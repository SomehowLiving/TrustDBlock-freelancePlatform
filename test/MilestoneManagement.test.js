const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE } = require("./helpers/setup");

describe("Milestone Management", function () {
    let projectId, milestoneId;
    let freelancePlatform;
    let userRegistry;
    let owner, client, freelancer, admin, otherUser;

    beforeEach(async function () {
        ({ freelancePlatform, userRegistry, client, freelancer, owner, otherUser, freshUser } = await deployContracts());

            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 2, "QmTestHash", 7);
            projectId = 1;
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(projectId);
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
        it("Should agree on milestones successfully", async function () {
            const amounts = getMilestoneAmounts(PROJECT_BUDGET, 2);
            const latestBlock = await ethers.provider.getBlock("latest");
        
            const deadlines = [
                latestBlock.timestamp + 86400* 7 + 3600, // 1 week
                latestBlock.timestamp + 86400* 14 + 3600  // 2 weeks
            ];
            const metadataHashes = ["QmMilestone1", "QmMilestone2"];

            const tx = await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            await expect(tx).to.emit(freelancePlatform, "MilestonesAgreed");
            await expect(tx).to.emit(freelancePlatform, "ProjectActivated")
                .withArgs(projectId);

            const project = await freelancePlatform.getProject(projectId);
            expect(project.status).to.equal(4); // Active

            const milestone1 = await freelancePlatform.getMilestone(1);
            expect(milestone1.projectId).to.equal(projectId);
            expect(milestone1.amount).to.equal(amounts[0]); // actual calculated amount
        });
        it("Should revert with array length mismatch", async function () {
            const amounts = [MILESTONE_AMOUNT];
            const latestBlock = await ethers.provider.getBlock("latest");
    
            const deadlines = [latestBlock.timestamp + 86400* 7 + 3600, latestBlock.timestamp + 86400* 14 + 3600];
            const metadataHashes = ["QmMilestone1"];

            await expect(
                freelancePlatform.connect(client).agreeMilestones(
                    projectId,
                    amounts,
                    deadlines,
                    metadataHashes
                )
            ).to.be.revertedWith("Array mismatch");
        });

        it("Should revert if total amount exceeds escrow", async function () {
            const amounts = [PROJECT_BUDGET, PROJECT_BUDGET]; // Exceeds available
            const latestBlock = await ethers.provider.getBlock("latest");
        
            const deadlines = [latestBlock.timestamp + 86400* 7 + 3600, latestBlock.timestamp + 86400* 14 + 3600];
            const metadataHashes = ["QmMilestone1", "QmMilestone2"];

            await expect(
                freelancePlatform.connect(client).agreeMilestones(
                    projectId,
                    amounts,
                    deadlines,
                    metadataHashes
                )
            ).to.be.revertedWith("Amount exceeds escrow");
        });

        it("Should revert if freelancer hasn't accepted", async function () {
            // Create new project without acceptance
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 2, "QmTestHash2", 7);
            const newProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(client).selectFreelancer(newProjectId, freelancer.address);

            const amounts = [MILESTONE_AMOUNT, MILESTONE_AMOUNT];
            const latestBlock = await ethers.provider.getBlock("latest");
        
            const deadlines = [latestBlock.timestamp + 86400* 7 + 3600, latestBlock.timestamp + 86400* 14 + 3600];
            const metadataHashes = ["QmMilestone1", "QmMilestone2"];

            await expect(
                freelancePlatform.connect(client).agreeMilestones(
                    newProjectId,
                    amounts,
                    deadlines,
                    metadataHashes
                )
            ).to.be.revertedWith("Freelancer hasn't accepted");
        });
    });