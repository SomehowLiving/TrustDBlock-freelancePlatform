import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-ignition";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 50 }, 
      viaIR: true,
      metadata: { bytecodeHash: "none" },
    },
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
      timeout: 1000000, // 👈 Increase timeout (default is 4000ms)
    },
    sepolia: {
      url: `https://blockchain.googleapis.com/v1/projects/snap-anime/locations/asia-east1/endpoints/ethereum-sepolia/rpc?key=${process.env.API_KEY}`,
      accounts: [`0x${process.env.SEPOLIA_PRIVATE_KEY}`],
      // accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    tenderly: {
      url: "https://virtual.sepolia.eu.rpc.tenderly.co/d29dbf0f-4646-4d79-b1b4-219004138793",
      accounts: [`0x${process.env.SEPOLIA_PRIVATE_KEY}`
      ],
      // chainId: 111666111, // Sepolia chain ID
    }
  },
  ignition:{

  }
};

export default config;
