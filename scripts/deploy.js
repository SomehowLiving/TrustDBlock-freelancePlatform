// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting FreelancePlatform deployment...\n");
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying contracts with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    try {
        // Step 1: Deploy UserRegistry Contract
        console.log("📋 Step 1: Deploying UserRegistry...");
        const UserRegistry = await ethers.getContractFactory("UserRegistry");
        const userRegistry = await UserRegistry.deploy();
        await userRegistry.waitForDeployment();
        
        const userRegistryAddress = await userRegistry.getAddress();
        console.log("✅ UserRegistry deployed to:", userRegistryAddress);
        console.log("⏱️  Transaction hash:", userRegistry.deploymentTransaction()?.hash);
        
        // Step 2: Deploy FreelancePlatform Contract
        console.log("\n🏢 Step 2: Deploying FreelancePlatform...");
        const FreelancePlatform = await ethers.getContractFactory("FreelancePlatform");
        const freelancePlatform = await FreelancePlatform.deploy(userRegistryAddress);
        await freelancePlatform.waitForDeployment();
        
        const freelancePlatformAddress = await freelancePlatform.getAddress();
        console.log("✅ FreelancePlatform deployed to:", freelancePlatformAddress);
        console.log("⏱️  Transaction hash:", freelancePlatform.deploymentTransaction()?.hash);
        
        // Step 3: Authorize FreelancePlatform in UserRegistry
        console.log("\n🔐 Step 3: Authorizing FreelancePlatform in UserRegistry...");
        const authorizeTx = await userRegistry.authorizeContract(freelancePlatformAddress);
        await authorizeTx.wait();
        console.log("✅ FreelancePlatform authorized in UserRegistry");
        console.log("⏱️  Transaction hash:", authorizeTx.hash);
        
        // Step 4: Verify the integration
        console.log("\n🔍 Step 4: Verifying integration...");
        
        // Check if authorization worked
        const isAuthorized = await userRegistry.authorizedContracts(freelancePlatformAddress);
        console.log("✅ Authorization verified:", isAuthorized);
        
        // Check if FreelancePlatform can access UserRegistry
        const registryAddress = await freelancePlatform.userRegistry();
        console.log("✅ UserRegistry address in FreelancePlatform:", registryAddress);
        console.log("✅ Addresses match:", registryAddress === userRegistryAddress);
        
        // Step 5: Display deployment summary
        console.log("\n" + "=".repeat(80));
        console.log("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
        console.log("=".repeat(80));
        console.log("📋 UserRegistry Address:     ", userRegistryAddress);
        console.log("🏢 FreelancePlatform Address:", freelancePlatformAddress);
        console.log("👤 Deployer Address:        ", deployer.address);
        console.log("⛽ Network:                 ", (await ethers.provider.getNetwork()).name);
        console.log("🔗 Chain ID:                ", (await ethers.provider.getNetwork()).chainId);
        console.log("=".repeat(80));
        
        // Step 6: Save addresses to file for frontend
        const fs = require('fs');
        const deploymentData = {
            network: (await ethers.provider.getNetwork()).name,
            chainId: (await ethers.provider.getNetwork()).chainId.toString(),
            deployer: deployer.address,
            contracts: {
                UserRegistry: userRegistryAddress,
                FreelancePlatform: freelancePlatformAddress
            },
            deploymentTime: new Date().toISOString(),
            transactionHashes: {
                UserRegistry: userRegistry.deploymentTransaction()?.hash,
                FreelancePlatform: freelancePlatform.deploymentTransaction()?.hash,
                Authorization: authorizeTx.hash
            }
        };
        
        fs.writeFileSync(
            './deployment-addresses.json', 
            JSON.stringify(deploymentData, null, 2)
        );
        console.log("📄 Deployment addresses saved to: ./deployment-addresses.json");
        
        // Step 7: Setup initial admin (optional)
        console.log("\n🔧 Step 7: Setting up initial configuration...");
        
        // Register the deployer as an admin user
        console.log("👤 Registering deployer as Admin...");
        const registerTx = await userRegistry.selfRegister("Admin", "");
        await registerTx.wait();
        console.log("✅ Deployer registered as Admin");
        
        // Verify admin registration
        const deployerRole = await userRegistry.getUserRole(deployer.address);
        console.log("✅ Deployer role verified:", deployerRole);
        
        console.log("\n🎯 Next Steps:");
        console.log("1. Update your backend with the new contract addresses");
        console.log("2. Update your frontend config with deployment-addresses.json");
        console.log("3. Verify contracts on block explorer if needed");
        console.log("4. Test user registration and project creation");
        console.log("\n🔗 Useful Commands:");
        console.log(`   npx hardhat verify --network <network> ${userRegistryAddress}`);
        console.log(`   npx hardhat verify --network <network> ${freelancePlatformAddress} ${userRegistryAddress}`);
        
        return {
            userRegistry: userRegistryAddress,
            freelancePlatform: freelancePlatformAddress,
            deployer: deployer.address
        };
        
    } catch (error) {
        console.error("\n❌ Deployment failed!");
        console.error("Error:", error.message);
        
        if (error.transaction) {
            console.error("Transaction hash:", error.transaction.hash);
        }
        
        throw error;
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then((addresses) => {
        console.log("\n✨ Deployment script completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 Deployment script failed:");
        console.error(error);
        process.exit(1);
    });
