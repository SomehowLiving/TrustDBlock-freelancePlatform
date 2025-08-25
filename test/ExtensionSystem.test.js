const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE } = require("./helpers/setup");

describe("Extension System", function () {
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
        const latestBlock = await ethers.provider.getBlock('latest');
        // console.log("Current block timestamp:", latestBlock.timestamp);  
        // const deadlines = [Math.floor(Date.now() / 1000) + 86400 * 7 + 3600];
        const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600];
        // console.log("Deadline we're setting:", deadlines[0]);
        const metadataHashes = ["QmMilestone1"];

        await freelancePlatform.connect(client).agreeMilestones(
            projectId,
            amounts,
            deadlines,
            metadataHashes
        );

        milestoneId = 1;
    });

    it("Should request extension successfully", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10 + 3600; // 10 days + 1h

        const tx = await freelancePlatform.connect(freelancer).requestExtension(
            milestoneId,
            newDeadline
        );

        await expect(tx).to.emit(freelancePlatform, "MilestoneExtensionRequested")
            .withArgs(milestoneId, projectId);

        const milestone = await freelancePlatform.getMilestone(milestoneId);
        expect(milestone.extensionRequested).to.be.true;
    });

    it("Should approve extension successfully", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10; // 10 days

        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline);

        const tx = await freelancePlatform.connect(client).approveExtension(
            milestoneId,
            newDeadline
        );

        await expect(tx).to.emit(freelancePlatform, "MilestoneExtensionApproved")
            .withArgs(milestoneId, projectId, newDeadline);

        const milestone = await freelancePlatform.getMilestone(milestoneId);
        expect(milestone.deadline).to.equal(newDeadline);
        expect(milestone.extensionRequested).to.be.false;
    });

    it("Should revert if extension already requested", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10;

        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline);

        await expect(
            freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline)
        ).to.be.revertedWith("Extension already requested");
    });

    // --------------------------ADDITIONAL TESTS FOR COVERAGE--------------------------
    it("Should revert if project is not active (requestExtension)", async function () {
        await ethers.provider.send("evm_increaseTime", [86400 * 4+ 3600]); // 3 days + 1h
        await ethers.provider.send("evm_mine");
        await freelancePlatform.connect(freelancer).finalSubmitMilestone(milestoneId);
        await freelancePlatform.connect(client).approveMilestone(milestoneId);
        await freelancePlatform.connect(client).releaseMilestoneFunds(milestoneId);
        
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 5;

        await expect(
            freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline)
        ).to.be.revertedWith("Project is not active");
    });

    it("Should revert if requesting extension within cutoff period", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10;

        // Move time forward close to deadline - within last 48h of grace period
        // deadline + SUBMISSION_END_BUFFER - EXTENSION_REQUEST_CUTOFF_BUFFER = 7d + 10d - 2d = 15 days
        await ethers.provider.send("evm_increaseTime", [86400 * 16]); // Move beyond cutoff
        await ethers.provider.send("evm_mine");

        await expect(
            freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline)
        ).to.be.revertedWith("Cannot request extension within last 48 hours of grace period");
    });

    it("Should revert if new deadline <= current deadline (requestExtension)", async function () {
        const milestone = await freelancePlatform.getMilestone(milestoneId);

        await expect(
            freelancePlatform.connect(freelancer).requestExtension(milestoneId, milestone.deadline)
        ).to.be.revertedWith("New deadline must be later than current deadline");
    });

    it("should revert if new deadline > max allowed)", async function () {
        const milestone = await freelancePlatform.getMilestone(milestoneId);

        const tooLateDeadline = Number(milestone.deadline) + 86400 * 11;; // beyond SUBMISSION_END_BUFFER

        await expect(
            freelancePlatform.connect(freelancer).requestExtension(milestoneId, tooLateDeadline)
        ).to.be.revertedWith("Extension exceeds maximum allowed period");
    });
    
it("should revert if non-client tries to approve", async function () {
    const milestone = await freelancePlatform.getMilestone(milestoneId);
    const newDeadline = Number(milestone.deadline) + 86400 * 2; // 2 days later

    await freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline);

    await expect(
        freelancePlatform.connect(freelancer).approveExtension(milestoneId, newDeadline)
    ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
});

    it("Should revert if non-freelancer tries to request extension", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10;

        await expect(
            freelancePlatform.connect(client).requestExtension(milestoneId, newDeadline)
        ).to.be.reverted; // modifier error (no message )
    });

    it("Should revert if project is not active (approveExtension)", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10;

        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline);
        // Move time forward to allow final submission
        await ethers.provider.send("evm_increaseTime", [86400 * 3]);
        await ethers.provider.send("evm_mine");

        await freelancePlatform.connect(freelancer).finalSubmitMilestone(milestoneId);
        await freelancePlatform.connect(client).approveMilestone(milestoneId);
        await freelancePlatform.connect(client).releaseMilestoneFunds(milestoneId);


        await expect(
            freelancePlatform.connect(client).approveExtension(milestoneId, newDeadline)
        ).to.be.revertedWith("Project is not active");
    });

    it("Should revert if milestone has final submission", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10;

        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline);

        // Move time forward to allow final submission
        await ethers.provider.send("evm_increaseTime", [86400 * 3]);
        await ethers.provider.send("evm_mine");

        await freelancePlatform.connect(freelancer).finalSubmitMilestone(milestoneId);

        await expect(
            freelancePlatform.connect(client).approveExtension(milestoneId, newDeadline)
        ).to.be.revertedWith("Cannot extend after final submission");
    });

    it("Should revert if new deadline <= current deadline (approveExtension)", async function () {
         const milestone = await freelancePlatform.getMilestone(milestoneId);
        const newDeadline = Number(milestone.deadline) + 86400 * 5; // 5 days later

        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline);

        // Try to approve with same current deadline (should fail)
        await expect(
            freelancePlatform.connect(client).approveExtension(milestoneId, milestone.deadline)
        ).to.be.revertedWith("New deadline must be later than current deadline");
    });

    it("Should revert if extension exceeds maximum allowed period (approveExtension)", async function () {
        const milestone = await freelancePlatform.getMilestone(milestoneId);
        const validDeadline = Number(milestone.deadline) + 86400 * 5; // 5 days extension
        const tooLateDeadline = Number(milestone.deadline) + 86400 * 11; // 11 days (beyond 10 day limit)

        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, validDeadline);

        await expect(
            freelancePlatform.connect(client).approveExtension(milestoneId, tooLateDeadline)
        ).to.be.revertedWith("Extension exceeds maximum allowed period");
    });

    it("Should revert if non-client tries to approve extension", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10;

        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline);

        await expect(
            freelancePlatform.connect(freelancer).approveExtension(milestoneId, newDeadline)
        ).to.be.reverted; // modifier error
    });

    it("Should allow multiple milestones and only affect target milestone", async function () {
        // Create a new project for this test to avoid milestone conflicts
        await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash2", 7);
        const newProjectId = 2;
        await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET });
        await freelancePlatform.connect(freelancer).applyForProject(newProjectId, "QmProposalHash2");
        await freelancePlatform.connect(client).selectFreelancer(newProjectId, freelancer.address);
        await freelancePlatform.connect(freelancer).acceptProject(newProjectId);

        // Add two milestones at once
        const amounts = [MILESTONE_AMOUNT, MILESTONE_AMOUNT];
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadlines = [
            latestBlock.timestamp + 86400 * 7 + 3600,
            latestBlock.timestamp + 86400 * 14 + 3600
        ];
        const metadataHashes = ["QmMilestone1", "QmMilestone2"];

        await freelancePlatform.connect(client).agreeMilestones(
            newProjectId,
            amounts,
            deadlines,
            metadataHashes
        );

        const milestone1Id = 2; // Assuming sequential IDs
        const milestone2Id = 3;
        const newDeadline = latestBlock.timestamp + 86400 * 10;

        await freelancePlatform.connect(freelancer).requestExtension(milestone2Id, newDeadline);

        const milestone1 = await freelancePlatform.getMilestone(milestone1Id);
        const milestone2 = await freelancePlatform.getMilestone(milestone2Id);

        expect(milestone1.extensionRequested).to.be.false;
        expect(milestone2.extensionRequested).to.be.true;
    });

    it("Should allow re-request after approval", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10;

        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline);
        await freelancePlatform.connect(client).approveExtension(milestoneId, newDeadline);

        const milestone = await freelancePlatform.getMilestone(milestoneId);
        expect(milestone.extensionRequested).to.be.false;

        // Request again with a later deadline
        const newDeadline2 = newDeadline + 86400 * 2;
        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline2);

        const updatedMilestone = await freelancePlatform.getMilestone(milestoneId);
        expect(updatedMilestone.extensionRequested).to.be.true;
    });

    it("Should allow extension exactly at maxAllowedDeadline", async function () {
        const milestone = await freelancePlatform.getMilestone(milestoneId);
        const maxDeadline = Number(milestone.deadline) + 86400 * 10; // exactly SUBMISSION_END_BUFFER

        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, maxDeadline);
        await freelancePlatform.connect(client).approveExtension(milestoneId, maxDeadline);

        const updatedMilestone = await freelancePlatform.getMilestone(milestoneId);
        expect(updatedMilestone.deadline).to.equal(maxDeadline);
    });

});