const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET } = require("./helpers/setup");

    describe("Reputation System", function () {
        let projectId, milestoneId;

        beforeEach(async function () {
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
            projectId = 1;
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(projectId);
            
            const amounts = [MILESTONE_AMOUNT];
            const deadlines = [Math.floor(Date.now() / 1000) + 86400 * 7 +3600];
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

        it("Should update freelancer reputation after payment", async function () {
            const reputation = await freelancePlatform.getFreelancerReputation(freelancer.address);
            
            expect(reputation.totalEarned).to.equal(MILESTONE_AMOUNT);
            expect(reputation.projectsCompleted).to.equal(1);
        });

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
    });
    