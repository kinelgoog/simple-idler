const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const SteamStrategy = require('passport-steam').Strategy;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const idleRoutes = require('./routes/idle');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const STEAM_API_KEY = process.env.STEAM_API_KEY;

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.use(cors());
app.use(bodyParser.json());
app.use(passport.initialize());

// Passport Local
passport.use(new LocalStrategy(
  async (username, password, done) => {
    const user = await User.findOne({ username });
    if (!user) return done(null, false);
    const match = await bcrypt.compare(password, user.password);
    if (!match) return done(null, false);
    return done(null, user);
  }
));

// Passport Steam (optional for profile link)
passport.use(new SteamStrategy({
  returnURL: process.env.RETURN_URL || 'http://localhost:5000/auth/steam/return', // Set in env for prod
  realm: process.env.REALM || 'http://localhost:5000/',
  apiKey: STEAM_API_KEY
}, async (identifier, profile, done) => {
  let user = await User.findOne({ steamId: profile.id });
  if (!user) {
    user = new User({ steamId: profile.id, username: profile.displayName });
    await user.save();
  }
  return done(null, user);
}));

// Routes
app.use('/auth', authRoutes);
app.use('/idle', idleRoutes);

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Start server
app.listen(PORT, () => console.log(`Backend on port ${PORT}`));
