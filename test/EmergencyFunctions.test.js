const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE } = require("./helpers/setup");

describe("Emergency Functions", function () {
    let projectId, milestoneId;
    let freelancePlatform;
    let userRegistry;
    let owner, client, freelancer, admin, otherUser;

    beforeEach(async function () {
        ({ freelancePlatform, userRegistry, client, freelancer, owner, otherUser, freshUser } = await deployContracts());

        await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
        projectId = 1;
    });

    it("Should allow emergency withdrawal in draft state", async function () {
        await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });

        const clientBalanceBefore = await ethers.provider.getBalance(client.address);

        await freelancePlatform.connect(client).emergencyWithdraw(projectId);

        const clientBalanceAfter = await ethers.provider.getBalance(client.address);
        const project = await freelancePlatform.getProject(projectId);

        expect(project.status).to.equal(6); // Cancelled
        expect(project.escrowBalance).to.equal(0);
        expect(clientBalanceAfter).to.be.greaterThan(clientBalanceBefore);
    });

    it("Should revert emergency withdrawal in active state", async function () {
        await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
        await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
        await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
        await freelancePlatform.connect(freelancer).acceptProject(projectId);

        const amounts = [MILESTONE_AMOUNT];

        // Use blockchain timestamp for deadline
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600];
        const metadataHashes = ["QmMilestone1"];

        await freelancePlatform.connect(client).agreeMilestones(
            projectId,
            amounts,
            deadlines,
            metadataHashes
        );

        await expect(
            freelancePlatform.connect(client).emergencyWithdraw(projectId)
        ).to.be.revertedWith("Cannot withdraw at this stage");
    });

    it("Should allow owner to emergency resolve dispute", async function () {
        await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
        await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
        await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
        await freelancePlatform.connect(freelancer).acceptProject(projectId);

        const amounts = [MILESTONE_AMOUNT];

        // Use blockchain timestamp for deadline
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600];
        const metadataHashes = ["QmMilestone1"];

        await freelancePlatform.connect(client).agreeMilestones(
            projectId,
            amounts,
            deadlines,
            metadataHashes
        );

        const milestoneId = 1;
        await freelancePlatform.connect(freelancer).submitMilestoneWork(
            milestoneId,
            "QmDeliveryHash",
            "Work completed"
        );
        await freelancePlatform.connect(client).disputeMilestone(milestoneId);

        const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);

        const tx = await freelancePlatform.connect(owner).emergencyResolveDispute(
            projectId,
            freelancer.address
        );

        await expect(tx).to.emit(freelancePlatform, "DisputeResolved");

        const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
        expect(freelancerBalanceAfter).to.be.greaterThan(freelancerBalanceBefore);
    });
});