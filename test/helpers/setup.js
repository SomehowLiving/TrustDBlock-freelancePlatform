const { ethers } = require("hardhat");

async function deployContracts() {
  const [owner, client, freelancer, admin, otherUser, freshUser] = await ethers.getSigners();

  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy();

  const FreelancePlatform = await ethers.getContractFactory("FreelancePlatform");
  const freelancePlatform = await FreelancePlatform.deploy(userRegistry.target);

  await userRegistry.authorizeContract(freelancePlatform.target);

  // Setup roles
  await userRegistry.connect(client).selfRegister("Client", "QmClientHash");
  await userRegistry.connect(freelancer).selfRegister("Freelancer", "QmFreelancerHash");
  await userRegistry.connect(otherUser).selfRegister("Freelancer", "QmFreelancerHash");

  return {
    freelancePlatform,
    userRegistry,
    owner,
    client,
    freelancer,
    admin,
    otherUser,
    freshUser
  };
}

module.exports = {
  deployContracts,
  PLATFORM_FEE: 300,
  FREELANCER_FEE: 250,
  PROJECT_BUDGET: ethers.parseEther("1.0"),
  MILESTONE_AMOUNT: ethers.parseEther("0.5")
};