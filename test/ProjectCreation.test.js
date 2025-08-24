const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET } = require("./helpers/setup");

describe("Project Creation", function () {
  let freelancePlatform, client, otherUser;

  beforeEach(async () => {
    ({ freelancePlatform, client, otherUser } = await deployContracts());
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
  });

  it("Should revert if caller doesn't have client role", async function () {
    await expect(
      freelancePlatform.connect(otherUser).createProject(PROJECT_BUDGET, 3, "QmHash", 7)
    ).to.be.revertedWith("Only clients allowed");
  });
});
