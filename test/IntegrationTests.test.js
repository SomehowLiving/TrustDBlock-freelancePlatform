const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE } = require("./helpers/setup");

describe("Integration Tests", function () {
    let projectId, milestoneId;
    let freelancePlatform;
    let userRegistry;
    let owner, client, freelancer, admin, otherUser;

    beforeEach(async function () {
        ({ freelancePlatform, userRegistry, client, freelancer, owner, otherUser, freshUser } = await deployContracts());

    });
    it("Should handle complete project lifecycle", async function () {
        // Create project
        await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 2, "QmTestHash", 7);
        const projectId = 1;

        // Fund project
        await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });

        // Apply and select freelancer
        await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
        await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
        await freelancePlatform.connect(freelancer).acceptProject(projectId);
        // Calculate available escrow after platform fees
        const platformFeePercent = 300; // 3% = 300 basis points
        const platformFee = (PROJECT_BUDGET * BigInt(platformFeePercent)) / 10000n;
        const availableEscrow = PROJECT_BUDGET - platformFee;

        // Split available escrow into 2 equal milestones
        const milestoneAmount = availableEscrow / 2n;

        const amounts = [milestoneAmount, milestoneAmount];

        // Use blockchain time instead of Date.now()
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadlines = [
            latestBlock.timestamp + 86400 * 7 + 3600,
            latestBlock.timestamp + 86400 * 14 + 3600
        ];
        const metadataHashes = ["QmMilestone1", "QmMilestone2"];
        await freelancePlatform.connect(client).agreeMilestones(
            projectId,
            amounts,
            deadlines,
            metadataHashes
        );

        // Complete first milestone
        await freelancePlatform.connect(freelancer).submitMilestoneWork(
            1,
            "QmDeliveryHash1",
            "First milestone completed"
        );
        await freelancePlatform.connect(client).approveMilestone(1);
        await freelancePlatform.connect(client).releaseMilestonePayment(1);

        // Complete second milestone
        await freelancePlatform.connect(freelancer).submitMilestoneWork(
            2,
            "QmDeliveryHash2",
            "Second milestone completed"
        );
        await freelancePlatform.connect(client).approveMilestone(2);

        const tx = await freelancePlatform.connect(client).releaseMilestonePayment(2);

        // Verify project completion
        await expect(tx).to.emit(freelancePlatform, "ProjectCompleted");

        const project = await freelancePlatform.getProject(projectId);
        expect(project.status).to.equal(5); // Completed
        expect(project.completedMilestones).to.equal(2);

        // Rate project
        await freelancePlatform.connect(client).rateProject(projectId, 5);

        const reputation = await freelancePlatform.getFreelancerReputation(freelancer.address);
        expect(reputation.projectsCompleted).to.equal(1);
        expect(reputation.averageRating).to.equal(5);
    });

});