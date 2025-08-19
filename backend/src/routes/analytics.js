const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();
require('dotenv').config();

// Import shared models
const { User, Project, Application, Milestone, Transaction, Dispute } = require('../models');

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

// Get platform analytics
router.get('/platform/analytics', async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case '7d':
        dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        break;
      case '90d':
        dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
        break;
      default:
        dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    }

    // Project analytics
    const projectAnalytics = await Project.aggregate([
      {
        $facet: {
          totalProjects: [{ $count: 'count' }],
          projectsByStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          projectsByCategory: [
            { $group: { _id: '$category', count: { $sum: 1 } } }
          ],
          recentProjects: [
            { $match: { createdAt: dateFilter } },
            { $count: 'count' }
          ],
          totalVolume: [
            { $group: { _id: null, total: { $sum: '$budget.total' } } }
          ]
        }
      }
    ]);

    // User analytics
    const userAnalytics = await User.aggregate([
      {
        $facet: {
          totalUsers: [{ $count: 'count' }],
          usersByRole: [
            { $group: { _id: '$role', count: { $sum: 1 } } }
          ],
          activeUsers: [
            { $match: { isActive: true } },
            { $count: 'count' }
          ],
          newUsers: [
            { $match: { createdAt: dateFilter } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    // Transaction analytics (paid milestones)
    const transactionAnalytics = await Milestone.aggregate([
      {
        $match: { status: 'paid' }
      },
      {
        $facet: {
          totalTransactions: [{ $count: 'count' }],
          totalValue: [
            { $group: { _id: null, total: { $sum: '$details.amount' } } }
          ],
          recentTransactions: [
            { $match: { 'timeline.paidAt': dateFilter } },
            { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$details.amount' } } }
          ],
          averageProjectValue: [
            { $group: { _id: '$projectId', total: { $sum: '$details.amount' } } },
            { $group: { _id: null, avg: { $avg: '$total' } } }
          ]
        }
      }
    ]);

    // Freelancer performance
    const freelancerPerformance = await Milestone.aggregate([
      {
        $match: { status: 'paid' }
      },
      {
        $group: {
          _id: '$freelancer',
          totalEarned: { $sum: '$details.amount' },
          projectsCompleted: { $addToSet: '$projectId' },
          milestonesCompleted: { $sum: 1 }
        }
      },
      {
        $project: {
          totalEarned: 1,
          projectsCompleted: { $size: '$projectsCompleted' },
          milestonesCompleted: 1
        }
      },
      { $sort: { totalEarned: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        period,
        projects: projectAnalytics[0],
        users: userAnalytics[0],
        transactions: transactionAnalytics[0],
        topFreelancers: freelancerPerformance,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    handleError(error, res, 'Analytics fetch failed');
  }
});

// Get platform statistics
router.get('/platform/stats', async (req, res) => {
  try {
    const [
      totalProjects,
      activeProjects,
      completedProjects,
      totalUsers,
      totalFreelancers,
      totalClients,
      totalDisputes,
      totalTransactions,
      totalVolume
    ] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: 'active' }),
      Project.countDocuments({ status: 'completed' }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'freelancer', isActive: true }),
      User.countDocuments({ role: 'client', isActive: true }),
      Dispute.countDocuments(),
      Transaction.countDocuments({ status: 'confirmed' }),
      Transaction.aggregate([
        { $match: { status: 'confirmed', type: 'payment_released' } },
        { $group: { _id: null, total: { $sum: '$amounts.value' } } }
      ])
    ]);

    // Get recent activity
    const recentProjects = await Project.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title budget.total status createdAt client.displayName');

    const recentTransactions = await Transaction.find({ status: 'confirmed' })
      .sort({ 'timestamps.createdAt': -1 })
      .limit(5)
      .select('type amounts.value entities.projectId entities.from entities.to timestamps.createdAt');

    const stats = {
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        successRate: totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0
      },
      users: {
        total: totalUsers,
        freelancers: totalFreelancers,
        clients: totalClients
      },
      platform: {
        totalVolume: totalVolume[0]?.total || 0,
        totalTransactions,
        totalDisputes,
        disputeRate: totalProjects > 0 ? (totalDisputes / totalProjects) * 100 : 0
      },
      activity: {
        recentProjects: recentProjects.map(p => ({
          id: p.projectId,
          title: p.title,
          budget: p.budget.total,
          status: p.status,
          client: p.client.displayName,
          createdAt: p.createdAt
        })),
        recentTransactions: recentTransactions.map(t => ({
          type: t.type,
          amount: t.amounts.value,
          projectId: t.entities.projectId,
          from: t.entities.from,
          to: t.entities.to,
          timestamp: t.timestamps.createdAt
        }))
      }
    };

    // Try to get blockchain stats if available
    try {
      const blockchainStats = await freelancePlatformContract.getPlatformStats();
      const userStats = await userRegistryContract.getUserStats();

      stats.blockchain = {
        totalVolumeProcessed: formatEther(blockchainStats.totalVolume),
        totalFeesCollected: formatEther(blockchainStats.totalFees),
        totalProjectsCompleted: blockchainStats.totalProjects.toString(),
        activeProjects: blockchainStats.activeProjects.toString(),
        onChainUsers: {
          total: userStats.totalUsers.toString(),
          clients: userStats.totalClients.toString(),
          freelancers: userStats.totalFreelancers.toString(),
          admins: userStats.totalAdmins.toString()
        }
      };
    } catch (error) {
      console.warn('Failed to fetch blockchain stats:', error.message);
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    handleError(error, res, 'Getting Platform stats failed');
  }
});

// Health check with database status
router.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    const userCount = await User.countDocuments();
    const projectCount = await Project.countDocuments();
    const milestoneCount = await Milestone.countDocuments();

    // Check contract connectivity
    let contractStatus = 'unknown';
    try {
      const platformCounter = await freelancePlatformContract.projectCounter();
      contractStatus = 'connected';
    } catch (err) {
      contractStatus = 'disconnected';
    }

    res.json({
      success: true,
      data: {
        status: 'healthy',
        database: {
          connected: true,
          collections: {
            users: userCount,
            projects: projectCount,
            milestones: milestoneCount
          }
        },
        blockchain: {
          status: contractStatus,
          contracts: CONTRACTS
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

module.exports = router;