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

    describe("Emergency Functions", function () {
        let projectId;

        beforeEach(async function () {
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
            projectId = 1;
        });

        it("Should allow emergency withdrawal in draft state", async function () {
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });

            const clientBalanceBefore = await ethers.provider.getBalance(client.address);

            await freelancePlatform.connect(client).emergencyWithdraw(projectId);

            const clientBalanceAfter = await ethers.provider.getBalance(client.address);
            const project = await freelancePlatform.getProject(projectId);

            expect(project.status).to.equal(6); // Cancelled
            expect(project.escrowBalance).to.equal(0);
            expect(clientBalanceAfter).to.be.greaterThan(clientBalanceBefore);
        });

        it("Should revert emergency withdrawal in active state", async function () {
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

            await expect(
                freelancePlatform.connect(client).emergencyWithdraw(projectId)
            ).to.be.revertedWith("Cannot withdraw at this stage");
        });

        it("Should allow owner to emergency resolve dispute", async function () {
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

            const milestoneId = 1;
            await freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmDeliveryHash",
                "Work completed"
            );
            await freelancePlatform.connect(client).disputeMilestone(milestoneId);

            const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);

            const tx = await freelancePlatform.connect(owner).emergencyResolveDispute(
                projectId,
                freelancer.address
            );

            await expect(tx).to.emit(freelancePlatform, "DisputeResolved");

            const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
            expect(freelancerBalanceAfter).to.be.greaterThan(freelancerBalanceBefore);
        });
    });
    
});