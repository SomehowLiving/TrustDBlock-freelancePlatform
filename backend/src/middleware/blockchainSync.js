// middleware/blockchainSync.js
const { ethers } = require('ethers');
const { User, Project, Application, Milestone, Transaction, Dispute } = require('../models');
// Import contract ABIs
const freelancePlatform = require('../../abis/FreelancePlatform.json');
const userRegistry = require('../../abis/UserRegistry.json');

// Contract configurations
const CONTRACTS = {
  freelancePlatform: {
    address: process.env.FREELANCE_PLATFORM_ADDRESS || "0x1111111111111111111111111111111111111111",
    abi: freelancePlatform || []
  },
  userRegistry: {
    address: process.env.USER_REGISTRY_ADDRESS || "0x2222222222222222222222222222222222222222",
    abi: userRegistry || []
  }
};

class BlockchainSyncManager {
  constructor(contracts, provider) {
  this.contracts = contracts;
  this.provider = provider;
  this.isListening = false;
  this.eventHandlers = new Map();

  // Safe binding - only bind methods that actually exist
  const methodsToBind = [
    'handleUserRegistered',
    'handleProjectCreated', 
    'handleFundsDeposited',
    'handleFreelancerSelected',
    'handleFreelancerAcceptedProject',
    'handleApplicationSubmitted',
    'handleMilestonesAgreed',
    'handleProjectActivated',
    'handleMilestoneSubmitted',
    'handleMilestoneApproved',
    'handlePaymentReleased',
    'handleMilestoneExtensionRequested',
    'handleMilestoneExtensionApproved',
    'handleMilestoneFinalized',
    'handleMilestoneCanceled',
    'handleMilestoneAutoCancelled',
    'handleDisputeRaised',
    'handleDisputeResolved',
    'handleProjectCompleted',
    'handleFreelancersShortlisted',
    'handleReputationUpdated',
    'handleProjectRated',
    'handleUserRoleUpdated',
    'handleUserDeactivated',
    'handleUserReactivated'
  ];

  // Bind only existing methods
  methodsToBind.forEach(methodName => {
    if (typeof this[methodName] === 'function') {
      this[methodName] = this[methodName].bind(this);
      console.log(`✅ Bound method: ${methodName}`);
    } else {
      console.warn(`⚠️ Method ${methodName} does not exist, skipping binding`);
    }
  });
}
  // Initialize event listeners
  async startEventListening() {
    if (this.isListening) return;
    try {
      console.log('Starting blockchain event listeners...');
      // Validate provider
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }
      // Validate contract configurations
      if (!this.contracts.freelancePlatform.abi || this.contracts.freelancePlatform.abi.length === 0) {
        console.warn('FreelancePlatform ABI not loaded, skipping contract initialization');
        return;
      }
      // --- FreelancePlatform Contract ---
      const freelanceContract = new ethers.Contract(
        this.contracts.freelancePlatform.address,
        this.contracts.freelancePlatform.abi,
        this.provider
      );
      // Project Lifecycle Events
      freelanceContract.on('ProjectCreated', this.handleProjectCreated);
      freelanceContract.on('FundsDeposited', this.handleFundsDeposited);
      freelanceContract.on('ApplicationSubmitted', this.handleApplicationSubmitted);
      freelanceContract.on('FreelancersShortlisted', this.handleFreelancersShortlisted);
      freelanceContract.on('FreelancerSelected', this.handleFreelancerSelected);
      freelanceContract.on('FreelancerAcceptedProject', this.handleFreelancerAcceptedProject);
      freelanceContract.on('MilestonesAgreed', this.handleMilestonesAgreed);
      freelanceContract.on('ProjectActivated', this.handleProjectActivated);
      freelanceContract.on('ProjectCompleted', this.handleProjectCompleted);

      // Milestone Events
      freelanceContract.on('MilestoneSubmitted', this.handleMilestoneSubmitted);
      freelanceContract.on('MilestoneApproved', this.handleMilestoneApproved);
      freelanceContract.on('PaymentReleased', this.handlePaymentReleased);
      freelanceContract.on('MilestoneExtensionRequested', this.handleMilestoneExtensionRequested);
      freelanceContract.on('MilestoneExtensionApproved', this.handleMilestoneExtensionApproved);
      freelanceContract.on('MilestoneFinalized', this.handleMilestoneFinalized);
      freelanceContract.on('MilestoneCanceled', this.handleMilestoneCanceled);
      freelanceContract.on('MilestoneAutoCancelled', this.handleMilestoneAutoCancelled);

      // Dispute Events
      freelanceContract.on('DisputeRaised', this.handleDisputeRaised);
      freelanceContract.on('DisputeResolved', this.handleDisputeResolved);

      // Reputation Events
      freelanceContract.on('ReputationUpdated', this.handleReputationUpdated);
      freelanceContract.on('ProjectRated', this.handleProjectRated);

      if (!this.contracts.userRegistry.abi || this.contracts.userRegistry.abi.length === 0) {
        console.warn('UserRegistry ABI not loaded, skipping user event initialization');
      } else {
        // --- UserRegistry Contract ---
        const userContract = new ethers.Contract(
          this.contracts.userRegistry.address,
          this.contracts.userRegistry.abi,
          this.provider
        );

        // User Events - bind with correct parameters
        userContract.on('UserRegistered', this.handleUserRegistered);
        userContract.on('UserRoleUpdated', this.handleUserRoleUpdated);
        userContract.on('UserDeactivated', this.handleUserDeactivated);
        userContract.on('UserReactivated', this.handleUserReactivated);

        console.log('UserRegistry event listeners initialized');
      }

      this.isListening = true;
      console.log('Blockchain event listeners started successfully');
    } catch (error) {
      console.error('Error starting blockchain event listeners:', error);
      throw error;
    }
  }

  // Stop event listeners
  stopEventListening() {
    if (!this.isListening) return;
    try {
      // Remove all listeners
      this.provider.removeAllListeners();
      this.isListening = false;
      console.log('Blockchain event listeners stopped');
    } catch (error) {
      console.error('Error stopping event listeners:', error);
    }
  }

  // ==================== EVENT HANDLERS ====================
  //========================== PROJECT ===========================
  async handleProjectCreated(projectId, client, totalBudget, metadataHash, event) {
    try {
      console.log(`Project created: ID ${projectId}, Client: ${client}`);
      // Find existing project in MongoDB and update with blockchain data
      const project = await Project.findOneAndUpdate(
        { 'client.address': client.toLowerCase() },
        {
          onChainId: parseInt(projectId),
          projectId: parseInt(projectId),
          status: 'draft', // open-> draft?
          'budget.totalBudget': parseFloat(ethers.formatEther(totalBudget)),
          'blockchain.status': 'confirmed',
          'blockchain.txHash': event.transactionHash,
          'blockchain.blockNumber': event.blockNumber,
          'metadata.ipfsHash': metadataHash
        },
        {
          new: true,
          sort: { createdAt: -1 } // Get the most recent project
        }
      );

      if (project) {
        console.log(`Project ${projectId} confirmed in database`);
      } else {
        // Create new project if not found (shouldn't happen in normal flow)
        await Project.create({
          onChainId: parseInt(projectId),
          projectId: parseInt(projectId),
          title: `Project #${projectId}`,
          description: 'Created on blockchain',
          client: {
            address: client.toLowerCase(),
            displayName: `User ${client.slice(-6)}`
          },
          budget: {
            total: parseFloat(ethers.formatEther(totalBudget)),
            totalBudget: parseFloat(ethers.formatEther(totalBudget))
          },
          status: 'draft', //draft
          category: 'Other',
          timeline: {
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            createdAt: new Date()
          },
          blockchain: {
            status: 'confirmed',
            txHash: event.transactionHash,
            blockNumber: event.blockNumber
          },
          metadata: {
            ipfsHash: metadataHash
          }
        });
      }

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'project_created',
        entities: {
          projectId: parseInt(projectId),
          from: client.toLowerCase(),
          client: client.toLowerCase()
        },
        amounts: {
          amount: ethers.formatEther(totalBudget),
          fee: '0'
        },
        eventData: {
          metadataHash
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling ProjectCreated event:', error);
    }
  }

  async handleFundsDeposited(projectId, client, amount, event) {
    try {
      console.log(`Funds deposited: Project ${projectId}, Amount: ${ethers.formatEther(amount)}`);

      const project = await Project.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(projectId) },
            { projectId: parseInt(projectId) }
          ]
        },
        {
          status: 'open', //funded->open?
          'budget.escrowBalance': parseFloat(ethers.formatEther(amount)),
          'blockchain.depositTxHash': event.transactionHash
        },
        { new: true }
      );

      if (project) {
        console.log(`Project ${projectId} funding confirmed`);
      }

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'funds_deposited',
        entities: {
          projectId: parseInt(projectId),
          from: client.toLowerCase(),
          client: client.toLowerCase()
        },
        amounts: {
          amount: ethers.formatEther(amount),
          fee: '0'
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling FundsDeposited event:', error);
    }
  }

  async handleApplicationSubmitted(projectId, freelancer, proposalHash, event) {
    try {
      console.log(`Application submitted: Project ${projectId}, Freelancer: ${freelancer}`);
      //Update or create Applicatiom
      await Application.findOneAndUpdate(
        {
          projectId: parseInt(projectId),
          'freelancer.wallet': freelancer.toLowerCase()
        },
        {
          projectId: parseInt(projectId),
          'freelancer.wallet': freelancer.toLowerCase(),
          status: 'submitted',
          'proposal.hash': proposalHash,
          'timestamps.submittedAt': new Date(),
          'blockchain.txHash': event.transactionHash
        },
        {
          new: true,
          upsert: true // Create if doesn't exist
        }
      );
      await this.recordTransaction(
        {
          txHash: event.transactionHash,
          type: 'application_submitted',
          entities: {
            projectId: parseInt(projectId),
            freelancer: freelancer.toLowerCase(),
            from: freelancer.toLowerCase()
          },
          amounts: {
            amount: '0',
            fee: '0'
          },
          eventData: {
            proposalHash
          },
          blockNumber: event.blockNumber
        }
      );
    } catch (error) {
      console.error('Error handling ApplicationSubmitted event:', error);
    }
  }
  async handleFreelancersShortlisted(projectId, freelancers, event) {
  try {
    console.log(`Freelancers shortlisted: Project ${projectId}, Count: ${freelancers.length}`);
    
    // Update project with shortlisted freelancers
    const project = await Project.findOneAndUpdate(
      {
        $or: [
          { onChainId: parseInt(projectId) },
          { projectId: parseInt(projectId) }
        ]
      },
      {
        status: 'selecting',
        'timeline.shortlistingDate': new Date()
      },
      { new: true }
    );

    if (!project) {
      console.warn(`Project ${projectId} not found for shortlisting`);
      return;
    }

    // Update application status for shortlisted freelancers
    await Application.updateMany(
      {
        projectId: parseInt(projectId),
        'freelancer.wallet': { $in: freelancers.map(addr => addr.toLowerCase()) }
      },
      {
        status: 'shortlisted',
        'timestamps.shortlistedAt': new Date()
      }
    );

    // Update non-shortlisted applications to 'reviewed' status
    await Application.updateMany(
      {
        projectId: parseInt(projectId),
        'freelancer.wallet': { $nin: freelancers.map(addr => addr.toLowerCase()) },
        status: 'submitted'
      },
      {
        status: 'reviewed'
      }
    );

    // Record transaction
    await this.recordTransaction({
      txHash: event.transactionHash,
      type: 'freelancers_shortlisted',
      entities: {
        projectId: parseInt(projectId),
        freelancers: freelancers.map(addr => addr.toLowerCase()),
        client: project.client?.address || ''
      },
      amounts: {
        amount: '0',
        fee: '0'
      },
      eventData: {
        freelancerCount: freelancers.length,
        shortlistedAddresses: freelancers.map(addr => addr.toLowerCase())
      },
      blockNumber: event.blockNumber
    });

    console.log(`Successfully processed shortlisting for project ${projectId}`);

  } catch (error) {
    console.error('Error handling FreelancersShortlisted event:', error);
    console.error('Event details:', {
      projectId,
      freelancers,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber
    });
  }
  }
  async handleFreelancerSelected(projectId, freelancer, event) {
    try {
      console.log(`Freelancer selected: Project ${projectId}, Freelancer: ${freelancer}`);

      const project = await Project.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(projectId) },
            { projectId: parseInt(projectId) }
          ]
        },
        {
          status: 'negotiating',
          'freelancer.address': freelancer.toLowerCase(),
          'freelancer.selectedAt': new Date()
        },
        { new: true }
      );
      // Update selected application status
      await Application.findOneAndUpdate(
        {
          projectId: parseInt(projectId),
          'freelancer.wallet': freelancer.toLowerCase()
        },
        {
          status: 'selected',
          'timestamps.selectedAt': new Date()
        }
      );
      // Update other applications to rejected
      await Application.updateMany(
        {
          projectId: parseInt(projectId),
          'freelancer.wallet': { $ne: freelancer.toLowerCase() },
          status: { $in: ['submitted', 'shortlisted'] }
        },
        {
          status: 'rejected'
        }
      );

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'freelancer_selected',
        entities: {
          projectId: parseInt(projectId),
          freelancer: freelancer.toLowerCase(),
          to: freelancer.toLowerCase()
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling FreelancerSelected event:', error);
    }
  }

  async handleFreelancerAcceptedProject(projectId, freelancer, event) {
    try {
      console.log(`Freelancer accepted project: Project ${projectId}, Freelancer: ${freelancer}`);
      await Project.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(projectId) },
            { projectId: parseInt(projectId) }
          ]
        },
        {
          'freelancer.acceptedAt': new Date(),
          'timelinne.acceptedAt': new Date()
        },
        { new: true }
      );
      // Update application status
      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'project_accepted',
        entities: {
          projectId: parseInt(projectId),
          freelancer: freelancer.toLowerCase(),
          from: freelancer.toLowerCase()
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        blockNumber: event.blockNumber
      });
    } catch (error) {
      console.error('Error handling FreelancerAcceptedProject event:', error);
    }
  }
  async handleMilestonesAgreed(projectId, milestoneIds, event) {
    try {
      console.log(`Milestones agreed: Project ${projectId}, Count: ${milestones.length}`);

      const project = await Project.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(projectId) },
            { projectId: parseInt(projectId) }
          ]
        },
        {
          // status: 'active',
          'milestones.agreed': milestones,
          'milestones.total': milestones.length,
          'milestones.totalMilestones': milestones.length
        },
        { new: true }
      );
      // Create milestone records for each aggreed milestone
      for (const milestoneId of milestoneIds) {
        await Milestone.findOneAndUpdate(
          { oneChainId: parseInt(milestoneId) },
          {
            onChainId: parseInt(milestoneId),
            milestoneId: parseInt(milestoneId),
            projectId: parseInt(projectId),
            status: 'pending',
            'blockchain.status': 'confirmed',
            'blockchain.txHash': event.transactionHash,
            'timeline.createdAt': new date()
          },
          { new: true, upsert: true }
        );
      }
      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'milestones_agreed',
        entities: {
          projectId: parseInt(projectId),
          milestoneIds: milestoneIds.map(id => parseInt(id))
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        eventData: {
          milestoneCount: milestoneIds.length
        },
        blockNumber: event.blockNumber
      });
    } catch (error) {
      console.error('Error handling MilestonesAgreed event:', error);
    }
  }

  async handleProjectActivated(projectId, event) {
    try {
      console.log(`Project activated: project ${projectId}`);
      await Project.fineOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(projectId) },
            { projectId: parseInt(projectId) }
          ]
        },
        {
          status: 'in_progress',
          'timeline.startDate': new Date()
        },
        { new: true }
      );
      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'project_activated',
        entities: {
          projectId: parseInt(projectId)
        },
        amounts: {
          amount: 0,
          fee: 0
        },
        blockNumber: event.blockNumber
      });
    }
    catch (error) {
      console.error('Error Handling ProjectActivated event:', error);
    }
  }
  async handleMilestoneSubmitted(milestoneId, projectId, amount, freelancer, deliveryHash, event) {
    try {
      console.log(`Milestone submitted: ID ${milestoneId},Project ${projectId}, Freelancer: ${freelancer}, Amount: ${ethers.formatEther(amount)}`);

      const milestone = await Milestone.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(milestoneId) },
            { milestoneId: parseInt(milestoneId) }
          ]
        },
        {
          status: 'submitted',
          'submission.deliveryHash': deliveryHash,
          'submission.submittedAt': new Date(),
          'timeline.submittedAt': new Date(),
          'blockchain.submitTxHash': event.transactionHash
        },
        { new: true }
      );

      if (milestone) {
        console.log(`Milestone ${milestoneId} submission confirmed`);
      }

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'milestone_submitted',
        entities: {
          milestoneId: parseInt(milestoneId),
          projectId: milestone?.projectId,
          from: freelancer.toLowerCase(),
          freelancer: freelancer.toLowerCase()
        },
        amounts: {
          amount: milestone?.details?.amount?.toString() || '0',
          fee: '0'
        },
        eventData: {
          deliveryHash
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling MilestoneSubmitted event:', error);
    }
  }

  async handleMilestoneFinalSubmitted(milestoneId, projectId, finalSubmitTime, freelancer, event) {
    try {
      console.log(`Milestone final submitted: ID ${milestoneId}, Project ${projectId}, Freelancer: ${freelancer}`);

      await Milestone.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(milestoneId) },
            { milestoneId: parseInt(milestoneId) }
          ]
        },
        {
          status: 'submitted',
          'timeline.finalSubmittedAt': new Date(parseInt(finalSubmitTime) * 1000),
          'blockchain.finalSubmitTxHash': event.transactionHash
        },
        { new: true }
      );

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'milestone_final_submitted',
        entities: {
          milestoneId: parseInt(milestoneId),
          projectId: parseInt(projectId),
          freelancer: freelancer.toLowerCase()
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        eventData: {
          finalSubmitTime: parseInt(finalSubmitTime)
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling MilestoneFinalSubmitted event:', error);
    }
  }

  async handleMilestoneApproved(milestoneId, projectId, client, event) {
    try {
      console.log(`Milestone approved: ID ${milestoneId},  Project ${projectId}, Client: ${client}`);

      const milestone = await Milestone.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(milestoneId) },
            { milestoneId: parseInt(milestoneId) }
          ]
        },
        {
          status: 'approved',
          'approval.approvedBy': client.toLowerCase(),
          'approval.approvedAt': new Date(),
          'timeline.approvedAt': new Date(),
          'blockchain.approveTxHash': event.transactionHash
        },
        { new: true }
      );

      if (milestone) {
        console.log(`Milestone ${milestoneId} approval confirmed`);
      }

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'milestone_approved',
        entities: {
          milestoneId: parseInt(milestoneId),
          projectId: milestone?.projectId,
          from: client.toLowerCase(),
          client: client.toLowerCase()
        },
        amounts: {
          amount: milestone?.details?.amount?.toString() || '0',
          fee: '0'
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling MilestoneApproved event:', error);
    }
  }

  async handlePaymentReleased(milestoneId, freelancer, amount, platformFee, event) {
    try {
      console.log(`Payment released: Milestone ${milestoneId}, Amount: ${ethers.formatEther(amount)}`);

      const milestone = await Milestone.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(milestoneId) },
            { milestoneId: parseInt(milestoneId) }
          ]
        },
        {
          status: 'paid',
          'timeline.paidAt': new Date(),
          'blockchain.paymentTxHash': event.transactionHash
        },
        { new: true }
      );

      if (milestone) {
        // Update project completion status
        const completedMilestones = await Milestone.countDocuments({
          projectId: milestone.projectId,
          status: 'paid'
        });

        const project = await Project.findOneAndUpdate(
          {
            $or: [
              { onChainId: milestone.projectId },
              { projectId: milestone.projectId }
            ]
          },
          {
            'milestones.completed': completedMilestones,
            'milestones.completedMilestones': completedMilestones
          },
          { new: true }
        );

        // Check if project is completed
        if (project && completedMilestones >= project.milestones.total) {
          project.status = 'completed';
          project.timeline.endDate = new Date();
          await project.save();
        }

        // Update freelancer reputation
        await User.findOneAndUpdate(
          { address: freelancer.toLowerCase() },
          {
            $inc: {
              'reputation.totalEarned': parseFloat(ethers.formatEther(amount)),
              'reputation.completedProjects': completedMilestones >= (project?.milestones?.total || 0) ? 1 : 0
            }
          }
        );

        console.log(`Payment ${milestoneId} release confirmed`);
      }

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'payment_released',
        entities: {
          milestoneId: parseInt(milestoneId),
          projectId: milestone?.projectId,
          to: freelancer.toLowerCase(),
          freelancer: freelancer.toLowerCase()
        },
        amounts: {
          amount: ethers.formatEther(amount),
          fee: ethers.formatEther(platformFee)
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling PaymentReleased event:', error);
    }
  }
  //===============================MILESTONE EXTENSION=================================
  async handleMilestoneExtensionRequested(milestoneId, projectId, event) {
    try {
      console.log(`Extension requested: Milestone ${milestoneId}, Project ${projectId}`);

      await Milestone.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(milestoneId) },
            { milestoneId: parseInt(milestoneId) }
          ]
        },
        {
          'extension.requested': true,
          'extension.requestedAt': new Date()
        },
        { new: true }
      );

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'extension_requested',
        entities: {
          milestoneId: parseInt(milestoneId),
          projectId: parseInt(projectId)
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling MilestoneExtensionRequested event:', error);
    }
  }

  async handleMilestoneExtensionApproved(milestoneId, projectId, newDeadline, event) {
    try {
      console.log(`Extension approved: Milestone ${milestoneId}, New deadline: ${new Date(parseInt(newDeadline) * 1000)}`);

      await Milestone.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(milestoneId) },
            { milestoneId: parseInt(milestoneId) }
          ]
        },
        {
          'extension.approved': true,
          'extension.approvedAt': new Date(),
          'timeline.deadline': new Date(parseInt(newDeadline) * 1000)
        },
        { new: true }
      );

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'extension_approved',
        entities: {
          milestoneId: parseInt(milestoneId),
          projectId: parseInt(projectId)
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        eventData: {
          newDeadline: parseInt(newDeadline)
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling MilestoneExtensionApproved event:', error);
    }
  }

  async handleMilestoneFinalized(milestoneId, projectId, freelancer, event) {
    try {
      console.log(`Milestone finalized: ID ${milestoneId}, Project ${projectId}`);

      await Milestone.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(milestoneId) },
            { milestoneId: parseInt(milestoneId) }
          ]
        },
        {
          'timeline.finalizedAt': new Date(),
          'blockchain.finalizeTxHash': event.transactionHash
        },
        { new: true }
      );

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'milestone_finalized',
        entities: {
          milestoneId: parseInt(milestoneId),
          projectId: parseInt(projectId),
          freelancer: freelancer.toLowerCase()
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling MilestoneFinalized event:', error);
    }
  }

  async handleMilestoneCanceled(milestoneId, projectId, event) {
    try {
      console.log(`Milestone canceled: ID ${milestoneId}, Project ${projectId}`);

      await Milestone.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(milestoneId) },
            { milestoneId: parseInt(milestoneId) }
          ]
        },
        {
          status: 'cancelled',
          'timeline.cancelledAt': new Date(),
          'blockchain.cancelTxHash': event.transactionHash
        },
        { new: true }
      );

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'milestone_cancelled',
        entities: {
          milestoneId: parseInt(milestoneId),
          projectId: parseInt(projectId)
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling MilestoneCanceled event:', error);
    }
  }

  async handleMilestoneAutoCancelled(milestoneId, projectId, event) {
    try {
      console.log(`Milestone auto-cancelled: ID ${milestoneId}, Project ${projectId}`);
      await Milestone.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(milestoneId) },
            { milestoneId: parseInt(milestoneId) }
          ]
        },
        {
          status: 'cancelled',
          'flags.autoCancelled': true,
          'timeline.cancelledAt': new Date(),
          'blockchain.cancelTxHash': event.transactionHash
        },
        { new: true }
      );
      // Update project milestone counts
      const project = await Project.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(projectId) },
            { projectId: parseInt(projectId) }
          ]
        },
        {
          $inc: { 'milestones.completed': 1 }
        },
        { new: true }
      );

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'milestone_cancelled',
        entities: {
          milestoneId: parseInt(milestoneId),
          projectId: parseInt(projectId)
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        eventData: {
          autoCancelled: true
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling MilestoneAutoCancelled event:', error);
    }
  }

  //===============================DISPUTE================================
  async handleDisputeRaised(projectId, raisedBy, event) {
    try {
      console.log(`Dispute raised: Project ${projectId}, Raised by: ${raisedBy}`);

      // Update project dispute status
      const project = await Project.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(projectId) },
            { projectId: parseInt(projectId) }
          ]
        },
        {
          status: 'disputed',
          'flags.isDisputed': true
        },
        { new: true }
      );
      // Create dispute record
      const disputeId = `${projectId}-${Date.now()}`;
      await Dispute.create({
        disputeId,
        projectId: parseInt(projectId),
        milestoneId: 0, // Will be updated if specific milestone dispute
        parties: {
          client: { wallet: project?.client?.address || '' },
          freelancer: { wallet: project?.freelancer?.address || '' },
          raisedBy: raisedBy.toLowerCase(),
          againstAddress: raisedBy.toLowerCase() === project?.client?.address?.toLowerCase()
            ? project?.freelancer?.address || ''
            : project?.client?.address || ''
        },
        details: {
          reason: 'Blockchain dispute raised',
          category: 'other'
        },
        resolution: {
          status: 'open'
        },
        timeline: {
          raisedAt: new Date()
        }
      });

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'dispute_raised',
        entities: {
          milestoneId: parseInt(milestoneId),
          projectId: milestone?.projectId,
          from: raisedBy.toLowerCase()
        },
        amounts: {
          amount: milestone?.details?.amount?.toString() || '0',
          fee: '0'
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling DisputeRaised event:', error);
    }
  }

  async handleDisputeResolved(milestoneId, winner, amount, event) {
    try {
      console.log(`Dispute resolved: Milestone ${milestoneId}, Winner: ${winner}`);

      const milestone = await Milestone.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(milestoneId) },
            { milestoneId: parseInt(milestoneId) }
          ]
        },
        {
          status: winner.toLowerCase() === milestone.freelancer.toLowerCase() ? 'paid' : 'refunded',
          'dispute.resolved': true,
          'dispute.resolvedAt': new Date(),
          'dispute.winner': winner.toLowerCase()
        },
        { new: true }
      );

      if (milestone) {
        // Update dispute record
        await Dispute.findOneAndUpdate(
          { milestoneId: parseInt(milestoneId) },
          {
            'resolution.status': 'resolved',
            'resolution.winner': winner.toLowerCase(),
            'resolution.resolvedAt': new Date(),
            'timeline.resolvedAt': new Date()
          }
        );

        console.log(`Dispute resolution ${milestoneId} confirmed`);
      }

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'dispute_resolved',
        entities: {
          milestoneId: parseInt(milestoneId),
          projectId: milestone?.projectId,
          to: winner.toLowerCase()
        },
        amounts: {
          amount: ethers.formatEther(amount),
          fee: '0'
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling DisputeResolved event:', error);
    }
  }
  //====================================Project completed====================

  async handleProjectCompleted(projectId, freelancer, event) {
    try {
      console.log(`Project completed: ID ${projectId}, Freelancer: ${freelancer}`);

      const project = await Project.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(projectId) },
            { projectId: parseInt(projectId) }
          ]
        },
        {
          status: 'completed',
          'flags.isCompleted': true,
          'timeline.endDate': new Date()
        },
        { new: true }
      );

      // Update freelancer reputation
      await User.findOneAndUpdate(
        { address: freelancer.toLowerCase() },
        {
          $inc: {
            'reputation.completedProjects': 1,
            'reputation.totalProjects': 1
          }
        }
      );

      // Update client reputation
      if (project?.client?.address) {
        await User.findOneAndUpdate(
          { address: project.client.address.toLowerCase() },
          {
            $inc: {
              'reputation.totalProjects': 1
            }
          }
        );
      }

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'project_completed',
        entities: {
          projectId: parseInt(projectId),
          freelancer: freelancer.toLowerCase(),
          client: project?.client?.address || ''
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling ProjectCompleted event:', error);
    }
  }
  //==============================================
  async handleReputationUpdated(user, newScore, event) {
    try {
      console.log(`Reputation updated: User ${user}, New score: ${newScore}`);

      await User.findOneAndUpdate(
        { address: user.toLowerCase() },
        {
          'reputation.reputationScore': parseInt(newScore),
          'reputation.lastUpdated': new Date()
        },
        { new: true }
      );

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'reputation_updated',
        entities: {
          user: user.toLowerCase()
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        eventData: {
          newScore: parseInt(newScore)
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling ReputationUpdated event:', error);
    }
  }

  async handleProjectRated(projectId, rater, rating, event) {
    try {
      console.log(`Project rated: Project ${projectId}, Rater: ${rater}, Rating: ${rating}`);

      const project = await Project.findOne({
        $or: [
          { onChainId: parseInt(projectId) },
          { projectId: parseInt(projectId) }
        ]
      });

      if (project) {
        // Update project rating data
        await Project.findOneAndUpdate(
          {
            $or: [
              { onChainId: parseInt(projectId) },
              { projectId: parseInt(projectId) }
            ]
          },
          {
            $push: {
              'ratings': {
                rater: rater.toLowerCase(),
                rating: parseInt(rating),
                ratedAt: new Date()
              }
            }
          }
        );

        // Update user reputation if rating the freelancer
        if (rater.toLowerCase() === project.client?.address?.toLowerCase() && project.freelancer?.address) {
          const freelancer = await User.findOne({ address: project.freelancer.address.toLowerCase() });

          if (freelancer) {
            const currentTotal = freelancer.reputation.totalRatings || 0;
            const currentAverage = freelancer.reputation.averageRating || 0;
            const newTotal = currentTotal + 1;
            const newAverage = ((currentAverage * currentTotal) + parseInt(rating)) / newTotal;

            await User.findOneAndUpdate(
              { address: project.freelancer.address.toLowerCase() },
              {
                'reputation.averageRating': newAverage,
                'reputation.totalRatings': newTotal
              }
            );
          }
        }
      }

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'project_rated',
        entities: {
          projectId: parseInt(projectId),
          rater: rater.toLowerCase()
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        eventData: {
          rating: parseInt(rating)
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling ProjectRated event:', error);
    }
  }

  async handleUserRegistered(userAddress, role, timestamp, event) {
    try {
      console.log(`User registered: Address ${userAddress}, Role: ${role}, Timestamp: ${timestamp}`);

      // Check if user already exists
      const existingUser = await User.findOne({ address: userAddress.toLowerCase() });

      if (!existingUser) {
        // Create new user record
        await User.create({
          address: userAddress.toLowerCase(),
          username: `user_${userAddress.slice(-8)}`,
          email: `${userAddress.slice(-8)}@temp.com`, // Temporary email
          password: 'blockchain_user', // Placeholder password
          role: role.toLowerCase(),
          profile: {
            bio: 'Blockchain user',
            availability: 'available'
          },
          reputation: {
            totalProjects: 0,
            completedProjects: 0,
            totalEarned: 0,
            averageRating: 0,
            totalRatings: 0
          },
          isActive: true,
          createdAt: new Date(parseInt(timestamp) * 1000),
          'blockchain.registrationTxHash': event.transactionHash,
          'blockchain.registrationBlockNumber': event.blockNumber
        });
      } else {
        // Update existing user role and blockchain data
        await User.findOneAndUpdate(
          { address: userAddress.toLowerCase() },
          {
            role: role.toLowerCase(),
            isActive: true,
            updatedAt: new Date(),
            'blockchain.registrationTxHash': event.transactionHash,
            'blockchain.registrationBlockNumber': event.blockNumber
          }
        );
      }

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'user_registered',
        entities: {
          user: userAddress.toLowerCase()
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        eventData: {
          role: role.toLowerCase(),
          registrationTime: parseInt(timestamp)
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling UserRegistered event:', error);
    }
  }
  async handleUserRoleUpdated(userAddress, oldRole, newRole, event) {
    try {
      console.log(`User role updated: Address ${userAddress}, Old: ${oldRole}, New: ${newRole}`);

      await User.findOneAndUpdate(
        { address: userAddress.toLowerCase() },
        {
          role: newRole.toLowerCase(),
          updatedAt: new Date(),
          'blockchain.lastRoleUpdateTxHash': event.transactionHash
        },
        { new: true }
      );

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'user_role_updated',
        entities: {
          user: userAddress.toLowerCase()
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        eventData: {
          oldRole: oldRole.toLowerCase(),
          newRole: newRole.toLowerCase()
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling UserRoleUpdated event:', error);
    }
  }

  async handleUserDeactivated(userAddress, event) {
    try {
      console.log(`User deactivated: Address ${userAddress}`);

      await User.findOneAndUpdate(
        { address: userAddress.toLowerCase() },
        {
          isActive: false,
          updatedAt: new Date(),
          'blockchain.deactivationTxHash': event.transactionHash
        },
        { new: true }
      );

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'user_deactivated',
        entities: {
          user: userAddress.toLowerCase()
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling UserDeactivated event:', error);
    }
  }

  async handleUserReactivated(userAddress, event) {
    try {
      console.log(`User reactivated: Address ${userAddress}`);

      await User.findOneAndUpdate(
        { address: userAddress.toLowerCase() },
        {
          isActive: true,
          updatedAt: new Date(),
          'blockchain.reactivationTxHash': event.transactionHash
        },
        { new: true }
      );

      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'user_reactivated',
        entities: {
          user: userAddress.toLowerCase()
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling UserReactivated event:', error);
    }
  }

  // ==================== UTILITY METHODS ====================

  async recordTransaction(transactionData) {
    try {
      await Transaction.create({
        txHash: transactionData.txHash,
        blockNumber: transactionData.blockNumber,
        type: transactionData.type,
        entities: transactionData.entities,
        amounts: transactionData.amounts,
        status: 'confirmed',
        confirmations: 1,
        eventData: transactionData.eventData || {},
        timestamps: {
          timestamp: new Date(),
          createdAt: new Date(),
          confirmedAt: new Date()
        }
      });
    } catch (error) {
      if (error.code !== 11000) { // Ignore duplicate key errors
        console.error('Error recording transaction:', error);
      }
    }
  }

  // Sync historical data from blockchain
  async syncHistoricalData(fromBlock = 0, toBlock = 'latest') {
    try {
      console.log(`Syncing historical data from block ${fromBlock} to ${toBlock}`);
      // Validate contracts
      if (!this.contracts.freelancePlatform.abi || this.contracts.freelancePlatform.abi.length === 0) {
        console.warn('FreelancePlatform ABI not loaded, skipping historical sync');
        return { success: false, error: 'Contract ABI not loaded' };
      }
      const freelanceContract = new ethers.Contract(
        this.contracts.freelancePlatform.address,
        this.contracts.freelancePlatform.abi,
        this.provider
      );

      // Get all historical events
      const events = await freelanceContract.queryFilter('*', fromBlock, toBlock);

      let syncedEvents = 0;
      for (const event of events) {
        try {
          switch (event.event) {
            case 'ProjectCreated':
              await this.handleProjectCreated(...event.args, event);
              break;
            case 'FundsDeposited':
              await this.handleFundsDeposited(...event.args, event);
              break;
            case 'ApplicationSubmitted':
              await this.handleApplicationSubmitted(...event.args, event);
              break;
            case 'FreelancerShortlisted':
              await this.handleFreelancerShortlisted(...event.args, event);
              break;
            case 'FreelancerSelected':
              await this.handleFreelancerSelected(...event.args, event);
              break;
            case 'FreelancerAcceptedProject':
              await this.handleFreelancerAcceptedProject(...event.args, event);
              break;
            case 'MilestonesAgreed':
              await this.handleMilestonesAgreed(...event.args, event);
              break;
            case 'ProjectActivated':
              await this.handleProjectActivated(...event.args, event);
              break;
            case 'MilestoneSubmitted':
              await this.handleMilestoneSubmitted(...event.args, event);
              break;
            case 'MilestoneApproved':
              await this.handleMilestoneApproved(...event.args, event);
              break;
            case 'PaymentReleased':
              await this.handlePaymentReleased(...event.args, event);
              break;
            case 'MilestoneExtensionRequested':
              await this.handleMilestoneExtensionRequested(...event.args, event);
              break;
            case 'MilestoneExtensionApproved':
              await this.handleMilestoneExtensionApproved(...event.args, event);
              break;
            case 'MilestoneFinalized':
              await this.handleMilestoneFinalized(...event.args, event);
              break;
            case 'MilestoneCanceled':
              await this.handleMilestoneCanceled(...event.args, event);
              break;
            case 'MilestoneAutoCancelled':
              await this.handleMilestoneAutoCancelled(...event.args, event);
              break;

            case 'DisputeRaised':
              await this.handleDisputeRaised(...event.args, event);
              break;
            case 'DisputeResolved':
              await this.handleDisputeResolved(...event.args, event);
              break;
            case 'ProjectCompleted':
              await this.handleProjectCompleted(...event.args, event);
              break;
            case 'ReputationUpdated':
              await this.handleReputationUpdated(...event.args, event);
              break;
            case 'ProjectRated':
              await this.handleProjectRated(...event.args, event);
              break;
            default:
              console.warn(`Unhandled event type: ${event.event}`);
          }
          syncedEvents++;
        } catch (error) {
          console.error(`Error syncing event ${event.event}:`, error);
        }
      }

      console.log(`Historical sync completed. Synced ${syncedEvents} events.`);
      return { success: true, syncedEvents, totalEvents: events.length };

    } catch (error) {
      console.error('Historical sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get blockchain data for verification
  async verifyData(type, id) {
    try {
      // Validate contracts first
      if (!this.contracts.freelancePlatform.abi || this.contracts.freelancePlatform.abi.length === 0) {
        throw new Error('FreelancePlatform contract not properly initialized');
      }
      const freelanceContract = new ethers.Contract(
        this.contracts.freelancePlatform.address,
        this.contracts.freelancePlatform.abi,
        this.provider
      );

      switch (type) {
        case 'project':
          return await freelanceContract.getProject(id);
        case 'milestone':
          return await freelanceContract.getMilestone(id);
        case 'user':
          const userContract = new ethers.Contract(
            this.contracts.userRegistry.address,
            this.contracts.userRegistry.abi,
            this.provider
          );
          return await userContract.getUserProfile(id);
        default:
          throw new Error(`Unknown verification type: ${type}`);
      }
    } catch (error) {
      console.error(`Verification failed for ${type} ${id}:`, error);
      throw error;
    }
  }
}

// Middleware factory
function createBlockchainSyncMiddleware(contracts, provider) {
  const syncManager = new BlockchainSyncManager(contracts, provider);

  return {
    syncManager,

    // Middleware to ensure data consistency
    ensureDataConsistency: async (req, res, next) => {
      try {
        // This middleware can be used to verify critical data against blockchain
        // For performance, only verify on specific routes or conditions

        const shouldVerify = req.headers['x-verify-blockchain'] === 'true';
        if (!shouldVerify) {
          return next();
        }

        // Add verification logic here if needed
        next();
      } catch (error) {
        console.error('Data consistency check failed:', error);
        next(); // Continue even if verification fails
      }
    },

    // Initialize sync manager
    initialize: async () => {
      try {
        await syncManager.startEventListening();
        return syncManager;
      } catch (error) {
        console.error('Failed to initialize blockchain sync:', error);
        throw error;
      }
    },

    // Graceful shutdown
    shutdown: () => {
      syncManager.stopEventListening();
    }
  };
}

module.exports = {
  BlockchainSyncManager,
  createBlockchainSyncMiddleware
};