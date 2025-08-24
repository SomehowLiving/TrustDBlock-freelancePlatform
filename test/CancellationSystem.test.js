const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE } = require("./helpers/setup");

describe("Cancellation System", function () {
    let projectId, milestoneId;
    let freelancePlatform;
    let userRegistry;
    let owner, client, freelancer, admin, otherUser;

    beforeEach(async function () {
        ({ freelancePlatform, userRegistry, client, freelancer, owner, otherUser, freshUser } = await deployContracts());

        await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
        projectId = 1;
        await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
        await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
        await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
        await freelancePlatform.connect(freelancer).acceptProject(projectId);

        const amounts = [MILESTONE_AMOUNT];

        const metadataHashes = ["QmMilestone1"];
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600];
        await freelancePlatform.connect(client).agreeMilestones(
            projectId,
            amounts,
            deadlines,
            metadataHashes
        );

        milestoneId = 1;
    });

    it("Should auto-cancel milestone after deadline", async function () {
        // Move time past final submission deadline
        await ethers.provider.send("evm_increaseTime", [86400 * 18]); // 18 days
        await ethers.provider.send("evm_mine");

        const clientBalanceBefore = await ethers.provider.getBalance(client.address);

        const tx = await freelancePlatform.autoCancelMilestone(milestoneId);

        await expect(tx).to.emit(freelancePlatform, "MilestoneAutoCancelled")
            .withArgs(milestoneId, projectId);

        const clientBalanceAfter = await ethers.provider.getBalance(client.address);
        expect(clientBalanceAfter - clientBalanceBefore).to.equal(MILESTONE_AMOUNT);

        const milestone = await freelancePlatform.getMilestone(milestoneId);
        expect(milestone.status).to.equal(5); // Cancelled
    });

    it("Should cancel milestone with mutual agreement", async function () {
        // Both parties request cancellation
        await freelancePlatform.connect(client).requestMilestoneCancellation(milestoneId);

        const clientBalanceBefore = await ethers.provider.getBalance(client.address);

        const tx = await freelancePlatform.connect(freelancer).requestMilestoneCancellation(milestoneId);

        await expect(tx).to.emit(freelancePlatform, "MilestoneCanceled")
            .withArgs(milestoneId, projectId);

        const clientBalanceAfter = await ethers.provider.getBalance(client.address);
        expect(clientBalanceAfter - clientBalanceBefore).to.equal(MILESTONE_AMOUNT);
    });

    it("Should revert auto-cancel if not eligible", async function () {
        await expect(
            freelancePlatform.autoCancelMilestone(milestoneId)
        ).to.be.revertedWith("Not eligible for auto cancellation");
    });

    it("Should revert cancellation request from non-participant", async function () {
        await expect(
            freelancePlatform.connect(otherUser).requestMilestoneCancellation(milestoneId)
        ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
    });
});