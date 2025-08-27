const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE } = require("./helpers/setup");

describe("Milestone Submission", function () {
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
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600]; // 7 days + 1h
        const metadataHashes = ["QmMilestone1"];

        await freelancePlatform.connect(client).agreeMilestones(
            projectId,
            amounts,
            deadlines,
            metadataHashes
        );

        milestoneId = 1;
    });

    it("Should submit milestone work successfully", async function () {
        const tx = await freelancePlatform.connect(freelancer).submitMilestoneWork(
            milestoneId,
            "QmDeliveryHash",
            "Work completed as agreed"
        );

        await expect(tx).to.emit(freelancePlatform, "MilestoneSubmitted")
            .withArgs(milestoneId, projectId, MILESTONE_AMOUNT);

        const milestone = await freelancePlatform.getMilestone(milestoneId);
        expect(milestone.status).to.equal(1); // Submitted

        const delivery = await freelancePlatform.getDelivery(milestoneId);
        expect(delivery.deliveryHash).to.equal("QmDeliveryHash");
        expect(delivery.notes).to.equal("Work completed as agreed");
    });

    it("Should revert if milestone already submitted", async function () {
        await freelancePlatform.connect(freelancer).submitMilestoneWork(
            milestoneId,
            "QmDeliveryHash",
            "Work completed"
        );

        await expect(
            freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmDeliveryHash2",
                "Updated work"
            )
        ).to.be.revertedWith("Invalid milestone status");
    });

    it("Should allow submission within grace period", async function () {
        const milestone = await freelancePlatform.getMilestone(milestoneId);
        
        // Move time to 2 days after deadline (within 3-day grace period)
        await ethers.provider.send("evm_setNextBlockTimestamp", [Number(milestone.deadline) + 86400 * 2]);
        await ethers.provider.send("evm_mine");

        const tx = await freelancePlatform.connect(freelancer).submitMilestoneWork(
            milestoneId,
            "QmLateDelivery",
            "Submitted within grace period"
        );

        await expect(tx).to.emit(freelancePlatform, "MilestoneSubmitted");

        const updatedMilestone = await freelancePlatform.getMilestone(milestoneId);
        expect(updatedMilestone.status).to.equal(1); // Submitted
        expect(updatedMilestone.submissionTime).to.be.greaterThan(0);
    });

    it("Should revert submission after grace period expires", async function () {
        const milestone = await freelancePlatform.getMilestone(milestoneId);
        
        // Move time to 4 days after deadline (beyond 3-day grace period)
        await ethers.provider.send("evm_setNextBlockTimestamp", [Number(milestone.deadline) + 86400 * 4]);
        await ethers.provider.send("evm_mine");

        await expect(
            freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmTooLate",
                "Too late submission"
            )
        ).to.be.revertedWith("Submission period expired");
    });

    it("Should revert if non-freelancer tries to submit work", async function () {
        await expect(
            freelancePlatform.connect(client).submitMilestoneWork(milestoneId, "QmHash", "Work")
        ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");

        await expect(
            freelancePlatform.connect(otherUser).submitMilestoneWork(milestoneId, "QmHash", "Work")
        ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
    });

    it("Should revert if milestoneId is invalid", async function () {
        await expect(
            freelancePlatform.connect(freelancer).submitMilestoneWork(9999, "QmHash", "Notes")
        ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
    });

    it("Should revert if milestone submitted after project completion", async function () {
        // Simulate paying & completing project
        await freelancePlatform.connect(freelancer).submitMilestoneWork(milestoneId, "QmHash", "Work");
        await freelancePlatform.connect(client).approveMilestone(milestoneId);
        await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);

        await expect(
            freelancePlatform.connect(freelancer).submitMilestoneWork(milestoneId, "QmNewHash", "Late work")
        ).to.be.revertedWith("Invalid milestone status");
    });

    it("Should handle empty delivery hash and notes", async function () {
        const tx = await freelancePlatform.connect(freelancer).submitMilestoneWork(
            milestoneId,
            "",
            ""
        );

        await expect(tx).to.emit(freelancePlatform, "MilestoneSubmitted");

        const delivery = await freelancePlatform.getDelivery(milestoneId);
        expect(delivery.deliveryHash).to.equal("");
        expect(delivery.notes).to.equal("");
    });

    it("Should track submission time correctly", async function () {
        const beforeSubmission = await ethers.provider.getBlock("latest");
        
        await freelancePlatform.connect(freelancer).submitMilestoneWork(
            milestoneId,
            "QmDeliveryHash",
            "Timed submission"
        );

        const milestone = await freelancePlatform.getMilestone(milestoneId);
        expect(milestone.submissionTime).to.be.greaterThan(beforeSubmission.timestamp);
    });

    it("Should allow submission at exact deadline", async function () {
        const milestone = await freelancePlatform.getMilestone(milestoneId);
        
        // Set time to exact deadline
        await ethers.provider.send("evm_setNextBlockTimestamp", [Number(milestone.deadline)]);
        await ethers.provider.send("evm_mine");

        const tx = await freelancePlatform.connect(freelancer).submitMilestoneWork(
            milestoneId,
            "QmDeadlineDelivery",
            "Submitted at deadline"
        );

        await expect(tx).to.emit(freelancePlatform, "MilestoneSubmitted");
    });

    it("Should allow submission at exact end of grace period", async function () {
        const milestone = await freelancePlatform.getMilestone(milestoneId);
        
        // Set time to exactly 3 days after deadline minus 1 second for mining time
        const newTimestamp = Number(milestone.deadline) + (86400 * 3) - 1;
        await ethers.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
        await ethers.provider.send("evm_mine");

        const tx = await freelancePlatform.connect(freelancer).submitMilestoneWork(
            milestoneId,
            "QmGracePeriodEnd",
            "Submitted at grace period end"
        );

        await expect(tx).to.emit(freelancePlatform, "MilestoneSubmitted");
    });
});