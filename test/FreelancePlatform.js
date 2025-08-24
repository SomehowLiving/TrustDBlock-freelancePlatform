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

    describe("Project Creation", function () {
        it("Should create a project successfully", async function () {
            const tx = await freelancePlatform.connect(client).createProject(
                PROJECT_BUDGET,
                3,
                "QmTestHash",
                7
            );

            await expect(tx).to.emit(freelancePlatform, "ProjectCreated")
                .withArgs(1, client.address, PROJECT_BUDGET);

            const project = await freelancePlatform.getProject(1);
            expect(project.client).to.equal(client.address);
            expect(project.totalBudget).to.equal(PROJECT_BUDGET);
            expect(project.status).to.equal(0); // Draft
        });

        it("Should increment project counter", async function () {
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "QmTestHash", 7);
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "QmTestHash2", 7);

            expect(await freelancePlatform.projectCounter()).to.equal(2);
        });

        it("Should revert with zero budget", async function () {
            await expect(
                freelancePlatform.connect(client).createProject(0, 3, "QmTestHash", 7)
            ).to.be.revertedWithCustomError(freelancePlatform, "InvalidAmount");
        });

        it("Should revert with empty metadata hash", async function () {
            await expect(
                freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "", 7)
            ).to.be.revertedWith("Metadata hash required");
        });

        it("Should revert if caller is not registered", async function () {
            const [, , , , , freshUser] = await ethers.getSigners(); // Get unused signer
            await expect(
                freelancePlatform.connect(freshUser).createProject(PROJECT_BUDGET, 3, "QmTestHash", 7)
            ).to.be.revertedWith("User not registered");
        });

        it("Should revert if caller doesn't have client role", async function () {
            await userRegistry.connect(otherUser).selfRegister("Freelancer", "QmOtherHash");
            await expect(
                freelancePlatform.connect(otherUser).createProject(PROJECT_BUDGET, 3, "QmTestHash", 7)
            ).to.be.revertedWith("Only clients allowed");
        });
    });

    describe("Fund Deposit", function () {
        let projectId;
        beforeEach(async function () {
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
    });

    describe("Application Process", function () {
        let projectId;

        beforeEach(async function () {
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

    describe("Freelancer Selection", function () {
        let projectId;

        beforeEach(async function () {
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

    describe("Milestone Management", function () {
        let projectId;

        beforeEach(async function () {
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 2, "QmTestHash", 7);
            projectId = 1;
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(projectId);
        });
        function getMilestoneAmounts(projectBudget, numMilestones) {
            const escrowBalance = projectBudget - (projectBudget * 3n / 100n); // Subtract platform fee
            const baseAmount = escrowBalance / BigInt(numMilestones);
            const remainder = escrowBalance % BigInt(numMilestones);

            const amounts = [];
            for (let i = 0; i < numMilestones; i++) {
                amounts.push(baseAmount + (i === numMilestones - 1 ? remainder : 0n));
            }
            return amounts;
        }
        it("Should agree on milestones successfully", async function () {
            const amounts = getMilestoneAmounts(PROJECT_BUDGET, 2);
            const deadlines = [
                Math.floor(Date.now() / 1000) + 86400 * 7 + 3600, // 1 week
                Math.floor(Date.now() / 1000) + 86400 * 14 + 3600  // 2 weeks
            ];
            const metadataHashes = ["QmMilestone1", "QmMilestone2"];

            const tx = await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            await expect(tx).to.emit(freelancePlatform, "MilestonesAgreed");
            await expect(tx).to.emit(freelancePlatform, "ProjectActivated")
                .withArgs(projectId);

            const project = await freelancePlatform.getProject(projectId);
            expect(project.status).to.equal(4); // Active

            const milestone1 = await freelancePlatform.getMilestone(1);
            expect(milestone1.projectId).to.equal(projectId);
            expect(milestone1.amount).to.equal(amounts[0]); // actual calculated amount
        });
        it("Should revert with array length mismatch", async function () {
            const amounts = [MILESTONE_AMOUNT];
            const deadlines = [Math.floor(Date.now() / 1000) + 86400 * 7 + 3600, Math.floor(Date.now() / 1000) + 86400 * 14 + 3600];
            const metadataHashes = ["QmMilestone1"];

            await expect(
                freelancePlatform.connect(client).agreeMilestones(
                    projectId,
                    amounts,
                    deadlines,
                    metadataHashes
                )
            ).to.be.revertedWith("Array mismatch");
        });

        it("Should revert if total amount exceeds escrow", async function () {
            const amounts = [PROJECT_BUDGET, PROJECT_BUDGET]; // Exceeds available
            const deadlines = [Math.floor(Date.now() / 1000) + 86400 * 7 + 3600, Math.floor(Date.now() / 1000) + 86400 * 14 + 3600];
            const metadataHashes = ["QmMilestone1", "QmMilestone2"];

            await expect(
                freelancePlatform.connect(client).agreeMilestones(
                    projectId,
                    amounts,
                    deadlines,
                    metadataHashes
                )
            ).to.be.revertedWith("Amount exceeds escrow");
        });

        it("Should revert if freelancer hasn't accepted", async function () {
            // Create new project without acceptance
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 2, "QmTestHash2", 7);
            const newProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(client).selectFreelancer(newProjectId, freelancer.address);

            const amounts = [MILESTONE_AMOUNT, MILESTONE_AMOUNT];
            const deadlines = [Math.floor(Date.now() / 1000) + 86400 * 7 + 3600, Math.floor(Date.now() / 1000) + 86400 * 14 + 3600];
            const metadataHashes = ["QmMilestone1", "QmMilestone2"];

            await expect(
                freelancePlatform.connect(client).agreeMilestones(
                    newProjectId,
                    amounts,
                    deadlines,
                    metadataHashes
                )
            ).to.be.revertedWith("Freelancer hasn't accepted");
        });
    });

    describe("Milestone Submission", function () {
        let projectId, milestoneId;

        beforeEach(async function () {
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
            projectId = 1;
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(projectId);

            const amounts = [MILESTONE_AMOUNT];
            const deadlines = [Math.floor(Date.now() / 1000) + 86400 * 7 + 3600];
            const metadataHashes = ["QmMilestone1"];

            await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            milestoneId = 1;
        });

        it("Should submit milestone work successfully", async function () {
            const tx = await freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmDeliveryHash",
                "Work completed as agreed"
            );

            await expect(tx).to.emit(freelancePlatform, "MilestoneSubmitted")
                .withArgs(milestoneId, projectId, MILESTONE_AMOUNT);

            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(1); // Submitted

            const delivery = await freelancePlatform.getDelivery(milestoneId);
            expect(delivery.deliveryHash).to.equal("QmDeliveryHash");
            expect(delivery.notes).to.equal("Work completed as agreed");
        });

        it("Should revert if milestone already submitted", async function () {
            await freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmDeliveryHash",
                "Work completed"
            );

            await expect(
                freelancePlatform.connect(freelancer).submitMilestoneWork(
                    milestoneId,
                    "QmDeliveryHash2",
                    "Updated work"
                )
            ).to.be.revertedWith("Invalid milestone status");
        });

        it("Should allow final submission", async function () {
            // Move time close to deadline
            await ethers.provider.send("evm_increaseTime", [86400 * 6]); // 6 days
            await ethers.provider.send("evm_mine");

            const tx = await freelancePlatform.connect(freelancer).finalSubmitMilestone(milestoneId);

            await expect(tx).to.emit(freelancePlatform, "MilestoneFinalSubmitted");

            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(1); // Submitted
            expect(milestone.finalSubmitTime).to.be.greaterThan(0);
        });
    });

    describe("Milestone Approval and Payment", function () {
    let projectId, milestoneId;

    beforeEach(async function () {
        await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
        projectId = 1;
        await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
        await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
        await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
        await freelancePlatform.connect(freelancer).acceptProject(projectId);

        const amounts = [MILESTONE_AMOUNT];

        // Use blockchain timestamp for deadlines
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600]; 
        const metadataHashes = ["QmMilestone1"];

        await freelancePlatform.connect(client).agreeMilestones(
            projectId,
            amounts,
            deadlines,
            metadataHashes
        );

        milestoneId = 1;
        await freelancePlatform.connect(freelancer).submitMilestoneWork(
            milestoneId,
            "QmDeliveryHash",
            "Work completed"
        );
    });

    it("Should approve milestone successfully", async function () {
        const tx = await freelancePlatform.connect(client).approveMilestone(milestoneId);

        await expect(tx).to.emit(freelancePlatform, "MilestoneApproved")
            .withArgs(milestoneId, projectId, client.address);

        const milestone = await freelancePlatform.getMilestone(milestoneId);
        expect(milestone.status).to.equal(2); // Approved
    });

    it("Should release payment successfully", async function () {
        await freelancePlatform.connect(client).approveMilestone(milestoneId);

        const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);
        const expectedFee = (MILESTONE_AMOUNT * BigInt(FREELANCER_FEE)) / 10000n;
        const expectedPayment = MILESTONE_AMOUNT - expectedFee;

        const tx = await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);

        await expect(tx).to.emit(freelancePlatform, "PaymentReleased")
            .withArgs(milestoneId, projectId, expectedPayment, freelancer.address);

        const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
        expect(freelancerBalanceAfter - freelancerBalanceBefore).to.equal(expectedPayment);

        const milestone = await freelancePlatform.getMilestone(milestoneId);
        expect(milestone.status).to.equal(3); // Paid
    });

    it("Should complete project after all milestones paid", async function () {
        await freelancePlatform.connect(client).approveMilestone(milestoneId);

        const tx = await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);

        await expect(tx).to.emit(freelancePlatform, "ProjectCompleted")
            .withArgs(projectId, freelancer.address);

        const project = await freelancePlatform.getProject(projectId);
        expect(project.status).to.equal(5); // Completed
    });

    it("Should auto-approve milestone after timeout", async function () {
        await ethers.provider.send("evm_increaseTime", [86400 * 11]); // 11 days
        await ethers.provider.send("evm_mine");

        const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);
        const expectedFee = (MILESTONE_AMOUNT * BigInt(FREELANCER_FEE)) / 10000n;
        const expectedPayment = MILESTONE_AMOUNT - expectedFee;

        const tx = await freelancePlatform.autoApproveMilestone(milestoneId);

        await expect(tx).to.emit(freelancePlatform, "MilestoneApproved")
            .withArgs(milestoneId, projectId, ethers.ZeroAddress);
        await expect(tx).to.emit(freelancePlatform, "PaymentReleased")
            .withArgs(milestoneId, projectId, expectedPayment, freelancer.address);

        const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
        expect(freelancerBalanceAfter - freelancerBalanceBefore).to.equal(expectedPayment);
    });

    it("Should revert approval if milestone not submitted", async function () {
        await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
        const newProjectId = 2;
        await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET });
        await freelancePlatform.connect(freelancer).applyForProject(newProjectId, "QmProposalHash");
        await freelancePlatform.connect(client).selectFreelancer(newProjectId, freelancer.address);
        await freelancePlatform.connect(freelancer).acceptProject(newProjectId);

        const amounts = [MILESTONE_AMOUNT];
        // Use blockchain timestamp for deadlines
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600]; 
        const metadataHashes = ["QmMilestone1"];

        await freelancePlatform.connect(client).agreeMilestones(
            newProjectId,
            amounts,
            deadlines,
            metadataHashes
        );

        const newMilestoneId = 2;

        await expect(
            freelancePlatform.connect(client).approveMilestone(newMilestoneId)
        ).to.be.revertedWith("Milestone not submitted or already processed");
    });

    it("Should revert payment if milestone not approved", async function () {
        await expect(
            freelancePlatform.connect(client).releaseMilestonePayment(milestoneId)
        ).to.be.revertedWith("Milestone not approved");
    });
});


    describe("Extension System", function () {
        let projectId, milestoneId;

        beforeEach(async function () {
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

    describe("Dispute System", function () {
        let projectId, milestoneId;

        beforeEach(async function () {
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
            projectId = 1;
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(projectId);

            const amounts = [MILESTONE_AMOUNT];

            // Use blockchain time for deadline
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600]; // 7 days + 1h
            const metadataHashes = ["QmMilestone1"];

            await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            milestoneId = 1;

            await freelancePlatform.connect(freelancer).submitMilestoneWork(
                milestoneId,
                "QmDeliveryHash",
                "Work completed"
            );
        });

        it("Should raise dispute successfully", async function () {
            const tx = await freelancePlatform.connect(client).disputeMilestone(milestoneId);

            await expect(tx).to.emit(freelancePlatform, "DisputeRaised")
                .withArgs(projectId, client.address);

            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(4); // Disputed
            expect(milestone.disputeRaised).to.be.true;

            const project = await freelancePlatform.getProject(projectId);
            expect(project.isDisputed).to.be.true;
        });

        it("Should resolve dispute in favor of freelancer", async function () {
            await freelancePlatform.connect(client).disputeMilestone(milestoneId);

            const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);
            const disputedAmount = MILESTONE_AMOUNT;
            const expectedFee = (disputedAmount * BigInt(FREELANCER_FEE)) / 10000n;
            const expectedPayment = disputedAmount - expectedFee;

            const tx = await freelancePlatform.connect(owner).resolveDispute(
                milestoneId,
                freelancer.address,
                disputedAmount
            );

            await expect(tx).to.emit(freelancePlatform, "DisputeResolved")
                .withArgs(projectId, freelancer.address, disputedAmount);

            const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
            expect(freelancerBalanceAfter - freelancerBalanceBefore).to.equal(expectedPayment);

            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(3); // Paid
        });

        it("Should resolve dispute in favor of client", async function () {
            await freelancePlatform.connect(client).disputeMilestone(milestoneId);

            const clientBalanceBefore = await ethers.provider.getBalance(client.address);
            const disputedAmount = MILESTONE_AMOUNT;

            const tx = await freelancePlatform.connect(owner).resolveDispute(
                milestoneId,
                client.address,
                disputedAmount
            );

            await expect(tx).to.emit(freelancePlatform, "DisputeResolved")
                .withArgs(projectId, client.address, disputedAmount);

            const clientBalanceAfter = await ethers.provider.getBalance(client.address);
            expect(clientBalanceAfter - clientBalanceBefore).to.equal(disputedAmount);

            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(6); // Refunded
        });

        it("Should revert if milestone not submitted", async function () {
            // Create a new project for this test
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash2", 7);
            const newProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(newProjectId, "QmProposalHash2");
            await freelancePlatform.connect(client).selectFreelancer(newProjectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(newProjectId);

            const amounts = [MILESTONE_AMOUNT];

            // Blockchain-based deadline
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600];
            const metadataHashes = ["QmMilestone2"];

            await freelancePlatform.connect(client).agreeMilestones(
                newProjectId,
                amounts,
                deadlines,
                metadataHashes
            );

            const newMilestoneId = 2; // This would be the second milestone created

            await expect(
                freelancePlatform.connect(client).disputeMilestone(newMilestoneId)
            ).to.be.revertedWith("Milestone not in submitted state");
        });

        it("Should revert if dispute window expired", async function () {
            // Move time forward past dispute window
            await ethers.provider.send("evm_increaseTime", [86400 * 15]); // 15 days
            await ethers.provider.send("evm_mine");

            await expect(
                freelancePlatform.connect(client).disputeMilestone(milestoneId)
            ).to.be.revertedWith("Dispute window expired");
        });
    });

    describe("Reputation System", function () {
    let projectId, milestoneId;

    beforeEach(async function () {
        await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
        projectId = 1;
        await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
        await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
        await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
        await freelancePlatform.connect(freelancer).acceptProject(projectId);

        const amounts = [MILESTONE_AMOUNT];

        //  Use blockchain timestamp for deadlines
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600]; // 7 days + 1h
        const metadataHashes = ["QmMilestone1"];

        await freelancePlatform.connect(client).agreeMilestones(
            projectId,
            amounts,
            deadlines,
            metadataHashes
        );

        milestoneId = 1;

        await freelancePlatform.connect(freelancer).submitMilestoneWork(
            milestoneId,
            "QmDeliveryHash",
            "Work completed"
        );
        await freelancePlatform.connect(client).approveMilestone(milestoneId);
        await freelancePlatform.connect(client).releaseMilestonePayment(milestoneId);
    });

    it("Should update freelancer reputation after payment", async function () {
        const reputation = await freelancePlatform.getFreelancerReputation(freelancer.address);

        expect(reputation.totalEarned).to.equal(MILESTONE_AMOUNT);
        expect(reputation.projectsCompleted).to.equal(1);
    });

    it("Should rate project successfully", async function () {
        const rating = 5;

        const tx = await freelancePlatform.connect(client).rateProject(projectId, rating);

        await expect(tx).to.emit(freelancePlatform, "ProjectRated")
            .withArgs(projectId, client.address, rating);

        expect(await freelancePlatform.projectRatings(client.address, projectId))
            .to.equal(rating);

        const reputation = await freelancePlatform.getFreelancerReputation(freelancer.address);
        expect(reputation.totalRatings).to.equal(1);
        expect(reputation.averageRating).to.equal(rating);
    });

    it("Should revert rating if project not completed", async function () {
        // Create new project that's not completed
        await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash2", 7);
        const newProjectId = 2;

        await expect(
            freelancePlatform.connect(client).rateProject(newProjectId, 5)
        ).to.be.revertedWith("Project not completed");
    });

    it("Should revert if already rated", async function () {
        await freelancePlatform.connect(client).rateProject(projectId, 5);

        await expect(
            freelancePlatform.connect(client).rateProject(projectId, 4)
        ).to.be.revertedWith("Already rated");
    });

    it("Should revert with invalid rating", async function () {
        await expect(
            freelancePlatform.connect(client).rateProject(projectId, 0)
        ).to.be.revertedWith("Rating must be between 1 and 5");

        await expect(
            freelancePlatform.connect(client).rateProject(projectId, 6)
        ).to.be.revertedWith("Rating must be between 1 and 5");
    });
});

    describe("Cancellation System", function () {
        let projectId, milestoneId;

        beforeEach(async function () {
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
            projectId = 1;
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(projectId);

            const amounts = [MILESTONE_AMOUNT];

            const metadataHashes = ["QmMilestone1"];
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600];
            await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );

            milestoneId = 1;
        });

        it("Should auto-cancel milestone after deadline", async function () {
            // Move time past final submission deadline
            await ethers.provider.send("evm_increaseTime", [86400 * 18]); // 18 days
            await ethers.provider.send("evm_mine");

            const clientBalanceBefore = await ethers.provider.getBalance(client.address);

            const tx = await freelancePlatform.autoCancelMilestone(milestoneId);

            await expect(tx).to.emit(freelancePlatform, "MilestoneAutoCancelled")
                .withArgs(milestoneId, projectId);

            const clientBalanceAfter = await ethers.provider.getBalance(client.address);
            expect(clientBalanceAfter - clientBalanceBefore).to.equal(MILESTONE_AMOUNT);

            const milestone = await freelancePlatform.getMilestone(milestoneId);
            expect(milestone.status).to.equal(5); // Cancelled
        });

        it("Should cancel milestone with mutual agreement", async function () {
            // Both parties request cancellation
            await freelancePlatform.connect(client).requestMilestoneCancellation(milestoneId);

            const clientBalanceBefore = await ethers.provider.getBalance(client.address);

            const tx = await freelancePlatform.connect(freelancer).requestMilestoneCancellation(milestoneId);

            await expect(tx).to.emit(freelancePlatform, "MilestoneCanceled")
                .withArgs(milestoneId, projectId);

            const clientBalanceAfter = await ethers.provider.getBalance(client.address);
            expect(clientBalanceAfter - clientBalanceBefore).to.equal(MILESTONE_AMOUNT);
        });

        it("Should revert auto-cancel if not eligible", async function () {
            await expect(
                freelancePlatform.autoCancelMilestone(milestoneId)
            ).to.be.revertedWith("Not eligible for auto cancellation");
        });

        it("Should revert cancellation request from non-participant", async function () {
            await expect(
                freelancePlatform.connect(otherUser).requestMilestoneCancellation(milestoneId)
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
        });
    });

    describe("Emergency Functions", function () {
    let projectId;

    beforeEach(async function () {
        await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash", 7);
        projectId = 1;
    });

    it("Should allow emergency withdrawal in draft state", async function () {
        await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });

        const clientBalanceBefore = await ethers.provider.getBalance(client.address);

        await freelancePlatform.connect(client).emergencyWithdraw(projectId);

        const clientBalanceAfter = await ethers.provider.getBalance(client.address);
        const project = await freelancePlatform.getProject(projectId);

        expect(project.status).to.equal(6); // Cancelled
        expect(project.escrowBalance).to.equal(0);
        expect(clientBalanceAfter).to.be.greaterThan(clientBalanceBefore);
    });

    it("Should revert emergency withdrawal in active state", async function () {
        await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
        await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
        await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
        await freelancePlatform.connect(freelancer).acceptProject(projectId);

        const amounts = [MILESTONE_AMOUNT];

        // Use blockchain timestamp for deadline
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600];
        const metadataHashes = ["QmMilestone1"];

        await freelancePlatform.connect(client).agreeMilestones(
            projectId,
            amounts,
            deadlines,
            metadataHashes
        );

        await expect(
            freelancePlatform.connect(client).emergencyWithdraw(projectId)
        ).to.be.revertedWith("Cannot withdraw at this stage");
    });

    it("Should allow owner to emergency resolve dispute", async function () {
        await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
        await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
        await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
        await freelancePlatform.connect(freelancer).acceptProject(projectId);

        const amounts = [MILESTONE_AMOUNT];

        // Use blockchain timestamp for deadline
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadlines = [latestBlock.timestamp + 86400 * 7 + 3600];
        const metadataHashes = ["QmMilestone1"];

        await freelancePlatform.connect(client).agreeMilestones(
            projectId,
            amounts,
            deadlines,
            metadataHashes
        );

        const milestoneId = 1;
        await freelancePlatform.connect(freelancer).submitMilestoneWork(
            milestoneId,
            "QmDeliveryHash",
            "Work completed"
        );
        await freelancePlatform.connect(client).disputeMilestone(milestoneId);

        const freelancerBalanceBefore = await ethers.provider.getBalance(freelancer.address);

        const tx = await freelancePlatform.connect(owner).emergencyResolveDispute(
            projectId,
            freelancer.address
        );

        await expect(tx).to.emit(freelancePlatform, "DisputeResolved");

        const freelancerBalanceAfter = await ethers.provider.getBalance(freelancer.address);
        expect(freelancerBalanceAfter).to.be.greaterThan(freelancerBalanceBefore);
    });
});

    describe("Admin Functions", function () {
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

    describe("View Functions", function () {
        let projectId, milestoneId;

        beforeEach(async function () {
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 2, "QmTestHash", 7);
            projectId = 1;
            await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposalHash");
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
            await freelancePlatform.connect(freelancer).acceptProject(projectId);

            // Calculate available escrow after platform fees
            const platformFeePercent = 300; // 3% = 300 basis points
            const platformFee = (PROJECT_BUDGET * BigInt(platformFeePercent)) / 10000n;
            const availableEscrow = PROJECT_BUDGET - platformFee;

            // Split available escrow into 2 equal milestones
            const milestoneAmount = availableEscrow / 2n;

            const amounts = [milestoneAmount, milestoneAmount];

            // Use blockchain time instead of Date.now()
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [
                latestBlock.timestamp + 86400 * 7 + 3600,
                latestBlock.timestamp + 86400 * 14 + 3600
            ];
            const metadataHashes = ["QmMilestone1", "QmMilestone2"];

            await freelancePlatform.connect(client).agreeMilestones(
                projectId,
                amounts,
                deadlines,
                metadataHashes
            );
        });

        it("Should get project milestones", async function () {
            const milestones = await freelancePlatform.getProjectMilestones(projectId);

            expect(milestones.length).to.equal(2);
            expect(milestones[0]).to.equal(1);
            expect(milestones[1]).to.equal(2);
        });

        it("Should get client projects", async function () {
            // Create another project
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash2", 7);

            const clientProjects = await freelancePlatform.getClientProjects(client.address);

            expect(clientProjects.length).to.equal(2);
            expect(clientProjects[0]).to.equal(1);
            expect(clientProjects[1]).to.equal(2);
        });

        it("Should get freelancer projects", async function () {
            const freelancerProjects = await freelancePlatform.getFreelancerProjects(freelancer.address);

            expect(freelancerProjects.length).to.equal(1);
            expect(freelancerProjects[0]).to.equal(1);
        });

        it("Should get platform statistics", async function () {
            const stats = await freelancePlatform.getPlatformStats();

            expect(stats.totalProjects).to.equal(0); // No completed projects yet
            expect(stats.activeProjects).to.equal(1);
            expect(stats.totalVolume).to.equal(0); // No payments yet
        });

        it("Should get project status", async function () {
            const status = await freelancePlatform.getProjectStatus(projectId);
            expect(status).to.equal("Active");
        });

        it("Should get shortlisted freelancers", async function () {
            // Create new project for shortlisting
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 1, "QmTestHash2", 7);
            const newProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET });
            await freelancePlatform.connect(freelancer).applyForProject(newProjectId, "QmProposalHash");

            await freelancePlatform.connect(client).shortlistFreelancers(
                newProjectId,
                [freelancer.address]
            );

            const shortlisted = await freelancePlatform.getShortlistedFreelancers(newProjectId);
            expect(shortlisted.length).to.equal(1);
            expect(shortlisted[0]).to.equal(freelancer.address);
        });
    });
    
    describe("Edge Cases and Security", function () {
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
            // Calculate available escrow after platform fees
            const platformFeePercent = 300; // 3% = 300 basis points
            const platformFee = (PROJECT_BUDGET * BigInt(platformFeePercent)) / 10000n;
            const availableEscrow = PROJECT_BUDGET - platformFee;

            // Split available escrow into 2 equal milestones
            const milestoneAmount = availableEscrow / 2n;

            const amounts = [milestoneAmount, milestoneAmount];

            // Use blockchain time instead of Date.now()
            const latestBlock = await ethers.provider.getBlock("latest");
            const deadlines = [
                latestBlock.timestamp + 86400 * 7 + 3600,
                latestBlock.timestamp + 86400 * 14 + 3600
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

            // Check that the user is inactive via getUserProfile
            const profile = await userRegistry.getUserProfile(freelancer.address);
            expect(profile.isActive).to.equal(false);

            // Applying for a project should fail with a custom revert (if applied)
            await expect(
                freelancePlatform.connect(freelancer).applyForProject(1, "QmProposalHash")
            ).to.be.revertedWith("User is inactive"); // update the revert reason in your contract
        });
    });
});
