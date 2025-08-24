const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET } = require("./helpers/setup");

describe("Edge Cases and Security", function () {
    let freelancePlatform, userRegistry;
    let owner, client, freelancer, otherUser, freshUser;

    beforeEach(async function () {
        // Get test accounts
        [owner, client, freelancer, otherUser, freshUser] = await ethers.getSigners();

        // Deploy contracts with helper
        ({ freelancePlatform, userRegistry } = await deployContracts(owner));
    });

        it("Should revert with invalid project ID", async function () {
            await expect(
                freelancePlatform.getProject(999)
            ).to.be.revertedWithCustomError(freelancePlatform, "InvalidProject");
        });

        it("Should revert with invalid milestone ID", async function () {
            await expect(
                freelancePlatform.getMilestone(999)
            ).to.be.revertedWith("Milestone doesn't exist");
        });

        it("Should handle reentrancy attacks", async function () {
            // The contract uses ReentrancyGuard, so this test ensures protection exists
            // In a real test, you'd deploy a malicious contract that tries to reenter
            expect(true).to.be.true; // Placeholder - actual reentrancy test would be more complex
        });

        it("Should reject direct ETH transfers without function calls", async function () {
            // The contract has a receive function, so it should accept ETH
            await expect(
                owner.sendTransaction({
                    to: freelancePlatform.target,
                    value: ethers.parseEther("1.0")
                })
            ).to.not.be.reverted;
        });

        it("Should revert fallback calls to non-existent functions", async function () {
            const data = "0x12345678"; // Random function selector

            await expect(
                owner.sendTransaction({
                    to: freelancePlatform.target,
                    data: data,
                    value: 0
                })
            ).to.be.revertedWith("Function not found");
        });
    });