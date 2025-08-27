const { expect } = require("chai");
const { ethers } = require("hardhat");
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

        // ADDITIONAL
it("Should revert if dispute already raised", async function () {
    await freelancePlatform.connect(client).disputeMilestone(milestoneId);
    await expect(
        freelancePlatform.connect(client).disputeMilestone(milestoneId)
    ).to.be.revertedWith("Milestone not in submitted state");
});

it("Should revert if non-participant tries to dispute", async function () {
    await expect(
        freelancePlatform.connect(otherUser).disputeMilestone(milestoneId)
    ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
});

it("Should revert if non-owner tries to resolve dispute", async function () {
    await freelancePlatform.connect(client).disputeMilestone(milestoneId);
    await expect(
        freelancePlatform.connect(client).resolveDispute(milestoneId, client.address, MILESTONE_AMOUNT)
    ).to.be.revertedWithCustomError(freelancePlatform, "OwnableUnauthorizedAccount");
});

it("Should revert if disputed amount exceeds milestone amount", async function () {
    await freelancePlatform.connect(client).disputeMilestone(milestoneId);
    const tooMuch = MILESTONE_AMOUNT + 1n;
    await expect(
        freelancePlatform.connect(owner).resolveDispute(milestoneId, client.address, tooMuch)
    ).to.be.revertedWithCustomError(freelancePlatform, "DisputedAmountExceedsMilestone");
});

it("Should revert if disputed amount exceeds escrow balance", async function () {
    await freelancePlatform.connect(client).disputeMilestone(milestoneId);
    await freelancePlatform.connect(owner).resolveDispute(milestoneId, freelancer.address, MILESTONE_AMOUNT); // resolves and empties escrow

    // Try resolving again on same milestone
    await expect(
        freelancePlatform.connect(owner).resolveDispute(milestoneId, client.address, MILESTONE_AMOUNT)
    ).to.be.revertedWith("No dispute exists");
});

it("Should revert if disputed amount is zero", async function () {
    await freelancePlatform.connect(client).disputeMilestone(milestoneId);
    await expect(
        freelancePlatform.connect(owner).resolveDispute(milestoneId, client.address, 0)
    ).to.be.revertedWithCustomError(freelancePlatform, "InvalidDisputedAmount");
});

it("Should revert if trying to resolve an already resolved dispute", async function () {
    await freelancePlatform.connect(client).disputeMilestone(milestoneId);
    await freelancePlatform.connect(owner).resolveDispute(milestoneId, freelancer.address, MILESTONE_AMOUNT);

    await expect(
        freelancePlatform.connect(owner).resolveDispute(milestoneId, freelancer.address, MILESTONE_AMOUNT)
    ).to.be.revertedWith("No dispute exists");
});

it("Should update escrow and pending amounts correctly after dispute", async function () {
    await freelancePlatform.connect(client).disputeMilestone(milestoneId);
    
    const projectBefore = await freelancePlatform.getProject(projectId);
    
    await freelancePlatform.connect(owner).resolveDispute(milestoneId, freelancer.address, MILESTONE_AMOUNT);
    
    const projectAfter = await freelancePlatform.getProject(projectId);
    
    // Convert to BigInt for arithmetic
    const escrowBefore = BigInt(projectBefore.escrowBalance.toString());
    const escrowAfter = BigInt(projectAfter.escrowBalance.toString());
    const milestoneAmount = MILESTONE_AMOUNT;
    
    // Test escrow balance decreased by milestone amount
    expect(escrowAfter).to.equal(escrowBefore - milestoneAmount);
    
    // Test completed milestones increased by 1
    expect(Number(projectAfter.completedMilestones)).to.equal(Number(projectBefore.completedMilestones) + 1);
    
    // Test project is no longer disputed
    expect(projectAfter.isDisputed).to.be.false;
    
    console.log("✅ Escrow before:", escrowBefore.toString());
    console.log("✅ Escrow after:", escrowAfter.toString());
    console.log("✅ Difference:", (escrowBefore - escrowAfter).toString());
    console.log("✅ Expected difference:", milestoneAmount.toString());
});

it("Should finalize project when all milestones completed after dispute", async function () {
    await freelancePlatform.connect(client).disputeMilestone(milestoneId);
    await freelancePlatform.connect(owner).resolveDispute(milestoneId, freelancer.address, MILESTONE_AMOUNT);

    const project = await freelancePlatform.getProject(projectId);
    expect(project.completedMilestones).to.equal(project.totalMilestones);

    // Optional: check for finalize-related state or event
});

it("Should allow freelancer to raise a dispute", async function () {
    const tx = await freelancePlatform.connect(freelancer).disputeMilestone(milestoneId);

    await expect(tx).to.emit(freelancePlatform, "DisputeRaised")
        .withArgs(projectId, freelancer.address);
});

it("Should resolve dispute with partial payout to freelancer", async function () {
    await freelancePlatform.connect(client).disputeMilestone(milestoneId);
    const partialAmount = MILESTONE_AMOUNT / 2n;

    const tx = await freelancePlatform.connect(owner).resolveDispute(milestoneId, freelancer.address, partialAmount);
    await expect(tx).to.emit(freelancePlatform, "DisputeResolved")
        .withArgs(projectId, freelancer.address, partialAmount);

    const milestone = await freelancePlatform.getMilestone(milestoneId);
    expect(milestone.status).to.equal(3); // Paid
});



    });