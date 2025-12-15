import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import SteamAccountForm from './components/SteamAccountForm';
import './styles/App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <div className="space">
          <div className="stars1"></div>
          <div className="stars2"></div>
          <div className="stars3"></div>
        </div>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/add-steam" element={<SteamAccountForm />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
