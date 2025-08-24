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

    describe("Integration Tests", function () {
        it("Should handle complete project lifecycle", async function () {
            // Create project
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 2, "QmTestHash", 7);
            const projectId = 1;

            // Fund project
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });

            // Apply and select freelancer
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(projectId);

            // Agree on milestones
            const amounts = [MILESTONE_AMOUNT, MILESTONE_AMOUNT];
            const deadlines = [
                Math.floor(Date.now() / 1000) + 86400 * 7 +3600,
                Math.floor(Date.now() / 1000) + 86400 * 14+ 3600
            ];
            const metadataHashes = ["QmMilestone1", "QmMilestone2"];

            await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            // Complete first milestone
            await freelancePlatform.connect(freelancer).submitMilestoneWork(
                1,
                "QmDeliveryHash1",
                "First milestone completed"
            );
            await freelancePlatform.connect(client).approveMilestone(1);
            await freelancePlatform.connect(client).releaseMilestonePayment(1);

            // Complete second milestone
            await freelancePlatform.connect(freelancer).submitMilestoneWork(
                2,
                "QmDeliveryHash2",
                "Second milestone completed"
            );
            await freelancePlatform.connect(client).approveMilestone(2);

            const tx = await freelancePlatform.connect(client).releaseMilestonePayment(2);

            // Verify project completion
            await expect(tx).to.emit(freelancePlatform, "ProjectCompleted");

            const project = await freelancePlatform.getProject(projectId);
            expect(project.status).to.equal(5); // Completed
            expect(project.completedMilestones).to.equal(2);

            // Rate project
            await freelancePlatform.connect(client).rateProject(projectId, 5);

            const reputation = await freelancePlatform.getFreelancerReputation(freelancer.address);
            expect(reputation.projectsCompleted).to.equal(1);
            expect(reputation.averageRating).to.equal(5);
        });
    });

    
});