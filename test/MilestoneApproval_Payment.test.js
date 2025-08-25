// test/MilestoneApproval_Payment.extended.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE } = require("./helpers/setup");

describe("Milestone Approval and Payment - Extended Scenarios", function () {
    let freelancePlatform;
    let owner, client, freelancer, otherUser;
    let projectId, milestoneId;

    beforeEach(async function () {
        ({ freelancePlatform, client, freelancer, owner, otherUser } = await deployContracts());

        // Create & fund project
        await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
        projectId = 1;
        await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });

        // Application/selection/accept
        await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
        await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
        await freelancePlatform.connect(freelancer).acceptProject(projectId);

        // Agree single milestone
        const latest = await ethers.provider.getBlock("latest");
        const amounts = [MILESTONE_AMOUNT];
        const deadlines = [latest.timestamp + 7 * 24 * 3600 + 3600];
        const metadataHashes = ["QmMilestone1"];
        await freelancePlatform.connect(client).agreeMilestones(projectId, amounts, deadlines, metadataHashes);

        milestoneId = 1;

        // Submit milestone (status: Submitted)
        await freelancePlatform
            .connect(freelancer)
            .submitMilestoneWork(milestoneId, "QmDeliveryHash", "Work completed");
    });

    describe("Milestone Approval and Payment ", function () {

        it("Should approve milestone successfully", async function () {
            const tx = await freelancePlatform.connect(client).approveMilestone(milestoneId);

            await expect(tx).to.emit(freelancePlatform, "MilestoneApproved")
                .withArgs(milestoneId, projectId, client.address);

            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(2); // Approved
        });

        it("Should release payment successfully", async function () {
            await freelancePlatform.connect(client).approveMilestone(milestoneId);

            const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);
            const expectedFee = (MILESTONE_AMOUNT * BigInt(FREELANCER_FEE)) / 10000n;
            const expectedPayment = MILESTONE_AMOUNT - expectedFee;

            const tx = await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);

            await expect(tx).to.emit(freelancePlatform, "PaymentReleased")
                .withArgs(milestoneId, projectId, expectedPayment, freelancer.address);

            const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
            expect(freelancerBalanceAfter - freelancerBalanceBefore).to.equal(expectedPayment);

            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(3); // Paid
        });

        it("Should complete project after all milestones paid", async function () {
            await freelancePlatform.connect(client).approveMilestone(milestoneId);

            const tx = await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);

            await expect(tx).to.emit(freelancePlatform, "ProjectCompleted")
                .withArgs(projectId, freelancer.address);

            const project = await freelancePlatform.getProject(projectId);
            expect(project.status).to.equal(5); // Completed
        });

        it("Should auto-approve milestone after timeout", async function () {
            await ethers.provider.send("evm_increaseTime", [86400 * 11]); // 11 days
            await ethers.provider.send("evm_mine");

            const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);
            const expectedFee = (MILESTONE_AMOUNT * BigInt(FREELANCER_FEE)) / 10000n;
            const expectedPayment = MILESTONE_AMOUNT - expectedFee;

            const tx = await freelancePlatform.autoApproveMilestone(milestoneId);

            await expect(tx).to.emit(freelancePlatform, "MilestoneApproved")
                .withArgs(milestoneId, projectId, ethers.ZeroAddress);
            await expect(tx).to.emit(freelancePlatform, "PaymentReleased")
                .withArgs(milestoneId, projectId, expectedPayment, freelancer.address);

            const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
            expect(freelancerBalanceAfter - freelancerBalanceBefore).to.equal(expectedPayment);
        });

        it("Should revert approval if milestone not submitted", async function () {
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
            const newProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(newProjectId, "QmProposalHash");
            await freelancePlatform.connect(client).selectFreelancer(newProjectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(newProjectId);

            const amounts = [MILESTONE_AMOUNT];
            // Use blockchain timestamp for deadlines
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600];
            const metadataHashes = ["QmMilestone1"];

            await freelancePlatform.connect(client).agreeMilestones(
                newProjectId,
                amounts,
                deadlines,
                metadataHashes
            );

            const newMilestoneId = 2;

            await expect(
                freelancePlatform.connect(client).approveMilestone(newMilestoneId)
            ).to.be.revertedWith("Milestone not submitted or already processed");
        });

        it("Should revert payment if milestone not approved", async function () {
            await expect(
                freelancePlatform.connect(client).releaseMilestonePayment(milestoneId)
            ).to.be.revertedWith("Milestone not approved");
        });

        //---------- Access Control ----------

        it("Should revert if non-client tries to approve milestone", async function () {
            await expect(
                freelancePlatform.connect(freelancer).approveMilestone(milestoneId)
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller"); // adjust if your modifier uses a string instead
        });

        it("Should revert if non-client tries to release payment", async function () {
            await freelancePlatform.connect(client).approveMilestone(milestoneId);
            await expect(
                freelancePlatform.connect(otherUser).releaseMilestonePayment(milestoneId)
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller"); // adjust revert msg
        });

        it("Should allow anyone to call autoApproveMilestone", async function () {
            await ethers.provider.send("evm_increaseTime", [86400 * 11]);
            await ethers.provider.send("evm_mine");
            await expect(
                freelancePlatform.connect(otherUser).autoApproveMilestone(milestoneId)
            ).to.emit(freelancePlatform, "MilestoneApproved");
        });

        // ---------- Time Constraints ----------
        it("Should revert if approval happens after review period expired", async function () {
            await ethers.provider.send("evm_increaseTime", [10 * 24 * 3600 + 1]); // beyond REVIEW_PERIOD
            await ethers.provider.send("evm_mine");
            await expect(
                freelancePlatform.connect(client).approveMilestone(milestoneId)
            ).to.be.revertedWith("Approval period expired");
        });

        it("Should revert auto-approve if called before AUTO_APPROVE_PERIOD", async function () {
            await ethers.provider.send("evm_increaseTime", [86400 * 3]);
            await ethers.provider.send("evm_mine");
            await expect(
                freelancePlatform.autoApproveMilestone(milestoneId)
            ).to.be.revertedWith("Auto-approve period not reached");
        });

        // ---------- Payments & Balances ----------
        it("Pays full amount when freelancer fee is 0 (owner updates fee)", async function () {
            await freelancePlatform.connect(owner).updateFreelancerFee(0);
            await freelancePlatform.connect(client).approveMilestone(milestoneId);

            const before = await ethers.provider.getBalance(freelancer.address);
            const tx = await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);
            await tx.wait();

            const after = await ethers.provider.getBalance(freelancer.address);
            expect(after - before).to.equal(MILESTONE_AMOUNT);
        });


        it("Reverts release when milestone amount is 0 (but only after approve)", async function () {
            // Make a new project with a zero-amount milestone and run through flow properly
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmZeroMeta", 7);
            const p2 = 2;

            await freelancePlatform.connect(client).depositFunds(p2, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(p2, "QmProposalHash2");
            await freelancePlatform.connect(client).selectFreelancer(p2, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(p2);

            const latest = await ethers.provider.getBlock("latest");
            await freelancePlatform.connect(client).agreeMilestones(p2, [0], [latest.timestamp + 86400], ["QmZero"]);

            const m2 = 2;
            await freelancePlatform.connect(freelancer).submitMilestoneWork(m2, "QmZeroDelivery", "Zero amount");
            await freelancePlatform.connect(client).approveMilestone(m2);

            await expect(
                freelancePlatform.connect(client).releaseMilestonePayment(m2)
            ).to.be.revertedWith("Invalid amount");
        });

        // ---------- State Transitions ----------
        it("Should revert if milestone is approved twice", async function () {
            await freelancePlatform.connect(client).approveMilestone(milestoneId);
            await expect(
                freelancePlatform.connect(client).approveMilestone(milestoneId)
            ).to.be.revertedWith("Milestone not submitted or already processed");
        });

        it("Should revert if payment is released twice", async function () {
            await freelancePlatform.connect(client).approveMilestone(milestoneId);
            await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);

            await expect(
                freelancePlatform.connect(client).releaseMilestonePayment(milestoneId)
            ).to.be.revertedWith("Milestone not approved");
        });

        it("Should revert auto-approve if milestone already approved", async function () {
            await freelancePlatform.connect(client).approveMilestone(milestoneId);
            await expect(
                freelancePlatform.autoApproveMilestone(milestoneId)
            ).to.be.revertedWith("Invalid status");
        });

        // ---------- Disputes ----------
        it("Approval blocked if dispute raised (status becomes Disputed)", async function () {
            // raise dispute as client (allowed participant)
            await freelancePlatform.connect(client).disputeMilestone(milestoneId);

            // Now approve should fail because status is no longer Submitted
            await expect(
                freelancePlatform.connect(client).approveMilestone(milestoneId)
            ).to.be.revertedWith("Milestone not submitted or already processed");

            const ms = await freelancePlatform.getMilestone(milestoneId);
            expect(ms.disputeRaised).to.equal(true);
            expect(ms.status).to.equal(4); // Disputed
        });

        // ---------------- Reputation & stats ----------------
        it("Updates reputation and stats after payment (fees include platform + freelancer fees)", async function () {
            // capture fee percents from contract to avoid hardcoding
            const platformFeeBps = await freelancePlatform.platformFeePercent();
            const freelancerFeeBps = await freelancePlatform.freelancerFeePercent();

            await freelancePlatform.connect(client).approveMilestone(milestoneId);
            await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);

            // reputation
            const rep = await freelancePlatform.reputations(freelancer.address);
            expect(rep.totalEarned).to.equal(MILESTONE_AMOUNT);

            // volume
            const totalVol = await freelancePlatform.totalVolumeProcessed();
            expect(totalVol).to.equal(MILESTONE_AMOUNT);

            // fees: platform fee (taken at deposit) + freelancer fee (taken at payout)
            const expectedPlatformFee = (PROJECT_BUDGET * BigInt(platformFeeBps)) / 10000n;
            const expectedFreelancerFee = (MILESTONE_AMOUNT * BigInt(freelancerFeeBps)) / 10000n;
            const expectedTotalFees = expectedPlatformFee + expectedFreelancerFee;

            const totalFees = await freelancePlatform.totalFeesCollected();
            expect(totalFees).to.equal(expectedTotalFees);
        });
        // ---------------- Multiple Milestones & Project Completion ----------------
        it("Should only finalize project when last milestone paid", async function () {
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET * 2n, 2, "QmTestHash", 7);
            const newProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET * 2n });
            await freelancePlatform.connect(freelancer).applyForProject(newProjectId, "QmProposalHash");
            await freelancePlatform.connect(client).selectFreelancer(newProjectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(newProjectId);

            const amounts = [MILESTONE_AMOUNT, MILESTONE_AMOUNT];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400, latestBlock.timestamp + 172800];
            await freelancePlatform.connect(client).agreeMilestones(newProjectId, amounts, deadlines, ["Qm1", "Qm2"]);

            // submit both
            await freelancePlatform.connect(freelancer).submitMilestoneWork(2, "QmDelivery1", "Work 1");
            await freelancePlatform.connect(freelancer).submitMilestoneWork(3, "QmDelivery2", "Work 2");

            // approve and pay only first
            await freelancePlatform.connect(client).approveMilestone(2);
            await freelancePlatform.connect(client).releaseMilestonePayment(2);

            let project = await freelancePlatform.getProject(newProjectId);
            expect(project.status).to.not.equal(5); // not Completed yet

            // approve and pay second
            await freelancePlatform.connect(client).approveMilestone(3);
            const tx = await freelancePlatform.connect(client).releaseMilestonePayment(3);

            await expect(tx).to.emit(freelancePlatform, "ProjectCompleted");
            project = await freelancePlatform.getProject(newProjectId);
            expect(project.status).to.equal(5); // Completed
        });

    });

    describe("Extended Scenarios", function () {
        // ---------- Auto-approve pays immediately (no separate release) ----------
        it("Auto-approve transfers funds & sets Paid; release thereafter reverts", async function () {
            const feeBps = await freelancePlatform.freelancerFeePercent();
            const expectedFee = (MILESTONE_AMOUNT * BigInt(feeBps)) / 10000n;
            const expectedNet = MILESTONE_AMOUNT - expectedFee;

            const balBefore = await ethers.provider.getBalance(freelancer.address);

            // Wait > AUTO_APPROVE_PERIOD (10 days)
            await ethers.provider.send("evm_increaseTime", [11 * 24 * 3600]);
            await ethers.provider.send("evm_mine");

            const tx = await freelancePlatform.autoApproveMilestone(milestoneId);
            await expect(tx).to.emit(freelancePlatform, "MilestoneApproved")
                .withArgs(milestoneId, projectId, ethers.ZeroAddress);
            await expect(tx).to.emit(freelancePlatform, "PaymentReleased")
                .withArgs(milestoneId, projectId, expectedNet, freelancer.address);

            const balAfter = await ethers.provider.getBalance(freelancer.address);
            expect(balAfter - balBefore).to.equal(expectedNet);

            const ms = await freelancePlatform.getMilestone(milestoneId);
            expect(ms.status).to.equal(3); // Paid

            // Trying to release again after auto-approve should fail
            await expect(
                freelancePlatform.connect(client).releaseMilestonePayment(milestoneId)
            ).to.be.revertedWith("Milestone not approved");
        });

        // ---------- Disputes ----------
        it("Freelancer can raise dispute; status becomes Disputed", async function () {
            await expect(
                freelancePlatform.connect(freelancer).disputeMilestone(milestoneId)
            ).to.emit(freelancePlatform, "DisputeRaised")
                .withArgs(projectId, freelancer.address);

            const ms = await freelancePlatform.getMilestone(milestoneId);
            expect(ms.disputeRaised).to.equal(true);
            expect(ms.status).to.equal(4); // Disputed
        });

        it("Cannot dispute twice", async function () {
            await freelancePlatform.connect(client).disputeMilestone(milestoneId);
            await expect(
                freelancePlatform.connect(client).disputeMilestone(milestoneId)
            ).to.be.revertedWith("Milestone not in submitted state"); // as its already under dispute
        });

        it("After dispute: approve fails (status), release fails (not approved)", async function () {
            await freelancePlatform.connect(client).disputeMilestone(milestoneId);

            await expect(
                freelancePlatform.connect(client).approveMilestone(milestoneId)
            ).to.be.revertedWith("Milestone not submitted or already processed");

            await expect(
                freelancePlatform.connect(client).releaseMilestonePayment(milestoneId)
            ).to.be.revertedWith("Milestone not approved");
        });

        // ---------- Auto-cancel cannot run after submission ----------
        it("autoCancelMilestone reverts if already submitted", async function () {
            await expect(
                freelancePlatform.autoCancelMilestone(milestoneId)
            ).to.be.revertedWith("Milestone already submitted");
        });

        // ---------- Update freelancer fee mid-project (<= 10%) ----------
        it("Applies updated freelancer fee set before release", async function () {
            await freelancePlatform.connect(client).approveMilestone(milestoneId);

            // Set fee to 7% (700 bps) – within the <= 10% constraint
            await freelancePlatform.connect(owner).updateFreelancerFee(700);

            const expectedFee = (MILESTONE_AMOUNT * 700n) / 10000n;
            const expectedNet = MILESTONE_AMOUNT - expectedFee;

            const tx = await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);
            await expect(tx).to.emit(freelancePlatform, "PaymentReleased")
                .withArgs(milestoneId, projectId, expectedNet, freelancer.address);
        });

        // ---------- Auto-approve reputation & stats ----------
        // ---------- REPUTATION ----------
        it("Should accumulate reputation across multiple projects", async function () {
            await freelancePlatform.connect(client).approveMilestone(milestoneId);
            await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);

            // Start a second project
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTest2", 7);
            const projectId2 = 2;
            await freelancePlatform.connect(client).depositFunds(projectId2, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(projectId2, "QmProposal2");
            await freelancePlatform.connect(client).selectFreelancer(projectId2, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(projectId2);

            const amounts2 = [MILESTONE_AMOUNT];
            const block = await ethers.provider.getBlock("latest");
            const deadlines2 = [block.timestamp + 86400 * 7 + 3600];
            await freelancePlatform.connect(client).agreeMilestones(projectId2, amounts2, deadlines2, ["QmM2"]);

            const milestoneId2 = 2;
            await freelancePlatform.connect(freelancer).submitMilestoneWork(milestoneId2, "QmD2", "Work2");
            await freelancePlatform.connect(client).approveMilestone(milestoneId2);
            await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId2);

            const rep = await freelancePlatform.reputations(freelancer.address);
            expect(rep.totalEarned).to.equal(MILESTONE_AMOUNT * 2n);
        });

        it("Auto-approve updates reputation and stats", async function () {
            const volBefore = await freelancePlatform.totalVolumeProcessed();
            const feesBefore = await freelancePlatform.totalFeesCollected();
            const feeBps = await freelancePlatform.freelancerFeePercent();

            await ethers.provider.send("evm_increaseTime", [11 * 24 * 3600]);
            await ethers.provider.send("evm_mine");
            await freelancePlatform.autoApproveMilestone(milestoneId);

            const rep = await freelancePlatform.reputations(freelancer.address);
            expect(rep.totalEarned).to.equal(MILESTONE_AMOUNT); // _updateFreelancerReputation adds full gross

            const volAfter = await freelancePlatform.totalVolumeProcessed();
            const feesAfter = await freelancePlatform.totalFeesCollected();
            const expectedFee = (MILESTONE_AMOUNT * BigInt(feeBps)) / 10000n;

            expect(volAfter - volBefore).to.equal(MILESTONE_AMOUNT);
            expect(feesAfter - feesBefore).to.equal(expectedFee);
        });


        // ---------- Dispute resolution paths ----------
        it("Client wins dispute -> refund to client, no reputation increase", async function () {
            // Raise dispute first
            await freelancePlatform.connect(client).disputeMilestone(milestoneId);

            // Owner resolves in favor of client for full milestone amount
            const repBefore = await freelancePlatform.reputations(freelancer.address);

            await expect(
                freelancePlatform.connect(owner).resolveDispute(milestoneId, client.address, MILESTONE_AMOUNT)
            ).to.emit(freelancePlatform, "DisputeResolved")
                .withArgs(projectId, client.address, MILESTONE_AMOUNT);

            const repAfter = await freelancePlatform.reputations(freelancer.address);
            expect(repAfter.totalEarned - repBefore.totalEarned).to.equal(0);

            const ms = await freelancePlatform.getMilestone(milestoneId);
            expect(ms.status).to.equal(6); // Refunded
        });

        it("Freelancer wins dispute -> paid with fee, stats updated", async function () {
            // Fresh project/milestone for a clean path
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmP2", 7);
            const p2 = 2;
            await freelancePlatform.connect(client).depositFunds(p2, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(p2, "QmProp2");
            await freelancePlatform.connect(client).selectFreelancer(p2, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(p2);

            const now2 = await ethers.provider.getBlock("latest");
            await freelancePlatform.connect(client).agreeMilestones(p2, [MILESTONE_AMOUNT], [now2.timestamp + 86400], ["QmM2"]);
            const m2 = 2;
            await freelancePlatform.connect(freelancer).submitMilestoneWork(m2, "QmD2", "Work2");

            await freelancePlatform.connect(client).disputeMilestone(m2);

            const feeBps = await freelancePlatform.freelancerFeePercent();
            const expectedFee = (MILESTONE_AMOUNT * BigInt(feeBps)) / 10000n;
            const expectedNet = MILESTONE_AMOUNT - expectedFee;

            const balBefore = await ethers.provider.getBalance(freelancer.address);
            const volBefore = await freelancePlatform.totalVolumeProcessed();
            const feesBefore = await freelancePlatform.totalFeesCollected();

            await expect(
                freelancePlatform.connect(owner).resolveDispute(m2, freelancer.address, MILESTONE_AMOUNT)
            ).to.emit(freelancePlatform, "DisputeResolved")
                .withArgs(p2, freelancer.address, MILESTONE_AMOUNT);

            const balAfter = await ethers.provider.getBalance(freelancer.address);
            expect(balAfter - balBefore).to.equal(expectedNet);

            const ms2 = await freelancePlatform.getMilestone(m2);
            expect(ms2.status).to.equal(3); // Paid

            const volAfter = await freelancePlatform.totalVolumeProcessed();
            const feesAfter = await freelancePlatform.totalFeesCollected();
            expect(volAfter - volBefore).to.equal(MILESTONE_AMOUNT);
            expect(feesAfter - feesBefore).to.equal(expectedFee);
        });

        // ---------- Invalid IDs & unauthorized ----------
        it("approveMilestone with non-existing milestoneId reverts with custom InvalidProject (modifier order)", async function () {
            // projectExists(milestones[id].projectId) runs before milestoneExists, so this hits InvalidProject()
            await expect(
                freelancePlatform.connect(client).approveMilestone(9999)
            ).to.be.revertedWithCustomError(freelancePlatform, "InvalidProject");
        });

        it("Non-participant cannot raise dispute (custom UnauthorizedCaller)", async function () {
            await expect(
                freelancePlatform.connect(otherUser).disputeMilestone(milestoneId)
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
        });
    });
});
