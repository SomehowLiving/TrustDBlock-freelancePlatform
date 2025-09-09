const express = require('express');
const { ethers } = require('ethers');
const jwt = require('jsonwebtoken');
const router = express.Router();
require('dotenv').config();

const { User } = require('../models');

// In-memory nonce store (replace with Redis if needed)
const nonces = new Map();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_TTL = '7d';

router.get('/auth/nonce', async (req, res) => {
  try {
    const address = (req.query.address || '').toString().toLowerCase();
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ success: false, error: 'Valid address is required' });
    }
    const nonce = Math.floor(Math.random() * 1e9).toString();
    nonces.set(address, { nonce, createdAt: Date.now() });
    return res.json({ success: true, data: { address, nonce, message: `Sign this nonce to login: ${nonce}` } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to issue nonce' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { address, signature } = req.body;
    if (!address || !ethers.isAddress(address) || !signature) {
      return res.status(400).json({ success: false, error: 'address and signature required' });
    }
    const entry = nonces.get(address.toLowerCase());
    if (!entry) return res.status(400).json({ success: false, error: 'Nonce not found. Request a new one.' });

    const message = `Sign this nonce to login: ${entry.nonce}`;
    let recovered;
    try {
      recovered = ethers.verifyMessage(message, signature);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(400).json({ success: false, error: 'Signature does not match address' });
    }

    nonces.delete(address.toLowerCase());

    // Ensure user exists off-chain if previously registered
    let user = await User.findOne({ address: address.toLowerCase() });
    // Do not auto-create here; registration API handles creation

    const token = jwt.sign({ sub: address.toLowerCase() }, JWT_SECRET, { expiresIn: JWT_TTL });
    return res.json({ success: true, data: { token, user } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

module.exports = router;


