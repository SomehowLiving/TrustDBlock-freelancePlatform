const { expect } = require("chai");
const { deployContracts, PLATFORM_FEE, FREELANCER_FEE } = require("./helpers/setup");
const { ethers } = require("hardhat");

describe("Deployment", function () {
  let freelancePlatform, userRegistry, owner;

  beforeEach(async () => {
    ({ freelancePlatform, userRegistry, owner } = await deployContracts());
  });

  it("Should set the right owner", async function () {
    expect(await freelancePlatform.owner()).to.equal(owner.address);
  });

  it("Should set the UserRegistry address", async function () {
    expect(await freelancePlatform.userRegistry()).to.equal(userRegistry.target);
  });

  it("Should initialize with correct default fees", async function () {
    expect(await freelancePlatform.platformFeePercent()).to.equal(PLATFORM_FEE);
    expect(await freelancePlatform.freelancerFeePercent()).to.equal(FREELANCER_FEE);
  });

  it("Should revert with invalid UserRegistry address", async function () {
    const FreelancePlatform = await ethers.getContractFactory("FreelancePlatform");
    await expect(
      FreelancePlatform.deploy(ethers.ZeroAddress)
    ).to.be.revertedWith("Invalid UserRegistry address");
  });
});
