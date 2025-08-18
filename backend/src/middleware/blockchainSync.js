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
  }
  // Initialize event listeners
  async startEventListening() {
    if (this.isListening) return;

    console.log('Starting blockchain event listeners...');

    // --- FreelancePlatform ---
    
    // Listen to FreelancePlatform events
    const freelanceContract = new ethers.Contract(
      this.contracts.freelancePlatform.address,
      this.contracts.freelancePlatform.abi,
      this.provider
    );

    // Listen to UserRegistry events
    const userContract = new ethers.Contract(
      this.contracts.userRegistry.address,
      this.contracts.userRegistry.abi,
      this.provider
    );

    // Project Events
    freelanceContract.on('ProjectCreated', this.handleProjectCreated.bind(this));
    freelanceContract.on('FundsDeposited', this.handleFundsDeposited.bind(this));
    freelanceContract.on('FreelancerSelected', this.handleFreelancerSelected.bind(this));
    freelanceContract.on('ProjectAccepted', this.handleProjectAccepted.bind(this));
    freelanceContract.on('MilestonesAgreed', this.handleMilestonesAgreed.bind(this));

    // Milestone Events
    freelanceContract.on('MilestoneSubmitted', this.handleMilestoneSubmitted.bind(this));
    freelanceContract.on('MilestoneApproved', this.handleMilestoneApproved.bind(this));
    freelanceContract.on('PaymentReleased', this.handlePaymentReleased.bind(this));
    freelanceContract.on('DisputeRaised', this.handleDisputeRaised.bind(this));
    freelanceContract.on('DisputeResolved', this.handleDisputeResolved.bind(this));

    // User Events
    userContract.on('UserRegistered', this.handleUserRegistered.bind(this));

    this.isListening = true;
    console.log('Blockchain event listeners started successfully');
  }

  // Stop event listeners
  stopEventListening() {
    if (!this.isListening) return;

    // Remove all listeners
    this.provider.removeAllListeners();
    this.isListening = false;
    console.log('Blockchain event listeners stopped');
  }

  // ==================== EVENT HANDLERS ====================

  async handleUserRegistered(userAddress, role, metadataHash, event) {
    try {
      console.log(`User registered: ${userAddress}, Role: ${role}`);

      // Update or create user in MongoDB
      const user = await User.findOneAndUpdate(
        { address: userAddress.toLowerCase() },
        {
          address: userAddress.toLowerCase(),
          isActive: true,
          'blockchain.status': 'confirmed',
          'blockchain.txHash': event.transactionHash,
          'blockchain.blockNumber': event.blockNumber
        },
        { 
          new: true, 
          upsert: false // Don't create if doesn't exist
        }
      );

      if (user) {
        console.log(`User ${userAddress} registration confirmed in database`);
      }

      // Record transaction
      await this.recordTransaction({
        txHash: event.transactionHash,
        type: 'user_registered',
        entities: {
          from: userAddress.toLowerCase(),
          userAddress: userAddress.toLowerCase()
        },
        amounts: {
          amount: '0',
          fee: '0'
        },
        eventData: {
          role,
          metadataHash
        },
        blockNumber: event.blockNumber
      });

    } catch (error) {
      console.error('Error handling UserRegistered event:', error);
    }
  }

  async handleProjectCreated(projectId, client, totalBudget, metadataHash, event) {
    try {
      console.log(`Project created: ID ${projectId}, Client: ${client}`);

      // Find existing project in MongoDB and update with blockchain data
      const project = await Project.findOneAndUpdate(
        { 'client.address': client.toLowerCase() },
        {
          onChainId: parseInt(projectId),
          projectId: parseInt(projectId),
          status: 'open',
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
          status: 'open',
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
          status: 'funded',
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

      // Update application status
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

  async handleMilestoneSubmitted(milestoneId, freelancer, deliveryHash, event) {
    try {
      console.log(`Milestone submitted: ID ${milestoneId}, Freelancer: ${freelancer}`);

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
          'blockchain.txHash': event.transactionHash
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

  async handleMilestoneApproved(milestoneId, client, event) {
    try {
      console.log(`Milestone approved: ID ${milestoneId}, Client: ${client}`);

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

  async handleDisputeRaised(milestoneId, raisedBy, event) {
    try {
      console.log(`Dispute raised: Milestone ${milestoneId}, Raised by: ${raisedBy}`);

      const milestone = await Milestone.findOneAndUpdate(
        {
          $or: [
            { onChainId: parseInt(milestoneId) },
            { milestoneId: parseInt(milestoneId) }
          ]
        },
        {
          status: 'disputed',
          'dispute.raised': true,
          'dispute.raisedBy': raisedBy.toLowerCase(),
          'dispute.raisedAt': new Date(),
          'timeline.disputedAt': new Date(),
          'blockchain.disputeTxHash': event.transactionHash
        },
        { new: true }
      );

      if (milestone) {
        // Update project dispute status
        await Project.findOneAndUpdate(
          {
            $or: [
              { onChainId: milestone.projectId },
              { projectId: milestone.projectId }
            ]
          },
          {
            'flags.isDisputed': true
          }
        );

        console.log(`Dispute ${milestoneId} confirmed`);
      }

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
            case 'FreelancerSelected':
              await this.handleFreelancerSelected(...event.args, event);
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
            case 'DisputeRaised':
              await this.handleDisputeRaised(...event.args, event);
              break;
            case 'DisputeResolved':
              await this.handleDisputeResolved(...event.args, event);
              break;
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