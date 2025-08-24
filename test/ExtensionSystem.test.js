const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE } = require("./helpers/setup");

describe("Extension System", function () {
    let projectId, milestoneId;
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
        const latestBlock = await ethers.provider.getBlock('latest');
        // console.log("Current block timestamp:", latestBlock.timestamp);  
        // const deadlines = [Math.floor(Date.now() / 1000) + 86400 * 7 + 3600];
        const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600];
        // console.log("Deadline we're setting:", deadlines[0]);
        const metadataHashes = ["QmMilestone1"];

        await freelancePlatform.connect(client).agreeMilestones(
            projectId,
            amounts,
            deadlines,
            metadataHashes
        );

        milestoneId = 1;
    });

    it("Should request extension successfully", async function () {
        // const newDeadline = Math.floor(Date.now() / 1000) + 86400 * 10 + 3600;
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10 + 3600; // 10 days + 1h

        const tx = await freelancePlatform.connect(freelancer).requestExtension(
            milestoneId,
            newDeadline
        );

        await expect(tx).to.emit(freelancePlatform, "MilestoneExtensionRequested")
            .withArgs(milestoneId, projectId);

        const milestone = await freelancePlatform.getMilestone(milestoneId);
        expect(milestone.extensionRequested).to.be.true;
    });

    it("Should approve extension successfully", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10; // 10 days

        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline);

        const tx = await freelancePlatform.connect(client).approveExtension(
            milestoneId,
            newDeadline
        );

        await expect(tx).to.emit(freelancePlatform, "MilestoneExtensionApproved")
            .withArgs(milestoneId, projectId, newDeadline);

        const milestone = await freelancePlatform.getMilestone(milestoneId);
        expect(milestone.deadline).to.equal(newDeadline);
        expect(milestone.extensionRequested).to.be.false;
    });

    it("Should revert if extension already requested", async function () {
        const latestBlock = await ethers.provider.getBlock("latest");
        const newDeadline = latestBlock.timestamp + 86400 * 10;

        await freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline);

        await expect(
            freelancePlatform.connect(freelancer).requestExtension(milestoneId, newDeadline)
        ).to.be.revertedWith("Extension already requested");
    });
});