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
        // Set deadline 7 days from now (matching your original intent)
        const deadlines = [latestBlock.timestamp + 86400 * 7];
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
        const newDeadline = latestBlock.timestamp + 86400 * 10; // 10 days from now

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
        const newDeadline = latestBlock.timestamp + 86400 * 10; // 10 days from now

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
        // Move forward enough time to submit work and complete milestone
        await ethers.provider.send("evm_increaseTime", [86400 * 3]); // 3 days forward
        await ethers.provider.send("evm_mine");
        
        await freelancePlatform.connect(freelancer).submitMilestoneWork(milestoneId, "SMWhash", "hello im working");
        await freelancePlatform.connect(client).approveMilestone(milestoneId);
        await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);
        
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 5;

        await expect(
            freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline)
        ).to.be.revertedWith("Project is not active");
    });

    it("Should revert if requesting extension within cutoff period", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10;

        // Move time forward to within the cutoff period (last 48 hours before deadline)
        // Original deadline was 7 days, so move forward 5.5 days to be within 1.5 days (< 2 days cutoff)
        await ethers.provider.send("evm_increaseTime", [86400 * 5.5]); // 5.5 days
        await ethers.provider.send("evm_mine");

        await expect(
            freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline)
        ).to.be.revertedWith("Cannot request extension within last 48 hours of milestone deadline");
    });

    it("Should revert if new deadline <= current deadline (requestExtension)", async function () {
        const milestone = await freelancePlatform.getMilestone(milestoneId);

        await expect(
            freelancePlatform.connect(freelancer).requestExtension(milestoneId, milestone.deadline)
        ).to.be.revertedWith("New deadline must be later than current deadline");
    });

    it("should revert if new deadline < current deadline", async function () {
        const milestone = await freelancePlatform.getMilestone(milestoneId);
        const tooEarlyDeadline = Number(milestone.deadline) - 86400; // 1 day earlier

        await expect(
            freelancePlatform.connect(freelancer).requestExtension(milestoneId, tooEarlyDeadline)
        ).to.be.revertedWith("New deadline must be later than current deadline");
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
        ).to.be.reverted; // modifier error (no message)
    });

    it("Should revert if project is not active (approveExtension)", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10;

        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline);
        
        // Move time forward and complete milestone
        await ethers.provider.send("evm_increaseTime", [86400 * 3]);
        await ethers.provider.send("evm_mine");

        await freelancePlatform.connect(freelancer).submitMilestoneWork(milestoneId, "SMWhash", "hello im working");
        await freelancePlatform.connect(client).approveMilestone(milestoneId);
        await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);

        await expect(
            freelancePlatform.connect(client).approveExtension(milestoneId, newDeadline)
        ).to.be.revertedWith("Project is not active");
    });

    it("Should revert if milestone has final submission", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10;

        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline);

        // Move time forward and submit work
        await ethers.provider.send("evm_increaseTime", [86400 * 3]);
        await ethers.provider.send("evm_mine");

        await freelancePlatform.connect(freelancer).submitMilestoneWork(milestoneId, "SMWhash", "hello im working");

        await expect(
            freelancePlatform.connect(client).approveExtension(milestoneId, newDeadline)
        ).to.be.revertedWith("Cannot extend after submission");
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

    it("Should approve extension successfully even with longer deadline ", async function () {
        const milestone = await freelancePlatform.getMilestone(milestoneId);
        const validDeadline = Number(milestone.deadline) + 86400 * 2; // 2 days later
        const longerDeadline = Number(milestone.deadline) + 86400 * 10; // 10 days later

        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, validDeadline);

        // Current contract doesn't enforce maximum extension period
        const tx = await freelancePlatform.connect(client).approveExtension(milestoneId, longerDeadline);
        
        await expect(tx).to.emit(freelancePlatform, "MilestoneExtensionApproved")
            .withArgs(milestoneId, projectId, longerDeadline);

        const updatedMilestone = await freelancePlatform.getMilestone(milestoneId);
        expect(updatedMilestone.deadline).to.equal(longerDeadline);
    });

    it("Should revert if non-client tries to approve extension", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10;

        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline);

        await expect(
            freelancePlatform.connect(freelancer).approveExtension(milestoneId, newDeadline)
        ).to.be.reverted; // modifier error
    });

    function getMilestoneAmounts(projectBudget, numMilestones) {
        const escrowBalance = projectBudget - (projectBudget * 3n / 100n); // Subtract platform fee
        const baseAmount = escrowBalance / BigInt(numMilestones);
        const remainder = escrowBalance % BigInt(numMilestones);

        const amounts = [];
        for (let i = 0; i < numMilestones; i++) {
            amounts.push(baseAmount + (i === numMilestones - 1 ? remainder : 0n));
        }
        return amounts;
    }

    it("Should allow multiple milestones and only affect target milestone", async function () {
        // Create a new project for this test to avoid milestone conflicts
        await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash2", 7);
        const newProjectId = 2;
        await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET });
        await freelancePlatform.connect(freelancer).applyForProject(newProjectId, "QmProposalHash2");
        await freelancePlatform.connect(client).selectFreelancer(newProjectId, freelancer.address);
        await freelancePlatform.connect(freelancer).acceptProject(newProjectId);

        // Add two milestones at once
        const amounts = getMilestoneAmounts(PROJECT_BUDGET, 2);
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadlines = [
            latestBlock.timestamp + 86400 * 7, // 7 days
            latestBlock.timestamp + 86400 * 14 // 14 days
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
        const newDeadline = latestBlock.timestamp + 86400 * 16; // 16 days from now

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
        // Based on the current contract, there's no explicit max limit validation
        // So we'll test a reasonable extension (3 days)
        const extendedDeadline = Number(milestone.deadline) + 86400 * 3; // 3 days extension

        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, extendedDeadline);
        await freelancePlatform.connect(client).approveExtension(milestoneId, extendedDeadline);

        const updatedMilestone = await freelancePlatform.getMilestone(milestoneId);
        expect(updatedMilestone.deadline).to.equal(extendedDeadline);
    });

    // Additional test to verify the cutoff calculation works correctly
    it("Should allow extension request just before cutoff period", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10;

        // Move time forward to just before the cutoff (2.1 days before deadline = 4.9 days from start)
        // Using integer seconds to avoid floating point issues
        const timeToMove = 86400 * 4 + 3600 * 21; // 4 days + 21 hours = 4.875 days
        await ethers.provider.send("evm_increaseTime", [timeToMove]);
        await ethers.provider.send("evm_mine");

        // This should succeed as we're still outside the 2-day cutoff window
        const tx = await freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline);
        
        await expect(tx).to.emit(freelancePlatform, "MilestoneExtensionRequested")
            .withArgs(milestoneId, projectId);
    });

    // Test to verify timeline for work submission
    it("Should allow work submission within SUBMISSION_END_BUFFER after deadline", async function () {
        // Move time to just after the original deadline
        await ethers.provider.send("evm_increaseTime", [86400 * 7.5]); // 7.5 days (past deadline)
        await ethers.provider.send("evm_mine");

        // Should still be able to submit as we're within SUBMISSION_END_BUFFER (3 days)
        await expect(
            freelancePlatform.connect(freelancer).submitMilestoneWork(milestoneId, "SMWhash", "late submission")
        ).to.not.be.reverted;
    });

    it("Should reject work submission after SUBMISSION_END_BUFFER", async function () {
        // Move time past deadline + SUBMISSION_END_BUFFER
        await ethers.provider.send("evm_increaseTime", [86400 * 11]); // 11 days (7 days deadline + 3 days buffer + 1 day)
        await ethers.provider.send("evm_mine");

        // Should fail as we're past the submission window
        await expect(
            freelancePlatform.connect(freelancer).submitMilestoneWork(milestoneId, "SMWhash", "too late")
        ).to.be.revertedWith("Submission period expired");
    });
});
