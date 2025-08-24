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

    describe("Cancellation System", function () {
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
        });

        it("Should auto-cancel milestone after deadline", async function () {
            // Move time past final submission deadline
            await ethers.provider.send("evm_increaseTime", [86400 * 18]); // 18 days
            await ethers.provider.send("evm_mine");

            const clientBalanceBefore = await ethers.provider.getBalance(client.address);

            const tx = await freelancePlatform.autoCancelMilestone(milestoneId);

            await expect(tx).to.emit(freelancePlatform, "MilestoneAutoCancelled")
                .withArgs(milestoneId, projectId);

            const clientBalanceAfter = await ethers.provider.getBalance(client.address);
            expect(clientBalanceAfter - clientBalanceBefore).to.equal(MILESTONE_AMOUNT);

            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(5); // Cancelled
        });

        it("Should cancel milestone with mutual agreement", async function () {
            // Both parties request cancellation
            await freelancePlatform.connect(client).requestMilestoneCancellation(milestoneId);
            
            const clientBalanceBefore = await ethers.provider.getBalance(client.address);

            const tx = await freelancePlatform.connect(freelancer).requestMilestoneCancellation(milestoneId);

            await expect(tx).to.emit(freelancePlatform, "MilestoneCanceled")
                .withArgs(milestoneId, projectId);

            const clientBalanceAfter = await ethers.provider.getBalance(client.address);
            expect(clientBalanceAfter - clientBalanceBefore).to.equal(MILESTONE_AMOUNT);
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

    
});