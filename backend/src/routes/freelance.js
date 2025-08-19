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

    // Generate proper proposal hash
    const proposalData = {
      coverLetter,
      proposedBudget: proposedBudget || project.budget.total,
      proposedTimeline: proposedTimeline || 30,
      milestoneBreakdown,
      freelancer: req.userAddress,
      projectId: project.onChainId || project.projectId,
      timestamp: Date.now()
    };
    const proposalHash = generateProposalHash(proposalData);

    // Update project application count
    project.applications.count = (project.applications.count || 0) + 1;
    await project.save();

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

// Shortlist Freelancers (for client to shortlist multiple freelancers)
router.post('/projects/:id/shortlist-freelancers', validateWallet, syncUser, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { freelancers } = req.body; // Array of freelancer addresses

    if (!Array.isArray(freelancers) || freelancers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Freelancers array is required'
      });
    }

    if (freelancers.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Cannot shortlist more than 10 freelancers'
      });
    }

    // Validate all addresses
    for (let addr of freelancers) {
      if (!validateAddress(addr)) {
        return res.status(400).json({
          success: false,
          error: `Invalid freelancer address: ${addr}`
        });
      }
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
        error: 'Only project client can shortlist freelancers'
      });
    }

    if (project.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'Project is not accepting applications'
      });
    }

    // Verify all freelancers have applied
    const applications = await Application.find({
      projectId: project.onChainId || project.projectId,
      'freelancer.wallet': { $in: freelancers.map(addr => addr.toLowerCase()) }
    });

    if (applications.length !== freelancers.length) {
      return res.status(400).json({
        success: false,
        error: 'All freelancers must have applied to the project'
      });
    }

    // Update project status
    project.status = 'shortlisting';
    await project.save();

    res.json({
      success: true,
      data: {
        project,
        shortlistedFreelancers: freelancers,
        contractCall: {
          contract: 'FreelancePlatform',
          method: 'shortlistFreelancers',
          params: [
            project.onChainId || project.projectId,
            freelancers
          ],
          address: CONTRACTS.freelancePlatform.address
        }
      },
      message: 'Freelancers shortlisted successfully'
    });
  } catch (error) {
    handleError(error, res, 'Freelancer shortlisting failed');
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
    // DON'T calculate fees here - let contract do it
    // Just update basic project status
    project.status = 'funding'; // Pending blockchain confirmation
    project.blockchain.txHash = txHash;

    await project.save();

    res.json({
      success: true,
      data: {
        project,
        deposit: parseFloat(amount),
        contractCall: {
          contract: 'FreelancePlatform',
          method: 'depositFunds',
          params: [
            project.onChainId || project.projectId  // _projectId (uint256)
          ],
          value: parseEther(amount).toString(),      // ETH value to send with transaction- Sending full amount
          address: CONTRACTS.freelancePlatform.address
        }
      },
      message: 'Ready to deposit funds. Contract will handle fee deduction automatically'
    });
  } catch (error) {
    handleError(error, res, 'Fund deposit preparation failed');
  }
});

// Sync actual values from blockchain AFTER the txn
router.post('/projects/:id/sync-deposit', async (req, res) => {
  try {
    const { onChainId, txHash } = req.body;
    const projectId = req.params.id;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Get ACTUAL values from blockchain after transaction
    try {
      const onChainProject = await freelancePlatformContract.getProject(onChainId);

      // Sync real values from blockchain
      project.onChainId = onChainId;
      project.budget.escrowBalance = parseFloat(formatEther(onChainProject.escrowBalance));
      project.blockchain.status = 'confirmed';
      project.blockchain.txHash = txHash;
      project.status = 'open'; // Now truly funded

      await project.save();

      res.json({
        success: true,
        data: project,
        message: 'Project funding synced with blockchain'
      });
    } catch (contractError) {
      return res.status(400).json({
        success: false,
        error: 'Failed to verify deposit on blockchain'
      });
    }
  } catch (error) {
    handleError(error, res, 'Deposit sync failed');
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
    // Generate proper delivery hash if not provided
    const deliveryData = {
      milestoneId: milestone.onChainId || milestone.milestoneId,
      notes: notes || '',
      files: files.map(f => ({ name: f.name, hash: f.hash })),
      freelancer: req.userAddress,
      timestamp: Date.now()
    };
    
    const finalDeliveryHash = deliveryHash || generateProposalHash(deliveryData);

    // Update milestone
    milestone.status = 'submitted';
    milestone.submission = {
      deliveryHash: finalDeliveryHash,
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
          params: [milestone.onChainId || milestone.milestoneId, finalDeliveryHash, notes || ''],
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

//------------auto approve-------------------
router.post('/milestones/:id/auto-approve', validateWallet, syncUser, async (req, res) => {
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

    if (milestone.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        error: 'Milestone is not in submitted status'
      });
    }

    // Check if auto-approval period has passed (10 days)
    const submitTime = milestone.timeline.submittedAt || new Date(milestone.submission.submittedAt);
    const autoApproveTime = new Date(submitTime.getTime() + (10 * 24 * 60 * 60 * 1000)); // 10 days
    
    if (new Date() < autoApproveTime) {
      return res.status(400).json({
        success: false,
        error: 'Auto-approval period not reached yet',
        data: {
          submitTime,
          autoApproveTime,
          remainingTime: autoApproveTime.getTime() - Date.now()
        }
      });
    }

    res.json({
      success: true,
      data: {
        milestone,
        contractCall: {
          contract: 'FreelancePlatform',
          method: 'autoApproveMilestone',
          params: [milestone.onChainId || milestone.milestoneId],
          address: CONTRACTS.freelancePlatform.address
        }
      },
      message: 'Auto-approval triggered successfully'
    });
  } catch (error) {
    handleError(error, res, 'Auto-approval failed');
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
//--------------------extend-----------------------
// Request Extension Route
router.post('/milestones/:id/request-extension', validateWallet, syncUser, async (req, res) => {
  try {
    const milestoneId = req.params.id;
    const { newDeadline, reason } = req.body;

    if (!newDeadline) {
      return res.status(400).json({
        success: false,
        error: 'New deadline is required'
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

    if (milestone.freelancer !== req.userAddress) {
      return res.status(403).json({
        success: false,
        error: 'Only assigned freelancer can request extension'
      });
    }

    if (milestone.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Can only request extension for pending milestones'
      });
    }

    const newDeadlineTimestamp = Math.floor(new Date(newDeadline).getTime() / 1000);

    // Update milestone in database
    milestone.extension = {
      requested: true,
      requestedAt: new Date(),
      requestedDeadline: new Date(newDeadline),
      reason: reason || 'Extension requested'
    };
    await milestone.save();

    res.json({
      success: true,
      data: {
        milestone,
        contractCall: {
          contract: 'FreelancePlatform',
          method: 'requestExtension',
          params: [
            milestone.onChainId || milestone.milestoneId,
            newDeadlineTimestamp
          ],
          address: CONTRACTS.freelancePlatform.address
        }
      },
      message: 'Extension request submitted successfully'
    });
  } catch (error) {
    handleError(error, res, 'Extension request failed');
  }
});

// Approve Extension Route
router.post('/milestones/:id/approve-extension', validateWallet, syncUser, async (req, res) => {
  try {
    const milestoneId = req.params.id;
    const { newDeadline } = req.body;

    if (!newDeadline) {
      return res.status(400).json({
        success: false,
        error: 'New deadline is required'
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
        error: 'Only project client can approve extensions'
      });
    }

    const newDeadlineTimestamp = Math.floor(new Date(newDeadline).getTime() / 1000);

    // Update milestone
    milestone.timeline.deadline = new Date(newDeadline);
    milestone.extension.approved = true;
    milestone.extension.approvedAt = new Date();
    await milestone.save();

    res.json({
      success: true,
      data: {
        milestone,
        contractCall: {
          contract: 'FreelancePlatform',
          method: 'approveExtension',
          params: [
            milestone.onChainId || milestone.milestoneId,
            newDeadlineTimestamp
          ],
          address: CONTRACTS.freelancePlatform.address
        }
      },
      message: 'Extension approved successfully'
    });
  } catch (error) {
    handleError(error, res, 'Extension approval failed');
  }
});

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


// Get fee information from contract (read-only)
router.get('/platform/fees', async (req, res) => {
  try {
    // Read fee percentages from contract
    const platformFeePercent = await freelancePlatformContract.platformFeePercent();
    const freelancerFeePercent = await freelancePlatformContract.freelancerFeePercent();

    // Convert basis points to percentage
    const platformFeePercentage = parseInt(platformFeePercent.toString()) / 10000; // 300 → 3%
    const freelancerFeePercentage = parseInt(freelancerFeePercent.toString()) / 10000; // 250 → 2.5%

    res.json({
      success: true,
      data: {
        platformFee: {
          basisPoints: platformFeePercent.toString(),
          percentage: platformFeePercentage
        },
        freelancerFee: {
          basisPoints: freelancerFeePercent.toString(),
          percentage: freelancerFeePercentage
        },
        note: "Fees are automatically deducted by the smart contract"
      }
    });
  } catch (error) {
    // Fallback to default values if contract call fails
    res.json({
      success: true,
      data: {
        platformFee: { basisPoints: "300", percentage: 3 },
        freelancerFee: { basisPoints: "250", percentage: 2.5 },
        note: "Default fee values - contract call failed"
      }
    });
  }
});

// ✅ CORRECT: Frontend helper to calculate fees for UI display ONLY
router.post('/calculate-fees', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || !validateAmount(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount required'
      });
    }

    try {
      // Get current fees from contract
      const platformFeePercent = await freelancePlatformContract.platformFeePercent();
      const freelancerFeePercent = await freelancePlatformContract.freelancerFeePercent();

      const platformFeePercentage = parseInt(platformFeePercent.toString()) / 10000; // Basis points to decimal
      const freelancerFeePercentage = parseInt(freelancerFeePercent.toString()) / 10000;

      const amountFloat = parseFloat(amount);
      const platformFee = amountFloat * platformFeePercentage;
      const freelancerFee = amountFloat * freelancerFeePercentage;
      const netAmount = amountFloat - platformFee;

      res.json({
        success: true,
        data: {
          inputAmount: amountFloat,
          platformFee: platformFee,
          freelancerFee: freelancerFee, // Applied later on milestone payments
          netEscrowAmount: netAmount,
          note: "This is for UI display only. Actual fees are calculated by smart contract."
        }
      });
    } catch (contractError) {
      // Fallback calculation with default values
      const platformFee = parseFloat(amount) * 0.03; // 3%
      const freelancerFee = parseFloat(amount) * 0.025; // 2.5%
      const netAmount = parseFloat(amount) - platformFee;

      res.json({
        success: true,
        data: {
          inputAmount: parseFloat(amount),
          platformFee: platformFee,
          freelancerFee: freelancerFee,
          netEscrowAmount: netAmount,
          note: "Estimated fees - using default values"
        }
      });
    }
  } catch (error) {
    handleError(error, res, 'Fee calculation failed');
  }
});


module.exports = router;
