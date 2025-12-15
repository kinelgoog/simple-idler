import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/auth/register', { username, password });
      navigate('/');
    } catch (err) {
      alert('Registration failed');
      console.error(err);
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Register for Cosmic Steam Idler</h1>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">Register</button>
      </form>
      <p><Link to="/">Back to Login</Link></p>
    </div>
  );
};

export default Register;
