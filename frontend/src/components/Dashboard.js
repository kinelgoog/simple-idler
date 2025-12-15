import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const Dashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(0);
  const [games, setGames] = useState([]);
  const [selectedGames, setSelectedGames] = useState([]);
  const [status, setStatus] = useState({ active: false, games: [] });
  const [stats, setStats] = useState([]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await axios.get('/idle/accounts', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        setAccounts(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (accounts.length === 0) return;
    const fetchData = async () => {
      try {
        const gamesRes = await axios.get(`/idle/games/${selectedAccount}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        setGames(gamesRes.data);

        const statusRes = await axios.get(`/idle/status/${selectedAccount}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        setStatus(statusRes.data);

        const statsRes = await axios.get(`/idle/stats/${selectedAccount}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        setStats(statsRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000); // Update stats every minute
    return () => clearInterval(interval);
  }, [selectedAccount, accounts]);

  const handleSelectGame = (gameId) => {
    if (selectedGames.includes(gameId)) {
      setSelectedGames(selectedGames.filter(id => id !== gameId));
    } else if (selectedGames.length < 32) {
      setSelectedGames([...selectedGames, gameId]);
    }
  };

  const startIdle = async () => {
    try {
      await axios.post(`/idle/start-idle/${selectedAccount}`, { gameIds: selectedGames }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setStatus({ active: true, games: selectedGames });
    } catch (err) {
      console.error(err);
    }
  };

  const stopIdle = async () => {
    try {
      await axios.post(`/idle/stop-idle/${selectedAccount}`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setStatus({ active: false, games: [] });
    } catch (err) {
      console.error(err);
    }
  };

  const chartData = {
    labels: stats.map(game => game.name || `App ${game.appid}`),
    datasets: [{
      label: 'Playtime (hours)',
      data: stats.map(game => game.playtime),
      backgroundColor: '#8a2be2'
    }]
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Cosmic Dashboard</h1>
      <a href="/add-steam">Add Steam Account</a>
      <h2>Select Account:</h2>
      <select value={selectedAccount} onChange={e => setSelectedAccount(Number(e.target.value))}>
        {accounts.map(acc => (
          <option key={acc.index} value={acc.index}>{acc.accountName}</option>
        ))}
      </select>
      <h2>Select Games (up to 32)</h2>
      <ul style={{ maxHeight: '200px', overflowY: 'scroll' }}>
        {games.map(game => (
          <li key={game} onClick={() => handleSelectGame(game)} style={{ color: selectedGames.includes(game) ? 'green' : 'white' }}>
            App ID: {game}
          </li>
        ))}
      </ul>
      <button onClick={startIdle} disabled={status.active || selectedGames.length === 0}>Start Idling</button>
      <button onClick={stopIdle} disabled={!status.active}>Stop Idling</button>
      <h2>Status for {accounts[selectedAccount]?.accountName || 'Selected'}: {status.active ? 'Active' : 'Inactive'}</h2>
      <h2>Current Games: {status.games.join(', ') || 'None'}</h2>
      <h2>Statistics:</h2>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Bar data={chartData} options={{ scales: { y: { beginAtZero: true } } }} />
      </div>
    </div>
  );
};

export default Dashboard;
