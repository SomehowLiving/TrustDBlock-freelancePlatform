// scripts/sync-blockchain.js
const { ethers } = require('ethers');
const { createBlockchainSyncMiddleware } = require('../middleware/blockchainSync');
const freelancePlatform = require('../abis/FreelancePlatform.json');
const userRegistry = require('../abis/UserRegistry.json');
require('dotenv').config();

async function syncBlockchain() {
  try {
    console.log('⛓️  Starting blockchain synchronization...');

    const contracts = {
      freelancePlatform: {
        address: process.env.FREELANCE_PLATFORM_ADDRESS || "0x1111111111111111111111111111111111111111",
        abi: freelancePlatform || []
      },
      userRegistry: {
        address: process.env.USER_REGISTRY_ADDRESS || "0x2222222222222222222222222222222222222222",
        abi: userRegistry || []
      }
    };

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://localhost:8545");

    // Test connection
    const network = await provider.getNetwork();
    console.log(`🔗 Connected to network: ${network.name} (Chain ID: ${network.chainId})`);

    const { syncManager, initialize } = createBlockchainSyncMiddleware(contracts, provider);
    const manager = await initialize();

    // Sync historical data
    const fromBlock = parseInt(process.env.SYNC_FROM_BLOCK || '0');
    const result = await manager.syncHistoricalData(fromBlock);

    console.log(`✅ Sync completed: ${result.syncedEvents}/${result.totalEvents} events synced`);

    // Keep listening for new events
    console.log('👂 Listening for new blockchain events... (Press Ctrl+C to stop)');
    
    process.on('SIGINT', () => {
      console.log('\n📤 Stopping blockchain sync...');
      manager.stopEventListening();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Blockchain sync failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  syncBlockchain();
}

module.exports = syncBlockchain;

