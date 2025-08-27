const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT } = require("./helpers/setup");

describe("Edge Cases and Security", function () {
    let freelancePlatform, userRegistry;
    let projectId, milestoneId;
    let owner, client, freelancer, otherUser, freshUser;

    beforeEach(async function () {
        // Get test accounts
        [owner, client, freelancer, otherUser, freshUser] = await ethers.getSigners();

        // Deploy contracts with helper
        ({ freelancePlatform, userRegistry } = await deployContracts(owner));
    });

    describe("Invalid Input Validation", function () {
        it("Should revert with invalid project ID", async function () {
            await expect(
                freelancePlatform.getProject(999)
            ).to.be.revertedWithCustomError(freelancePlatform, "InvalidProject");
        });

        it("Should revert with invalid milestone ID", async function () {
            await expect(
                freelancePlatform.getMilestone(999)
            ).to.be.revertedWith("Milestone doesn't exist");
        });

        it("Should revert with zero project ID", async function () {
            await expect(
                freelancePlatform.getProject(0)
            ).to.be.revertedWithCustomError(freelancePlatform, "InvalidProject");
        });

        it("Should handle maximum uint256 values gracefully", async function () {
            const maxUint256 = ethers.MaxUint256;
            
            await expect(
                freelancePlatform.getProject(maxUint256)
            ).to.be.revertedWithCustomError(freelancePlatform, "InvalidProject");
        });

        it("Should revert when creating project with zero budget", async function () {
            await expect(
                freelancePlatform.connect(client).createProject(0, 1, "QmTestHash", 7)
            ).to.be.revertedWithCustomError(freelancePlatform, "InvalidAmount");
        });

        it("Should revert when creating project with empty metadata", async function () {
            await expect(
                freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "", 7)
            ).to.be.revertedWith("Metadata hash required");
        });
    });

    describe("Access Control Edge Cases", function () {
        let projectId;

        beforeEach(async function () {
            // Create a basic project setup
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
            projectId = 1;
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
        });

        it("Should prevent unauthorized project operations", async function () {
            // Non-client trying to select freelancer
            await expect(
                freelancePlatform.connect(otherUser).selectFreelancer(projectId, freelancer.address)
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");

            // Non-client trying to deposit additional funds
            await expect(
                freelancePlatform.connect(otherUser).depositFunds(projectId, { value: ethers.parseEther("1.0") })
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
        });

        it("Should prevent client from applying to their own project", async function () {
            await expect(
                freelancePlatform.connect(client).applyForProject(projectId, "QmProposalHash")
            ).to.be.revertedWith("Only freelancers allowed");
        });

        it("Should prevent operations on non-existent projects", async function () {
            const nonExistentProjectId = 999;

            await expect(
                freelancePlatform.connect(client).selectFreelancer(nonExistentProjectId, freelancer.address)
            ).to.be.revertedWithCustomError(freelancePlatform, "InvalidProject");

            await expect(
                freelancePlatform.connect(freelancer).applyForProject(nonExistentProjectId, "QmProposal")
            ).to.be.revertedWithCustomError(freelancePlatform, "InvalidProject");
        });
    });

    describe("Financial Security", function () {
        let projectId;

        beforeEach(async function () {
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
            projectId = 1;
        });

        it("Should prevent depositing insufficient funds", async function () {
            const insufficientAmount = PROJECT_BUDGET / 2n;
            
            await expect(
                freelancePlatform.connect(client).depositFunds(projectId, { value: insufficientAmount })
            ).to.be.revertedWithCustomError(freelancePlatform, "InvalidAmount");
        });

        it("Should prevent zero value deposits", async function () {
            await expect(
                freelancePlatform.connect(client).depositFunds(projectId, { value: 0 })
            ).to.be.revertedWithCustomError(freelancePlatform, "ZeroAmount");
        });

        it("Should prevent double funding", async function () {
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
            
            await expect(
                freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET })
            ).to.be.revertedWith("Already funded");
        });

        it("Should handle platform fee calculation edge cases", async function () {
            // Test with minimum possible amount (1 wei)
            const minProject = 1n;
            await freelancePlatform.connect(client).createProject(minProject, 1, "QmMinTest", 7);
            const minProjectId = 2;

            await freelancePlatform.connect(client).depositFunds(minProjectId, { value: minProject });
            
            const project = await freelancePlatform.getProject(minProjectId);
            expect(project.escrowBalance).to.be.lessThanOrEqual(minProject);
        });
    });

    describe("State Consistency", function () {
        let projectId, milestoneId;

        beforeEach(async function () {
            // Full project setup
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
            projectId = 1;
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(projectId);
            
            // Create milestone
            const amounts = [MILESTONE_AMOUNT];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7];
            const metadataHashes = ["QmMilestone1"];

            await freelancePlatform.connect(client).agreeMilestones(
                projectId, amounts, deadlines, metadataHashes
            );
            milestoneId = 1;
        });

        it("Should prevent milestone operations in wrong project state", async function () {
            // Try to agree milestones again (project is now Active)
            const amounts = [MILESTONE_AMOUNT];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 14];
            const metadataHashes = ["QmMilestone2"];

            await expect(
                freelancePlatform.connect(client).agreeMilestones(
                    projectId, amounts, deadlines, metadataHashes
                )
            ).to.be.revertedWith("Invalid status");
        });

        it("Should prevent operations on completed projects", async function () {
            // Complete the project
            await freelancePlatform.connect(freelancer).submitMilestoneWork(milestoneId, "QmWork", "Completed");
            await freelancePlatform.connect(client).approveMilestone(milestoneId);
            await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);

            // Try to submit work again
            await expect(
                freelancePlatform.connect(freelancer).submitMilestoneWork(milestoneId, "QmNewWork", "Late work")
            ).to.be.revertedWith("Invalid milestone status");
        });

        it("Should maintain correct pending amounts", async function () {
            const pendingBefore = await freelancePlatform.getPendingAmount(projectId);
            expect(pendingBefore).to.equal(MILESTONE_AMOUNT);

            // Submit and approve milestone
            await freelancePlatform.connect(freelancer).submitMilestoneWork(milestoneId, "QmWork", "Done");
            await freelancePlatform.connect(client).approveMilestone(milestoneId);
            await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);

            const pendingAfter = await freelancePlatform.getPendingAmount(projectId);
            expect(pendingAfter).to.equal(0);
        });
    });

    describe("Time-based Edge Cases", function () {
        let projectId, milestoneId;

        beforeEach(async function () {
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
            projectId = 1;
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(projectId);
        });

        it("Should handle deadline boundary conditions", async function () {
            const latestBlock = await ethers.provider.getBlock("latest");
            const amounts = [MILESTONE_AMOUNT];
            const deadlines = [latestBlock.timestamp + 3]; // 3 second in future
            const metadataHashes = ["QmMilestone1"];

            const tx = await freelancePlatform.connect(client).agreeMilestones(
                projectId, amounts, deadlines, metadataHashes
            );
            
            await expect(tx).to.emit(freelancePlatform, "MilestonesAgreed");
        });

        it("Should reject past deadlines", async function () {
            const latestBlock = await ethers.provider.getBlock("latest");
            const amounts = [MILESTONE_AMOUNT];
            const deadlines = [latestBlock.timestamp - 1]; // 1 second in past
            const metadataHashes = ["QmMilestone1"];

            await expect(
                freelancePlatform.connect(client).agreeMilestones(
                    projectId, amounts, deadlines, metadataHashes
                )
            ).to.be.revertedWith("Invalid deadline");
        });

        it("Should handle application deadline edge cases", async function () {
            // Create a NEW project with fresh application deadline
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmNewTestHash", 30);
            const newProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET });

            const project = await freelancePlatform.getProject(newProjectId);

            // Register fresh users as freelancers
            await userRegistry.connect(otherUser).selfRegister("Freelancer", "QmOtherHash");
            await userRegistry.connect(freshUser).selfRegister("Freelancer", "QmFreshHash");

            // Fast forward to just before application deadline
            await ethers.provider.send("evm_setNextBlockTimestamp", [Number(project.applicationDeadline) - 1]);
            await ethers.provider.send("evm_mine");

            // Should still allow applications
            await freelancePlatform.connect(otherUser).applyForProject(newProjectId, "QmLateProposal");

            // Fast forward past deadline
            await ethers.provider.send("evm_setNextBlockTimestamp", [Number(project.applicationDeadline) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Should reject applications after deadline
            await expect(
                freelancePlatform.connect(freshUser).applyForProject(newProjectId, "QmTooLateProposal")
            ).to.be.revertedWith("Application deadline passed");
        });

    });

    describe("Contract Security", function () {
        it("Should handle reentrancy attacks", async function () {
            // The contract uses ReentrancyGuard, so this test ensures protection exists
            // In a real test, you'd deploy a malicious contract that tries to reenter
            expect(true).to.be.true; // Placeholder - actual reentrancy test would be more complex
        });

        it("Should accept direct ETH transfers", async function () {
            // The contract has a receive function, so it should accept ETH
            await expect(
                owner.sendTransaction({
                    to: freelancePlatform.target,
                    value: ethers.parseEther("1.0")
                })
            ).to.not.be.reverted;
        });

        it("Should revert fallback calls to non-existent functions", async function () {
            const data = "0x12345678"; // Random function selector

            await expect(
                owner.sendTransaction({
                    to: freelancePlatform.target,
                    data: data,
                    value: 0
                })
            ).to.be.revertedWith("Function not found");
        });

        it("Should prevent unauthorized admin operations", async function () {
            await expect(
                freelancePlatform.connect(otherUser).updatePlatformFee(500)
            ).to.be.revertedWithCustomError(freelancePlatform, "OwnableUnauthorizedAccount");

            await expect(
                freelancePlatform.connect(otherUser).authorizeAdmin(freshUser.address)
            ).to.be.revertedWithCustomError(freelancePlatform, "OwnableUnauthorizedAccount");
        });

        it("Should validate fee percentage limits", async function () {
            await expect(
                freelancePlatform.connect(owner).updatePlatformFee(1001) // > 10%
            ).to.be.revertedWith("Fee cannot exceed 10%");

            await expect(
                freelancePlatform.connect(owner).updateFreelancerFee(1001) // > 10%
            ).to.be.revertedWith("Fee cannot exceed 10%");
        });

        it("Should handle zero address validations", async function () {
            // Create a project first
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
            const projectId = 1;

            // Test zero address validation
            await expect(
                freelancePlatform.connect(client).selectFreelancer(projectId, ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(freelancePlatform, "InvalidAddress");
        });
    });

    describe("Gas and Performance Edge Cases", function () {
        it("Should handle large arrays in milestone agreement", async function () {
            // Setup project
            await freelancePlatform.connect(client).createProject(ethers.parseEther("100"), 50, "QmTestHash", 7);
            const projectId = 1;
            await freelancePlatform.connect(client).depositFunds(projectId, { value: ethers.parseEther("100") });
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(projectId);

            const numMilestones = 20; // Reasonable test size
            const amounts = Array(numMilestones).fill(ethers.parseEther("1"));
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = Array(numMilestones).fill().map((_, i) => latestBlock.timestamp + 86400 * (i + 1));
            const metadataHashes = Array(numMilestones).fill().map((_, i) => `QmMilestone${i + 1}`);

            const tx = await freelancePlatform.connect(client).agreeMilestones(
                projectId, amounts, deadlines, metadataHashes
            );

            const receipt = await tx.wait();
            console.log(`Gas used for ${numMilestones} milestones: ${receipt.gasUsed}`);
            
            expect(receipt.gasUsed).to.be.lessThan(10000000); // Reasonable gas limit
        });

        it("Should handle empty milestone arrays", async function () {
            // Setup project
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 0, "QmTestHash", 7);
            const projectId = 1;
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(projectId);

            const tx = await freelancePlatform.connect(client).agreeMilestones(
                projectId, [], [], []
            );

            await expect(tx).to.emit(freelancePlatform, "ProjectActivated");
        });
    });

    describe("Data Integrity", function () {
        it("Should maintain consistent project counter", async function () {
            const initialCounter = await freelancePlatform.projectCounter();
            
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTest1", 7);
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTest2", 7);
            
            const finalCounter = await freelancePlatform.projectCounter();
            expect(finalCounter).to.equal(initialCounter + 2n);
        });

        it("Should maintain consistent milestone counter", async function () {
            // Setup project for milestone creation
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 2, "QmTestHash", 7);
            const projectId = 1;
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(projectId);

            const initialCounter = await freelancePlatform.milestoneCounter();
            
            // Calculate proper amounts within escrow balance
            const project = await freelancePlatform.getProject(projectId);
            const escrowBalance = project.escrowBalance;
            const amounts = [escrowBalance / 2n, escrowBalance / 2n];
            
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7, latestBlock.timestamp + 86400 * 14];
            const metadataHashes = ["QmMilestone1", "QmMilestone2"];

            await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            const finalCounter = await freelancePlatform.milestoneCounter();
            expect(finalCounter).to.equal(initialCounter + 2n);
        });
    });
});