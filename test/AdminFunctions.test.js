const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE } = require("./helpers/setup");

    describe("Admin Functions", function () {
        let freelancePlatform, userRegistry, client, freelancer, owner, admin, otherUser, freshUser;

        beforeEach(async function () {
            ({ freelancePlatform, userRegistry, client, freelancer, owner, admin, otherUser, freshUser } = await deployContracts());
            
        });
        it("Should update platform fee", async function () {
            const newFee = 500; // 5%

            await freelancePlatform.connect(owner).updatePlatformFee(newFee);

            expect(await freelancePlatform.platformFeePercent()).to.equal(newFee);
        });

        it("Should revert platform fee update if too high", async function () {
            const invalidFee = 1100; // 11%

            await expect(
                freelancePlatform.connect(owner).updatePlatformFee(invalidFee)
            ).to.be.revertedWith("Fee cannot exceed 10%");
        });

        it("Should update freelancer fee", async function () {
            const newFee = 300; // 3%

            await freelancePlatform.connect(owner).updateFreelancerFee(newFee);

            expect(await freelancePlatform.freelancerFeePercent()).to.equal(newFee);
        });

        it("Should authorize and revoke admin", async function () {
            await freelancePlatform.connect(owner).authorizeAdmin(admin.address);
            expect(await freelancePlatform.authorizedAdmins(admin.address)).to.be.true;

            await freelancePlatform.connect(owner).revokeAdmin(admin.address);
            expect(await freelancePlatform.authorizedAdmins(admin.address)).to.be.false;
        });

        it("Should update user registry", async function () {
            const UserRegistry = await ethers.getContractFactory("UserRegistry");
            const newUserRegistry = await UserRegistry.deploy();

            await freelancePlatform.connect(owner).updateUserRegistry(newUserRegistry.target);

            expect(await freelancePlatform.userRegistry()).to.equal(newUserRegistry.target);
        });

        it("Should revert user registry update with zero address", async function () {
            await expect(
                freelancePlatform.connect(owner).updateUserRegistry(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid UserRegistry address");
        });
    });