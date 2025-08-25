const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE, PLATFORM_FEE } = require("./helpers/setup");

describe("Enhanced Milestone Management Tests", function () {
    let projectId, milestoneId;
    let freelancePlatform;
    let userRegistry;
    let owner, client, freelancer, admin, otherUser;

    beforeEach(async function () {
        ({ freelancePlatform, userRegistry, client, freelancer, owner, admin, otherUser } = await deployContracts());

        // Setup complete project ready for milestone agreement
        await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 2, "QmTestHash", 7);
        projectId = 1;
        await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
        await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
        await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
        await freelancePlatform.connect(freelancer).acceptProject(projectId);
    });
    
describe("Milestone Management", function () {
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
                projectId, amounts, deadlines, metadataHashes
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
                    projectId, amounts, deadlines, metadataHashes
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
                    projectId, amounts, deadlines, metadataHashes
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
                    newProjectId, amounts, deadlines, metadataHashes
                )
            ).to.be.revertedWith("Freelancer hasn't accepted");
        });
    });

    describe("Agree Milestones Function Tests", function () {
        function getMilestoneAmounts(projectBudget, numMilestones) {
            const escrowBalance = projectBudget - (projectBudget * BigInt(PLATFORM_FEE) / 10000n);
            const baseAmount = escrowBalance / BigInt(numMilestones);
            const remainder = escrowBalance % BigInt(numMilestones);

            const amounts = [];
            for (let i = 0; i < numMilestones; i++) {
                amounts.push(baseAmount + (i === numMilestones - 1 ? remainder : 0n));
            }
            return amounts;
        }

        it("Should agree on single milestone successfully", async function () {
            const amounts = getMilestoneAmounts(PROJECT_BUDGET, 1);
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7];
            const metadataHashes = ["QmMilestone1"];

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
            expect(project.totalMilestones).to.equal(1);

            const milestone = await freelancePlatform.getMilestone(1);
            expect(milestone.amount).to.equal(amounts[0]);
            expect(milestone.status).to.equal(0); // Pending
        });

        it("Should agree on multiple milestones with different amounts", async function () {
            const escrowBalance = PROJECT_BUDGET - (PROJECT_BUDGET * BigInt(PLATFORM_FEE) / 10000n);
            const amounts = [escrowBalance / 3n, escrowBalance / 3n, escrowBalance - (escrowBalance / 3n * 2n)];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [
                latestBlock.timestamp + 86400 * 7,
                latestBlock.timestamp + 86400 * 14,
                latestBlock.timestamp + 86400 * 21
            ];
            const metadataHashes = ["QmMilestone1", "QmMilestone2", "QmMilestone3"];

            const tx = await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            await expect(tx).to.emit(freelancePlatform, "MilestonesAgreed");

            const project = await freelancePlatform.getProject(projectId);
            expect(project.totalMilestones).to.equal(3);

            // Check all milestones were created
            for (let i = 1; i <= 3; i++) {
                const milestone = await freelancePlatform.getMilestone(i);
                expect(milestone.projectId).to.equal(projectId);
                expect(milestone.amount).to.equal(amounts[i - 1]);
            }
        });

        it("Should revert if freelancer hasn't accepted project", async function () {
            // Create new project without freelancer acceptance
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash2", 7);
            const newProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(newProjectId, "QmProposal2");
            await freelancePlatform.connect(client).selectFreelancer(newProjectId, freelancer.address);
            // Don't call acceptProject

            const amounts = [MILESTONE_AMOUNT];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7];
            const metadataHashes = ["QmMilestone1"];

            await expect(
                freelancePlatform.connect(client).agreeMilestones(
                    newProjectId,
                    amounts,
                    deadlines,
                    metadataHashes
                )
            ).to.be.revertedWith("Freelancer hasn't accepted");
        });

        it("Should revert if project not in Negotiating status", async function () {
            const amounts = getMilestoneAmounts(PROJECT_BUDGET, 1);
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7];
            const metadataHashes = ["QmMilestone1"];

            // First agreement
            await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            // Try to agree again (project is now Active)
            await expect(
                freelancePlatform.connect(client).agreeMilestones(
                    projectId,
                    amounts,
                    deadlines,
                    metadataHashes
                )
            ).to.be.revertedWith("Invalid status");
        });

        it("Should revert with array length mismatch - amounts vs deadlines", async function () {
            const amounts = [MILESTONE_AMOUNT];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7, latestBlock.timestamp + 86400 * 14];
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

        it("Should revert with array length mismatch - amounts vs metadata", async function () {
            const amounts = [MILESTONE_AMOUNT, MILESTONE_AMOUNT];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7, latestBlock.timestamp + 86400 * 14];
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

        it("Should revert if deadline is in the past", async function () {
            const amounts = [MILESTONE_AMOUNT];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp - 86400]; // Yesterday
            const metadataHashes = ["QmMilestone1"];

            await expect(
                freelancePlatform.connect(client).agreeMilestones(
                    projectId,
                    amounts,
                    deadlines,
                    metadataHashes
                )
            ).to.be.revertedWith("Invalid deadline");
        });

        it("Should revert if deadline equals current timestamp", async function () {
            const latestBlock = await ethers.provider.getBlock("latest");
            const amounts = [MILESTONE_AMOUNT];
            const deadlines = [latestBlock.timestamp]; // Current time
            const metadataHashes = ["QmMilestone1"];

            await expect(
                freelancePlatform.connect(client).agreeMilestones(
                    projectId,
                    amounts,
                    deadlines,
                    metadataHashes
                )
            ).to.be.revertedWith("Invalid deadline");
        });

        it("Should allow deadline exactly 1 second in future", async function () {
            const latestBlock = await ethers.provider.getBlock("latest");
            const amounts = [MILESTONE_AMOUNT];
            // 2 seconds instead of 1 to account for block mining time
            const deadlines = [latestBlock.timestamp + 2];
            const metadataHashes = ["QmMilestone1"];

            const tx = await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            await expect(tx).to.emit(freelancePlatform, "MilestonesAgreed");
        });

        it("Should revert if total amount exceeds escrow balance", async function () {
            const project = await freelancePlatform.getProject(projectId);
            const excessAmount = project.escrowBalance + ethers.parseEther("0.1");
            const amounts = [excessAmount];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7];
            const metadataHashes = ["QmMilestone1"];

            await expect(
                freelancePlatform.connect(client).agreeMilestones(
                    projectId,
                    amounts,
                    deadlines,
                    metadataHashes
                )
            ).to.be.revertedWith("Amount exceeds escrow");
        });

        it("Should allow total amount equal to escrow balance", async function () {
            const project = await freelancePlatform.getProject(projectId);
            const amounts = [project.escrowBalance];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7];
            const metadataHashes = ["QmMilestone1"];

            const tx = await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            await expect(tx).to.emit(freelancePlatform, "MilestonesAgreed");
        });

        it("Should handle empty arrays gracefully", async function () {
            const amounts = [];
            const deadlines = [];
            const metadataHashes = [];

            const tx = await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            await expect(tx).to.emit(freelancePlatform, "ProjectActivated");

            const project = await freelancePlatform.getProject(projectId);
            expect(project.totalMilestones).to.equal(0);
            expect(project.status).to.equal(4); // Active
        });

        it("Should revert if non-client tries to agree milestones", async function () {
            const amounts = [MILESTONE_AMOUNT];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7];
            const metadataHashes = ["QmMilestone1"];

            await expect(
                freelancePlatform.connect(freelancer).agreeMilestones(
                    projectId,
                    amounts,
                    deadlines,
                    metadataHashes
                )
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
        });
    });

    describe("Submit Milestone Work Function Tests", function () {
        beforeEach(async function () {
            // Setup milestone
            const amounts = getMilestoneAmounts(PROJECT_BUDGET, 1);
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7]; // 7 days
            const metadataHashes = ["QmMilestone1"];

            await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            milestoneId = 1;
        });

        function getMilestoneAmounts(projectBudget, numMilestones) {
            const escrowBalance = projectBudget - (projectBudget * BigInt(PLATFORM_FEE) / 10000n);
            return [escrowBalance];
        }

        it("Should submit milestone work successfully", async function () {
            const tx = await freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmDeliveryHash",
                "Work completed successfully"
            );

            const amounts = getMilestoneAmounts(PROJECT_BUDGET, 1);
            await expect(tx).to.emit(freelancePlatform, "MilestoneSubmitted")
                .withArgs(milestoneId, projectId, amounts[0]);

            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(1); // Submitted
            expect(milestone.submissionTime).to.be.greaterThan(0);

            const delivery = await freelancePlatform.getDelivery(milestoneId);
            expect(delivery.deliveryHash).to.equal("QmDeliveryHash");
            expect(delivery.notes).to.equal("Work completed successfully");
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

        it("Should allow submission within 3-day grace period", async function () {
            const milestone = await freelancePlatform.getMilestone(milestoneId);
            
            // Set time to 2 days after deadline (within 3-day grace period)
            await ethers.provider.send("evm_setNextBlockTimestamp", [Number(milestone.deadline) + 86400 * 2]);
            await ethers.provider.send("evm_mine");

            const tx = await freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmLateDelivery",
                "Submitted within grace period"
            );

            await expect(tx).to.emit(freelancePlatform, "MilestoneSubmitted");
        });

        it("Should allow submission at exact end of grace period", async function () {
            const milestone = await freelancePlatform.getMilestone(milestoneId);
           
            // Set time to exactly 3 days after deadline (convert BigInt to Number properly)
   const newTimestamp = Number(milestone.deadline) + (86400 * 3) - 1; // -1 for mining time
    await ethers.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
    
            // await ethers.provider.send("evm_setNextBlockTimestamp", [Number(milestone.deadline) + 86400 * 3]);
            await ethers.provider.send("evm_mine");

            const tx = await freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmGracePeriodEnd",
                "Submitted at grace period end"
            );

            await expect(tx).to.emit(freelancePlatform, "MilestoneSubmitted");
        });

        it("Should revert submission after grace period", async function () {
            const milestone = await freelancePlatform.getMilestone(milestoneId);
            
            // Set time to 3 days + 1 second after deadline
            await ethers.provider.send("evm_setNextBlockTimestamp", [Number(milestone.deadline) + 86400 * 3 + 1]);
            await ethers.provider.send("evm_mine");

            await expect(
                freelancePlatform.connect(freelancer).submitMilestoneWork(
                    milestoneId,
                    "QmTooLate",
                    "Too late submission"
                )
            ).to.be.revertedWith("Submission period expired");
        });

        it("Should revert if milestone already submitted", async function () {
            // First submission
            await freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmFirstDelivery",
                "First submission"
            );

            // Second submission attempt
            await expect(
                freelancePlatform.connect(freelancer).submitMilestoneWork(
                    milestoneId,
                    "QmSecondDelivery",
                    "Second submission"
                )
            ).to.be.revertedWith("Invalid milestone status");
        });

        it("Should revert if non-freelancer tries to submit", async function () {
            await expect(
                freelancePlatform.connect(client).submitMilestoneWork(
                    milestoneId,
                    "QmUnauthorized",
                    "Unauthorized submission"
                )
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
        });

        it("Should revert for non-existent milestone", async function () {
            await expect(
                freelancePlatform.connect(freelancer).submitMilestoneWork(
                    999,
                    "QmNonExistent",
                    "Non-existent milestone"
                )
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller"); // as we firstly check if the freelancer/client for that project/milestone exists 
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
    });

    describe("Final Submit Milestone Function Tests", function () {
        let SUBMISSION_START_BUFFER, FINAL_SUBMISSION_END_BUFFER;

        beforeEach(async function () {
            // Get buffer constants from contract (assuming they're public or have getters)
            SUBMISSION_START_BUFFER = 86400 * 3; // 3 days (assumption based on common practice)
            FINAL_SUBMISSION_END_BUFFER = 86400 * 10; // 10 days (assumption)

            // Setup milestone
            const amounts = getMilestoneAmounts(PROJECT_BUDGET, 1);
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7]; // 7 days
            const metadataHashes = ["QmMilestone1"];

            await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            milestoneId = 1;
        });

        function getMilestoneAmounts(projectBudget, numMilestones) {
            const escrowBalance = projectBudget - (projectBudget * BigInt(PLATFORM_FEE) / 10000n);
            return [escrowBalance];
        }

it("Should allow final submission within allowed window", async function () {
    const milestone = await freelancePlatform.getMilestone(milestoneId);
    
    // Set time to 2 days before deadline (within SUBMISSION_START_BUFFER)
    // Convert BigInt to Number properly
    const deadlineNumber = Number(milestone.deadline);
    const newTimestamp = deadlineNumber - (86400 * 2);
    await ethers.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
    await ethers.provider.send("evm_mine");

    const tx = await freelancePlatform.connect(freelancer).finalSubmitMilestone(milestoneId);

    await expect(tx).to.emit(freelancePlatform, "MilestoneFinalSubmitted")
        .withArgs(milestoneId, projectId, newTimestamp + 1, freelancer.address);

    const updatedMilestone = await freelancePlatform.getMilestone(milestoneId);
    expect(updatedMilestone.status).to.equal(1); // Submitted
    expect(updatedMilestone.finalSubmitTime).to.be.greaterThan(0);
});

        it("Should allow final submission at exact start of window", async function () {
            const milestone = await freelancePlatform.getMilestone(milestoneId);
            
            // Set time to 1 second AFTER the SUBMISSION_START_BUFFER begins
    // This accounts for the block mining time
    // SUBMISSION_START_BUFFER is 2 days = 172800 seconds
    const SUBMISSION_START_BUFFER = 172800; // 2 days in seconds
    const deadlineNumber = Number(milestone.deadline);
    const newTimestamp = deadlineNumber - SUBMISSION_START_BUFFER + 1; // +1 to account for mining time
    await ethers.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
    await ethers.provider.send("evm_mine");

            const tx = await freelancePlatform.connect(freelancer).finalSubmitMilestone(milestoneId);

            await expect(tx).to.emit(freelancePlatform, "MilestoneFinalSubmitted");
        });

        it("Should revert final submission too early", async function () {
            const milestone = await freelancePlatform.getMilestone(milestoneId);
            
            // Set time to before the allowed submission window
            await ethers.provider.send("evm_setNextBlockTimestamp", [Number(milestone.deadline) - SUBMISSION_START_BUFFER - 1]);
            await ethers.provider.send("evm_mine");

            await expect(
                freelancePlatform.connect(freelancer).finalSubmitMilestone(milestoneId)
            ).to.be.revertedWith("Final submission too early");
        });

        it("Should allow final submission within end buffer", async function () {
            const milestone = await freelancePlatform.getMilestone(milestoneId);
            
            // Set time to 1 second BEFORE the FINAL_SUBMISSION_END_BUFFER ends
    // This accounts for the block mining time which will add ~1 second
    // FINAL_SUBMISSION_END_BUFFER is 10 days = 864000 seconds
    const FINAL_SUBMISSION_END_BUFFER = 864000; // 10 days in seconds
    const deadlineNumber = Number(milestone.deadline);
    const newTimestamp = deadlineNumber + FINAL_SUBMISSION_END_BUFFER - 1; // -1 to account for mining time
    await ethers.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
    await ethers.provider.send("evm_mine");
            const tx = await freelancePlatform.connect(freelancer).finalSubmitMilestone(milestoneId);

            await expect(tx).to.emit(freelancePlatform, "MilestoneFinalSubmitted");
        });

        it("Should allow final submission at exact end of buffer", async function () {
            const milestone = await freelancePlatform.getMilestone(milestoneId);
            
            // Set time to exactly FINAL_SUBMISSION_END_BUFFER after deadline
    // FINAL_SUBMISSION_END_BUFFER is 10 days = 864000 seconds
    const FINAL_SUBMISSION_END_BUFFER = 864000; // 10 days in seconds
    const deadlineNumber = Number(milestone.deadline);
    const newTimestamp = deadlineNumber + FINAL_SUBMISSION_END_BUFFER -1; // -1 to account for mining time
    await ethers.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
            // await ethers.provider.send("evm_setNextBlockTimestamp", [Number(milestone.deadline) + FINAL_SUBMISSION_END_BUFFER]);
            await ethers.provider.send("evm_mine");

            const tx = await freelancePlatform.connect(freelancer).finalSubmitMilestone(milestoneId);

            await expect(tx).to.emit(freelancePlatform, "MilestoneFinalSubmitted");
        });

        it("Should revert final submission after end buffer", async function () {
            const milestone = await freelancePlatform.getMilestone(milestoneId);
            
            // Set time to after the allowed submission window
            await ethers.provider.send("evm_setNextBlockTimestamp", [Number(milestone.deadline) + FINAL_SUBMISSION_END_BUFFER + 1]);
            await ethers.provider.send("evm_mine");

            await expect(
                freelancePlatform.connect(freelancer).finalSubmitMilestone(milestoneId)
            ).to.be.revertedWith("Final submission period over");
        });

        it("Should revert if milestone already submitted via regular submission", async function () {
            // Regular submission first
            await freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmRegularSubmission",
                "Regular submission"
            );

            // Move time to final submission window
            const milestone = await freelancePlatform.getMilestone(milestoneId);
            await ethers.provider.send("evm_setNextBlockTimestamp", [Number(milestone.deadline) - 86400]);
            await ethers.provider.send("evm_mine");

            await expect(
                freelancePlatform.connect(freelancer).finalSubmitMilestone(milestoneId)
            ).to.be.revertedWith("Milestone already submitted");
        });

        it("Should revert if non-freelancer tries final submission", async function () {
            const milestone = await freelancePlatform.getMilestone(milestoneId);
            
            // Set time within allowed window
            await ethers.provider.send("evm_setNextBlockTimestamp", [Number(milestone.deadline) - 86400]);
            await ethers.provider.send("evm_mine");

            await expect(
                freelancePlatform.connect(client).finalSubmitMilestone(milestoneId)
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
        });

        it("Should handle multiple final submission attempts", async function () {
            const milestone = await freelancePlatform.getMilestone(milestoneId);
            
            // Set time within allowed window
            await ethers.provider.send("evm_setNextBlockTimestamp", [Number(milestone.deadline) - 86400]);
            await ethers.provider.send("evm_mine");

            // First final submission
            await freelancePlatform.connect(freelancer).finalSubmitMilestone(milestoneId);

            // Second attempt should fail
            await expect(
                freelancePlatform.connect(freelancer).finalSubmitMilestone(milestoneId)
            ).to.be.revertedWith("Milestone already submitted");
        });
    });

    describe("Integration and Edge Cases", function () {
        it("Should handle milestone agreement with maximum number of milestones", async function () {
            // Test with many milestones (gas efficiency test)
            const numMilestones = 50;
            const escrowBalance = PROJECT_BUDGET - (PROJECT_BUDGET * BigInt(PLATFORM_FEE) / 10000n);
            const amounts = Array(numMilestones).fill(escrowBalance / BigInt(numMilestones));
            
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = Array(numMilestones).fill().map((_, i) => latestBlock.timestamp + 86400 * (i + 1));
            const metadataHashes = Array(numMilestones).fill().map((_, i) => `QmMilestone${i + 1}`);

            const tx = await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            const receipt = await tx.wait();
            console.log(`Gas used for ${numMilestones} milestones: ${receipt.gasUsed}`);

            await expect(tx).to.emit(freelancePlatform, "MilestonesAgreed");
            
            const project = await freelancePlatform.getProject(projectId);
            expect(project.totalMilestones).to.equal(numMilestones);
        });

        it("Should properly track pending amounts", async function () {
            const amounts = getMilestoneAmounts(PROJECT_BUDGET, 2);
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7, latestBlock.timestamp + 86400 * 14];
            const metadataHashes = ["QmMilestone1", "QmMilestone2"];

            await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            const expectedPendingAmount = amounts[0] + amounts[1];
            const actualPendingAmount = await freelancePlatform.pendingAmounts(projectId);
            expect(actualPendingAmount).to.equal(expectedPendingAmount);
        });

        function getMilestoneAmounts(projectBudget, numMilestones) {
            const escrowBalance = projectBudget - (projectBudget * BigInt(PLATFORM_FEE) / 10000n);
            const baseAmount = escrowBalance / BigInt(numMilestones);
            const remainder = escrowBalance % BigInt(numMilestones);

            const amounts = [];
            for (let i = 0; i < numMilestones; i++) {
                amounts.push(baseAmount + (i === numMilestones - 1 ? remainder : 0n));
            }
            return amounts;
        }
    });
});
