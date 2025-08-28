const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();
require('dotenv').config();

// Import shared models
const { User, Project, Application, Milestone, Transaction, Dispute } = require('../models');

// Contract configurations (shared)
const { CONTRACTS, provider, freelancePlatformContract, userRegistryContract } = require('./contracts.js'); // Extract contract setup

// Utility functions
const validateAddress = (address) => ethers.isAddress(address);
const validateAmount = (amount) => !isNaN(amount) && parseFloat(amount) > 0;
const parseEther = (amount) => ethers.parseEther(amount.toString());
const formatEther = (amount) => ethers.formatEther(amount);
//----to generate id
const generateId = () => Math.floor(Math.random() * 1000000);

// Error handling
const handleError = (error, res, message = 'Operation failed') => {
  console.error(`${message}:`, error);

  let errorMessage = message;
  let statusCode = 500;

  if (error.name === 'ValidationError') {
    errorMessage = Object.values(error.errors).map(e => e.message).join(', ');
    statusCode = 400;
  } else if (error.name === 'CastError') {
    errorMessage = 'Invalid data format';
    statusCode = 400;
  } else if (error.code === 11000) {
    errorMessage = 'Duplicate entry found';
    statusCode = 409;
  } else if (error.reason) {
    errorMessage = error.reason;
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    error: errorMessage,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// Middleware for validating wallet addresses
const validateWallet = (req, res, next) => {
  const walletAddress = req.headers['x-wallet-address'] || req.body.walletAddress;
  if (!walletAddress || !validateAddress(walletAddress)) {
    return res.status(400).json({
      success: false,
      error: 'Valid wallet address required in x-wallet-address header or body'
    });
  }
  req.userAddress = walletAddress.toLowerCase();
  next();
};

// Middleware to check user registration
const checkUserRegistration = async (req, res, next) => {
  try {
    const isRegistered = await userRegistryContract.isUserRegistered(req.userAddress);
    if (!isRegistered) {
      return res.status(400).json({
        success: false,
        error: 'User must be registered first. Please register through /users/register'
      });
    }
    next();
  } catch (error) {
    handleError(error, res);
  }
};


// Middleware to sync/verify user exists
const syncUser = async (req, res, next) => {
  try {
    let user = await User.findOne({ address: req.userAddress });

    if (!user) {
      // Check if user exists on blockchain
      const isRegistered = await userRegistryContract.isUserRegistered(req.userAddress);

      if (isRegistered) {
        // Sync from blockchain
        const profile = await userRegistryContract.getUserProfile(req.userAddress);
        user = await User.create({
          address: req.userAddress,
          username: `user_${req.userAddress.slice(-6)}`,
          email: `${req.userAddress.slice(-6)}@example.com`,
          password: 'blockchain_user', // Temporary password
          role: profile.role.toLowerCase(),
          isActive: profile.isActive,
          createdAt: new Date(profile.registrationTime * 1000)
        });
      }
      
    }

    req.user = user;
    next();
  } catch (error) {
    handleError(error, res, 'User sync failed');
  }
};


// Utility function to generate proper IPFS hash (replace with actual IPFS upload)
const generateProposalHash = (proposalData) => {
  // In production, upload to IPFS and return actual hash
  // For now, generate deterministic hash based on content
  const crypto = require('crypto');
  const dataString = JSON.stringify(proposalData);
  const hash = crypto.createHash('sha256').update(dataString).digest('hex');
  return `Qm${hash.substring(0, 44)}`; // Mock IPFS hash format
};


// Utility function to map API status to contract status
const mapStatusToContract = (apiStatus) => {
  const statusMap = {
    'created': 'Draft',
    'draft': 'Draft', 
    'open': 'Open',
    'shortlisting': 'Shortlisting',
    'selecting': 'Selecting',
    'negotiating': 'Negotiating',
    'active': 'Active',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  return statusMap[apiStatus] || apiStatus;
};

// Utility function to map contract status to API status
const mapStatusFromContract = (contractStatus) => {
  const statusMap = {
    'Draft': 'created',
    'Open': 'open',
    'Selecting': 'selecting',
    'Negotiating': 'negotiating', 
    'Active': 'active',
    'Completed': 'completed',
    'Cancelled': 'cancelled'
  };
  return statusMap[contractStatus] || contractStatus.toLowerCase();
};

// Updated project sync function
const syncProjectStatus = async (project) => {
  try {
    if (project.onChainId) {
      const contractStatus = await freelancePlatformContract.getProjectStatus(project.onChainId);
      const apiStatus = mapStatusFromContract(contractStatus);
      
      if (project.status !== apiStatus) {
        project.status = apiStatus;
        await project.save();
      }
    }
  } catch (error) {
    console.warn('Failed to sync project status:', error.message);
  }
};

module.exports = {
validateAddress, 
  validateAmount, 
  checkUserRegistration,
  parseEther, 
  formatEther, 
  generateId, 
  handleError,
  validateWallet,
  syncUser,
  generateProposalHash,
  mapStatusToContract,
  mapStatusFromContract,
  syncProjectStatus
};