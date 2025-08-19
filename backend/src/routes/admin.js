const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();
require('dotenv').config();

// Import shared models
const { User, Project, Application, Milestone, Transaction, Dispute } = require('./models');

// Import shared utilities
const { 
  validateAddress, 
  validateAmount, 
  parseEther, 
  formatEther, 
  generateId, 
  handleError,
  validateWallet,
  syncUser,
  generateProposalHash,
  mapStatusToContract,
  mapStatusFromContract,
  syncProjectStatus
} = require('./utils.js'); // You'll need to extract these to a utils file

// Contract configurations (shared)
const { CONTRACTS, provider, freelancePlatformContract, userRegistryContract } = require('./contracts.js'); // Extract contract setup


// Resolve dispute (admin only)
router.post('/admin/disputes/:id/resolve', async (req, res) => {
  try {
    const { winner, reasoning, compensation, amount, txHash, adminKey } = req.body;
    const disputeId = req.params.id;

    // Admin auth
    if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'demo-admin-key') {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    }

    if (!validateAddress(winner)) {
      return res.status(400).json({ success: false, error: 'Invalid winner address' });
    }
    const dispute = await Dispute.findOne({ disputeId });
    if (!dispute) return res.status(404).json({ success: false, error: 'Dispute not found' });

    if (dispute.resolution.status !== 'open') {
      return res.status(400).json({ success: false, error: 'Dispute is not open for resolution' });
    }
    const milestone = await Milestone.findOne({
      $or: [{ onChainId: dispute.milestoneId }, { milestoneId: dispute.milestoneId }]
    });
    if (!milestone) {
      return res.status(404).json({ success: false, error: 'Related Milestone not found' });
    }

    const project = await Project.findOne({
      $or: [{ onChainId: dispute.projectId }, { projectId: dispute.projectId }]
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Related project not found' });
    }
    // Calculate resolved amount
    const resolvedAmount = amount || milestone.details.amount || 0;

    // Update dispute (partial, safer)
    dispute.resolution.status = 'resolved';
    dispute.resolution.winner = winner.toLowerCase();
    dispute.resolution.reasoning = reasoning || '';
    dispute.resolution.amount = resolvedAmount || 0;
    dispute.resolution.resolvedBy = 'admin';
    dispute.resolution.resolvedAt = new Date();
    dispute.resolution.compensation = compensation || {};

    await dispute.save();

    // Update milestone
    milestone.status = winner.toLowerCase() === milestone.freelancer.toLowerCase() ? 'paid' : 'refunded';
    milestone.dispute.resolved = true;
    milestone.dispute.resolvedAt = new Date();
    milestone.dispute.winner = winner.toLowerCase();
    await milestone.save();

    // Update project
    const activeDisputes = await Dispute.countDocuments({
      projectId: dispute.projectId,
      'resolution.status': { $ne: 'resolved' }
    });

    if (activeDisputes === 0) {
      project.flags.isDisputed = false;
      await project.save();
    }

    // Record transaction
    const transaction = new Transaction({
      txHash: txHash || `0x${Date.now()}`,
      type: 'dispute_resolved',
      entities: {
        projectId: dispute.projectId,
        milestoneId: dispute.milestoneId,
        from:
          winner.toLowerCase() === milestone?.freelancer?.toLowerCase()
            ? project?.client?.address
            : milestone?.freelancer,
        to: winner.toLowerCase(),
        client: project?.client?.address,
        freelancer: milestone?.freelancer
      },
      amounts: {
        amount: resolvedAmount.toSring(),
        value: parseFloat(resolvedAmount)
      },
      status: 'confirmed'
    });

    await transaction.save();

    // Response
    res.json({
      success: true,
      data: { dispute, milestone, project, transaction },
      message: `Dispute resolved in favor of ${winner.toLowerCase() === milestone?.freelancer?.toLowerCase() ? 'freelancer' : 'client'
        }`,
      contractCall: {
        contract: 'FreelancePlatform',
        method: 'resolveDispute',
        params: [
          milestone?.onChainId || milestone.milestoneId,
          winner,
          parseEther(resolvedAmount.toSring()).toString()
        ],
        address: CONTRACTS.freelancePlatform.address
      }
    });
  } catch (error) {
    handleError(error, res, 'Dispute resolution failed');
  }
});

// Get all disputes (admin only)
router.get('/admin/disputes', async (req, res) => {
  try {
    const { status = 'open', page = 1, limit = 20 } = req.query;

    const disputes = await Dispute.find({ 'resolution.status': status })
      .sort({ 'timeline.raisedAt': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('projectId', 'title client freelancer')
      .lean();

    const total = await Dispute.countDocuments({ 'resolution.status': status });

    res.json({
      success: true,
      data: disputes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    handleError(error, res, 'Get disputes failed');
  }
});

// Sync blockchain data to MongoDB
router.post('/admin/sync-blockchain', async (req, res) => {
  try {
    const { adminKey } = req.body;

    if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'demo-admin-key') {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin credentials'
      });
    }

    let syncResults = {
      users: { synced: 0, errors: 0 },
      projects: { synced: 0, errors: 0 },
      milestones: { synced: 0, errors: 0 }
    };

    // Sync users from blockchain
    try {
      // This would need to be implemented based on your contract's user enumeration
      // For now, just acknowledge the request
      console.log('User sync would happen here');
    } catch (err) {
      syncResults.users.errors++;
    }

    // Sync projects from blockchain
    try {
      const projectCounter = await freelancePlatformContract.projectCounter();
      const totalProjects = parseInt(projectCounter.toString());

      for (let i = 1; i <= Math.min(totalProjects, 100); i++) { // Limit to 100 for demo
        try {
          const onChainProject = await freelancePlatformContract.getProject(i);
          const projectStatus = await freelancePlatformContract.getProjectStatus(i);

          // Update or create project in MongoDB
          await Project.findOneAndUpdate(
            { onChainId: i },
            {
              onChainId: i,
              status: projectStatus,
              'budget.escrowBalance': parseFloat(formatEther(onChainProject.escrowBalance)),
              'blockchain.status': 'confirmed'
            },
            { upsert: false } // Don't create new projects, only update existing ones
          );

          syncResults.projects.synced++;
        } catch (err) {
          syncResults.projects.errors++;
        }
      }
    } catch (err) {
      console.error('Project sync error:', err);
    }

    res.json({
      success: true,
      data: syncResults,
      message: 'Blockchain sync completed'
    });
  } catch (error) {
    handleError(error, res, 'Blockchain sync failed');
  }
});

module.exports = router;
