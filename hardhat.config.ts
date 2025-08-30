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
      timeout: 1000000,
    },
    // ---- Ethereum Sepolia (Google Cloud RPC or Alchemy) ----
    sepolia: {
      // `https://eth-sepolia.g.alchemy.com/v2/${process.env.API_KEY}`,
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      // `https://blockchain.googleapis.com/v1/projects/snap-anime/locations/asia-east1/endpoints/ethereum-sepolia/rpc?key=${process.env.API_KEY}`,
      accounts: [`0x${process.env.SEPOLIA_PRIVATE_KEY}`],
      // accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    tenderly: {
      url: "https://virtual.sepolia.eu.rpc.tenderly.co/d29dbf0f-4646-4d79-b1b4-219004138793",
      accounts: [`0x${process.env.SEPOLIA_PRIVATE_KEY}`
      ],
      // chainId: 111666111, // Sepolia chain ID
    },
    // ---- Avalanche ----
    avalancheFuji: {
      // `https://avax-fuji.g.alchemy.com/v2/${process.env.API_KEY}`
      url: `https://avax-fuji.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      // "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: process.env.AVALANCHE_PRIVATE_KEY
        ? [`0x${process.env.AVALANCHE_PRIVATE_KEY}`]
        : [],
    },
    avalanche: {
      // `https://avalanche-amoy.g.alchemy.com/v2/${process.env.API_KEY}`
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: process.env.AVALANCHE_PRIVATE_KEY
        ? [`0x${process.env.AVALANCHE_PRIVATE_KEY}`]
        : [],
    },
    
    // ---- Polygon ----
    polygonMumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      chainId: 80001,
      accounts: process.env.POLYGON_PRIVATE_KEY
        ? [`0x${process.env.POLYGON_PRIVATE_KEY}`]
        : [],
    },
    polygon: {
      // `https://polygon-amoy.g.alchemy.com/v2/${process.env.API_KEY}`
      url: "https://polygon-rpc.com",
      chainId: 137,
      accounts: process.env.POLYGON_PRIVATE_KEY
        ? [`0x${process.env.POLYGON_PRIVATE_KEY}`]
        : [],
    },
    //-------------- for avalanche subnet ----------------------
    localSubnet: {
      url: "http://127.0.0.1:9650/ext/bc/C/rpc",
      accounts: process.env.AVALANCHE_PRIVATE_KEY
        ? [`0x${process.env.AVALANCHE_PRIVATE_KEY}`]
        : [],
    }
  },
  ignition: {},
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
  },

};

export default config;
