const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET } = require("./helpers/setup");

    describe("View Functions", function () {
        let freelancePlatform, userRegistry, client, freelancer, otherUser, freshUser;

        beforeEach(async function () {
            ({ freelancePlatform, userRegistry, client, freelancer, otherUser, freshUser } = await deployContracts());
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 2, "QmTestHash", 7);
            projectId = 1;
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
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
        });

        it("Should get project milestones", async function () {
            const milestones = await freelancePlatform.getProjectMilestones(projectId);

            expect(milestones.length).to.equal(2);
            expect(milestones[0]).to.equal(1);
            expect(milestones[1]).to.equal(2);
        });

        it("Should get client projects", async function () {
            // Create another project
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash2", 7);

            const clientProjects = await freelancePlatform.getClientProjects(client.address);

            expect(clientProjects.length).to.equal(2);
            expect(clientProjects[0]).to.equal(1);
            expect(clientProjects[1]).to.equal(2);
        });

        it("Should get freelancer projects", async function () {
            const freelancerProjects = await freelancePlatform.getFreelancerProjects(freelancer.address);

            expect(freelancerProjects.length).to.equal(1);
            expect(freelancerProjects[0]).to.equal(1);
        });

        it("Should get platform statistics", async function () {
            const stats = await freelancePlatform.getPlatformStats();

            expect(stats.totalProjects).to.equal(0); // No completed projects yet
            expect(stats.activeProjects).to.equal(1);
            expect(stats.totalVolume).to.equal(0); // No payments yet
        });

        it("Should get project status", async function () {
            const status = await freelancePlatform.getProjectStatus(projectId);
            expect(status).to.equal("Active");
        });

        it("Should get shortlisted freelancers", async function () {
            // Create new project for shortlisting
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash2", 7);
            const newProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(newProjectId, "QmProposalHash");

            await freelancePlatform.connect(client).shortlistFreelancers(
                newProjectId,
                [freelancer.address]
            );

            const shortlisted = await freelancePlatform.getShortlistedFreelancers(newProjectId);
            expect(shortlisted.length).to.equal(1);
            expect(shortlisted[0]).to.equal(freelancer.address);
        });
    });