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

    it("Should allow final submission", async function () {
        // Move time close to deadline
        await ethers.provider.send("evm_increaseTime", [86400 * 6]); // 6 days
        await ethers.provider.send("evm_mine");

        const tx = await freelancePlatform.connect(freelancer).finalSubmitMilestone(milestoneId);

        await expect(tx).to.emit(freelancePlatform, "MilestoneFinalSubmitted");

        const milestone = await freelancePlatform.getMilestone(milestoneId);
        expect(milestone.status).to.equal(1); // Submitted
        expect(milestone.finalSubmitTime).to.be.greaterThan(0);
    });

    it("Should revert if non-freelancer tries to submit work", async function () {
        await expect(
            freelancePlatform.connect(client).submitMilestoneWork(milestoneId, "QmHash", "Work")
        ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");

        await expect(
            freelancePlatform.connect(otherUser).finalSubmitMilestone(milestoneId)
        ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
    });

    it("Should revert final submit if too early", async function () {
        await expect(
            freelancePlatform.connect(freelancer).finalSubmitMilestone(milestoneId)
        ).to.be.revertedWith("Final submission too early");
    });

    it("Should revert final submit if already submitted normally", async function () {
        await freelancePlatform.connect(freelancer).submitMilestoneWork(
            milestoneId,
            "QmDeliveryHash",
            "Work done"
        );

        await expect(
            freelancePlatform.connect(freelancer).finalSubmitMilestone(milestoneId)
        ).to.be.revertedWith("Milestone already submitted");
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


});