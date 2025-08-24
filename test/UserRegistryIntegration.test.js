const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET } = require("./helpers/setup");

    describe("UserRegistry Integration", function () {
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

            // Should not be able to apply
            await expect(
                freelancePlatform.connect(freelancer).applyForProject(1, "QmProposalHash")
            ).to.be.revertedWith("User not registered");
        });
    });
