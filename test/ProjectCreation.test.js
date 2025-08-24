const { expect } = require("chai");
const { MaxUint256 } = require("ethers");
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

  //-----------------------Additional Tests-----------------------
  it("Should set correct application deadline", async function () {
  const now = (await ethers.provider.getBlock("latest")).timestamp;
  const tx = await freelancePlatform.connect(client).createProject(
    PROJECT_BUDGET,
    3,
    "QmDeadlineHash",
    10
  );
  await tx.wait();

  const project = await freelancePlatform.getProject(1);
  expect(project.applicationDeadline).to.be.closeTo(now + 10 * 24 * 60 * 60, 5);
});

it("Should default milestones to 1 if zero is passed", async function () {
  await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 0, "QmTestHash", 7);
  const project = await freelancePlatform.getProject(1);
  expect(project.totalMilestones).to.equal(1);
});

it("Should initialize escrow balance to zero", async function () {
  await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "QmHash", 7);
  const project = await freelancePlatform.getProject(1);
  expect(project.escrowBalance).to.equal(0);
});

it("Should allow zero-day application period but deadline == createdAt", async function () {
  const now = (await ethers.provider.getBlock("latest")).timestamp;
  const tx = await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "QmTestHash", 0);
  await tx.wait();

  const project = await freelancePlatform.getProject(1);
  expect(project.applicationDeadline).to.be.closeTo(now, 2); // allow 2s drift
});

it("Should handle very large budget safely", async function () {
  const hugeBudget = MaxUint256;
  await expect(
    freelancePlatform.connect(client).createProject(hugeBudget, 1, "QmHash", 7)
  ).to.not.be.reverted;
});

it("Should emit ProjectCreated with correct args", async function () {
  const tx = await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "QmMeta", 7);
  await expect(tx).to.emit(freelancePlatform, "ProjectCreated")
    .withArgs(1, client.address, PROJECT_BUDGET);
});

it("Should create sequential IDs across multiple clients", async function () {
  await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "Qm1", 7);
  await userRegistry.connect(otherUser).selfRegister("Client", "QmOther");
  await freelancePlatform.connect(otherUser).createProject(PROJECT_BUDGET, 3, "Qm2", 7);

  const project1 = await freelancePlatform.getProject(1);
  const project2 = await freelancePlatform.getProject(2);
  expect(project1.id).to.equal(1);
  expect(project2.id).to.equal(2);
});


});
