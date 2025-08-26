const { expect } = require("chai");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE, PLATFORM_FEE } = require("./helpers/setup");

describe("Fund Deposit", function () {
    let projectId, milestoneId;
    let freelancePlatform;
    let userRegistry;
    let owner, client, freelancer, admin, otherUser;

    beforeEach(async function () {
        ({ freelancePlatform, userRegistry, client, freelancer, owner, otherUser, freshUser } = await deployContracts());
        const tx = await freelancePlatform.connect(client).createProject(
            PROJECT_BUDGET,
            3,
            "QmTestHash",
            7
        );
        projectId = 1;
    });

    it("Should deposit funds successfully", async function () {
        const depositAmount = PROJECT_BUDGET + ethers.parseEther("0.1"); // Extra for fees

        const tx = await freelancePlatform.connect(client).depositFunds(projectId, {
            value: depositAmount
        });

        await expect(tx).to.emit(freelancePlatform, "FundsDeposited")
            .withArgs(projectId, depositAmount, client.address);

        const project = await freelancePlatform.getProject(projectId);
        expect(project.status).to.equal(1); // Open
        expect(project.escrowBalance).to.be.greaterThan(0);
    });

    it("Should calculate and transfer platform fee", async function () {
        const depositAmount = PROJECT_BUDGET;
        const expectedFee = (depositAmount * BigInt(PLATFORM_FEE)) / 10000n;
        const expectedEscrow = depositAmount - expectedFee;

        const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

        await freelancePlatform.connect(client).depositFunds(projectId, {
            value: depositAmount
        });

        const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
        expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedFee);

        const project = await freelancePlatform.getProject(projectId);
        expect(project.escrowBalance).to.equal(expectedEscrow);
    });

    it("Should revert with zero amount", async function () {
        await expect(
            freelancePlatform.connect(client).depositFunds(projectId, { value: 0 })
        ).to.be.revertedWithCustomError(freelancePlatform, "ZeroAmount");
    });

    it("Should revert with insufficient amount", async function () {
        const insufficientAmount = PROJECT_BUDGET / 2n;

        await expect(
            freelancePlatform.connect(client).depositFunds(projectId, {
                value: insufficientAmount
            })
        ).to.be.revertedWithCustomError(freelancePlatform, "InvalidAmount");
    });

    it("Should revert if already funded", async function () {
        await freelancePlatform.connect(client).depositFunds(projectId, {
            value: PROJECT_BUDGET
        });

        await expect(
            freelancePlatform.connect(client).depositFunds(projectId, {
                value: PROJECT_BUDGET
            })
        ).to.be.revertedWith("Already funded");
    });

    it("Should revert if not project client", async function () {
        await expect(
            freelancePlatform.connect(freelancer).depositFunds(projectId, {
                value: PROJECT_BUDGET
            })
        ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
    });

    // ----------------------------Additional Tests----------------------------
    it("Should update project status to Open after deposit", async function () {
        await freelancePlatform.connect(client).depositFunds(projectId, {
            value: PROJECT_BUDGET
        });

        const project = await freelancePlatform.getProject(projectId);
        expect(project.status).to.equal(1); // Open
    });

    it("Should set escrow balance correctly after deposit", async function () {
        const depositAmount = PROJECT_BUDGET;
        const expectedFee = (depositAmount * BigInt(PLATFORM_FEE)) / 10000n;
        const expectedEscrow = depositAmount - expectedFee;

        await freelancePlatform.connect(client).depositFunds(projectId, {
            value: depositAmount
        });

        const project = await freelancePlatform.getProject(projectId);
        expect(project.escrowBalance).to.equal(expectedEscrow);
    });

    it("Should track total fees collected", async function () {
        const depositAmount = PROJECT_BUDGET;
        const expectedFee = (depositAmount * BigInt(PLATFORM_FEE)) / 10000n;

        await freelancePlatform.connect(client).depositFunds(projectId, {
            value: depositAmount
        });

        const totalFees = await freelancePlatform.totalFeesCollected();
        expect(totalFees).to.equal(expectedFee);
    });

    it("Should revert if project status is not Draft", async function () {
        // Fund once (changes status to Open)
        await freelancePlatform.connect(client).depositFunds(projectId, {
            value: PROJECT_BUDGET
        });

        // Now status is Open, so a second deposit should fail
        await expect(
            freelancePlatform.connect(client).depositFunds(projectId, {
                value: PROJECT_BUDGET
            })
        ).to.be.revertedWith("Already funded");
    });

    it("Should revert when depositing funds again for an already funded project", async function () {
        // Simulate assignment
        const project = await freelancePlatform.getProject(projectId);
        await freelancePlatform.connect(client).depositFunds(projectId, {
            value: PROJECT_BUDGET
        });
        await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmFreelancerHash");
        // select freelancer
        await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);

        await expect(
            freelancePlatform.connect(client).depositFunds(projectId, {
                value: PROJECT_BUDGET
            })
        ).to.be.revertedWithCustomError(freelancePlatform, "FreelancerAlreadySelected");
    });

    it("Should revert if project already has freelancer", async function () {
        // Step 1: fund the project
        await freelancePlatform.connect(client).depositFunds(projectId, {
            value: PROJECT_BUDGET
        });
         await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmFreelancerHash");
          await freelancePlatform.connect(otherUser).applyForProject(projectId, "QmFreelancerHash");
       
        // Step 2: select the first freelancer
        await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);

        // Step 3: try selecting another freelancer
        await expect(
            freelancePlatform.connect(client).selectFreelancer(projectId, otherUser.address)
        ).to.be.revertedWithCustomError(freelancePlatform, "FreelancerAlreadySelected");
    });


    it("Should emit FundsDeposited with full deposit amount", async function () {
        const depositAmount = PROJECT_BUDGET;

        await expect(
            freelancePlatform.connect(client).depositFunds(projectId, { value: depositAmount })
        ).to.emit(freelancePlatform, "FundsDeposited")
            .withArgs(projectId, depositAmount, client.address);
    });

    it("Should transfer fee to owner immediately", async function () {
        const depositAmount = PROJECT_BUDGET;
        const expectedFee = (depositAmount * BigInt(PLATFORM_FEE)) / 10000n;

        const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

        const tx = await freelancePlatform.connect(client).depositFunds(projectId, {
            value: depositAmount
        });
        await tx.wait();

        const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
        expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedFee);
    });

});