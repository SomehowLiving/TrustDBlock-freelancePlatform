const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();
require('dotenv').config();

// MongoDB Models
const { User, Project, Application, Milestone, Transaction, Dispute } = require('./models');

// Contract ABIs
const freelancePlatform = require('../abis/FreelancePlatform.json');
const userRegistry = require('../abis/UserRegistry.json');

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

// Provider setup
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://localhost:8545");

// Contract instances (read-only)
const freelancePlatformContract = new ethers.Contract(
  CONTRACTS.freelancePlatform.address,
  CONTRACTS.freelancePlatform.abi,
  provider
);

const userRegistryContract = new ethers.Contract(
  CONTRACTS.userRegistry.address,
  CONTRACTS.userRegistry.abi,
  provider
);

// Utility functions
const validateAddress = (address) => ethers.isAddress(address);
const validateAmount = (amount) => !isNaN(amount) && parseFloat(amount) > 0;
const parseEther = (amount) => ethers.parseEther(amount.toString());
const formatEther = (amount) => ethers.formatEther(amount);
//----to generate id
const generateId = () => Math.floor(Math.random() * 1000000);

// Error handling
const handleError = (error, res, message = 'Operation failed') => {
  console.error(`${message}:`, error);
  
  let errorMessage = message;
  let statusCode = 500;
  
  if (error.name === 'ValidationError') {
    errorMessage = Object.values(error.errors).map(e => e.message).join(', ');
    statusCode = 400;
  } else if (error.name === 'CastError') {
    errorMessage = 'Invalid data format';
    statusCode = 400;
  } else if (error.code === 11000) {
    errorMessage = 'Duplicate entry found';
    statusCode = 409;
  } else if (error.reason) {
    errorMessage = error.reason;
    statusCode = 400;
  }
  
  res.status(statusCode).json({
    success: false,
    error: errorMessage,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// Middleware for validating wallet addresses
const validateWallet = (req, res, next) => {
  const walletAddress = req.headers['x-wallet-address'] || req.body.walletAddress;
  if (!walletAddress || !validateAddress(walletAddress)) {
    return res.status(400).json({
      success: false,
      error: 'Valid wallet address required in x-wallet-address header or body'
    });
  }
  req.userAddress = walletAddress.toLowerCase();
  next();
};

// Middleware to sync/verify user exists
const syncUser = async (req, res, next) => {
  try {
    let user = await User.findOne({ address: req.userAddress });
    
    if (!user) {
      // Check if user exists on blockchain
      const isRegistered = await userRegistryContract.isUserRegistered(req.userAddress);
      
      if (isRegistered) {
        // Sync from blockchain
        const profile = await userRegistryContract.getUserProfile(req.userAddress);
        user = await User.create({
          address: req.userAddress,
          username: `user_${req.userAddress.slice(-6)}`,
          email: `${req.userAddress.slice(-6)}@example.com`,
          password: 'blockchain_user', // Temporary password
          role: profile.role.toLowerCase(),
          isActive: profile.isActive,
          createdAt: new Date(profile.registrationTime * 1000)
        });
      }
    }
    
    req.user = user;
    next();
  } catch (error) {
    handleError(error, res, 'User sync failed');
  }
};

// ==================== USER REGISTRY ROUTES ====================

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

// ==================== PROJECT ROUTES ====================

// Create project (hybrid approach)
router.post('/projects', validateWallet, syncUser, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({
        success: false,
        error: 'User must be registered first'
      });
    }

    const {
      title,
      description,
      budget,
      category,
      skills = [],
      requirements = [],
      timeline,
      expectedMilestones = 1
    } = req.body;

    // Validate required fields
    if (!title || !description || !budget || !timeline?.deadline) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, budget, and deadline are required'
      });
    }

    if (!validateAmount(budget)) {
      return res.status(400).json({
        success: false,
        error: 'Budget must be a valid positive number'
      });
    }

    // Create project in MongoDB
    const project = await Project.create({
      title: title.trim(),
      description: description.trim(),
      client: {
        address: req.userAddress,
        displayName: req.user.username
      },
      budget: {
        total: parseFloat(budget),
        totalBudget: parseFloat(budget),
        type: 'fixed'
      },
      milestones: {
        expected: expectedMilestones,
        expectedMilestones: expectedMilestones
      },
      timeline: {
        deadline: new Date(timeline.deadline),
        applicationDeadline: timeline.applicationDeadline 
          ? new Date(timeline.applicationDeadline)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      category: category || 'Other',
      skills: skills,
      requirements: {
        skills: requirements,
        deliverables: []
      },
      status: 'created'
    });

    // Prepare blockchain data
    const metadata = {
      title,
      description,
      requirements,
      skills,
      category: category || 'Other'
    };
    const metadataHash = "QmProjectMetadata" + projectId; // Implement IPFS upload

    res.status(201).json({
      success: true,
      data: {
        project,
        contractCall: {
          contract: 'FreelancePlatform',
          method: 'createProject',
          params: [
            parseEther(budget).toString(),
            expectedMilestones,
            metadataHash,
            7 // applicationPeriodDays
          ],
          address: CONTRACTS.freelancePlatform.address
        }
      },
      message: 'Project created in database. Please complete blockchain transaction.'
    });
  } catch (error) {
    handleError(error, res, 'Project creation failed');
  }
});

// Sync project with blockchain
router.post('/projects/:id/sync', async (req, res) => {
  try {
    const { onChainId, txHash } = req.body;
    const projectId = req.params.id;

    if (!onChainId || !txHash) {
      return res.status(400).json({
        success: false,
        error: 'On-chain ID and transaction hash are required'
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Verify on-chain project exists
    try {
      const onChainProject = await freelancePlatformContract.getProject(onChainId);
      
      // Update project with blockchain data
      project.onChainId = onChainId;
      project.projectId = onChainId;
      project.blockchain.status = 'confirmed';
      project.blockchain.txHash = txHash;
      project.status = 'open';
      
      await project.save();

      res.json({
        success: true,
        data: project,
        message: 'Project synced with blockchain successfully'
      });
    } catch (contractError) {
      return res.status(400).json({
        success: false,
        error: 'Failed to verify project on blockchain'
      });
    }
  } catch (error) {
    handleError(error, res, 'Project sync failed');
  }
});

// Get projects with advanced filtering
router.get('/projects', async (req, res) => {
  try {
    const {
      status,
      category,
      minBudget,
      maxBudget,
      skills,
      clientAddress,
      freelancerAddress,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build filter object
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (minBudget || maxBudget) {
      filter['budget.total'] = {};
      if (minBudget) filter['budget.total'].$gte = parseFloat(minBudget);
      if (maxBudget) filter['budget.total'].$lte = parseFloat(maxBudget);
    }

    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      filter.skills = { $in: skillsArray };
    }

    if (clientAddress) {
      filter['client.address'] = clientAddress.toLowerCase();
    }

    if (freelancerAddress) {
      filter['freelancer.address'] = freelancerAddress.toLowerCase();
    }

    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const projects = await Project.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('client.address', 'username profile.avatar')
      .populate('freelancer.address', 'username profile.avatar')
      .lean();

    const total = await Project.countDocuments(filter);

    // Get application counts
    for (let project of projects) {
      if (project._id) {
        const applicationCount = await Application.countDocuments({ 
          projectId: project.onChainId || project.projectId 
        });
        project.applications = { count: applicationCount };
      }
    }

    res.json({
      success: true,
      data: projects,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    handleError(error, res, 'Get projects failed');
  }
});

// Get project by ID (with full details)
router.get('/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    let project;

    // Try to find by MongoDB ObjectId first, then by onChainId
    if (projectId.match(/^[0-9a-fA-F]{24}$/)) {
      project = await Project.findById(projectId);
    } else {
      project = await Project.findOne({ 
        $or: [{ onChainId: parseInt(projectId) }, { projectId: parseInt(projectId) }]
      });
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Get applications
    const applications = await Application.find({ 
      projectId: project.onChainId || project.projectId 
    })
    .populate('freelancer.wallet', 'username profile.avatar profile.skills')
    .sort({ 'timestamps.submittedAt': -1 });

    // Get milestones
    const milestones = await Milestone.find({ 
      projectId: project.onChainId || project.projectId 
    }).sort({ 'details.order': 1 });

    // Sync with blockchain if needed
    if (project.onChainId) {
      try {
        const onChainProject = await freelancePlatformContract.getProject(project.onChainId);
        const projectStatus = await freelancePlatformContract.getProjectStatus(project.onChainId);
        
        // Update local data with blockchain data
        if (project.status !== projectStatus) {
          project.status = projectStatus;
          project.budget.escrowBalance = parseFloat(formatEther(onChainProject.escrowBalance));
          await project.save();
        }
      } catch (err) {
        console.log('Blockchain sync error:', err.message);
      }
    }

    res.json({
      success: true,
      data: {
        project,
        applications: applications.length,
        applicationsDetail: applications,
        milestones: milestones.length,
        milestonesDetail: milestones,
        progress: project.calculateProgress()
      }
    });
  } catch (error) {
    handleError(error, res, 'Get project failed');
  }
});

// Apply for project
router.post('/projects/:id/apply', validateWallet, syncUser, async (req, res) => {
  try {
    const projectId = req.params.id;
    const {
      coverLetter,
      proposedBudget,
      proposedTimeline,
      milestoneBreakdown = []
    } = req.body;

    if (!coverLetter) {
      return res.status(400).json({
        success: false,
        error: 'Cover letter is required'
      });
    }

    // Find project
    const project = await Project.findOne({
      $or: [
        { _id: projectId.match(/^[0-9a-fA-F]{24}$/) ? projectId : null },
        { onChainId: parseInt(projectId) },
        { projectId: parseInt(projectId) }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (project.client.address === req.userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Cannot apply to your own project'
      });
    }

    if (project.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'Project is not accepting applications'
      });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      projectId: project.onChainId || project.projectId,
      'freelancer.wallet': req.userAddress
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        error: 'Already applied to this project'
      });
    }

    // Create application
    const application = await Application.create({
      projectId: project.onChainId || project.projectId,
      project: {
        title: project.title,
        budget: project.budget.total,
        client: project.client.address
      },
      freelancer: {
        wallet: req.userAddress,
        displayName: req.user.username
      },
      proposal: {
        coverLetter,
        proposedBudget: proposedBudget || project.budget.total,
        proposedTimeline: proposedTimeline || 30,
        milestoneBreakdown
      }
    });

    // Update project application count
    project.applications.count = (project.applications.count || 0) + 1;
    await project.save();

    // Prepare blockchain transaction data
    const proposalHash = "QmProposalHash123"; // Implement IPFS upload

    res.status(201).json({
      success: true,
      data: {
        application,
        contractCall: {
          contract: 'FreelancePlatform',
          method: 'applyForProject',
          params: [project.onChainId || project.projectId, proposalHash],
          address: CONTRACTS.freelancePlatform.address
        }
      },
      message: 'Application submitted successfully'
    });
  } catch (error) {
    handleError(error, res, 'Application submission failed');
  }
});

//========================added()select freelancer, deposit funds, accept project----
router.post('/projects/:id/select-freelancer', validateWallet, syncUser, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { freelancerAddress } = req.body;

    if (!freelancerAddress || !validateAddress(freelancerAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Valid freelancer address is required'
      });
    }
    // Find project
    const project = await Project.findOne({
      $or: [
        { _id: projectId.match(/^[0-9a-fA-F]{24}$/) ? projectId : null },
        { onChainId: parseInt(projectId) },
        { projectId: parseInt(projectId) }
      ]
    });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    if (project.client.address !== req.userAddress) {
      return res.status(403).json({
        success: false,
        error: 'Only project client can select freelancer'
      });
    }

    if (project.freelancer && project.freelancer.address) {
      return res.status(409).json({
        success: false,
        error: 'Freelancer already selected for this project'
      });
    }

    if (!['open', 'selecting'].includes(project.status)) {
      return res.status(400).json({
        success: false,
        error: 'Project is not accepting freelancer selection'
      });
    }
    // Verify freelancer has applied
    const application = await Application.findOne({
      projectId: project.onChainId || project.projectId,
      'freelancer.wallet': freelancerAddress.toLowerCase()
    });

    if (!application) {
      return res.status(400).json({
        success: false,
        error: 'Freelancer has not applied for this project'
      });
    }
    // Update project in database
    project.freelancer = {
      address: freelancerAddress.toLowerCase(),
      displayName: application.freelancer.displayName
    };
    project.status = 'negotiating';
    await project.save();

    // Update application status
    application.status = 'selected';
    await application.save();

    // contract call 
    res.json({
      success: true,
      data: {
        project,
        selectedFreelancer: application.freelancer,
        contractCall: {
          contract: 'FreelancePlatform',
          method: 'selectFreelancer',
          params: [
            project.onChainId || project.projectId,  // _projectId (uint256)
            freelancerAddress                        // _freelancer (address)
          ],
          address: CONTRACTS.freelancePlatform.address
        }
      },
      message: 'Freelancer selected successfully. Awaiting freelancer acceptance.'
    });
  } catch (error) {
    handleError(error, res, 'Freelancer selection failed');
  }
});

// Deposit Funds
router.post('/projects/:id/deposit', validateWallet, syncUser, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { amount, txHash } = req.body;

    if (!amount || !validateAmount(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Valid deposit amount is required'
      });
    }

    // Find project
    const project = await Project.findOne({
      $or: [
        { _id: projectId.match(/^[0-9a-fA-F]{24}$/) ? projectId : null },
        { onChainId: parseInt(projectId) },
        { projectId: parseInt(projectId) }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (project.client.address !== req.userAddress) {
      return res.status(403).json({
        success: false,
        error: 'Only project client can deposit funds'
      });
    }

    if (project.status !== 'created' && project.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Project is not in a state that accepts funding'
      });
    }

    if (parseFloat(amount) < project.budget.total) {
      return res.status(400).json({
        success: false,
        error: `Deposit amount must be at least ${project.budget.total} ETH`
      });
    }

    // Calculate platform fee (3% as per contract)
    const platformFeePercent = 3; // 3%
    const platformFee = parseFloat(amount) * (platformFeePercent / 100);
    const escrowAmount = parseFloat(amount) - platformFee;

    // Update project in database (pending blockchain confirmation)
    project.budget.escrowBalance = escrowAmount;
    project.budget.platformFee = platformFee;
    project.status = 'funded'; // Will become 'open' after blockchain confirmation
    project.blockchain.txHash = txHash;
    
    await project.save();

    res.json({
      success: true,
      data: {
        project,
        deposit: {
          totalAmount: parseFloat(amount),
          escrowAmount,
          platformFee
        },
        contractCall: {
          contract: 'FreelancePlatform',
          method: 'depositFunds',
          params: [
            project.onChainId || project.projectId  // _projectId (uint256)
          ],
          value: parseEther(amount).toString(),      // ETH value to send with transaction
          address: CONTRACTS.freelancePlatform.address
        }
      },
      message: 'Funds prepared for deposit. Please complete blockchain transaction.'
    });
  } catch (error) {
    handleError(error, res, 'Fund deposit preparation failed');
  }
});

//Accept Project (Freelancer accepting selected project)
router.post('/projects/:id/accept', validateWallet, syncUser, async (req, res) => {
  try {
    const projectId = req.params.id;

    // Find project
    const project = await Project.findOne({
      $or: [
        { _id: projectId.match(/^[0-9a-fA-F]{24}$/) ? projectId : null },
        { onChainId: parseInt(projectId) },
        { projectId: parseInt(projectId) }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (!project.freelancer || project.freelancer.address !== req.userAddress) {
      return res.status(403).json({
        success: false,
        error: 'Only selected freelancer can accept project'
      });
    }

    if (project.status !== 'negotiating') {
      return res.status(400).json({
        success: false,
        error: 'Project is not in negotiating status'
      });
    }

    // Update project status
    project.status = 'accepted';
    project.timeline.acceptedAt = new Date();
    await project.save();

    // Contract call for acceptance
    res.json({
      success: true,
      data: {
        project,
        contractCall: {
          contract: 'FreelancePlatform',
          method: 'acceptProject',
          params: [
            project.onChainId || project.projectId  // _projectId (uint256)
          ],
          address: CONTRACTS.freelancePlatform.address
        }
      },
      message: 'Project accepted successfully. Ready for milestone planning.'
    });
  } catch (error) {
    handleError(error, res, 'Project acceptance failed');
  }
});
// ==================== MILESTONE ROUTES ====================

// Create milestones
router.post('/projects/:id/milestones', validateWallet, syncUser, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { milestones, txHash } = req.body;

    if (!Array.isArray(milestones) || milestones.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Must provide array of milestones'
      });
    }

    // Find project
    const project = await Project.findOne({
      $or: [
        { _id: projectId.match(/^[0-9a-fA-F]{24}$/) ? projectId : null },
        { onChainId: parseInt(projectId) },
        { projectId: parseInt(projectId) }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (project.client.address !== req.userAddress) {
      return res.status(403).json({
        success: false,
        error: 'Only project client can create milestones'
      });
    }

    // Validate milestones
    let totalAmount = 0;
    const validatedMilestones = [];

    for (let i = 0; i < milestones.length; i++) {
      const milestone = milestones[i];
      
      if (!milestone.title || !milestone.amount || !milestone.deadline) {
        return res.status(400).json({
          success: false,
          error: 'Each milestone must have title, amount, and deadline'
        });
      }

      if (!validateAmount(milestone.amount)) {
        return res.status(400).json({
          success: false,
          error: `Invalid amount for milestone: ${milestone.title}`
        });
      }

      totalAmount += parseFloat(milestone.amount);
      
      validatedMilestones.push({
        projectId: project.onChainId || project.projectId,
        project: {
          title: project.title,
          client: project.client.address,
          freelancer: project.freelancer.address
        },
        freelancer: project.freelancer.address,
        details: {
          title: milestone.title,
          description: milestone.description || '',
          amount: parseFloat(milestone.amount),
          order: i + 1
        },
        timeline: {
          deadline: new Date(milestone.deadline)
        },
        status: 'pending'
      });
    }

    // Check total amount
    if (totalAmount > project.budget.escrowBalance) {
      return res.status(400).json({
        success: false,
        error: `Total milestone amount (${totalAmount}) exceeds escrow balance`
      });
    }

    // Create milestones in MongoDB
    const createdMilestones = await Milestone.insertMany(validatedMilestones);

    // Update project
    project.status = 'active';
    project.milestones.total = createdMilestones.length;
    project.blockchain.txHash = txHash;
    await project.save();

    // Prepare blockchain data
    const amounts = milestones.map(m => parseEther(m.amount).toString());
    const deadlines = milestones.map(m => Math.floor(new Date(m.deadline).getTime() / 1000));
    const metadataHashes = milestones.map((m, i) => `QmMilestone${i}`);

    res.json({
      success: true,
      data: {
        project,
        milestones: createdMilestones,
        contractCall: {
          contract: 'FreelancePlatform',
          method: 'agreeMilestones',
          params: [project.onChainId || project.projectId, amounts, deadlines, metadataHashes],
          address: CONTRACTS.freelancePlatform.address
        }
      },
      message: 'Milestones created successfully'
    });
  } catch (error) {
    handleError(error, res, 'Milestone creation failed');
  }
});

// Submit milestone work
router.post('/milestones/:id/submit', validateWallet, syncUser, async (req, res) => {
  try {
    const milestoneId = req.params.id;
    const { deliveryHash, notes, files = [] } = req.body;

    // Find milestone
    const milestone = await Milestone.findOne({
      $or: [
        { _id: milestoneId.match(/^[0-9a-fA-F]{24}$/) ? milestoneId : null },
        { onChainId: parseInt(milestoneId) },
        { milestoneId: parseInt(milestoneId) }
      ]
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        error: 'Milestone not found'
      });
    }

    if (milestone.freelancer !== req.userAddress) {
      return res.status(403).json({
        success: false,
        error: 'Only assigned freelancer can submit milestone work'
      });
    }

    if (milestone.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Milestone is not in pending status'
      });
    }

    // Update milestone
    milestone.status = 'submitted';
    milestone.submission = {
      deliveryHash: deliveryHash || '',
      notes: notes || '',
      submittedAt: new Date(),
      attachments: files.map(file => ({
        name: file.name,
        url: file.url,
        type: file.type,
        size: file.size
      }))
    };
    milestone.timeline.submittedAt = new Date();

    await milestone.save();

    res.json({
      success: true,
      data: {
        milestone,
        contractCall: {
          contract: 'FreelancePlatform',
          method: 'submitMilestoneWork',
          params: [milestone.onChainId || milestone.milestoneId, deliveryHash || 'QmDeliveryHash123', notes || ''],
          address: CONTRACTS.freelancePlatform.address
        }
      },
      message: 'Milestone work submitted successfully'
    });
  } catch (error) {
    handleError(error, res, 'Milestone submission failed');
  }
});

// Approve milestone
router.post('/milestones/:id/approve', validateWallet, syncUser, async (req, res) => {
  try {
    const milestoneId = req.params.id;
    const { rating, feedback } = req.body;

    // Find milestone
    const milestone = await Milestone.findOne({
      $or: [
        { _id: milestoneId.match(/^[0-9a-fA-F]{24}$/) ? milestoneId : null },
        { onChainId: parseInt(milestoneId) },
        { milestoneId: parseInt(milestoneId) }
      ]
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        error: 'Milestone not found'
      });
    }

    // Get project to verify client
    const project = await Project.findOne({
      $or: [
        { onChainId: milestone.projectId },
        { projectId: milestone.projectId }
      ]
    });

    if (!project || project.client.address !== req.userAddress) {
      return res.status(403).json({
        success: false,
        error: 'Only project client can approve milestones'
      });
    }

    if (milestone.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        error: 'Milestone is not in submitted status'
      });
    }

    // Update milestone
    milestone.status = 'approved';
    milestone.approval = {
      approvedBy: req.userAddress,
      approvedAt: new Date(),
      feedback: feedback || '',
      rating: rating || 5
    };
    milestone.timeline.approvedAt = new Date();

    await milestone.save();

    res.json({
      success: true,
      data: {
        milestone,
        contractCall: {
          contract: 'FreelancePlatform',
          method: 'approveMilestone',
          params: [milestone.onChainId || milestone.milestoneId],
          address: CONTRACTS.freelancePlatform.address
        }
      },
      message: 'Milestone approved successfully'
    });
  } catch (error) {
    handleError(error, res, 'Milestone approval failed');
  }
});

// Release payment
router.post('/milestones/:id/release', validateWallet, syncUser, async (req, res) => {
  try {
    const milestoneId = req.params.id;

    // Find milestone
    const milestone = await Milestone.findOne({
      $or: [
        { _id: milestoneId.match(/^[0-9a-fA-F]{24}$/) ? milestoneId : null },
        { onChainId: parseInt(milestoneId) },
        { milestoneId: parseInt(milestoneId) }
      ]
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        error: 'Milestone not found'
      });
    }

    // Get project to verify client
    const project = await Project.findOne({
      $or: [
        { onChainId: milestone.projectId },
        { projectId: milestone.projectId }
      ]
    });

    if (!project || project.client.address !== req.userAddress) {
      return res.status(403).json({
        success: false,
        error: 'Only project client can release payments'
      });
    }

    if (milestone.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Milestone must be approved before payment release'
      });
    }

    // Update milestone
    milestone.status = 'paid';
    milestone.timeline.paidAt = new Date();

    await milestone.save();

    // Update project milestone completion
    const completedMilestones = await Milestone.countDocuments({
      projectId: milestone.projectId,
      status: 'paid'
    });

    project.milestones.completed = completedMilestones;
    project.milestones.completedMilestones = completedMilestones;

    // Check if project is completed
    if (completedMilestones >= project.milestones.total) {
      project.status = 'completed';
      project.timeline.endDate = new Date();
    }

    await project.save();

    // Update freelancer reputation
    await User.findOneAndUpdate(
      { address: milestone.freelancer },
      {
        $inc: {
          'reputation.totalEarned': milestone.details.amount,
          'reputation.completedProjects': completedMilestones >= project.milestones.total ? 1 : 0
        }
      }
    );

    res.json({
      success: true,
      data: {
        milestone,
        project: {
          id: project._id,
          status: project.status,
          completedMilestones,
          totalMilestones: project.milestones.total
        },
        contractCall: {
          contract: 'FreelancePlatform',
          method: 'releaseMilestonePayment',
          params: [milestone.onChainId || milestone.milestoneId],
          address: CONTRACTS.freelancePlatform.address
        }
      },
      message: 'Payment released successfully'
    });
  } catch (error) {
    handleError(error, res, 'Payment release failed');
  }
});

// Dispute milestone
router.post('/milestones/:id/dispute', validateWallet, syncUser, async (req, res) => {
  try {
    const milestoneId = req.params.id;
    const { reason, category, evidence = [] } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Dispute reason is required'
      });
    }
    // Find milestone
    const milestone = await Milestone.findOne({
      $or: [
        { _id: milestoneId.match(/^[0-9a-fA-F]{24}$/) ? milestoneId : null },
        { onChainId: parseInt(milestoneId) },
        { milestoneId: parseInt(milestoneId) }
      ]
    });
    if (!milestone) {
      return res.status(404).json({
        success: false,
        error: 'Milestone not found'
      });
    }
    // Get project to verify participants
    const project = await Project.findOne({
      $or: [
        { onChainId: milestone.projectId },
        { projectId: milestone.projectId }
      ]
    });
    const isClient = project.client.address === req.userAddress;
    const isFreelancer = milestone.freelancer === req.userAddress;

    if (!isClient && !isFreelancer) {
      return res.status(403).json({
        success: false,
        error: 'Only project participants can raise disputes'
      });
    }
    if (milestone.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        error: 'Can only dispute submitted milestones'
      });
    }

    // Create dispute record
    const disputeId = `${milestone.projectId}-${milestone._id}-${Date.now()}`;
    
    const dispute = await Dispute.create({
      disputeId,
      projectId: milestone.projectId,
      milestoneId: milestone.onChainId || milestone.milestoneId,
      parties: {
        client: {
          wallet: project.client.address,
          displayName: project.client.displayName
        },
        freelancer: {
          wallet: milestone.freelancer,
          displayName: project.freelancer.displayName
        },
        raisedBy: req.userAddress,
        againstAddress: isClient ? milestone.freelancer : project.client.address
      },
      details: {
        reason: reason.trim(),
        category: category || 'other',
        evidence: evidence.map(e => ({
          type: e.type,
          url: e.url,
          description: e.description,
          uploadedBy: req.userAddress,
          uploadedAt: new Date()
        }))
      }
    });

    // Update milestone
    milestone.status = 'disputed';
    milestone.dispute = {
      raised: true,
      raisedBy: req.userAddress,
      raisedAt: new Date(),
      reason: reason.trim(),
      disputeReason: reason.trim()
    };
    milestone.timeline.disputedAt = new Date();

    await milestone.save();

    // Update project
    project.flags.isDisputed = true;
    await project.save();

    res.json({
      success: true,
      data: {
        milestone,
        dispute,
        contractCall: {
          contract: 'FreelancePlatform',
          method: 'disputeMilestone',
          params: [milestone.onChainId || milestone.milestoneId],
          address: CONTRACTS.freelancePlatform.address
        }
      },
      message: 'Dispute raised successfully. Platform admin will review.'
    });
  } catch (error) {
    handleError(error, res, 'Dispute creation failed');
  }
});

// ==================== ADVANCED QUERY ROUTES ====================

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

// ==================== UTILITY ROUTES ====================
// Advanced project search with full-text search
router.post('/projects/search', async (req, res) => {
  try {
    const {
      query,
      filters = {},
      sort = { createdAt: -1 },
      page = 1,
      limit = 20
    } = req.body;

    let pipeline = [];

    // Text search stage
    if (query) {
      pipeline.push({
        $match: {
          $text: { $search: query }
        }
      });
    }

    // Filters stage
    let matchStage = { status: 'open' }; // Default to open projects

    if (filters.category) {
      matchStage.category = filters.category;
    }

    if (filters.budget) {
      if (filters.budget.min || filters.budget.max) {
        matchStage['budget.total'] = {};
        if (filters.budget.min) matchStage['budget.total'].$gte = filters.budget.min;
        if (filters.budget.max) matchStage['budget.total'].$lte = filters.budget.max;
      }
    }

    if (filters.skills && filters.skills.length > 0) {
      matchStage.skills = { $in: filters.skills };
    }

    if (filters.timeline) {
      if (filters.timeline.maxDays) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + filters.timeline.maxDays);
        matchStage['timeline.deadline'] = { $lte: futureDate };
      }
    }

    pipeline.push({ $match: matchStage });

    // Add client information
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'client.address',
        foreignField: 'address',
        as: 'clientInfo'
      }
    });

    // Add application count
    pipeline.push({
      $lookup: {
        from: 'applications',
        let: { projectId: '$onChainId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$projectId', '$projectId'] } } },
          { $count: 'count' }
        ],
        as: 'applicationCount'
      }
    });

    // Sort stage
    pipeline.push({ $sort: sort });

    // Add text score for relevance (if text search was used)
    if (query) {
      pipeline.push({
        $addFields: {
          score: { $meta: 'textScore' }
        }
      });
    }

    // Pagination
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });

    const projects = await Project.aggregate(pipeline);
    
    // Get total count for pagination
    const totalPipeline = pipeline.slice(0, -2); // Remove skip and limit
    totalPipeline.push({ $count: 'total' });
    const totalResult = await Project.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    res.json({
      success: true,
      data: projects,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      },
      searchInfo: {
        query,
        filters,
        resultsFound: total
      }
    });
  } catch (error) {
    handleError(error, res, 'Project search failed');
  }
});

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

// ==================== ADMIN ROUTES ====================

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
      milestone.status =winner.toLowerCase() === milestone.freelancer.toLowerCase() ? 'paid' : 'refunded';
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
      message: `Dispute resolved in favor of ${
        winner.toLowerCase() === milestone?.freelancer?.toLowerCase() ? 'freelancer' : 'client'
      }`,
      contractCall: {
        contract: 'FreelancePlatform',
        method: 'resolveDispute',
        params: [
          milestone?.onChainId || dispute.milestoneId,
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

// ==================== UTILITY ROUTES ====================

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