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

// const { ethers, upgrades } = require("hardhat");
// const { writeFileSync, existsSync, mkdirSync } = require("fs");
// const path = require("path");

// async function main() {
//     console.log("🚀 Starting FreelancePlatform deployment...\n");
    
//     // Get network information
//     const network = await ethers.provider.getNetwork();
//     console.log(`📡 Deploying to network: ${network.name} (Chain ID: ${network.chainId})`);
    
//     // Get deployment account
//     const [deployer] = await ethers.getSigners();
//     const deployerAddress = await deployer.getAddress();
//     const deployerBalance = await ethers.provider.getBalance(deployerAddress);
    
//     console.log(`👤 Deploying from account: ${deployerAddress}`);
//     console.log(`💰 Account balance: ${ethers.formatEther(deployerBalance)} ETH\n`);
    
//     // Estimate deployment cost
//     const FreelancePlatform = await ethers.getContractFactory("FreelancePlatform");
//     const deploymentData = FreelancePlatform.interface.encodeDeploy([]);
//     const estimatedGas = await ethers.provider.estimateGas({
//         data: FreelancePlatform.bytecode + deploymentData.slice(2)
//     });
    
//     const gasPrice = await ethers.provider.getFeeData();
//     const estimatedCost = estimatedGas * gasPrice.gasPrice;
    
//     console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`);
//     console.log(`💸 Estimated cost: ${ethers.formatEther(estimatedCost)} ETH\n`);
    
//     // Check if we have enough balance
//     if (deployerBalance < estimatedCost) {
//         throw new Error(`❌ Insufficient balance. Need at least ${ethers.formatEther(estimatedCost)} ETH`);
//     }
    
//     try {
//         // Deploy the contract
//         console.log("📦 Deploying FreelancePlatform contract...");
//         const freelancePlatform = await FreelancePlatform.deploy();
        
//         // Wait for deployment to be mined
//         console.log("⏳ Waiting for deployment transaction to be mined...");
//         await freelancePlatform.waitForDeployment();
        
//         const contractAddress = await freelancePlatform.getAddress();
//         console.log(`✅ FreelancePlatform deployed successfully!`);
//         console.log(`📍 Contract address: ${contractAddress}\n`);
        
//         // Get deployment transaction details
//         const deploymentTx = freelancePlatform.deploymentTransaction();
//         console.log(`🔗 Transaction hash: ${deploymentTx.hash}`);
//         console.log(`🧱 Block number: ${deploymentTx.blockNumber}`);
//         console.log(`⛽ Gas used: ${deploymentTx.gasLimit.toString()}\n`);
        
//         // Verify contract deployment
//         console.log("🔍 Verifying contract deployment...");
//         const code = await ethers.provider.getCode(contractAddress);
//         if (code === "0x") {
//             throw new Error("❌ Contract deployment failed - no code at address");
//         }
//         console.log("✅ Contract code verified at address\n");
        
//         // Test basic contract functionality
//         console.log("🧪 Testing basic contract functionality...");
        
//         // Test contract version
//         const version = await freelancePlatform.getContractVersion();
//         console.log(`📋 Contract version: ${version}`);
        
//         // Test backward compatibility
//         const isCompatible = await freelancePlatform.testBackwardCompatibility();
//         console.log(`🔄 Backward compatibility: ${isCompatible ? '✅' : '❌'}`);
        
//         // Check initial state
//         const projectCounter = await freelancePlatform.projectCounter();
//         const milestoneCounter = await freelancePlatform.milestoneCounter();
//         const platformFee = await freelancePlatform.platformFeePercent();
//         const freelancerFee = await freelancePlatform.freelancerFeePercent();
        
//         console.log(`📊 Initial project counter: ${projectCounter}`);
//         console.log(`📊 Initial milestone counter: ${milestoneCounter}`);
//         console.log(`💰 Platform fee: ${platformFee / 100}%`);
//         console.log(`💰 Freelancer fee: ${freelancerFee / 100}%`);
        
//         // Check owner
//         const owner = await freelancePlatform.owner();
//         console.log(`👑 Contract owner: ${owner}`);
//         console.log(`🎯 Owner matches deployer: ${owner === deployerAddress ? '✅' : '❌'}\n`);
        
//         // Save deployment information
//         const deploymentInfo = {
//             network: {
//                 name: network.name,
//                 chainId: network.chainId.toString()
//             },
//             contract: {
//                 name: "FreelancePlatform",
//                 address: contractAddress,
//                 deployer: deployerAddress,
//                 deploymentTxHash: deploymentTx.hash,
//                 blockNumber: deploymentTx.blockNumber,
//                 version: version,
//                 timestamp: new Date().toISOString()
//             },
//             fees: {
//                 platformFeePercent: platformFee.toString(),
//                 freelancerFeePercent: freelancerFee.toString()
//             },
//             initialState: {
//                 projectCounter: projectCounter.toString(),
//                 milestoneCounter: milestoneCounter.toString(),
//                 owner: owner
//             },
//             deployment: {
//                 estimatedGas: estimatedGas.toString(),
//                 gasPrice: gasPrice.gasPrice.toString(),
//                 estimatedCost: estimatedCost.toString(),
//                 deployerBalance: deployerBalance.toString()
//             }
//         };
        
//         // Create deployments directory if it doesn't exist
//         const deploymentsDir = path.join(process.cwd(), 'deployments');
//         if (!existsSync(deploymentsDir)) {
//             mkdirSync(deploymentsDir, { recursive: true });
//         }
        
//         // Save deployment info to file
//         const deploymentFile = path.join(deploymentsDir, `freelance-platform-${network.name}-${Date.now()}.json`);
//         writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
//         console.log(`📄 Deployment info saved to: ${deploymentFile}\n`);
        
//         // Generate environment variables
//         const envVars = `
// # FreelancePlatform Contract - ${network.name}
// FREELANCE_PLATFORM_ADDRESS=${contractAddress}
// FREELANCE_PLATFORM_DEPLOYER=${deployerAddress}
// FREELANCE_PLATFORM_NETWORK=${network.name}
// FREELANCE_PLATFORM_CHAIN_ID=${network.chainId}
// FREELANCE_PLATFORM_DEPLOYMENT_TX=${deploymentTx.hash}
// FREELANCE_PLATFORM_BLOCK_NUMBER=${deploymentTx.blockNumber}
// `;
        
//         const envFile = path.join(process.cwd(), `.env.${network.name.toLowerCase()}`);
//         writeFileSync(envFile, envVars.trim());
//         console.log(`🌍 Environment variables saved to: ${envFile}\n`);
        
//         // Print summary
//         console.log("🎉 DEPLOYMENT SUMMARY");
//         console.log("=====================");
//         console.log(`Contract: FreelancePlatform`);
//         console.log(`Address: ${contractAddress}`);
//         console.log(`Network: ${network.name} (${network.chainId})`);
//         console.log(`Deployer: ${deployerAddress}`);
//         console.log(`Transaction: ${deploymentTx.hash}`);
//         console.log(`Block: ${deploymentTx.blockNumber}`);
//         console.log(`Version: ${version}`);
//         console.log("=====================\n");
        
//         // Verification instructions
//         if (network.name !== "hardhat" && network.name !== "localhost") {
//             console.log("🔍 VERIFICATION INSTRUCTIONS");
//             console.log("============================");
//             console.log("To verify the contract on Etherscan, run:");
//             console.log(`npx hardhat verify --network ${network.name} ${contractAddress}`);
//             console.log("============================\n");
//         }
        
//         // Next steps
//         console.log("📋 NEXT STEPS");
//         console.log("=============");
//         console.log("1. Verify the contract on block explorer");
//         console.log("2. Set up admin accounts if needed:");
//         console.log(`   freelancePlatform.authorizeAdmin("<admin_address>")`);
//         console.log("3. Update platform fees if needed:");
//         console.log(`   freelancePlatform.updatePlatformFee(<new_fee_basis_points>)`);
//         console.log("4. Register initial users:");
//         console.log(`   freelancePlatform.registerUser("<user_address>", "<role>")`);
//         console.log("5. Consider setting up monitoring for contract events");
//         console.log("=============\n");
        
//         return {
//             contract: freelancePlatform,
//             address: contractAddress,
//             deploymentInfo: deploymentInfo
//         };
        
//     } catch (error) {
//         console.error("❌ Deployment failed:", error.message);
//         throw error;
//     }
// }

// // Post-deployment setup function
// async function postDeploymentSetup(contractAddress) {
//     console.log("🔧 Running post-deployment setup...\n");
    
//     const FreelancePlatform = await ethers.getContractFactory("FreelancePlatform");
//     const freelancePlatform = FreelancePlatform.attach(contractAddress);
//     const [deployer] = await ethers.getSigners();
    
//     try {
//         // Register deployer as admin
//         console.log("👤 Registering deployer as admin...");
//         const deployerRole = await freelancePlatform.getUserRole(deployer.address);
//         if (deployerRole === "" || deployerRole === "Unknown") {
//             const tx = await freelancePlatform.registerUser(deployer.address, "Admin");
//             await tx.wait();
//             console.log("✅ Deployer registered as admin");
//         } else {
//             console.log(`ℹ️  Deployer already registered as: ${deployerRole}`);
//         }
        
//         // You can add more setup steps here
//         // For example, registering initial users, setting custom fees, etc.
        
//         console.log("✅ Post-deployment setup completed\n");
        
//     } catch (error) {
//         console.error("❌ Post-deployment setup failed:", error.message);
//         // Don't throw here as deployment was successful
//     }
// }

// // Handle script execution
// if (require.main === module) {
//     main()
//         .then(async (result) => {
//             console.log("🎉 Deployment completed successfully!");
            
//             // Run post-deployment setup
//             await postDeploymentSetup(result.address);
            
//             process.exit(0);
//         })
//         .catch((error) => {
//             console.error("💥 Fatal error:", error);
//             process.exit(1);
//         });
// }

// module.exports = { main, postDeploymentSetup };