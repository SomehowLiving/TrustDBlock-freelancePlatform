// scripts/verify-contracts.js
const { ethers } = require('ethers');
require('dotenv').config();

async function verifyContracts() {
  try {
    console.log('🔍 Verifying contract deployments...');

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://localhost:8545");
    const network = await provider.getNetwork();
    console.log(`🔗 Connected to network: ${network.name} (Chain ID: ${network.chainId})`);

    const contracts = {
      FreelancePlatform: process.env.FREELANCE_PLATFORM_ADDRESS,
      UserRegistry: process.env.USER_REGISTRY_ADDRESS
    };

    for (const [name, address] of Object.entries(contracts)) {
      if (!address || address === "0x1111111111111111111111111111111111111111") {
        console.log(`⚠️  ${name}: No address configured`);
        continue;
      }

      try {
        const code = await provider.getCode(address);
        if (code === '0x') {
          console.log(`❌ ${name} at ${address}: No contract code found`);
        } else {
          console.log(`✅ ${name} at ${address}: Contract verified (${code.length} bytes)`);
          
          // Try to call a basic function to verify it's working
          if (name === 'FreelancePlatform') {
            const contract = new ethers.Contract(address, ['function projectCounter() view returns (uint256)'], provider);
            try {
              const counter = await contract.projectCounter();
              console.log(`   📊 Project counter: ${counter.toString()}`);
            } catch (err) {
              console.log(`   ⚠️  Function call failed: ${err.message}`);
            }
          }
        }
      } catch (error) {
        console.log(`❌ ${name} at ${address}: Verification failed - ${error.message}`);
      }
    }

    console.log('✅ Contract verification completed');
    
  } catch (error) {
    console.error('❌ Contract verification failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  verifyContracts();
}

module.exports = verifyContracts;

