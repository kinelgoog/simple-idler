const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  password: String, // hashed
  steamAccounts: [{
    accountName: String,
    encryptedPassword: String,
    sharedSecret: String, // optional for 2FA
    steamID: String, // steamID64 for API calls
  }],
  steamId: String, // from Steam auth
});

module.exports = mongoose.model('User', userSchema);
