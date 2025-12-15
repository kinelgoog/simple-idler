import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const SteamAccountForm = () => {
  const [accountName, setAccountName] = useState('');
  const [password, setPassword] = useState('');
  const [sharedSecret, setSharedSecret] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/idle/add-steam-account', { accountName, password, sharedSecret }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      navigate('/dashboard');
    } catch (err) {
      alert('Add failed');
      console.error(err);
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Add Steam Account</h1>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Steam Username" value={accountName} onChange={e => setAccountName(e.target.value)} />
        <input type="password" placeholder="Steam Password" value={password} onChange={e => setPassword(e.target.value)} />
        <input type="text" placeholder="Shared Secret (optional for 2FA)" value={sharedSecret} onChange={e => setSharedSecret(e.target.value)} />
        <button type="submit">Add</button>
      </form>
    </div>
  );
};

export default SteamAccountForm;
