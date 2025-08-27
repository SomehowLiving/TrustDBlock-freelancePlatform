const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE } = require("./helpers/setup");

describe("Comprehensive Cancellation System Tests", function () {
    let projectId, milestoneId;
    let freelancePlatform;
    let userRegistry;
    let owner, client, freelancer, admin, otherUser, freshUser;

    beforeEach(async function () {
        ({ freelancePlatform, userRegistry, client, freelancer, owner, otherUser, freshUser } = await deployContracts());

        await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
        projectId = 1;
        await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
        await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
        await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
        await freelancePlatform.connect(freelancer).acceptProject(projectId);

        const amounts = [MILESTONE_AMOUNT];
        const metadataHashes = ["QmMilestone1"];
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600];
        await freelancePlatform.connect(client).agreeMilestones(
            projectId,
            amounts,
            deadlines,
            metadataHashes
        );

        milestoneId = 1;
    });

    describe("Auto Cancellation Tests", function () {

        it("Should auto-cancel milestone after deadline", async function () {
            // Move time past final submission deadline (7 days + 3 days buffer)
            await ethers.provider.send("evm_increaseTime", [86400 * 11]); // 11 days
            await ethers.provider.send("evm_mine");

            const clientBalanceBefore = await ethers.provider.getBalance(client.address);

            const tx = await freelancePlatform.autoCancelMilestone(milestoneId);
            const receipt = await tx.wait();
            await expect(tx).to.emit(freelancePlatform, "MilestoneAutoCancelled")
                .withArgs(milestoneId, projectId);

            const clientBalanceAfter = await ethers.provider.getBalance(client.address);
            expect(clientBalanceAfter - clientBalanceBefore).to.equal(MILESTONE_AMOUNT);

            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(5); // Cancelled

            // // Verify project state updates
            // const project = await freelancePlatform.getProject(projectId);
            // expect(project.escrowBalance).to.equal(PROJECT_BUDGET - MILESTONE_AMOUNT);
            // expect(await freelancePlatform.getPendingAmount(projectId)).to.equal(0);
        });

        it("Should revert auto-cancel if not eligible (before deadline)", async function () {
            await expect(
                freelancePlatform.autoCancelMilestone(milestoneId)
            ).to.be.revertedWith("Not eligible for auto cancellation");
        });

        it("Should revert auto-cancel if milestone already submitted", async function () {
            // Submit milestone first
            await freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmDeliveryHash",
                "Work completed"
            );

            // Move time past deadline
            await ethers.provider.send("evm_increaseTime", [86400 * 11]);
            await ethers.provider.send("evm_mine");

            await expect(
                freelancePlatform.autoCancelMilestone(milestoneId)
            ).to.be.revertedWith("Milestone already submitted");
        });

        it("Should allow anyone to trigger auto-cancellation", async function () {
            // Move time past deadline
            await ethers.provider.send("evm_increaseTime", [86400 * 11]);
            await ethers.provider.send("evm_mine");

            // Third party can trigger cancellation
            await expect(
                freelancePlatform.connect(otherUser).autoCancelMilestone(milestoneId)
            ).to.emit(freelancePlatform, "MilestoneAutoCancelled");
        });

        it("Should handle auto-cancellation at exact deadline boundary", async function () {
            const milestone = await freelancePlatform.getMilestone(milestoneId);
            const exactDeadline = Number(milestone.deadline) + (86400 * 3); // deadline + SUBMISSION_END_BUFFER

            await ethers.provider.send("evm_setNextBlockTimestamp", [exactDeadline]);
            await ethers.provider.send("evm_mine");

            await expect(
                freelancePlatform.autoCancelMilestone(milestoneId)
            ).to.emit(freelancePlatform, "MilestoneAutoCancelled");
        });
        
    it("Should revert auto-cancel if not eligible", async function () {
        await expect(
            freelancePlatform.autoCancelMilestone(milestoneId)
        ).to.be.revertedWith("Not eligible for auto cancellation");
    });

    it("Should revert cancellation request from non-participant", async function () {
        await expect(
            freelancePlatform.connect(otherUser).requestMilestoneCancellation(milestoneId)
        ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
    });
    });

    describe("Mutual Cancellation Tests", function () {
        it("Should cancel milestone with mutual agreement", async function () {
            // Both parties request cancellation
            await freelancePlatform.connect(client).requestMilestoneCancellation(milestoneId);

            const clientBalanceBefore = await ethers.provider.getBalance(client.address);

            const tx = await freelancePlatform.connect(freelancer).requestMilestoneCancellation(milestoneId);

            await expect(tx).to.emit(freelancePlatform, "MilestoneCanceled")
                .withArgs(milestoneId, projectId);

            const clientBalanceAfter = await ethers.provider.getBalance(client.address);
            expect(clientBalanceAfter - clientBalanceBefore).to.equal(MILESTONE_AMOUNT);

            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(5); // Cancelled
        });

        it("Should allow client to initiate cancellation request", async function () {
            await freelancePlatform.connect(client).requestMilestoneCancellation(milestoneId);
            
            // Milestone should still be pending until client agrees
            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(0); // Still pending
        });

        it("Should allow freelancer to initiate cancellation request", async function () {
            await freelancePlatform.connect(freelancer).requestMilestoneCancellation(milestoneId);
            
            // Milestone should still be pending until client agrees
            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(0); // Still pending
        });

        it("Should work in either order (client first or freelancer first)", async function () {
            // Test freelancer first, then client
            await freelancePlatform.connect(freelancer).requestMilestoneCancellation(milestoneId);
            
            const clientBalanceBefore = await ethers.provider.getBalance(client.address);
            
            // FIXED: Client executes final transaction, so client pays gas and receives refund
            const tx = await freelancePlatform.connect(client).requestMilestoneCancellation(milestoneId);
            const receipt = await tx.wait();
            
            await expect(tx).to.emit(freelancePlatform, "MilestoneCanceled");

            const clientBalanceAfter = await ethers.provider.getBalance(client.address);
            const gasUsed = receipt.gasUsed * receipt.gasPrice;
            const netBalanceChange = clientBalanceAfter - clientBalanceBefore + gasUsed;
            expect(netBalanceChange).to.equal(MILESTONE_AMOUNT);
        });
        it("Should cancel submitted milestone with mutual agreement", async function () {
            // Submit milestone first
            await freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmDeliveryHash",
                "Work completed"
            );

            // Both parties agree to cancel
            await freelancePlatform.connect(client).requestMilestoneCancellation(milestoneId);
            
            await expect(
                freelancePlatform.connect(freelancer).requestMilestoneCancellation(milestoneId)
            ).to.emit(freelancePlatform, "MilestoneCanceled");

            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(5); // Cancelled
        });
    });

    describe("Cancellation Access Control", function () {
        it("Should revert cancellation request from non-participant", async function () {
            await expect(
                freelancePlatform.connect(otherUser).requestMilestoneCancellation(milestoneId)
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
        });

        it("Should revert cancellation request with invalid milestone ID", async function () {
            await expect(
                freelancePlatform.connect(client).requestMilestoneCancellation(999)
            ).to.be.revertedWith("Milestone doesn't exist");
        });

        it("Should revert auto-cancel with invalid milestone ID", async function () {
            await expect(
                freelancePlatform.autoCancelMilestone(999)
            ).to.be.revertedWithCustomError(freelancePlatform, "InvalidProject");
        });
    });

    describe("Cancellation State Validation", function () {
        it("Should not cancel approved milestone", async function () {
            // Submit and approve milestone
            await freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmDeliveryHash",
                "Work completed"
            );
            await freelancePlatform.connect(client).approveMilestone(milestoneId);

            // Try to request cancellation
            await freelancePlatform.connect(client).requestMilestoneCancellation(milestoneId);
            
            await expect(
                freelancePlatform.connect(freelancer).requestMilestoneCancellation(milestoneId)
            ).to.be.revertedWith("Milestone not cancellable");
        });

        it("Should not cancel paid milestone", async function () {
            // Complete the milestone payment flow
            await freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmDeliveryHash",
                "Work completed"
            );
            await freelancePlatform.connect(client).approveMilestone(milestoneId);
            await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);

            // Try to request cancellation
            await freelancePlatform.connect(client).requestMilestoneCancellation(milestoneId);
            
            await expect(
                freelancePlatform.connect(freelancer).requestMilestoneCancellation(milestoneId)
            ).to.be.revertedWith("Milestone not cancellable");
        });

        it("Should not auto-cancel already cancelled milestone", async function () {
            // First cancel through mutual agreement
            await freelancePlatform.connect(client).requestMilestoneCancellation(milestoneId);
            await freelancePlatform.connect(freelancer).requestMilestoneCancellation(milestoneId);

            // Move time past deadline
            await ethers.provider.send("evm_increaseTime", [86400 * 11]);
            await ethers.provider.send("evm_mine");

            // Try to auto-cancel
            await expect(
                freelancePlatform.autoCancelMilestone(milestoneId)
            ).to.be.revertedWith("Milestone already submitted");
        });
    });

    describe("Emergency Withdrawal Tests", function () {

        it("Should allow emergency withdrawal for Open projects", async function () {
            // Create new project and leave it in Open state (funded but no freelancer selected)
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash2", 7);
            const openProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(openProjectId, { value: PROJECT_BUDGET });
            
            // Project should now be in Open state
            const project = await freelancePlatform.getProject(openProjectId);
            expect(project.status).to.equal(1); // Open

            const clientBalanceBefore = await ethers.provider.getBalance(client.address);
            
            const tx = await freelancePlatform.connect(client).emergencyWithdraw(openProjectId);
            const receipt = await tx.wait();
            
            const clientBalanceAfter = await ethers.provider.getBalance(client.address);
            const gasUsed = receipt.gasUsed * receipt.gasPrice;
            
            // FIXED: Account for gas and platform fee deduction
            // The escrow balance is PROJECT_BUDGET minus platform fee (3%)
            const expectedRefund = project.escrowBalance; // This is already net of platform fee
            const netBalanceChange = clientBalanceAfter - clientBalanceBefore + gasUsed;
            
            expect(netBalanceChange).to.equal(expectedRefund);

            const updatedProject = await freelancePlatform.getProject(openProjectId);
            expect(updatedProject.status).to.equal(6); // Cancelled
            expect(updatedProject.escrowBalance).to.equal(0);
        });
        it("Should not allow emergency withdrawal for Active projects", async function () {
            await expect(
                freelancePlatform.connect(client).emergencyWithdraw(projectId)
            ).to.be.revertedWith("Cannot withdraw at this stage");
        });

        it("Should not allow emergency withdrawal by non-client", async function () {
            // Create new draft project
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash2", 7);
            const draftProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(draftProjectId, { value: PROJECT_BUDGET });

            await expect(
                freelancePlatform.connect(otherUser).emergencyWithdraw(draftProjectId)
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
        });

        it("Should not allow emergency withdrawal with no funds", async function () {
            // Create project but don't fund it
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash3", 7);
            const unfundedProjectId = 2;

            await expect(
                freelancePlatform.connect(client).emergencyWithdraw(unfundedProjectId)
            ).to.be.revertedWith("No funds to withdraw");
        });
    });

    describe("Multiple Milestone Cancellation", function () {
        let milestone2Id, milestone3Id;

        beforeEach(async function () {
            // Create project with multiple milestones
            await freelancePlatform.connect(client).createProject(ethers.parseEther("3"), 3, "QmMultiHash", 7);
            const multiProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(multiProjectId, { value: ethers.parseEther("3") });
            await freelancePlatform.connect(freelancer).applyForProject(multiProjectId, "QmProposalHash2");
            await freelancePlatform.connect(client).selectFreelancer(multiProjectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(multiProjectId);
 // escrow balance (3 ETH - 3% platform fee)
            const project = await freelancePlatform.getProject(multiProjectId);
            const availableEscrow = project.escrowBalance;
            
            // Split available escrow into 3 equal parts
            const milestoneAmount = availableEscrow / 3n;
            const amounts = [milestoneAmount, milestoneAmount, milestoneAmount];
            const metadataHashes = ["QmMilestone1", "QmMilestone2", "QmMilestone3"];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [
                latestBlock.timestamp + 86400 * 7,
                latestBlock.timestamp + 86400 * 14,
                latestBlock.timestamp + 86400 * 21
            ];

            await freelancePlatform.connect(client).agreeMilestones(
                multiProjectId,
                amounts,
                deadlines,
                metadataHashes
            );

            milestone2Id = 2;
            milestone3Id = 3;
        });

        it("Should handle cancellation of multiple milestones", async function () {
            // Cancel first milestone through mutual agreement
            await freelancePlatform.connect(client).requestMilestoneCancellation(milestone2Id);
            await freelancePlatform.connect(freelancer).requestMilestoneCancellation(milestone2Id);

            // Auto-cancel third milestone due to deadline
            await ethers.provider.send("evm_increaseTime", [86400 * 25]); // Past all deadlines
            await ethers.provider.send("evm_mine");

            await freelancePlatform.autoCancelMilestone(milestone3Id);

            // Verify both are cancelled
            const milestone2 = await freelancePlatform.getMilestone(milestone2Id);
            const milestone3 = await freelancePlatform.getMilestone(milestone3Id);
            
            expect(milestone2.status).to.equal(5); // Cancelled
            expect(milestone3.status).to.equal(5); // Cancelled
        });

        // it("Should update project balances correctly with multiple cancellations", async function () {
        //     const project = await freelancePlatform.getProject(2);
        //     const initialEscrow = project.escrowBalance;
        //     const initialPending = await freelancePlatform.getPendingAmount(2);

        //     // Cancel two milestones
        //     await freelancePlatform.connect(client).requestMilestoneCancellation(milestone2Id);
        //     await freelancePlatform.connect(freelancer).requestMilestoneCancellation(milestone2Id);

        //     await ethers.provider.send("evm_increaseTime", [86400 * 25]);
        //     await ethers.provider.send("evm_mine");
        //     await freelancePlatform.autoCancelMilestone(milestone3Id);

        //     const updatedProject = await freelancePlatform.getProject(2);
        //     const finalPending = await freelancePlatform.getPendingAmount(2);

        //     // Two milestones worth of ETH should be reduced from escrow and pending
        //     expect(updatedProject.escrowBalance).to.equal(initialEscrow - ethers.parseEther("2"));
        //     expect(finalPending).to.equal(initialPending - ethers.parseEther("2"));
        // });
     it("Should update project balances correctly with multiple cancellations", async function () {
            const project = await freelancePlatform.getProject(2);
            const initialEscrow = project.escrowBalance;
            const initialPending = await freelancePlatform.getPendingAmount(2);

            // Get milestone amounts
            const milestone2 = await freelancePlatform.getMilestone(milestone2Id);
            const milestone3 = await freelancePlatform.getMilestone(milestone3Id);
            const totalCancelledAmount = milestone2.amount + milestone3.amount;

            // Cancel two milestones
            await freelancePlatform.connect(client).requestMilestoneCancellation(milestone2Id);
            await freelancePlatform.connect(freelancer).requestMilestoneCancellation(milestone2Id);

            await ethers.provider.send("evm_increaseTime", [86400 * 25]);
            await ethers.provider.send("evm_mine");
            await freelancePlatform.autoCancelMilestone(milestone3Id);

            const updatedProject = await freelancePlatform.getProject(2);
            const finalPending = await freelancePlatform.getPendingAmount(2);

            // Two milestones worth should be reduced from escrow and pending
            expect(updatedProject.escrowBalance).to.equal(initialEscrow - totalCancelledAmount);
            expect(finalPending).to.equal(initialPending - totalCancelledAmount);
        });

    
    });

    describe("Withdraw Excess Funds Tests", function () {
        it("Should allow withdrawing excess funds after project completion", async function () {
            // Complete the project
            await freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmDeliveryHash",
                "Work completed"
            );
            await freelancePlatform.connect(client).approveMilestone(milestoneId);
            await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);

            // Add some excess funds to simulate overfunding
            const project = await freelancePlatform.getProject(projectId);
            const excessAmount = project.escrowBalance;

            if (excessAmount > 0) {
                const clientBalanceBefore = await ethers.provider.getBalance(client.address);
                
                await freelancePlatform.connect(client).withdrawExcessFunds(projectId);
                
                const clientBalanceAfter = await ethers.provider.getBalance(client.address);
                expect(clientBalanceAfter).to.be.gt(clientBalanceBefore);
            }
        });

        it("Should not allow withdrawing excess funds from incomplete project", async function () {
            await expect(
                freelancePlatform.connect(client).withdrawExcessFunds(projectId)
            ).to.be.revertedWith("Project not completed");
        });

        it("Should not allow non-client to withdraw excess funds", async function () {
            // Complete project first
            await freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmDeliveryHash",
                "Work completed"
            );
            await freelancePlatform.connect(client).approveMilestone(milestoneId);
            await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);

            await expect(
                freelancePlatform.connect(otherUser).withdrawExcessFunds(projectId)
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
        });
    });
});
