const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE, PLATFORM_FEE } = require("./helpers/setup");


describe("Application Process", function () {
        let projectId, milestoneId;
    let freelancePlatform;
    let userRegistry;
    let owner, client, freelancer, admin, otherUser;

        beforeEach(async function () {
            ({ freelancePlatform, userRegistry, client, freelancer, owner, otherUser, freshUser } = await deployContracts());
            
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "QmTestHash", 7);
            projectId = 1;
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
        });

        it("Should allow freelancer to apply", async function () {
            const tx = await freelancePlatform.connect(freelancer).applyForProject(
                projectId,
                "QmProposalHash"
            );

            await expect(tx).to.emit(freelancePlatform, "ApplicationSubmitted")
                .withArgs(projectId, freelancer.address, "QmProposalHash");

            expect(await freelancePlatform.hasFreelancerApplied(projectId, freelancer.address))
                .to.be.true;
        });

        it("Should revert if project is not open", async function () {
            // Change project status
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);

            // Register another freelancer
            await userRegistry.connect(otherUser).selfRegister("Freelancer", "QmOtherHash");

            await expect(
                freelancePlatform.connect(otherUser).applyForProject(projectId, "QmProposalHash")
            ).to.be.revertedWith("Applications not open");
        });

        it("Should revert if already applied", async function () {
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");

            await expect(
                freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash2")
            ).to.be.revertedWith("Already applied");
        });

        it("Should revert if client tries to apply", async function () {
            await expect(
                freelancePlatform.connect(client).applyForProject(projectId, "QmProposalHash")
            ).to.be.revertedWith("Client cannot apply");
        });
    });