// scripts/deploy-subnet.js
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Starting TrustDBlock deployment on local Avalanche Subnet...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "AVAX\n");

  try {
    // Step 1: Deploy UserRegistry
    console.log("📋 Step 1: Deploying UserRegistry...");
    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    const userRegistry = await UserRegistry.deploy();
    await userRegistry.waitForDeployment();

    const userRegistryAddress = await userRegistry.getAddress();
    console.log("✅ UserRegistry deployed to:", userRegistryAddress);
    console.log("⏱️  Tx hash:", userRegistry.deploymentTransaction()?.hash);

    // Step 2: Deploy FreelancePlatform
    console.log("\n🏢 Step 2: Deploying FreelancePlatform...");
    const FreelancePlatform = await ethers.getContractFactory("FreelancePlatform");
    const freelancePlatform = await FreelancePlatform.deploy(userRegistryAddress);
    await freelancePlatform.waitForDeployment();

    const freelancePlatformAddress = await freelancePlatform.getAddress();
    console.log("✅ FreelancePlatform deployed to:", freelancePlatformAddress);
    console.log("⏱️  Tx hash:", freelancePlatform.deploymentTransaction()?.hash);

    // Step 3: Authorize FreelancePlatform in UserRegistry
    console.log("\n🔐 Step 3: Authorizing FreelancePlatform...");
    const authorizeTx = await userRegistry.authorizeContract(freelancePlatformAddress);
    await authorizeTx.wait();
    console.log("✅ FreelancePlatform authorized in UserRegistry");
    console.log("⏱️  Tx hash:", authorizeTx.hash);

    // Step 4: Verify integration
    const isAuthorized = await userRegistry.authorizedContracts(freelancePlatformAddress);
    console.log("✅ Authorization verified:", isAuthorized);

    const registryAddress = await freelancePlatform.userRegistry();
    console.log("✅ UserRegistry address in FreelancePlatform:", registryAddress);
    console.log("✅ Addresses match:", registryAddress === userRegistryAddress);

    // Step 5: Save deployment info
    const deploymentData = {
      network: "localSubnet",
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

    fs.writeFileSync('./deployment-addresses-subnet.json', JSON.stringify(deploymentData, null, 2));
    console.log("📄 Deployment addresses saved to: ./deployment-addresses-subnet.json");

    // Step 6: Register deployer as Admin
    console.log("\n🔧 Step 6: Registering deployer as Admin...");
    const registerTx = await userRegistry.selfRegister("Admin", "");
    await registerTx.wait();
    const deployerRole = await userRegistry.getUserRole(deployer.address);
    console.log("✅ Deployer role verified:", deployerRole);

    console.log("\n🎉 DEPLOYMENT COMPLETED on local subnet!");
    console.log("📋 Contracts ready for frontend integration.");
    
  } catch (error) {
    console.error("\n❌ Deployment failed!");
    console.error(error);
    process.exit(1);
  }
}

main();
