const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE, PLATFORM_FEE } = require("./helpers/setup");

describe("Application Process", function () {
    let projectId, milestoneId;
    let freelancePlatform;
    let userRegistry;
    let owner, client, freelancer, admin, otherUser;

    beforeEach(async function () {
        ({ freelancePlatform, userRegistry, client, freelancer, owner, admin, otherUser, freshUser } = await deployContracts());

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

    //---------------------------ADDITIONAL TESTS---------------------------
    it("Should revert if application deadline has passed", async function () {
        // fast-forward time beyond deadline
        await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // +8 days
        await ethers.provider.send("evm_mine");

        await expect(
            freelancePlatform.connect(freelancer).applyForProject(projectId, "QmLateProposal")
        ).to.be.revertedWith("Application deadline passed");
    });

    it("Should revert if inactive user tries to apply", async function () {
        // mark freelancer as inactive in registry
        await userRegistry.connect(owner).deactivateUser(freelancer.address);

        await expect(
            freelancePlatform.connect(freelancer).applyForProject(projectId, "QmInactiveProposal")
        ).to.be.revertedWith("User is inactive");
    });

    //------------have to think it thoughly----------------
    it("Should revert if unregistered user tries to apply", async function () {
        const newWallet = ethers.Wallet.createRandom().connect(ethers.provider);

        await expect(
            freelancePlatform.connect(newWallet).applyForProject(projectId, "QmUnregisteredProposal")
        ).to.be.revertedWith("User is inactive"); // <-- not "User not registered"
    });


    it("Should allow multiple different freelancers to apply", async function () {
        // register another freelancer
        await userRegistry.connect(otherUser).selfRegister("Freelancer", "QmOtherHash");

        await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposal1");
        await freelancePlatform.connect(otherUser).applyForProject(projectId, "QmProposal2");

        expect(await freelancePlatform.hasFreelancerApplied(projectId, freelancer.address)).to.be.true;
        expect(await freelancePlatform.hasFreelancerApplied(projectId, otherUser.address)).to.be.true;
    });

    it("Should revert if client shortlists a freelancer who did not apply", async function () {
        await expect(
            freelancePlatform.connect(client).shortlistFreelancers(projectId, [otherUser.address])
        ).to.be.revertedWith("Freelancer hasn't applied");
    });

    it("Should revert if client shortlists more than 10 freelancers", async function () {
        // create 11 registered freelancers
        const manyFreelancers = [];
        for (let i = 0; i < 11; i++) {
            const newFreelancer = ethers.Wallet.createRandom().connect(ethers.provider);

            // fund gas for new account
            await owner.sendTransaction({
                to: newFreelancer.address,
                value: ethers.parseEther("1"), // v6 syntax
            });

            await userRegistry.connect(newFreelancer).selfRegister("Freelancer", `QmHash${i}`);
            manyFreelancers.push(newFreelancer.address);

            // each applies
            await freelancePlatform.connect(newFreelancer).applyForProject(projectId, `QmProposal${i}`);
        }

        await expect(
            freelancePlatform.connect(client).shortlistFreelancers(projectId, manyFreelancers)
        ).to.be.revertedWith("Too many shortlisted");
    });


    it("Should revert if client shortlists after deadline passed", async function () {
        await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposal");

        // move time past deadline
        await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // +8 days
        await ethers.provider.send("evm_mine");

        await expect(
            freelancePlatform.connect(client).shortlistFreelancers(projectId, [freelancer.address])
        ).to.be.revertedWith("Application period ended");
    });
});