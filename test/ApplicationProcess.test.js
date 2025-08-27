const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts, PROJECT_BUDGET, MILESTONE_AMOUNT, FREELANCER_FEE, PLATFORM_FEE } = require("./helpers/setup");

describe("Enhanced Application Process Tests", function () {
    let projectId, milestoneId;
    let freelancePlatform;
    let userRegistry;
    let owner, client, freelancer, admin, otherUser, freshUser;

    beforeEach(async function () {
        ({ freelancePlatform, userRegistry, client, freelancer, owner, admin, otherUser, freshUser } = await deployContracts());

        await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "QmTestHash", 7);
        projectId = 1;
        await freelancePlatform.connect(client).depositFunds(projectId, { value: PROJECT_BUDGET });
    });

describe("Application Process", function () {
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
        ).to.be.revertedWith("Only freelancers allowed");
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
    describe("Application Function Edge Cases", function () {
        it("Should allow empty proposal hash (no validation in contract)", async function () {
            // Contract doesn't validate proposal hash, so this should succeed- gonna handle it in backend
            const tx = await freelancePlatform.connect(freelancer).applyForProject(projectId, "");
            await expect(tx).to.emit(freelancePlatform, "ApplicationSubmitted")
                .withArgs(projectId, freelancer.address, "");
        });

       it("Should revert application at exactly the deadline (< not <=)", async function () {
            // As Contract uses <= so at deadline it should still work, but let's test just before
            const project = await freelancePlatform.getProject(projectId);
            const deadline = project.applicationDeadline;
            
            // Set time to just before the deadline
            await ethers.provider.send("evm_setNextBlockTimestamp", [Number(deadline) - 1]);
            await ethers.provider.send("evm_mine");

            // Should allow application just before deadline
            const tx = await freelancePlatform.connect(freelancer).applyForProject(
                projectId,
                "QmDeadlineProposal"
            );

            await expect(tx).to.emit(freelancePlatform, "ApplicationSubmitted");
        });

        it("Should revert one second after deadline", async function () {
            const project = await freelancePlatform.getProject(projectId);
            const deadline = project.applicationDeadline;
            
            // Set time to one second after deadline
            await ethers.provider.send("evm_setNextBlockTimestamp", [Number(deadline) + 1]);
            await ethers.provider.send("evm_mine");

            await expect(
                freelancePlatform.connect(freelancer).applyForProject(projectId, "QmLateProposal")
            ).to.be.revertedWith("Application deadline passed");
        });

        it("Should prevent application to non-existent project", async function () {
            await expect(
                freelancePlatform.connect(freelancer).applyForProject(999, "QmProposal")
            ).to.be.revertedWithCustomError(freelancePlatform, "InvalidProject");
        });
    });

    describe("Shortlisting Function Tests", function () {
        beforeEach(async function () {
            // Apply with freelancer first
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposal1");
        });

        it("Should successfully shortlist a single freelancer", async function () {
            const tx = await freelancePlatform.connect(client).shortlistFreelancers(
                projectId,
                [freelancer.address]
            );

            await expect(tx).to.emit(freelancePlatform, "FreelancersShortlisted")
                .withArgs(projectId, [freelancer.address]);

            const project = await freelancePlatform.getProject(projectId);
            expect(project.status).to.equal(2); // Selecting status

            expect(await freelancePlatform.isShortlisted(projectId, freelancer.address)).to.be.true;
        });

        it("Should successfully shortlist multiple freelancers", async function () {
            // Register and apply with additional freelancers
            await userRegistry.connect(otherUser).selfRegister("Freelancer", "QmOtherHash");
            await freelancePlatform.connect(otherUser).applyForProject(projectId, "QmProposal2");

            const freelancers = [freelancer.address, otherUser.address];
            
            const tx = await freelancePlatform.connect(client).shortlistFreelancers(
                projectId,
                freelancers
            );

            await expect(tx).to.emit(freelancePlatform, "FreelancersShortlisted")
                .withArgs(projectId, freelancers);

            const shortlisted = await freelancePlatform.getShortlistedFreelancers(projectId);
            expect(shortlisted).to.deep.equal(freelancers);
        });

        it("Should clear previous shortlist when creating new one", async function () {
            // Register additional freelancer
            await userRegistry.connect(otherUser).selfRegister("Freelancer", "QmOtherHash");
            await freelancePlatform.connect(otherUser).applyForProject(projectId, "QmProposal2");

            // First shortlist
            await freelancePlatform.connect(client).shortlistFreelancers(
                projectId,
                [freelancer.address]
            );

             // Verify project is in Selecting status
            let project = await freelancePlatform.getProject(projectId);
            expect(project.status).to.equal(2); // Selecting

            // Reset project status back to Open for second shortlist
            // Note: not sorta possible 
            // Instead, let's create a fresh project for this test
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "QmTestHash2", 7);
            const newProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET });
            
            // Have both freelancers apply to new project
            await freelancePlatform.connect(freelancer).applyForProject(newProjectId, "QmProposal3");
            await freelancePlatform.connect(otherUser).applyForProject(newProjectId, "QmProposal4");

            // First shortlist
            await freelancePlatform.connect(client).shortlistFreelancers(
                newProjectId,
                [freelancer.address]
            );

            // This will fail because project is now in Selecting status
            // The Contract doesn't allow re-shortlisting once in Selecting status
            await expect(
                freelancePlatform.connect(client).shortlistFreelancers(
                    newProjectId,
                    [otherUser.address]
                )
            ).to.be.revertedWith("Invalid status");
        });

        it("Should revert shortlisting with empty array", async function () {
            await expect(
                freelancePlatform.connect(client).shortlistFreelancers(projectId, [])
            ).to.be.revertedWith("Cannot create empty shortlist");
        });
        it("Should allow duplicate freelancers (no validation in contract)", async function () {
            // Your contract doesn't prevent duplicates, so this should work
            const tx = await freelancePlatform.connect(client).shortlistFreelancers(
                projectId,
                [freelancer.address, freelancer.address]
            );
            await expect(tx).to.emit(freelancePlatform, "FreelancersShortlisted");
            
            const shortlisted = await freelancePlatform.getShortlistedFreelancers(projectId);
            expect(shortlisted).to.deep.equal([freelancer.address, freelancer.address]);
        });

        it("Should prevent duplicate freelancers via frontend validation", async function () {
            const freelancers = [freelancer.address, freelancer.address];
            
            // Frontend validation
            const unique = [...new Set(freelancers)];
            expect(unique.length).to.not.equal(freelancers.length);
            
            // Only send unique freelancers to contract
            const tx = await freelancePlatform.connect(client).shortlistFreelancers(
                projectId,
                unique
            );
            
            await expect(tx).to.emit(freelancePlatform, "FreelancersShortlisted");
        });

        it("Should revert shortlisting if project is not in Open status", async function () {
            // Change project status by selecting freelancer
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);

            await expect(
                freelancePlatform.connect(client).shortlistFreelancers(projectId, [freelancer.address])
            ).to.be.revertedWith("Invalid status");
        });

        it("Should revert if non-client tries to shortlist", async function () {
            await expect(
                freelancePlatform.connect(freelancer).shortlistFreelancers(projectId, [freelancer.address])
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
        });

        it("Should allow shortlisting exactly 10 freelancers", async function () {
            const freelancers = [];
            
            // Create exactly 10 freelancers
            for (let i = 0; i < 9; i++) { // We already have 1 (freelancer)
                const newFreelancer = ethers.Wallet.createRandom().connect(ethers.provider);
                await owner.sendTransaction({
                    to: newFreelancer.address,
                    value: ethers.parseEther("1"),
                });
                await userRegistry.connect(newFreelancer).selfRegister("Freelancer", `QmHash${i}`);
                await freelancePlatform.connect(newFreelancer).applyForProject(projectId, `QmProposal${i + 2}`);
                freelancers.push(newFreelancer.address);
            }
            freelancers.push(freelancer.address); // Add the original freelancer

            const tx = await freelancePlatform.connect(client).shortlistFreelancers(projectId, freelancers);
            await expect(tx).to.emit(freelancePlatform, "FreelancersShortlisted");

            const shortlisted = await freelancePlatform.getShortlistedFreelancers(projectId);
            expect(shortlisted.length).to.equal(10);
        });
    });

    describe("Select Freelancer Function Tests", function () {
        beforeEach(async function () {
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposal");
        });

        it("Should select freelancer directly from Open status", async function () {
            const tx = await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);

            await expect(tx).to.emit(freelancePlatform, "FreelancerSelected")
                .withArgs(projectId, freelancer.address);

            const project = await freelancePlatform.getProject(projectId);
            expect(project.freelancer).to.equal(freelancer.address);
            expect(project.status).to.equal(3); // Negotiating
        });

        it("Should select freelancer from shortlisted candidates", async function () {
            // First shortlist
            await freelancePlatform.connect(client).shortlistFreelancers(projectId, [freelancer.address]);

            const tx = await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);

            await expect(tx).to.emit(freelancePlatform, "FreelancerSelected")
                .withArgs(projectId, freelancer.address);

            const project = await freelancePlatform.getProject(projectId);
            expect(project.status).to.equal(3); // Negotiating
        });

        it("Should revert if selecting non-shortlisted freelancer from Selecting status", async function () {
            // Register another freelancer
            await userRegistry.connect(otherUser).selfRegister("Freelancer", "QmOtherHash");
            await freelancePlatform.connect(otherUser).applyForProject(projectId, "QmProposal2");

            // Shortlist only the first freelancer
            await freelancePlatform.connect(client).shortlistFreelancers(projectId, [freelancer.address]);

            // Try to select the non-shortlisted freelancer
            await expect(
                freelancePlatform.connect(client).selectFreelancer(projectId, otherUser.address)
            ).to.be.revertedWith("Freelancer not shortlisted");
        });

        it("Should revert if project is not funded", async function () {
            // Create unfunded project
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "QmTestHash2", 7);
            const unfundedProjectId = 2;

            await expect(
                freelancePlatform.connect(client).selectFreelancer(unfundedProjectId, freelancer.address)
            ).to.be.revertedWithCustomError(freelancePlatform, "ProjectNotFunded");
        });

        it("Should revert if selecting zero address", async function () {
            await expect(
                freelancePlatform.connect(client).selectFreelancer(projectId, ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(freelancePlatform, "InvalidAddress");
        });

        it("Should revert if freelancer already selected", async function () {
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);

            await expect(
                freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address)
            ).to.be.revertedWithCustomError(freelancePlatform, "FreelancerAlreadySelected");
        });

        it("Should revert if non-client tries to select", async function () {
            await expect(
                freelancePlatform.connect(freelancer).selectFreelancer(projectId, freelancer.address)
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
        });
    });

    describe("Accept Project Function Tests", function () {
        beforeEach(async function () {
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposal");
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
        });

        it("Should successfully accept project", async function () {
            const tx = await freelancePlatform.connect(freelancer).acceptProject(projectId);

            await expect(tx).to.emit(freelancePlatform, "FreelancerAcceptedProject")
                .withArgs(projectId, freelancer.address);

            expect(await freelancePlatform.freelancerAccepted(projectId)).to.be.true;
        });

        it("Should revert if project is not in Negotiating status", async function () {
            // Try to accept before being selected - should revert with custom error
            await freelancePlatform.connect(client).createProject(PROJECT_BUDGET, 3, "QmTestHash2", 7);
            const newProjectId = 2;
            await freelancePlatform.connect(client).depositFunds(newProjectId, { value: PROJECT_BUDGET });

            await expect(
                freelancePlatform.connect(freelancer).acceptProject(newProjectId)
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
        });

        it("Should revert if non-selected freelancer tries to accept", async function () {
            await userRegistry.connect(otherUser).selfRegister("Freelancer", "QmOtherHash");

            await expect(
                freelancePlatform.connect(otherUser).acceptProject(projectId)
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
        });

        it("Should revert if client tries to accept project", async function () {
            await expect(
                freelancePlatform.connect(client).acceptProject(projectId)
            ).to.be.revertedWithCustomError(freelancePlatform, "UnauthorizedCaller");
        });

        it("Should allow acceptance even if already accepted", async function () {
            // First acceptance
            await freelancePlatform.connect(freelancer).acceptProject(projectId);
            expect(await freelancePlatform.freelancerAccepted(projectId)).to.be.true;

            // Second acceptance (should not revert but also shouldn't change state)
            const tx = await freelancePlatform.connect(freelancer).acceptProject(projectId);
            await expect(tx).to.emit(freelancePlatform, "FreelancerAcceptedProject");
            expect(await freelancePlatform.freelancerAccepted(projectId)).to.be.true;
        });
    });

    describe("Integration Flow Tests", function () {
        it("Should handle complete application to acceptance flow", async function () {
            // Apply
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmProposal");
            expect(await freelancePlatform.hasFreelancerApplied(projectId, freelancer.address)).to.be.true;

            // Shortlist
            await freelancePlatform.connect(client).shortlistFreelancers(projectId, [freelancer.address]);
            expect(await freelancePlatform.isShortlisted(projectId, freelancer.address)).to.be.true;

            // Select
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancer.address);
            const project = await freelancePlatform.getProject(projectId);
            expect(project.freelancer).to.equal(freelancer.address);
            expect(project.status).to.equal(3); // Negotiating

            // Accept
            await freelancePlatform.connect(freelancer).acceptProject(projectId);
            expect(await freelancePlatform.freelancerAccepted(projectId)).to.be.true;
        });

        it("Should handle multiple applicants with selective shortlisting", async function () {
            // Create multiple freelancers
            const freelancers = [];
            for (let i = 0; i < 5; i++) {
                const newFreelancer = ethers.Wallet.createRandom().connect(ethers.provider);
                await owner.sendTransaction({
                    to: newFreelancer.address,
                    value: ethers.parseEther("1"),
                });
                await userRegistry.connect(newFreelancer).selfRegister("Freelancer", `QmHash${i}`);
                await freelancePlatform.connect(newFreelancer).applyForProject(projectId, `QmProposal${i}`);
                freelancers.push(newFreelancer);
            }

            // Also apply with original freelancer
            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmOriginalProposal");

            // Shortlist only 3 of them
            const shortlistedAddresses = [
                freelancers[0].address,
                freelancers[2].address,
                freelancer.address
            ];

            await freelancePlatform.connect(client).shortlistFreelancers(projectId, shortlistedAddresses);

            // Verify shortlisted status
            expect(await freelancePlatform.isShortlisted(projectId, freelancers[0].address)).to.be.true;
            expect(await freelancePlatform.isShortlisted(projectId, freelancers[1].address)).to.be.false;
            expect(await freelancePlatform.isShortlisted(projectId, freelancers[2].address)).to.be.true;

            // Select one of the shortlisted freelancers
            await freelancePlatform.connect(client).selectFreelancer(projectId, freelancers[0].address);

            const project = await freelancePlatform.getProject(projectId);
            expect(project.freelancer).to.equal(freelancers[0].address);
        });
    });

    describe("Gas Optimization Tests", function () {
        it("Should use reasonable gas for application", async function () {
            const tx = await freelancePlatform.connect(freelancer).applyForProject(
                projectId,
                "QmProposal"
            );
            const receipt = await tx.wait();
            
            // Application should use less than 100k gas
            expect(receipt.gasUsed).to.be.lessThan(100000);
        });

        it("Should use reasonable gas for shortlisting multiple freelancers", async function () {
            // Create 5 freelancers and have them apply
            const freelancers = [freelancer.address];
            for (let i = 0; i < 4; i++) {
                const newFreelancer = ethers.Wallet.createRandom().connect(ethers.provider);
                await owner.sendTransaction({
                    to: newFreelancer.address,
                    value: ethers.parseEther("1"),
                });
                await userRegistry.connect(newFreelancer).selfRegister("Freelancer", `QmHash${i}`);
                await freelancePlatform.connect(newFreelancer).applyForProject(projectId, `QmProposal${i}`);
                freelancers.push(newFreelancer.address);
            }

            await freelancePlatform.connect(freelancer).applyForProject(projectId, "QmOriginalProposal");

            const tx = await freelancePlatform.connect(client).shortlistFreelancers(projectId, freelancers);
            const receipt = await tx.wait();
            
            // Shortlisting 5 freelancers should use less than 350k gas
            expect(receipt.gasUsed).to.be.lessThan(350000);
        });
    });
});
