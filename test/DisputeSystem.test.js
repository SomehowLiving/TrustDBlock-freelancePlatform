const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE } = require("./helpers/setup");

describe("Dispute System", function () {
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

            // Use blockchain time for deadline
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
        });

        it("Should raise dispute successfully", async function () {
            const tx = await freelancePlatform.connect(client).disputeMilestone(milestoneId);

            await expect(tx).to.emit(freelancePlatform, "DisputeRaised")
                .withArgs(projectId, client.address);

            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(4); // Disputed
            expect(milestone.disputeRaised).to.be.true;

            const project = await freelancePlatform.getProject(projectId);
            expect(project.isDisputed).to.be.true;
        });

        it("Should resolve dispute in favor of freelancer", async function () {
            await freelancePlatform.connect(client).disputeMilestone(milestoneId);

            const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);
            const disputedAmount = MILESTONE_AMOUNT;
            const expectedFee = (disputedAmount * BigInt(FREELANCER_FEE)) / 10000n;
            const expectedPayment = disputedAmount - expectedFee;

            const tx = await freelancePlatform.connect(owner).resolveDispute(
                milestoneId,
                freelancer.address,
                disputedAmount
            );

            await expect(tx).to.emit(freelancePlatform, "DisputeResolved")
                .withArgs(projectId, freelancer.address, disputedAmount);

            const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
            expect(freelancerBalanceAfter - freelancerBalanceBefore).to.equal(expectedPayment);

            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(3); // Paid
        });

        it("Should resolve dispute in favor of client", async function () {
            await freelancePlatform.connect(client).disputeMilestone(milestoneId);

            const clientBalanceBefore = await ethers.provider.getBalance(client.address);
            const disputedAmount = MILESTONE_AMOUNT;

            const tx = await freelancePlatform.connect(owner).resolveDispute(
                milestoneId,
                client.address,
                disputedAmount
            );

            await expect(tx).to.emit(freelancePlatform, "DisputeResolved")
                .withArgs(projectId, client.address, disputedAmount);

            const clientBalanceAfter = await ethers.provider.getBalance(client.address);
            expect(clientBalanceAfter - clientBalanceBefore).to.equal(disputedAmount);

            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(6); // Refunded
        });

        it("Should revert if milestone not submitted", async function () {
            // Create a new project for this test
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash2", 7);
            const newProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(newProjectId, "QmProposalHash2");
            await freelancePlatform.connect(client).selectFreelancer(newProjectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(newProjectId);

            const amounts = [MILESTONE_AMOUNT];

            // Blockchain-based deadline
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600];
            const metadataHashes = ["QmMilestone2"];

            await freelancePlatform.connect(client).agreeMilestones(
                newProjectId,
                amounts,
                deadlines,
                metadataHashes
            );

            const newMilestoneId = 2; // This would be the second milestone created

            await expect(
                freelancePlatform.connect(client).disputeMilestone(newMilestoneId)
            ).to.be.revertedWith("Milestone not in submitted state");
        });

        it("Should revert if dispute window expired", async function () {
            // Move time forward past dispute window
            await ethers.provider.send("evm_increaseTime", [86400 * 15]); // 15 days
            await ethers.provider.send("evm_mine");

            await expect(
                freelancePlatform.connect(client).disputeMilestone(milestoneId)
            ).to.be.revertedWith("Dispute window expired");
        });
    });