const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE } = require("./helpers/setup");

    describe("UserRegistry Integration", function () {
    let projectId, milestoneId;
    let freelancePlatform;
    let userRegistry;
    let owner, client, freelancer, admin, otherUser;

    beforeEach(async function () {
        ({ freelancePlatform, userRegistry, client, freelancer, owner, otherUser, freshUser } = await deployContracts());
    });
    
    it("Should properly check user roles", async function () {
            // Test that only registered users can create projects
            await expect(
                freelancePlatform.connect(otherUser).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7)
            ).to.be.revertedWith("User not registered");

            // Register other user as freelancer
            await userRegistry.connect(otherUser).selfRegister("Freelancer", "QmOtherHash");

            // Should still revert because freelancers can't create projects
            await expect(
                freelancePlatform.connect(otherUser).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7)
            ).to.be.revertedWith("Only clients allowed");
        });

        it("Should handle user deactivation", async function () {
            // Create and fund project
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
            await freelancePlatform.connect(client).depositFunds(1, { value: PROJECT_BUDGET });

            // Deactivate freelancer
            await userRegistry.connect(owner).deactivateUser(freelancer.address);

            // Check that the user is inactive via getUserProfile
            const profile = await userRegistry.getUserProfile(freelancer.address);
            expect(profile.isActive).to.equal(false);

            // Applying for a project should fail with a custom revert (if applied)
            await expect(
                freelancePlatform.connect(freelancer).applyForProject(1, "QmProposalHash")
            ).to.be.revertedWith("User is inactive"); // update the revert reason in your contract
        });
    });