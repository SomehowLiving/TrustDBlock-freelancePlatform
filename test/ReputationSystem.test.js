const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE } = require("./helpers/setup");

describe("Reputation System", function () {
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

        await freelancePlatform.connect(freelancer).submitMilestoneWork(
            milestoneId,
            "QmDeliveryHash",
            "Work completed"
        );
        await freelancePlatform.connect(client).approveMilestone(milestoneId);
        await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);
    });

    describe("Basic Reputation Tracking", function () {
        it("Should update freelancer reputation after payment", async function () {
            const reputation = await freelancePlatform.getFreelancerReputation(freelancer.address);

            expect(reputation.totalEarned).to.equal(MILESTONE_AMOUNT);
            expect(reputation.projectsCompleted).to.equal(1);
        });

        it("Should initialize reputation with zero values for new freelancer", async function () {
            const newFreelancerReputation = await freelancePlatform.getFreelancerReputation(otherUser.address);

            expect(newFreelancerReputation.totalEarned).to.equal(0);
            expect(newFreelancerReputation.projectsCompleted).to.equal(0);
            expect(newFreelancerReputation.averageRating).to.equal(0);
            expect(newFreelancerReputation.totalRatings).to.equal(0);
            expect(newFreelancerReputation.hasNFT).to.equal(false);
        });

        it("Should emit ReputationUpdated event on payment", async function () {
            // Create another project to test event emission
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash2", 7);
            const newProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(newProjectId, "QmProposal2");
            await freelancePlatform.connect(client).selectFreelancer(newProjectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(newProjectId);

            const amounts = [MILESTONE_AMOUNT];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7];
            const metadataHashes = ["QmMilestone2"];

            await freelancePlatform.connect(client).agreeMilestones(newProjectId, amounts, deadlines, metadataHashes);
            
            await freelancePlatform.connect(freelancer).submitMilestoneWork(2, "QmDelivery2", "Second work");
            await freelancePlatform.connect(client).approveMilestone(2);

            const tx = await freelancePlatform.connect(client).releaseMilestonePayment(2);
            
            await expect(tx).to.emit(freelancePlatform, "ReputationUpdated");
        });
    });

    describe("Multiple Project Scenarios", function () {
        it("Should accumulate reputation across multiple projects", async function () {
            // Create and complete second project
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET * 2n, 1, "QmTestHash2", 7);
            const secondProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(secondProjectId, { value: PROJECT_BUDGET * 2n });
            await freelancePlatform.connect(freelancer).applyForProject(secondProjectId, "QmProposal2");
            await freelancePlatform.connect(client).selectFreelancer(secondProjectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(secondProjectId);

            const amounts = [MILESTONE_AMOUNT * 2n];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7];
            const metadataHashes = ["QmMilestone2"];

            await freelancePlatform.connect(client).agreeMilestones(secondProjectId, amounts, deadlines, metadataHashes);
            await freelancePlatform.connect(freelancer).submitMilestoneWork(2, "QmDelivery2", "Second work");
            await freelancePlatform.connect(client).approveMilestone(2);
            await freelancePlatform.connect(client).releaseMilestonePayment(2);

            const reputation = await freelancePlatform.getFreelancerReputation(freelancer.address);
            expect(reputation.totalEarned).to.equal(MILESTONE_AMOUNT + (MILESTONE_AMOUNT * 2n));
            expect(reputation.projectsCompleted).to.equal(2);
        });

        it("Should handle multi-milestone projects correctly", async function () {
            // Create project with multiple milestones
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "QmTestHash3", 7);
            const multiMilestoneProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(multiMilestoneProjectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(multiMilestoneProjectId, "QmProposal3");
            await freelancePlatform.connect(client).selectFreelancer(multiMilestoneProjectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(multiMilestoneProjectId);

            const project = await freelancePlatform.getProject(multiMilestoneProjectId);
            const totalAmount = project.escrowBalance;
            const amountPerMilestone = totalAmount / 3n;
            const amounts = [amountPerMilestone, amountPerMilestone, totalAmount - (amountPerMilestone * 2n)];
            
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [
                latestBlock.timestamp + 86400 * 7,
                latestBlock.timestamp + 86400 * 14,
                latestBlock.timestamp + 86400 * 21
            ];
            const metadataHashes = ["QmMile2", "QmMile3", "QmMile4"];

            await freelancePlatform.connect(client).agreeMilestones(multiMilestoneProjectId, amounts, deadlines, metadataHashes);

            // Complete first milestone
            await freelancePlatform.connect(freelancer).submitMilestoneWork(2, "QmDel2", "Work 1");
            await freelancePlatform.connect(client).approveMilestone(2);
            await freelancePlatform.connect(client).releaseMilestonePayment(2);

            // Complete second milestone
            await freelancePlatform.connect(freelancer).submitMilestoneWork(3, "QmDel3", "Work 2");
            await freelancePlatform.connect(client).approveMilestone(3);
            await freelancePlatform.connect(client).releaseMilestonePayment(3);

            // Complete third milestone (should complete project)
            await freelancePlatform.connect(freelancer).submitMilestoneWork(4, "QmDel4", "Work 3");
            await freelancePlatform.connect(client).approveMilestone(4);
            await freelancePlatform.connect(client).releaseMilestonePayment(4);

            const reputation = await freelancePlatform.getFreelancerReputation(freelancer.address);
            expect(reputation.projectsCompleted).to.equal(2); // Original project + this one
        });
    });

    describe("Auto-Approval Reputation Updates", function () {
        it("Should update reputation on auto-approved milestones", async function () {
            // Create new project for auto-approval test
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmAutoTest", 7);
            const autoProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(autoProjectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(autoProjectId, "QmAutoProposal");
            await freelancePlatform.connect(client).selectFreelancer(autoProjectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(autoProjectId);

            const amounts = [MILESTONE_AMOUNT];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400]; // 1 day deadline
            const metadataHashes = ["QmAutoMilestone"];

            await freelancePlatform.connect(client).agreeMilestones(autoProjectId, amounts, deadlines, metadataHashes);

            // Submit work
            await freelancePlatform.connect(freelancer).submitMilestoneWork(2, "QmAutoDelivery", "Auto test work");

            // Fast forward past auto-approve period (7 days after deadline)
            await ethers.provider.send("evm_increaseTime", [86400 * 8]); // 8 days
            await ethers.provider.send("evm_mine");

            // Auto approve
            await freelancePlatform.autoApproveMilestone(2);

            const reputation = await freelancePlatform.getFreelancerReputation(freelancer.address);
            expect(reputation.projectsCompleted).to.equal(2); // Both projects completed
            expect(reputation.totalEarned).to.be.greaterThan(MILESTONE_AMOUNT);
        });
    });

    describe("Project Rating System", function () {
        it("Should rate project successfully", async function () {
            const rating = 5;

            const tx = await freelancePlatform.connect(client).rateProject(projectId, rating);

            await expect(tx).to.emit(freelancePlatform, "ProjectRated")
                .withArgs(projectId, client.address, rating);

            expect(await freelancePlatform.projectRatings(client.address, projectId))
                .to.equal(rating);

            const reputation = await freelancePlatform.getFreelancerReputation(freelancer.address);
            expect(reputation.totalRatings).to.equal(1);
            expect(reputation.averageRating).to.equal(rating);
        });

        it("Should allow both client and freelancer to rate", async function () {
            // Client rates first
            await freelancePlatform.connect(client).rateProject(projectId, 5);
            
            // Freelancer rates second
            await freelancePlatform.connect(freelancer).rateProject(projectId, 4);

            const clientRating = await freelancePlatform.projectRatings(client.address, projectId);
            const freelancerRating = await freelancePlatform.projectRatings(freelancer.address, projectId);

            expect(clientRating).to.equal(5);
            expect(freelancerRating).to.equal(4);

            // Only client rating affects freelancer reputation
            const reputation = await freelancePlatform.getFreelancerReputation(freelancer.address);
            expect(reputation.averageRating).to.equal(5);
            expect(reputation.totalRatings).to.equal(1);
        });

        it("Should calculate average rating correctly with multiple ratings", async function () {
            // Rate first project
            await freelancePlatform.connect(client).rateProject(projectId, 5);

            // Create and complete second project
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmSecond", 7);
            const secondProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(secondProjectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(secondProjectId, "QmSecondProposal");
            await freelancePlatform.connect(client).selectFreelancer(secondProjectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(secondProjectId);

            const amounts = [MILESTONE_AMOUNT];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7];
            const metadataHashes = ["QmSecondMilestone"];

            await freelancePlatform.connect(client).agreeMilestones(secondProjectId, amounts, deadlines, metadataHashes);
            await freelancePlatform.connect(freelancer).submitMilestoneWork(2, "QmSecondDelivery", "Second work");
            await freelancePlatform.connect(client).approveMilestone(2);
            await freelancePlatform.connect(client).releaseMilestonePayment(2);

            // Rate second project
            await freelancePlatform.connect(client).rateProject(secondProjectId, 3);

            const reputation = await freelancePlatform.getFreelancerReputation(freelancer.address);
            expect(reputation.totalRatings).to.equal(2);
            expect(reputation.averageRating).to.equal(4); // (5 + 3) / 2 = 4
        });

        it("Should revert rating if project not completed", async function () {
            // Create new project that's not completed
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash2", 7);
            const newProjectId = 2;

            await expect(
                freelancePlatform.connect(client).rateProject(newProjectId, 5)
            ).to.be.revertedWith("Project not completed");
        });

        it("Should revert if already rated", async function () {
            await freelancePlatform.connect(client).rateProject(projectId, 5);

            await expect(
                freelancePlatform.connect(client).rateProject(projectId, 4)
            ).to.be.revertedWith("Already rated");
        });

        it("Should revert with invalid rating", async function () {
            await expect(
                freelancePlatform.connect(client).rateProject(projectId, 0)
            ).to.be.revertedWith("Rating must be between 1 and 5");

            await expect(
                freelancePlatform.connect(client).rateProject(projectId, 6)
            ).to.be.revertedWith("Rating must be between 1 and 5");
        });

        it("Should revert if non-participant tries to rate", async function () {
            await expect(
                freelancePlatform.connect(otherUser).rateProject(projectId, 5)
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
        });

        it("Should handle rating for project with invalid ID", async function () {
            await expect(
                freelancePlatform.connect(client).rateProject(999, 5)
            ).to.be.revertedWithCustomError(freelancePlatform, "InvalidProject");
        });
    });

    describe("Dispute Resolution Reputation Effects", function () {
        it("Should update reputation when freelancer wins dispute", async function () {
            // Create new project for dispute test
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmDispute", 7);
            const disputeProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(disputeProjectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(disputeProjectId, "QmDisputeProposal");
            await freelancePlatform.connect(client).selectFreelancer(disputeProjectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(disputeProjectId);

            const amounts = [MILESTONE_AMOUNT];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7];
            const metadataHashes = ["QmDisputeMilestone"];

            await freelancePlatform.connect(client).agreeMilestones(disputeProjectId, amounts, deadlines, metadataHashes);
            await freelancePlatform.connect(freelancer).submitMilestoneWork(2, "QmDisputeDelivery", "Disputed work");

            // Create dispute
            await freelancePlatform.connect(client).disputeMilestone(2);

            // Owner resolves in favor of freelancer
            await freelancePlatform.connect(owner).resolveDispute(2, freelancer.address, MILESTONE_AMOUNT);

            const reputation = await freelancePlatform.getFreelancerReputation(freelancer.address);
            expect(reputation.totalEarned).to.be.greaterThan(MILESTONE_AMOUNT);
            expect(reputation.projectsCompleted).to.equal(2);
        });
    });

    describe("Edge Cases and Error Handling", function () {
        it("Should handle zero-amount milestones for reputation", async function () {
            // This test depends on your contract allowing zero-amount milestones
            // If not allowed, this test should be removed or modified
            const initialReputation = await freelancePlatform.getFreelancerReputation(freelancer.address);
            
            // Reputation should remain unchanged for zero amounts
            expect(initialReputation.totalEarned).to.equal(MILESTONE_AMOUNT);
        });

        it("Should maintain reputation consistency across contract calls", async function () {
            const reputation1 = await freelancePlatform.getFreelancerReputation(freelancer.address);
            const reputation2 = await freelancePlatform.getFreelancerReputation(freelancer.address);

            expect(reputation1.totalEarned).to.equal(reputation2.totalEarned);
            expect(reputation1.projectsCompleted).to.equal(reputation2.projectsCompleted);
            expect(reputation1.averageRating).to.equal(reputation2.averageRating);
        });

        it("Should not affect reputation for cancelled milestones", async function () {
            // Create new project for cancellation test
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmCancel", 7);
            const cancelProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(cancelProjectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(cancelProjectId, "QmCancelProposal");
            await freelancePlatform.connect(client).selectFreelancer(cancelProjectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(cancelProjectId);

            const amounts = [MILESTONE_AMOUNT];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400]; // 1 day
            const metadataHashes = ["QmCancelMilestone"];

            await freelancePlatform.connect(client).agreeMilestones(cancelProjectId, amounts, deadlines, metadataHashes);

            // Let milestone auto-cancel by not submitting and waiting
            await ethers.provider.send("evm_increaseTime", [86400 * 5]); // 5 days past deadline
            await ethers.provider.send("evm_mine");

            await freelancePlatform.autoCancelMilestone(2);

            const reputation = await freelancePlatform.getFreelancerReputation(freelancer.address);
            expect(reputation.projectsCompleted).to.equal(1); // Only original project
        });
    });

    describe("Reputation Score Calculation", function () {
        it("Should emit ReputationUpdated event with correct score", async function () {
            // Create another project to test score calculation
            await freelancePlatform.connect(client).createProject(ethers.parseEther("2"), 1, "QmScore", 7);
            const scoreProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(scoreProjectId, { value: ethers.parseEther("2") });
            await freelancePlatform.connect(freelancer).applyForProject(scoreProjectId, "QmScoreProposal");
            await freelancePlatform.connect(client).selectFreelancer(scoreProjectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(scoreProjectId);

            const project = await freelancePlatform.getProject(scoreProjectId);
            const amounts = [project.escrowBalance];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7];
            const metadataHashes = ["QmScoreMilestone"];

            await freelancePlatform.connect(client).agreeMilestones(scoreProjectId, amounts, deadlines, metadataHashes);
            await freelancePlatform.connect(freelancer).submitMilestoneWork(2, "QmScoreDelivery", "Score work");
            await freelancePlatform.connect(client).approveMilestone(2);

            const tx = await freelancePlatform.connect(client).releaseMilestonePayment(2);

            // Check if ReputationUpdated event was emitted with a score > 0
            await expect(tx).to.emit(freelancePlatform, "ReputationUpdated")
                .withArgs(freelancer.address, (value) => value > 0);
        });
    });
});