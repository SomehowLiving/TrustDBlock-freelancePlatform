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

// Register user (hybrid approach)
router.post('/users/register', validateWallet, async (req, res) => {
  try {
    const { username, email, password, role, bio, skills = [] } = req.body;

    // Validate required fields
    if (!username || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, password, and role are required'
      });
    }

    if (!['client', 'freelancer', 'admin'].includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Role must be client, freelancer, or admin'
      });
    }

    // Check if user already exists in DB
    const existingUser = await User.findOne({
      $or: [
        { address: req.userAddress },
        { email: email.toLowerCase() },
        { username: username.toLowerCase() }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this address, email, or username'
      });
    }

    // Check blockchain registration
    const isRegistered = await userRegistryContract.isUserRegistered(req.userAddress);
    if (isRegistered) {
      return res.status(400).json({
        success: false,
        error: 'User already registered on blockchain'
      });
    }

    // Create user in MongoDB (pending blockchain confirmation)
    const user = await User.create({
      address: req.userAddress,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      role: role.toLowerCase(),
      profile: {
        bio: bio || '',
        skills: skills,
        availability: 'available'
      },
      isActive: false // Will be activated after blockchain confirmation
    });

    // Create metadata object for IPFS
    const metadata = {
      username,
      bio: bio || '',
      skills,
      registrationTime: Date.now()
    };
    const metadataHash = "QmUserMetadata123" + Date.now(); // Mock hash - implement IPFS upload

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          address: user.address,
          username: user.username,
          email: user.email,
          role: user.role,
          profile: user.profile
        },
        contractCall: {
          contract: 'UserRegistry',
          method: 'selfRegister',
          params: [role.charAt(0).toUpperCase() + role.slice(1), metadataHash],
          address: CONTRACTS.userRegistry.address
        }
      },
      message: 'User created in database. Please complete blockchain registration.'
    });
  } catch (error) {
    handleError(error, res, 'User registration failed');
  }
});

// Complete user registration (after blockchain confirmation)
router.post('/users/:address/confirm', async (req, res) => {
  try {
    const { txHash } = req.body;
    const userAddress = req.params.address.toLowerCase();

    // Verify blockchain registration
    const isRegistered = await userRegistryContract.isUserRegistered(userAddress);
    if (!isRegistered) {
      return res.status(400).json({
        success: false,
        error: 'User not registered on blockchain'
      });
    }

    // Update user in database
    const user = await User.findOneAndUpdate(
      { address: userAddress },
      {
        isActive: true,
        lastLogin: new Date(),
        'blockchain.status': 'confirmed',
        'blockchain.txHash': txHash
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found in database'
      });
    }

    res.json({
      success: true,
      data: user,
      message: 'User registration confirmed successfully'
    });
  } catch (error) {
    handleError(error, res, 'Registration confirmation failed');
  }
});

// Get user profile (MongoDB first, blockchain sync)
router.get('/users/:address', async (req, res) => {
  try {
    const userAddress = req.params.address.toLowerCase();

    if (!validateAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address'
      });
    }

    // Get from MongoDB first
    let user = await User.findOne({ address: userAddress });

    if (!user) {
      // Check blockchain and sync if exists
      const isRegistered = await userRegistryContract.isUserRegistered(userAddress);
      if (!isRegistered) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Sync from blockchain
      const profile = await userRegistryContract.getUserProfile(userAddress);
      user = await User.create({
        address: userAddress,
        username: `user_${userAddress.slice(-6)}`,
        email: `${userAddress.slice(-6)}@temp.com`,
        password: 'blockchain_synced',
        role: profile.role.toLowerCase(),
        isActive: profile.isActive,
        createdAt: new Date(profile.registrationTime * 1000)
      });
    }
    // Get reputation from blockchain
    const reputation = await freelancePlatformContract.getFreelancerReputation(userAddress);
    // Get user stats from MongoDB
    const userProjects = await Project.countDocuments({
      $or: [
        { 'client.address': userAddress },
        { 'freelancer.address': userAddress }
      ]
    });
    const completedProjects = await Project.countDocuments({
      $or: [
        { 'client.address': userAddress },
        { 'freelancer.address': userAddress }
      ],
      status: 'completed'
    });

    // Update user reputation in MongoDB
    user.reputation.totalProjects = userProjects;
    user.reputation.completedProjects = completedProjects;
    user.reputation.totalEarned = parseFloat(formatEther(reputation.totalEarned));
    user.reputation.averageRating = parseFloat(reputation.averageRating);
    user.reputation.totalRatings = parseInt(reputation.totalRatings);
    user.reputation.hasNFT = reputation.hasNFT;
    user.reputation.successRate = user.calculateSuccessRate();

    await user.save();

    res.json({
      success: true,
      data: {
        user: {
          address: user.address,
          username: user.username,
          role: user.role,
          profile: user.profile,
          reputation: user.reputation,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      }
    });
  } catch (error) {
    handleError(error, res, 'Get user profile failed');
  }
});

// Update user profile
router.patch('/users/:address', validateWallet, syncUser, async (req, res) => {
  try {
    if (req.params.address.toLowerCase() !== req.userAddress) {
      return res.status(403).json({
        success: false,
        error: 'Can only update own profile'
      });
    }

    const updates = req.body;
    const allowedUpdates = ['username', 'email', 'profile', 'preferences'];
    const actualUpdates = {};

    // Filter allowed updates
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        actualUpdates[key] = updates[key];
      }
    });

    if (Object.keys(actualUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid updates provided'
      });
    }

    const user = await User.findOneAndUpdate(
      { address: req.userAddress },
      actualUpdates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    handleError(error, res, 'Profile update failed');
  }
});


// Get user dashboard data
router.get('/users/:address/dashboard', validateWallet, syncUser, async (req, res) => {
  try {
    if (req.params.address.toLowerCase() !== req.userAddress) {
      return res.status(403).json({
        success: false,
        error: 'Can only access own dashboard'
      });
    }

    const userAddress = req.userAddress;

    // Get projects statistics
    const projectStats = await Project.aggregate([
      {
        $match: {
          $or: [
            { 'client.address': userAddress },
            { 'freelancer.address': userAddress }
          ]
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$budget.total' }
        }
      }
    ]);

    // Get recent activities
    const recentProjects = await Project.find({
      $or: [
        { 'client.address': userAddress },
        { 'freelancer.address': userAddress }
      ]
    })
      .sort({ 'timeline.createdAt': -1 })
      .limit(5)
      .lean();

    const recentApplications = await Application.find({
      'freelancer.wallet': userAddress
    })
      .sort({ 'timestamps.submittedAt': -1 })
      .limit(5)
      .populate('projectId', 'title budget.total client')
      .lean();

    const pendingMilestones = await Milestone.find({
      $or: [
        { freelancer: userAddress, status: 'pending' },
        { 'project.client': userAddress, status: 'submitted' }
      ]
    })
      .sort({ 'timeline.deadline': 1 })
      .limit(5)
      .lean();

    // Get earnings (for freelancers)
    const earnings = await Milestone.aggregate([
      {
        $match: {
          freelancer: userAddress,
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: '$details.amount' },
          projectsCompleted: { $addToSet: '$projectId' }
        }
      }
    ]);

    // Get notifications (mock data - implement notification system)
    const notifications = [
      {
        type: 'milestone_due',
        message: 'You have milestones due soon',
        count: pendingMilestones.length,
        timestamp: new Date()
      }
    ];

    res.json({
      success: true,
      data: {
        user: req.user,
        statistics: {
          projects: projectStats,
          earnings: earnings[0] || { totalEarned: 0, projectsCompleted: [] },
          completedProjects: earnings[0]?.projectsCompleted?.length || 0
        },
        recentActivity: {
          projects: recentProjects,
          applications: recentApplications,
          milestones: pendingMilestones
        },
        notifications
      }
    });
  } catch (error) {
    handleError(error, res, 'Dashboard data fetch failed');
  }
});

// Get user's projects
router.get('/users/:address/projects', async (req, res) => {
  try {
    const userAddress = req.params.address;
    const { role = 'all', status, page = 1, limit = 20 } = req.query;

    if (!validateAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address'
      });
    }

    // Build query
    let query = {};

    if (role === 'client' || role === 'all') {
      query['client.address'] = userAddress.toLowerCase();
    }

    if (role === 'freelancer' || role === 'all') {
      if (query['client.address']) {
        // If role is 'all', we need an OR query
        query = {
          $or: [
            { 'client.address': userAddress.toLowerCase() },
            { 'freelancer.address': userAddress.toLowerCase() }
          ]
        };
      } else {
        query['freelancer.address'] = userAddress.toLowerCase();
      }
    }

    if (status) {
      if (query.$or) {
        query = {
          $and: [
            { $or: query.$or },
            { status }
          ]
        };
      } else {
        query.status = status;
      }
    }

    const [projects, totalCount] = await Promise.all([
      Project.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('applications'),
      Project.countDocuments(query)
    ]);

    // Add role information to each project
    const projectsWithRole = projects.map(project => ({
      ...project.toObject(),
      userRole: project.client.address === userAddress.toLowerCase() ? 'client' : 'freelancer'
    }));

    res.json({
      success: true,
      data: projectsWithRole,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    handleError(error, res, 'Error getting user projects');
  }
});

// Get user reputation with combined data
router.get('/users/:address/reputation', async (req, res) => {
  try {
    const userAddress = req.params.address;

    if (!validateAddress(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address'
      });
    }

    const user = await User.findOne({ address: userAddress.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get blockchain reputation if available
    let blockchainReputation = null;
    try {
      const reputation = await freelancePlatformContract.getFreelancerReputation(userAddress);
      blockchainReputation = {
        totalEarned: formatEther(reputation.totalEarned),
        projectsCompleted: reputation.projectsCompleted.toString(),
        averageRating: reputation.averageRating.toString(),
        totalRatings: reputation.totalRatings.toString(),
        hasNFT: reputation.hasNFT
      };
    } catch (error) {
      console.warn('Failed to fetch blockchain reputation:', error.message);
    }

    // Calculate additional stats from database
    const [completedProjects, totalEarned, averageRating] = await Promise.all([
      Project.countDocuments({
        'freelancer.address': userAddress.toLowerCase(),
        status: 'completed'
      }),
      Transaction.aggregate([
        {
          $match: {
            'entities.to': userAddress.toLowerCase(),
            type: 'payment_released',
            status: 'confirmed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amounts.value' }
          }
        }
      ]),
      Milestone.aggregate([
        {
          $match: {
            freelancer: userAddress.toLowerCase(),
            status: 'paid',
            'approval.rating': { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$approval.rating' },
            totalRatings: { $sum: 1 }
          }
        }
      ])
    ]);

    const dbStats = {
      projectsCompleted: completedProjects,
      totalEarned: totalEarned[0]?.total || 0,
      averageRating: averageRating[0]?.averageRating || 0,
      totalRatings: averageRating[0]?.totalRatings || 0,
      successRate: user.reputation.totalProjects > 0
        ? (user.reputation.completedProjects / user.reputation.totalProjects) * 100
        : 0
    };

    res.json({
      success: true,
      data: {
        address: userAddress,
        database: {
          ...user.reputation.toObject(),
          ...dbStats
        },
        blockchain: blockchainReputation,
        profile: user.profile,
        joinedAt: user.createdAt,
        lastActive: user.lastActiveAt
      }
    });
  } catch (error) {
    handleError(error, res, 'Error getting user reputation');
  }
});

module.exports = router;