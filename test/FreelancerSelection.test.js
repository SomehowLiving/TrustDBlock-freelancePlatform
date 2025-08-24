const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE } = require("./helpers/setup");


describe("Freelancer Selection", function () {
        let projectId, milestoneId;
    let freelancePlatform;
    let userRegistry;
    let owner, client, freelancer, admin, otherUser;

    beforeEach(async function () {
        ({ freelancePlatform, userRegistry, client, freelancer, owner, otherUser, freshUser } = await deployContracts());
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "QmTestHash", 7);
            projectId = 1;
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
        });

        it("Should select freelancer successfully", async function () {
            const tx = await freelancePlatform.connect(client).selectFreelancer(
                projectId,
                freelancer.address
            );

            await expect(tx).to.emit(freelancePlatform, "FreelancerSelected")
                .withArgs(projectId, freelancer.address);

            const project = await freelancePlatform.getProject(projectId);
            expect(project.freelancer).to.equal(freelancer.address);
            expect(project.status).to.equal(3); // Negotiating
        });

        it("Should allow freelancer to accept project", async function () {
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);

            const tx = await freelancePlatform.connect(freelancer).acceptProject(projectId);

            await expect(tx).to.emit(freelancePlatform, "FreelancerAcceptedProject")
                .withArgs(projectId, freelancer.address);

            expect(await freelancePlatform.freelancerAccepted(projectId)).to.be.true;
        });

        it("Should revert if freelancer already selected", async function () {
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);

            await expect(
                freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address)
            ).to.be.revertedWithCustomError(freelancePlatform, "FreelancerAlreadySelected");
        });

        it("Should revert with invalid freelancer address", async function () {
            await expect(
                freelancePlatform.connect(client).selectFreelancer(projectId, ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(freelancePlatform, "InvalidAddress");
        });

        it("Should revert if project not funded", async function () {
            // Create unfunded project
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "QmTestHash2", 7);
            const unfundedProjectId = 2;

            await expect(
                freelancePlatform.connect(client).selectFreelancer(unfundedProjectId, freelancer.address)
            ).to.be.revertedWithCustomError(freelancePlatform, "ProjectNotFunded");
        });
    });