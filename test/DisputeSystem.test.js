const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FreelancePlatform", function () {
    let freelancePlatform;
    let userRegistry;
    let owner, client, freelancer, admin, otherUser;
    
    // Test constants
    const PLATFORM_FEE = 300; // 3%
    const FREELANCER_FEE = 250; // 2.5%
    const PROJECT_BUDGET = ethers.parseEther("1.0");
    const MILESTONE_AMOUNT = ethers.parseEther("0.5");
    
    beforeEach(async function () {
        [owner, client, freelancer, admin, otherUser] = await ethers.getSigners();
        
        // Deploy UserRegistry first
        const UserRegistry = await ethers.getContractFactory("UserRegistry");
        userRegistry = await UserRegistry.deploy();
        
        // Deploy FreelancePlatform
        const FreelancePlatform = await ethers.getContractFactory("FreelancePlatform");
        freelancePlatform = await FreelancePlatform.deploy(userRegistry.target);
        
        // Authorize the FreelancePlatform contract to check user roles
        await userRegistry.authorizeContract(freelancePlatform.target);
        
        // Setup user roles
        await userRegistry.connect(client).selfRegister("Client", "QmClientHash");
        await userRegistry.connect(freelancer).selfRegister("Freelancer", "QmFreelancerHash");
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await freelancePlatform.owner()).to.equal(owner.address);
        });

        it("Should set the UserRegistry address", async function () {
            expect(await freelancePlatform.userRegistry()).to.equal(userRegistry.target);
        });

        it("Should initialize with correct default fees", async function () {
            expect(await freelancePlatform.platformFeePercent()).to.equal(PLATFORM_FEE);
            expect(await freelancePlatform.freelancerFeePercent()).to.equal(FREELANCER_FEE);
        });

        it("Should revert with invalid UserRegistry address", async function () {
            const FreelancePlatform = await ethers.getContractFactory("FreelancePlatform");
            await expect(
                FreelancePlatform.deploy(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid UserRegistry address");
        });
    });

    describe("Dispute System", function () {
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
            // Create new milestone that's not submitted
            const amounts = [MILESTONE_AMOUNT];
            const deadlines = [Math.floor(Date.now() / 1000) + 86400 * 7 +3600];
            const metadataHashes = ["QmMilestone2"];
            
            await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            await expect(
                freelancePlatform.connect(client).disputeMilestone(2)
            ).to.be.revertedWith("Milestone not in submitted state");
        });

        it("Should revert if dispute window expired", async function () {
            // Move time past dispute window
            await ethers.provider.send("evm_increaseTime", [86400 * 15]); // 15 days
            await ethers.provider.send("evm_mine");

            await expect(
                freelancePlatform.connect(client).disputeMilestone(milestoneId)
            ).to.be.revertedWith("Dispute window expired");
        });
    });
});