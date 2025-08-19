const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();
require('dotenv').config();

// MongoDB Models
const { User, Project, Application, Milestone, Transaction, Dispute } = require('../models');

// Contract ABIs
const freelancePlatform = require('../abis/FreelancePlatform.json');
const userRegistry = require('../abis/UserRegistry.json');

// Contract configurations
const CONTRACTS = {
  freelancePlatform: {
    address: process.env.FREELANCE_PLATFORM_ADDRESS || "0x1111111111111111111111111111111111111111",
    abi: freelancePlatform || []
  },
  userRegistry: {
    address: process.env.USER_REGISTRY_ADDRESS || "0x2222222222222222222222222222222222222222",
    abi: userRegistry || []
  }
};

// Provider setup
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://localhost:8545");

// Contract instances (read-only)
const freelancePlatformContract = new ethers.Contract(
  CONTRACTS.freelancePlatform.address,
  CONTRACTS.freelancePlatform.abi,
  provider
);

const userRegistryContract = new ethers.Contract(
  CONTRACTS.userRegistry.address,
  CONTRACTS.userRegistry.abi,
  provider
);

module.exports = {
    router,
    CONTRACTS,
    provider,
    freelancePlatformContract,
    userRegistryContract
    };