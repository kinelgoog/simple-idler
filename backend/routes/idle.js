const express = require('express');
const jwt = require('jsonwebtoken');
const SteamUser = require('steam-user');
const axios = require('axios');
const { encrypt, decrypt } = require('../utils/encryption');
const User = require('../models/User');

const router = express.Router();
const idleClients = new Map(); // key: `${userId}-${accountIndex}` -> { client, games }

// Verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.userId = decoded.id;
    next();
  });
};

router.post('/add-steam-account', verifyToken, async (req, res) => {
  const { accountName, password, sharedSecret } = req.body;
  const user = await User.findById(req.userId);
  if (user.steamAccounts.length >= 10) return res.status(400).json({ error: 'Max 10 accounts' });
  const encryptedPassword = encrypt(password);

  // Temp client to get steamID64
  const tempClient = new SteamUser();
  tempClient.logOn({
    accountName,
    password,
    sharedSecret
  });

  tempClient.on('loggedOn', () => {
    const steamID = tempClient.steamID.getSteamID64();
    user.steamAccounts.push({ accountName, encryptedPassword, sharedSecret, steamID });
    user.save();
    tempClient.logOff();
    res.json({ message: 'Steam account added', steamID });
  });

  tempClient.on('error', err => res.status(500).json({ error: err.message }));
  tempClient.on('steamGuard', (domain, callback) => {
    console.error(`Steam Guard needed for ${accountName}. Check email.`);
    res.status(403).json({ error: 'Steam Guard code required - handle manually first time.' });
  });
});

router.get('/accounts', verifyToken, async (req, res) => {
  const user = await User.findById(req.userId);
  res.json(user.steamAccounts.map((acc, index) => ({ index, accountName: acc.accountName })));
});

router.get('/games/:accountIndex', verifyToken, async (req, res) => {
  const { accountIndex } = req.params;
  const user = await User.findById(req.userId);
  const account = user.steamAccounts[accountIndex];
  if (!account) return res.status(404).json({ error: 'No Steam account' });

  try {
    const response = await axios.get(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAM_API_KEY}&steamid=${account.steamID}&format=json&include_appinfo=false`);
    const apps = response.data.response.games.map(game => game.appid);
    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/start-idle/:accountIndex', verifyToken, async (req, res) => {
  const { accountIndex } = req.params;
  const { gameIds } = req.body;
  if (gameIds.length > 32) return res.status(400).json({ error: 'Max 32 games' });

  const user = await User.findById(req.userId);
  const account = user.steamAccounts[accountIndex];
  if (!account) return res.status(404).json({ error: 'No account' });

  const client = new SteamUser({ autoRelogin: true, dataDirectory: null });
  client.logOn({
    accountName: account.accountName,
    password: decrypt(account.encryptedPassword),
    rememberPassword: true,
    sharedSecret: account.sharedSecret
  });

  client.on('loggedOn', () => {
    client.setPersona(SteamUser.EPersonaState.Online);
    client.gamesPlayed(gameIds);
    console.log(`Idling ${gameIds.length} games for ${account.accountName}`);
    if (global.gc) global.gc();
  });

  client.on('error', err => console.error(`Error for ${account.accountName}: ${err}`));
  client.on('disconnected', () => console.log(`Disconnected ${account.accountName}, relogging...`));
  client.on('steamGuard', (domain, callback) => {
    console.error(`Steam Guard for ${account.accountName} from ${domain}.`);
  });

  const key = `${req.userId}-${accountIndex}`;
  idleClients.set(key, { client, games: gameIds });
  res.json({ message: 'Idling started' });
});

router.post('/stop-idle/:accountIndex', verifyToken, (req, res) => {
  const { accountIndex } = req.params;
  const key = `${req.userId}-${accountIndex}`;
  const idle = idleClients.get(key);
  if (!idle) return res.status(404).json({ error: 'No active idle' });
  idle.client.gamesPlayed([]);
  idle.client.logOff();
  idleClients.delete(key);
  res.json({ message: 'Idling stopped' });
});

router.get('/status/:accountIndex', verifyToken, (req, res) => {
  const { accountIndex } = req.params;
  const key = `${req.userId}-${accountIndex}`;
  const idle = idleClients.get(key);
  res.json({ active: !!idle, games: idle?.games || [] });
});

router.get('/stats/:accountIndex', verifyToken, async (req, res) => {
  const { accountIndex } = req.params;
  const user = await User.findById(req.userId);
  const account = user.steamAccounts[accountIndex];
  if (!account) return res.status(404).json({ error: 'No account' });

  try {
    const response = await axios.get(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAM_API_KEY}&steamid=${account.steamID}&format=json&include_played_free_games=true&include_appinfo=true`);
    const games = response.data.response.games || [];
    const stats = games.map(game => ({
      appid: game.appid,
      name: game.name,
      playtime: Math.round(game.playtime_forever / 60 * 10) / 10 // hours, rounded
    }));
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
