const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE } = require("./helpers/setup");

describe("Milestone Approval and Payment", function () {
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

        // Use blockchain timestamp for deadlines
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600]; 
        const metadataHashes = ["QmMilestone1"];

        await freelancePlatform.connect(client).agreeMilestones(
            projectId,
            amounts,
            deadlines,
            metadataHashes
        );

        milestoneId = 1;
        await freelancePlatform.connect(freelancer).submitMilestoneWork(
            milestoneId,
            "QmDeliveryHash",
            "Work completed"
        );
    });

    it("Should approve milestone successfully", async function () {
        const tx = await freelancePlatform.connect(client).approveMilestone(milestoneId);

        await expect(tx).to.emit(freelancePlatform, "MilestoneApproved")
            .withArgs(milestoneId, projectId, client.address);

        const milestone = await freelancePlatform.getMilestone(milestoneId);
        expect(milestone.status).to.equal(2); // Approved
    });

    it("Should release payment successfully", async function () {
        await freelancePlatform.connect(client).approveMilestone(milestoneId);

        const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);
        const expectedFee = (MILESTONE_AMOUNT * BigInt(FREELANCER_FEE)) / 10000n;
        const expectedPayment = MILESTONE_AMOUNT - expectedFee;

        const tx = await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);

        await expect(tx).to.emit(freelancePlatform, "PaymentReleased")
            .withArgs(milestoneId, projectId, expectedPayment, freelancer.address);

        const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
        expect(freelancerBalanceAfter - freelancerBalanceBefore).to.equal(expectedPayment);

        const milestone = await freelancePlatform.getMilestone(milestoneId);
        expect(milestone.status).to.equal(3); // Paid
    });

    it("Should complete project after all milestones paid", async function () {
        await freelancePlatform.connect(client).approveMilestone(milestoneId);

        const tx = await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);

        await expect(tx).to.emit(freelancePlatform, "ProjectCompleted")
            .withArgs(projectId, freelancer.address);

        const project = await freelancePlatform.getProject(projectId);
        expect(project.status).to.equal(5); // Completed
    });

    it("Should auto-approve milestone after timeout", async function () {
        await ethers.provider.send("evm_increaseTime", [86400 * 11]); // 11 days
        await ethers.provider.send("evm_mine");

        const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);
        const expectedFee = (MILESTONE_AMOUNT * BigInt(FREELANCER_FEE)) / 10000n;
        const expectedPayment = MILESTONE_AMOUNT - expectedFee;

        const tx = await freelancePlatform.autoApproveMilestone(milestoneId);

        await expect(tx).to.emit(freelancePlatform, "MilestoneApproved")
            .withArgs(milestoneId, projectId, ethers.ZeroAddress);
        await expect(tx).to.emit(freelancePlatform, "PaymentReleased")
            .withArgs(milestoneId, projectId, expectedPayment, freelancer.address);

        const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
        expect(freelancerBalanceAfter - freelancerBalanceBefore).to.equal(expectedPayment);
    });

    it("Should revert approval if milestone not submitted", async function () {
        await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
        const newProjectId = 2;
        await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET });
        await freelancePlatform.connect(freelancer).applyForProject(newProjectId, "QmProposalHash");
        await freelancePlatform.connect(client).selectFreelancer(newProjectId, freelancer.address);
        await freelancePlatform.connect(freelancer).acceptProject(newProjectId);

        const amounts = [MILESTONE_AMOUNT];
        // Use blockchain timestamp for deadlines
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600]; 
        const metadataHashes = ["QmMilestone1"];

        await freelancePlatform.connect(client).agreeMilestones(
            newProjectId,
            amounts,
            deadlines,
            metadataHashes
        );

        const newMilestoneId = 2;

        await expect(
            freelancePlatform.connect(client).approveMilestone(newMilestoneId)
        ).to.be.revertedWith("Milestone not submitted or already processed");
    });

    it("Should revert payment if milestone not approved", async function () {
        await expect(
            freelancePlatform.connect(client).releaseMilestonePayment(milestoneId)
        ).to.be.revertedWith("Milestone not approved");
    });
});