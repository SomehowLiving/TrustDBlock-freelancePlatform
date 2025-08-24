const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET } = require("./helpers/setup");

describe("Project Creation", function () {
  let freelancePlatform, userRegistry, client, otherUser;

  beforeEach(async () => {
    ({ freelancePlatform, userRegistry, client, freelancer, owner, otherUser, freshUser } = await deployContracts());
  });

  it("Should create a project successfully", async function () {
    const tx = await freelancePlatform.connect(client).createProject(
      PROJECT_BUDGET,
      3,
      "QmTestHash",
      7
    );

    await expect(tx).to.emit(freelancePlatform, "ProjectCreated")
      .withArgs(1, client.address, PROJECT_BUDGET);

    const project = await freelancePlatform.getProject(1);
    expect(project.client).to.equal(client.address);
    expect(project.totalBudget).to.equal(PROJECT_BUDGET);
    expect(project.status).to.equal(0); // Draft
  });

  it("Should increment project counter", async function () {
    await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "QmTestHash", 7);
    await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "QmTestHash2", 7);

    expect(await freelancePlatform.projectCounter()).to.equal(2);
  });

  it("Should revert with zero budget", async function () {
    await expect(
      freelancePlatform.connect(client).createProject(0, 3, "QmTestHash", 7)
    ).to.be.revertedWithCustomError(freelancePlatform, "InvalidAmount");
  });

  it("Should revert with empty metadata hash", async function () {
    await expect(
      freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "", 7)
    ).to.be.revertedWith("Metadata hash required");
  });

  it("Should revert if caller is not registered", async function () {
    const [, , , , , freshUser] = await ethers.getSigners(); // Get unused signer
    await expect(
      freelancePlatform.connect(freshUser).createProject(PROJECT_BUDGET, 3, "QmTestHash", 7)
    ).to.be.revertedWith("User not registered");
  });

  it("Should revert if caller doesn't have client role", async function () {
    await userRegistry.connect(otherUser).selfRegister("Freelancer", "QmOtherHash");
    await expect(
      freelancePlatform.connect(otherUser).createProject(PROJECT_BUDGET, 3, "QmTestHash", 7)
    ).to.be.revertedWith("Only clients allowed");
  });
});
