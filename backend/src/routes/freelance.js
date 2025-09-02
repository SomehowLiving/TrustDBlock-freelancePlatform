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
  syncProjectStatus,
  checkUserRegistration
} = require('./utils.js');

// Contract configurations
const { CONTRACTS, provider, freelancePlatformContract, userRegistryContract } = require('./contracts.js'); // Extract contract setup

router.post('/projects', validateWallet, async (req, res) => {
  try {
    // 1. Basic role checks
    // Instead of syncUser (MongoDB), rely on blockchain role lookup
    // const isRegistered = await userRegistryContract.isUserRegistered(req.userAddress);
    // if (!isRegistered) {
    //   return res.status(400).json({ success: false, error: 'User must be registered first' });
    // }

    // Fetch role directly from contract
    // const role = await userRegistryContract.getUserRole(req.userAddress);
    // if (role.toLowerCase() !== 'client') {
    //   return res.status(403).json({ success: false, error: 'Only clients can create projects on-chain' });
    // }

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

    // 2. Validate required fields
    if (!title || !description || !budget || !timeline?.deadline) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, budget, and deadline are required'
      });
    }
    if (!validateAmount(budget)) {
      return res.status(400).json({ success: false, error: 'Budget must be a valid positive number' });
    }

    // 3. Prepare metadata (store in IPFS in the future)
    const metadata = { title, description, requirements, skills, category: category || 'Other' };
    const metadataHash = "QmProjectMetadata" + Date.now(); // TODO: replace with IPFS upload

    // 4. Blockchain call
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const freelancePlatformWithSigner = freelancePlatformContract.connect(signer);

    let txHash;
    let projectIdOnChain;

    try {
      const tx = await freelancePlatformWithSigner.createProject(
        parseEther(budget.toString()), // convert to wei
        expectedMilestones,
        metadataHash,
        7, // application period days
        { gasLimit: 300_000 }
      );

      txHash = tx.hash;
      console.log("Transaction sent:", tx.hash);

      const receipt = await tx.wait();
      console.log("Transaction mined:", receipt.transactionHash);

      // Extract project ID from event logs
      let event;
      for (const log of receipt.logs) {
        try {
          const parsedLog = freelancePlatformContract.interface.parseLog(log);
          if (parsedLog.name === "ProjectCreated") {
            event = parsedLog;
            break;
          }
        } catch (err) {
          // ignore unrelated logs
        }
      }

      if (!event) {
        throw new Error("ProjectCreated event not found in transaction receipt");
      }

      projectIdOnChain = Number(event.args.projectId);
      console.log("On-chain project ID:", projectIdOnChain);

    } catch (err) {
      console.error("Blockchain createProject failed:", err);
      return res.status(500).json({ success: false, error: 'Blockchain transaction failed' });
    }

    // 5. Final response (no DB persistence)
    res.status(201).json({
      success: true,
      data: {
        project: {
          title,
          description,
          client: req.userAddress,
          budget: parseFloat(budget),
          timeline,
          category: category || 'Other',
          skills,
          requirements,
          expectedMilestones
        },
        blockchain: {
          txHash,
          projectId: projectIdOnChain,
          metadataHash
        }
      },
      message: 'Project created on blockchain.'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Project creation failed' });
  }
});

// Get project by ID--- works blockchain
router.get('/projects/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id).toString();
    
    if (isNaN(projectId) || projectId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      });
    }

    try {
      const project = await freelancePlatformContract.getProject(projectId);
      const milestoneIds = await freelancePlatformContract.getProjectMilestones(projectId);
      const shortlistedFreelancers = await freelancePlatformContract.getShortlistedFreelancers(projectId);
      const projectStatus = await freelancePlatformContract.getProjectStatus(projectId);
      const pendingAmount = await freelancePlatformContract.getPendingAmount(projectId);

      // Get milestones details
      const milestones = [];
      for (const milestoneId of milestoneIds) {
        try {
          const milestone = await freelancePlatformContract.getMilestone(milestoneId);
          milestones.push({
            id: milestone.id.toString(),
            projectId: milestone.projectId.toString(),
            amount: formatEther(milestone.amount),
            deadline: milestone.deadline.toString(),
            finalSubmitTime: milestone.finalSubmitTime.toString(),
            status: milestone.status,
            extensionRequested: milestone.extensionRequested,
            metadataHash: milestone.metadataHash,
            submissionTime: milestone.submissionTime.toString(),
            disputeRaised: milestone.disputeRaised
          });
        } catch (err) {
          // Milestone might not exist
        }
      }

      res.json({
        success: true,
        data: {
          id: project.id.toString(),
          client: project.client,
          freelancer: project.freelancer,
          totalBudget: formatEther(project.totalBudget),
          escrowBalance: formatEther(project.escrowBalance),
          status: projectStatus,
          isDisputed: project.isDisputed,
          totalMilestones: project.totalMilestones.toString(),
          completedMilestones: project.completedMilestones.toString(),
          metadataHash: project.metadataHash,
          createdAt: project.createdAt.toString(),
          applicationDeadline: project.applicationDeadline.toString(),
          shortlistedFreelancers,
          pendingAmount: formatEther(pendingAmount),
          milestones
        }
      });
    } catch (contractError) {
      if (contractError.reason === 'InvalidProject') {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
      throw contractError;
    }
  } catch (error) {
    handleContractError(error, res);
  }
});

// all project - blockchain
// Get all projects with filtering
router.get('/projects', async (req, res) => {
  try {
    const {
      status,
      clientAddress,
      freelancerAddress,
      page = 1,
      limit = 20
    } = req.query;

    // Get total project count
    const projectCounter = await freelancePlatformContract.projectCounter();
    const totalProjects = parseInt(projectCounter.toString());

    if (totalProjects === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: parseInt(limit)
        }
      });
    }

    const projects = [];
    
    // Fetch projects (in production, implement better pagination)
    const startIndex = Math.max(1, totalProjects - (page * limit) + 1);
    const endIndex = Math.min(totalProjects, startIndex + parseInt(limit) - 1);

    for (let i = startIndex; i <= endIndex; i++) {
      try {
        const project = await freelancePlatformContract.getProject(i);
        const projectStatus = await freelancePlatformContract.getProjectStatus(i);
        
        // Apply filters
        if (status && projectStatus !== status) continue;
        if (clientAddress && project.client.toLowerCase() !== clientAddress.toLowerCase()) continue;
        if (freelancerAddress && project.freelancer.toLowerCase() !== freelancerAddress.toLowerCase()) continue;

        projects.push({
          id: project.id.toString(),
          client: project.client,
          freelancer: project.freelancer,
          totalBudget: formatEther(project.totalBudget),
          escrowBalance: formatEther(project.escrowBalance),
          status: projectStatus,
          isDisputed: project.isDisputed,
          totalMilestones: project.totalMilestones.toString(),
          completedMilestones: project.completedMilestones.toString(),
          metadataHash: project.metadataHash,
          createdAt: project.createdAt.toString(),
          applicationDeadline: project.applicationDeadline.toString()
        });
      } catch (err) {
        // Project might not exist or be accessible
        continue;
      }
    }

    res.json({
      success: true,
      data: projects,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalProjects / limit),
        totalItems: totalProjects,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    handleContractError(error, res);
  }
});

router.post('/projects/:id/deposit', validateWallet, async (req, res) => {
  try {
    const { amount } = req.body;
    const onChainProjectId = parseInt(req.params.id, 10);

    // if (!amount || !validateAmount(amount)) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Valid deposit amount is required'
    //   });
    // }

    // // Step 1: Check if project exists on-chain
    // const projectExists = await freelancePlatformContract.projectExists(onChainProjectId);
    // if (!projectExists) {
    //   return res.status(404).json({
    //     success: false,
    //     error: 'Project not found on blockchain'
    //   });
    // }

    // Step 2: Fetch project details directly from blockchain
    // const projectDetails = await freelancePlatformContract.getProject(onChainProjectId);

    // Step 3: Authorization — only project client can deposit
    // if (projectDetails.client.toLowerCase() !== req.userAddress.toLowerCase()) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'Only project client can deposit funds'
    //   });
    // }

    // Step 4: Ensure deposit >= required budget
    // const requiredBudget = parseFloat(ethers.formatEther(projectDetails.budget));
    // if (parseFloat(amount) < requiredBudget) {
    //   return res.status(400).json({
    //     success: false,
    //     error: `Deposit amount must be at least ${requiredBudget} ETH`
    //   });
    // }

    // Step 5: Blockchain transaction
    const signer = new ethers.Wallet(process.env.CLIENT_PRIVATE_KEY, provider);
    const freelancePlatformWithSigner = freelancePlatformContract.connect(signer);

    let txHash, escrowAmount;

    try {
      console.log(`Depositing ${amount} ETH for project ${onChainProjectId}`);

      const tx = await freelancePlatformWithSigner.depositFunds(onChainProjectId, {
        value: ethers.parseEther(amount)
      });

      txHash = tx.hash;
      console.log("Deposit transaction sent:", txHash);

      const receipt = await tx.wait();
      console.log("Deposit transaction mined:", receipt.transactionHash);

      // Step 6: Extract FundsDeposited event
      for (const log of receipt.logs) {
        try {
          const parsed = freelancePlatformContract.interface.parseLog(log);
          if (parsed.name === "FundsDeposited") {
            escrowAmount = parseFloat(ethers.formatEther(parsed.args.amount));
            break;
          }
        } catch {
          // skip unrelated logs
        }
      }

      if (escrowAmount === undefined) {
        throw new Error("FundsDeposited event not found in receipt");
      }

    } catch (err) {
      console.error("Blockchain deposit failed:", err);
      return res.status(500).json({
        success: false,
        error: "Blockchain deposit failed",
        details: err.message
      });
    }

    // Step 7: Respond without DB
    res.json({
      success: true,
      data: {
        projectId: onChainProjectId,
        deposit: parseFloat(amount),
        blockchain: {
          txHash,
          escrowAmount
        }
      },
      message: "Funds deposited successfully and project is now open"
    });

  } catch (error) {
    handleError(error, res, 'Deposit failed');
  }
});

router.post('/projects/:id/apply', validateWallet, async (req, res) => {
  try {
    const onChainProjectId = parseInt(req.params.id, 10);
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

    // // Step 1: Ensure project exists on-chain
    // const projectExists = await freelancePlatformContract.projectExists(onChainProjectId);
    // if (!projectExists) {
    //   return res.status(404).json({
    //     success: false,
    //     error: 'Project not found on blockchain'
    //   });
    // }

    // // Step 2: Prevent client applying to their own project
    // const projectDetails = await freelancePlatformContract.getProject(onChainProjectId);
    // if (projectDetails.client.toLowerCase() === req.userAddress.toLowerCase()) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Cannot apply to your own project'
    //   });
    // }

    // // Step 3: Prepare proposal hash
    const proposalData = {
      coverLetter,
      proposedBudget: proposedBudget || projectDetails.budget,
      proposedTimeline: proposedTimeline || 30,
      milestoneBreakdown,
      freelancer: req.userAddress,
      projectId: onChainProjectId,
      timestamp: Date.now()
    };
    const proposalHash = generateProposalHash(proposalData);

    // Step 4: Send blockchain tx
    const signer = new ethers.Wallet(process.env.FREELANCER_PRIVATE_KEY, provider);
    const freelancePlatformWithSigner = freelancePlatformContract.connect(signer);

    console.log(`Applying for project ${onChainProjectId} on-chain with hash ${proposalHash}`);

    const tx = await freelancePlatformWithSigner.applyForProject(
      onChainProjectId,
      proposalHash,
      { gasLimit: 300_000 }
    );

    console.log("Tx sent:", tx.hash);

    // Respond immediately (don’t wait for confirmation)
    res.status(201).json({
      success: true,
      data: {
        application: {
          projectId: onChainProjectId,
          freelancer: req.userAddress,
          proposal: proposalData
        },
        blockchain: { txHash: tx.hash }
      },
      message: 'Application submitted, awaiting confirmation'
    });

    // Optional background wait
    const receipt = await tx.wait();
    if (receipt.status === 1) {
      console.log("Application confirmed:", receipt.transactionHash);
    } else {
      console.error("Tx reverted:", receipt.transactionHash);
    }

  } catch (error) {
    console.error("Application submission failed:", error);
    handleError(error, res, 'Application submission failed');
  }
});

// tested 
// --- SHORTLIST FREELANCERS (On-chain) ---
router.post('/projects/:id/shortlist-freelancers', validateWallet, async (req, res) => {
  try {
    const onChainProjectId = parseInt(req.params.id, 10);
    const { freelancers } = req.body;

    // Step 1: Basic validation
    if (!Array.isArray(freelancers) || freelancers.length === 0) {
      return res.status(400).json({ success: false, error: 'Freelancers array is required' });
    }
    if (freelancers.length > 10) {
      return res.status(400).json({ success: false, error: 'Cannot shortlist more than 10 freelancers' });
    }
    for (const addr of freelancers) {
      if (!validateAddress(addr)) {
        return res.status(400).json({ success: false, error: `Invalid freelancer address: ${addr}` });
      }
    }

    // Step 2: Ensure project exists on-chain
    // const projectExists = await freelancePlatformContract.projectExists(onChainProjectId);
    // if (!projectExists) {
    //   return res.status(404).json({ success: false, error: 'Project not found on blockchain' });
    // }

    // Step 3: Authorization — only client can shortlist
    // const projectDetails = await freelancePlatformContract.getProject(onChainProjectId);
    // if (projectDetails.client.toLowerCase() !== req.userAddress.toLowerCase()) {
    //   return res.status(403).json({ success: false, error: 'Only project client can shortlist freelancers' });
    // }

    // (Optional) Step 4: Verify freelancers applied by checking proposals on-chain (if contract supports)
    // Example:
    // const applied = await freelancePlatformContract.hasApplied(onChainProjectId, freelancerAddr);

    // Step 5: Blockchain call
    const signer = new ethers.Wallet(process.env.CLIENT_PRIVATE_KEY, provider);
    const contractWithSigner = freelancePlatformContract.connect(signer);

    const tx = await contractWithSigner.shortlistFreelancers(onChainProjectId, freelancers, {
      gasLimit: 400_000
    });
    console.log('Tx sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Tx confirmed:', receipt.transactionHash);

    // Step 6: Respond without DB
    res.json({
      success: true,
      data: {
        projectId: onChainProjectId,
        shortlistedFreelancers: freelancers,
        txHash: tx.hash
      },
      message: 'Freelancers shortlisted on-chain successfully'
    });

  } catch (error) {
    console.error('Shortlisting failed:', error);
    handleError(error, res, 'Freelancer shortlisting failed');
  }
});

// --- SELECT FREELANCER (On-chain) ---
router.post('/projects/:id/select-freelancer', validateWallet, async (req, res) => {
  try {
    const onChainProjectId = parseInt(req.params.id, 10);
    const { freelancerAddress } = req.body;

    // Step 1: Validate input
    if (!freelancerAddress || !validateAddress(freelancerAddress)) {
      return res.status(400).json({ success: false, error: 'Valid freelancer address is required' });
    }

    // Step 2: Ensure project exists on-chain
    // const projectExists = await freelancePlatformContract.projectExists(onChainProjectId);
    // if (!projectExists) {
    //   return res.status(404).json({ success: false, error: 'Project not found on blockchain' });
    // }

    // // Step 3: Fetch project details
    // const projectDetails = await freelancePlatformContract.getProject(onChainProjectId);

    // // Step 4: Authorization — only the client can select a freelancer
    // if (projectDetails.client.toLowerCase() !== req.userAddress.toLowerCase()) {
    //   return res.status(403).json({ success: false, error: 'Only project client can select a freelancer' });
    // }

    // Step 5: Ensure project has escrow balance (optional, depending on contract rules)
    // const escrowBalance = parseFloat(ethers.formatEther(projectDetails.escrowBalance));
    // if (escrowBalance <= 0) {
    //   return res.status(400).json({ success: false, error: 'Project not funded' });
    // }

    // Step 6: Ensure no freelancer already selected
    // if (projectDetails.freelancer && projectDetails.freelancer !== ethers.ZeroAddress) {
    //   return res.status(409).json({ success: false, error: 'Freelancer already selected' });
    // }

    // (Optional) Step 7: Check if freelancer applied/was shortlisted
    // If your contract has a method like hasApplied/wasShortlisted, call it here
    // const isShortlisted = await freelancePlatformContract.isShortlisted(onChainProjectId, freelancerAddress);
    // if (!isShortlisted) return res.status(400).json({ success: false, error: 'Freelancer was not shortlisted' });

    // Step 8: Blockchain transaction
    const signer = new ethers.Wallet(process.env.CLIENT_PRIVATE_KEY, provider);
    const contractWithSigner = freelancePlatformContract.connect(signer);

    const tx = await contractWithSigner.selectFreelancer(onChainProjectId, freelancerAddress, {
      gasLimit: 300_000
    });
    console.log('Tx sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Tx confirmed:', receipt.transactionHash);

    // Step 9: Respond (no DB persistence)
    res.json({
      success: true,
      data: {
        projectId: onChainProjectId,
        selectedFreelancer: freelancerAddress.toLowerCase(),
        txHash: tx.hash
      },
      message: 'Freelancer selected on-chain successfully'
    });

  } catch (error) {
    console.error('Freelancer selection failed:', error);
    handleError(error, res, 'Freelancer selection failed');
  }
});

//Accept Project (Freelancer accepting selected project)
// --- ACCEPT PROJECT (On-chain) ---
// POST /api/projects/:id/accept
router.post('/projects/:id/accept', validateWallet, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);

    if (!req.userAddress) {
      return res.status(401).json({ success: false, error: 'User address not found' });
    }

    // signer = freelancer’s private key
    const signer = new ethers.Wallet(process.env.FREELANCER_PRIVATE_KEY, provider);
    const contractWithSigner = freelancePlatformContract.connect(signer);

    console.log(`Freelancer accepting project ${projectId} on-chain`);

    const tx = await contractWithSigner.acceptProject(projectId);
    console.log('Tx sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Tx confirmed:', receipt.transactionHash);

    // Parse event
    const event = receipt.logs
      .map(log => {
        try { return freelancePlatformContract.interface.parseLog(log); }
        catch { return null; }
      })
      .find(parsed => parsed && parsed.name === 'FreelancerAcceptedProject');

    if (!event) throw new Error('FreelancerAcceptedProject event not found');

    res.json({
      success: true,
      data: {
        txHash: tx.hash,
        projectId: event.args[0].toString(),
        freelancer: event.args[1]
      },
      message: 'Project accepted successfully on-chain'
    });

  } catch (error) {
    console.error('Accept project failed:', error);
    res.status(500).json({
      success: false,
      error: 'Accept project failed',
      details: error.message
    });
  }
});

// ==================== MILESTONE ROUTES ====================
// Create milestones
// POST /api/projects/:id/milestones/agree
router.post('/projects/:id/milestones/agree', validateWallet, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { amounts, deadlines, metadataHashes } = req.body;

    if (!req.userAddress) {
      return res.status(401).json({ success: false, error: 'User address not found' });
    }

    // signer = client’s private key
    const signer = new ethers.Wallet(process.env.CLIENT_PRIVATE_KEY, provider);
    const contractWithSigner = freelancePlatformContract.connect(signer);

    console.log(`Agreeing milestones for project ${projectId} on-chain`);

    const tx = await contractWithSigner.agreeMilestones(
      projectId,
      amounts,
      deadlines,
      metadataHashes
    );
    console.log('Tx sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Tx confirmed:', receipt.transactionHash);

    // Look for events
    const milestonesEvent = receipt.logs
      .map(log => {
        try { return freelancePlatformContract.interface.parseLog(log); }
        catch { return null; }
      })
      .find(parsed => parsed && parsed.name === 'MilestonesAgreed');

    if (!milestonesEvent) throw new Error('MilestonesAgreed event not found');

    res.json({
      success: true,
      data: {
        txHash: tx.hash,
        projectId,
        milestoneIds: milestonesEvent.args[1].map(id => id.toString())
      },
      message: 'Milestones agreed and project activated on-chain'
    });

  } catch (error) {
    console.error('Agree milestones failed:', error);
    res.status(500).json({
      success: false,
      error: 'Agree milestones failed',
      details: error.message
    });
  }
});

// Submit milestone work
// POST /api/milestones/:id/submit-work
router.post('/milestones/:id/submit-work', validateWallet, async (req, res) => {
  try {
    const milestoneId = parseInt(req.params.id, 10);
    const { deliveryHash, notes } = req.body;

    if (!req.userAddress) {
      return res.status(401).json({ success: false, error: 'User address not found' });
    }

    const signer = new ethers.Wallet(process.env.FREELANCER_PRIVATE_KEY, provider);
    const contractWithSigner = freelancePlatformContract.connect(signer);

    console.log(`Submitting work for milestone ${milestoneId} on-chain`);

    const tx = await contractWithSigner.submitMilestoneWork(
      milestoneId,
      deliveryHash,
      notes
    );
    console.log('Tx sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Tx confirmed:', receipt.transactionHash);

    // Look for event
    const submitEvent = receipt.logs
      .map(log => {
        try { return freelancePlatformContract.interface.parseLog(log); }
        catch { return null; }
      })
      .find(parsed => parsed && parsed.name === 'MilestoneSubmitted');

    if (!submitEvent) throw new Error('MilestoneSubmitted event not found');

    res.json({
      success: true,
      data: {
        txHash: tx.hash,
        milestoneId,
        projectId: submitEvent.args[1].toString(),
        amount: submitEvent.args[2].toString()
      },
      message: 'Milestone work submitted successfully on-chain'
    });

  } catch (error) {
    console.error('Submit milestone work failed:', error);
    res.status(500).json({
      success: false,
      error: 'Submit milestone work failed',
      details: error.message
    });
  }
});

router.post('/milestones/:id/approve', validateWallet, async (req, res) => {
  try {
    const milestoneId = parseInt(req.params.id, 10);

    if (!req.userAddress) {
      return res.status(401).json({ success: false, error: 'User address not found' });
    }

    const signer = new ethers.Wallet(process.env.CLIENT_PRIVATE_KEY, provider);
    const contractWithSigner = freelancePlatformContract.connect(signer);

    console.log(`Approving milestone ${milestoneId} on-chain`);

    const tx = await contractWithSigner.approveMilestone(milestoneId);
    console.log('Tx sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Tx confirmed:', receipt.transactionHash);

    const event = receipt.logs
      .map(log => {
        try { return freelancePlatformContract.interface.parseLog(log); }
        catch { return null; }
      })
      .find(parsed => parsed && parsed.name === 'MilestoneApproved');

    if (!event) throw new Error('MilestoneApproved event not found in receipt');

    res.json({
      success: true,
      data: {
        txHash: tx.hash,
        milestoneId: milestoneId.toString(),
        projectId: event.args?.[1]?.toString(),
        approver: event.args?.[2]
      },
      message: 'Milestone approved on-chain successfully'
    });

  } catch (error) {
    console.error('Milestone approval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Milestone approval failed',
      details: error.message
    });
  }
});

router.post('/milestones/:id/release', validateWallet, async (req, res) => {
  try {
    const milestoneId = parseInt(req.params.id, 10);

    if (!req.userAddress) {
      return res.status(401).json({ success: false, error: 'User address not found' });
    }

    const signer = new ethers.Wallet(process.env.CLIENT_PRIVATE_KEY, provider);
    const contractWithSigner = freelancePlatformContract.connect(signer);

    console.log(`Releasing payment for milestone ${milestoneId} on-chain`);

    const tx = await contractWithSigner.releaseMilestonePayment(milestoneId);
    console.log('Tx sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Tx confirmed:', receipt.transactionHash);

    const event = receipt.logs
      .map(log => {
        try { return freelancePlatformContract.interface.parseLog(log); }
        catch { return null; }
      })
      .find(parsed => parsed && (parsed.name === 'PaymentReleased' || parsed.name === 'MilestonePaymentReleased'));

    if (!event) throw new Error('MilestonePaymentReleased/PaymentReleased event not found in receipt');

    res.json({
      success: true,
      data: {
        txHash: tx.hash,
        milestoneId: milestoneId.toString(),
        projectId: event.args?.[1]?.toString(),
        amount: event.args?.[2]?.toString(),
        freelancer: event.args?.[3]
      },
      message: 'Milestone payment released on-chain successfully'
    });

  } catch (error) {
    console.error('Payment release failed:', error);
    res.status(500).json({
      success: false,
      error: 'Payment release failed',
      details: error.message
    });
  }
});

//------------auto approve------------------- can be done by both client or freelancer
router.post('/milestones/:id/auto-approve', validateWallet, syncUser, async (req, res) => {
  try {
    const milestoneId = parseInt(req.params.id, 10);

    if (!req.userAddress) {
      return res.status(401).json({ success: false, error: 'User address not found' });
    }

    const signer = new ethers.Wallet(process.env.FREELANCER_PRIVATE_KEY, provider);
    const contractWithSigner = freelancePlatformContract.connect(signer);

    console.log(`Auto Approving milestone ${milestoneId} on-chain`);

    const tx = await contractWithSigner.autoApproveMilestone(milestoneId);
    console.log('Tx sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Tx confirmed:', receipt.transactionHash);

    const event = receipt.logs
      .map(log => {
        try { return freelancePlatformContract.interface.parseLog(log); }
        catch { return null; }
      })
      .find(parsed => parsed && parsed.name === 'PaymentReleased');

    if (!event) throw new Error('PaymentReleased event not found in receipt');

    res.json({
      success: true,
      data: {
        txHash: tx.hash,
        milestoneId: milestoneId.toString(),
        projectId: event.args?.[1]?.toString(),
        approver: event.args?.[2]
      },
      message: 'Milestone auto approved on-chain successfully'
    });

  } catch (error) {
    console.error('Milestone auto approval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Milestone auto approval failed',
      details: error.message
    });
  }
});

// Dispute
router.post('/milestones/:id/dispute', validateWallet, syncUser, async (req, res) => {
  try {
    const milestoneId = parseInt(req.params.id, 10);
    const { reason } = req.body;

    if (!req.userAddress) {
      return res.status(401).json({ success: false, error: 'User address not found' });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Dispute reason is required' });
    }

    const signer = new ethers.Wallet(process.env.CLIENT_PRIVATE_KEY, provider);
    const contractWithSigner = freelancePlatformContract.connect(signer);

    console.log(`Raising dispute for milestone ${milestoneId} on-chain`);

    const tx = await contractWithSigner.disputeMilestone(milestoneId);
    console.log('Tx sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Tx confirmed:', receipt.transactionHash);

    // Parse event
    const event = receipt.logs
      .map(log => {
        try { return freelancePlatformContract.interface.parseLog(log); }
        catch { return null; }
      })
      .find(parsed => parsed && parsed.name === 'DisputeRaised');

    if (!event) throw new Error('DisputeRaised event not found in receipt');

    res.json({
      success: true,
      data: {
        txHash: tx.hash,
        milestoneId: milestoneId,
        projectId: event.args[0]?.toString(),
        disputeRaisedBy: event.args[1],
        reason: reason.trim()
      },
      message: 'Dispute raised on-chain successfully'
    });

  } catch (error) {
    console.error('Milestone dispute failed:', error);
    res.status(500).json({
      success: false,
      error: 'Milestone dispute failed',
      details: error.message
    });
  }
});
//--------------------extend-----------------------
// Request Extension Route
router.post('/milestones/:id/request-extension', validateWallet, syncUser, async (req, res) => {
  try {
    const milestoneId = parseInt(req.params.id, 10);
    const { newDeadline} = req.body;
    if (!req.userAddress) {
      return res.status(401).json({ success: false, error: 'User address not found' });
    }
    if (!newDeadline) {
      return res.status(400).json({
        success: false,
        error: 'New deadline is required'
      });
    }
    const newDeadlineTimestamp = Math.floor(new Date(newDeadline).getTime() / 1000);

    const signer = new ethers.Wallet(process.env.FREELANCER_PRIVATE_KEY, provider);
    const contractWithSigner = freelancePlatformContract.connect(signer);

    console.log(`Disputing milestones for milestone ${milestoneId} on-chain`);

    const tx = await contractWithSigner.requestExtension(
      milestoneId,
      newDeadlineTimestamp
    );
    console.log('Tx sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Tx confirmed:', receipt.transactionHash);

    const event = receipt.logs
      .map(log => {
        try { return freelancePlatformContract.interface.parseLog(log); }
        catch { return null; }
      })
      .find(parsed => parsed && parsed.name === 'MilestoneExtensionRequested');

    if (!event) throw new Error('MilestoneExtensionRequested event not found in receipt');

    res.json({
      success: true,
      data: {
        txHash:tx.hash,
        milestoneId: event.args?.[0]?.toString() ?? milestoneId.toString(),
        projectId: event.args?.[1]?.toString(),
        requestedNewDeadline: newDeadlineTimestamp
      },
      message: 'Extension request submitted successfully'
    });
  } catch (error) {
    console.error('Extension request failed:', error);
    res.status(500).json({
      success: false,
      error: 'Extension request failed',
      details: error.message
    });
  }
});

// Approve Extension Route
router.post('/milestones/:id/approve-extension', validateWallet, syncUser, async (req, res) => {
  try {
    const milestoneId = req.params.id;
    const { newDeadline } = req.body;
    if (!req.userAddress) {
      return res.status(401).json({ success: false, error: 'User address not found' });
    }
    if (!newDeadline) {
      return res.status(400).json({
        success: false,
        error: 'New deadline is required'
      });
    }
     const newDeadlineTimestamp = Math.floor(new Date(newDeadline).getTime() / 1000);

    // Client signs approval
    const signer = new ethers.Wallet(process.env.CLIENT_PRIVATE_KEY, provider);
    const contractWithSigner = freelancePlatformContract.connect(signer);

    console.log(`Approving extension for milestone ${milestoneId} on-chain`);

    const tx = await contractWithSigner.approveExtension(milestoneId, newDeadlineTimestamp);
    console.log('Tx sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Tx confirmed:', receipt.transactionHash);
    
    const event = receipt.logs
      .map(log => {
        try { return freelancePlatformContract.interface.parseLog(log); }
        catch { return null; }
      })
      .find(parsed => parsed && parsed.name === 'MilestoneExtensionApproved');

    if (!event) throw new Error('MilestoneExtensionApproved event not found in receipt');

    res.json({
      success: true,
      data: {
        txHash: tx.hash,
        milestoneId: event.args?.[0]?.toString() ?? milestoneId.toString(),
        projectId: event.args?.[1]?.toString(),
        newDeadline: event.args?.[2]?.toString() ?? newDeadlineTimestamp.toString()
      },
      message: 'Extension approved successfully'
    });

  } catch (error) {
    console.error('Extension approval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Extension approval failed',
      details: error.message
    });
  }
});


// Admin/owner resolves dispute
router.post('/milestones/:id/resolve-dispute', validateWallet, async (req, res) => {
  try {
    const milestoneId = parseInt(req.params.id, 10);
    const { winner, disputedAmount } = req.body;

    if (!req.userAddress) {
      return res.status(401).json({ success: false, error: 'User address not found' });
    }
    if (!Number.isFinite(milestoneId)) {
      return res.status(400).json({ success: false, error: 'Invalid milestone id' });
    }
    if (!winner || !ethers.utils.isAddress(winner)) {
      return res.status(400).json({ success: false, error: 'Valid winner address is required' });
    }
    if (!disputedAmount || !/^\d+$/.test(String(disputedAmount))) {
      return res.status(400).json({ success: false, error: 'disputedAmount (uint) is required' });
    }

    // Contract owner signer
    const signer = new ethers.Wallet(process.env.ADMIN_KEY, provider);
    const contractWithSigner = freelancePlatformContract.connect(signer);

    console.log(`Resolving dispute for milestone ${milestoneId} on-chain`);

    const tx = await contractWithSigner.resolveDispute(
      milestoneId,
      winner,
      ethers.BigNumber.from(disputedAmount)
    );
    console.log('Tx sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Tx confirmed:', receipt.transactionHash);

    // DisputeResolved(projectId, winner, disputedAmount)
    const event = receipt.logs
      .map(log => {
        try { return freelancePlatformContract.interface.parseLog(log); }
        catch { return null; }
      })
      .find(parsed => parsed && parsed.name === 'DisputeResolved');

    if (!event) throw new Error('DisputeResolved event not found in receipt');

    res.json({
      success: true,
      data: {
        txHash: tx.hash,
        projectId: event.args?.[0]?.toString(),
        winner: event.args?.[1],
        disputedAmount: event.args?.[2]?.toString()
      },
      message: 'Dispute resolved on-chain successfully'
    });

  } catch (error) {
    console.error('Resolve dispute failed:', error);
    res.status(500).json({
      success: false,
      error: 'Resolve dispute failed',
      details: error.message
    });
  }
});

module.exports = router;

// // Advanced project search with full-text search--after mongodb integration
// router.post('/projects/search', async (req, res) => {
//   try {
//     const {
//       query,
//       filters = {},
//       sort = { createdAt: -1 },
//       page = 1,
//       limit = 20
//     } = req.body;

//     let pipeline = [];

//     // Text search stage
//     if (query) {
//       pipeline.push({
//         $match: {
//           $text: { $search: query }
//         }
//       });
//     }

//     // Filters stage
//     let matchStage = { status: 'open' }; // Default to open projects

//     if (filters.category) {
//       matchStage.category = filters.category;
//     }

//     if (filters.budget) {
//       if (filters.budget.min || filters.budget.max) {
//         matchStage['budget.total'] = {};
//         if (filters.budget.min) matchStage['budget.total'].$gte = filters.budget.min;
//         if (filters.budget.max) matchStage['budget.total'].$lte = filters.budget.max;
//       }
//     }

//     if (filters.skills && filters.skills.length > 0) {
//       matchStage.skills = { $in: filters.skills };
//     }

//     if (filters.timeline) {
//       if (filters.timeline.maxDays) {
//         const futureDate = new Date();
//         futureDate.setDate(futureDate.getDate() + filters.timeline.maxDays);
//         matchStage['timeline.deadline'] = { $lte: futureDate };
//       }
//     }

//     pipeline.push({ $match: matchStage });

//     // Add client information
//     pipeline.push({
//       $lookup: {
//         from: 'users',
//         localField: 'client.address',
//         foreignField: 'address',
//         as: 'clientInfo'
//       }
//     });

//     // Add application count
//     pipeline.push({
//       $lookup: {
//         from: 'applications',
//         let: { projectId: '$onChainId' },
//         pipeline: [
//           { $match: { $expr: { $eq: ['$projectId', '$projectId'] } } },
//           { $count: 'count' }
//         ],
//         as: 'applicationCount'
//       }
//     });

//     // Sort stage
//     pipeline.push({ $sort: sort });

//     // Add text score for relevance (if text search was used)
//     if (query) {
//       pipeline.push({
//         $addFields: {
//           score: { $meta: 'textScore' }
//         }
//       });
//     }

//     // Pagination
//     pipeline.push({ $skip: (page - 1) * limit });
//     pipeline.push({ $limit: limit });

//     const projects = await Project.aggregate(pipeline);

//     // Get total count for pagination
//     const totalPipeline = pipeline.slice(0, -2); // Remove skip and limit
//     totalPipeline.push({ $count: 'total' });
//     const totalResult = await Project.aggregate(totalPipeline);
//     const total = totalResult[0]?.total || 0;

//     res.json({
//       success: true,
//       data: projects,
//       pagination: {
//         currentPage: page,
//         totalPages: Math.ceil(total / limit),
//         totalItems: total,
//         itemsPerPage: limit
//       },
//       searchInfo: {
//         query,
//         filters,
//         resultsFound: total
//       }
//     });
//   } catch (error) {
//     handleError(error, res, 'Project search failed');
//   }
// });

// // Get fee information from contract (read-only)
// router.get('/platform/fees', async (req, res) => {
//   try {
//     // Read fee percentages from contract
//     const platformFeePercent = await freelancePlatformContract.platformFeePercent();
//     const freelancerFeePercent = await freelancePlatformContract.freelancerFeePercent();

//     // Convert basis points to percentage
//     const platformFeePercentage = parseInt(platformFeePercent.toString()) / 10000; // 300 → 3%
//     const freelancerFeePercentage = parseInt(freelancerFeePercent.toString()) / 10000; // 250 → 2.5%

//     res.json({
//       success: true,
//       data: {
//         platformFee: {
//           basisPoints: platformFeePercent.toString(),
//           percentage: platformFeePercentage
//         },
//         freelancerFee: {
//           basisPoints: freelancerFeePercent.toString(),
//           percentage: freelancerFeePercentage
//         },
//         note: "Fees are automatically deducted by the smart contract"
//       }
//     });
//   } catch (error) {
//     // Fallback to default values if contract call fails
//     res.json({
//       success: true,
//       data: {
//         platformFee: { basisPoints: "300", percentage: 3 },
//         freelancerFee: { basisPoints: "250", percentage: 2.5 },
//         note: "Default fee values - contract call failed"
//       }
//     });
//   }
// });

// // Frontend helper to calculate fees for UI display ONLY
// router.post('/calculate-fees', async (req, res) => {
//   try {
//     const { amount } = req.body;

//     if (!amount || !validateAmount(amount)) {
//       return res.status(400).json({
//         success: false,
//         error: 'Valid amount required'
//       });
//     }

//     try {
//       // Get current fees from contract
//       const platformFeePercent = await freelancePlatformContract.platformFeePercent();
//       const freelancerFeePercent = await freelancePlatformContract.freelancerFeePercent();

//       const platformFeePercentage = parseInt(platformFeePercent.toString()) / 10000; // Basis points to decimal
//       const freelancerFeePercentage = parseInt(freelancerFeePercent.toString()) / 10000;

//       const amountFloat = parseFloat(amount);
//       const platformFee = amountFloat * platformFeePercentage;
//       const freelancerFee = amountFloat * freelancerFeePercentage;
//       const netAmount = amountFloat - platformFee;

//       res.json({
//         success: true,
//         data: {
//           inputAmount: amountFloat,
//           platformFee: platformFee,
//           freelancerFee: freelancerFee, // Applied later on milestone payments
//           netEscrowAmount: netAmount,
//           note: "This is for UI display only. Actual fees are calculated by smart contract."
//         }
//       });
//     } catch (contractError) {
//       // Fallback calculation with default values
//       const platformFee = parseFloat(amount) * 0.03; // 3%
//       const freelancerFee = parseFloat(amount) * 0.025; // 2.5%
//       const netAmount = parseFloat(amount) - platformFee;

//       res.json({
//         success: true,
//         data: {
//           inputAmount: parseFloat(amount),
//           platformFee: platformFee,
//           freelancerFee: freelancerFee,
//           netEscrowAmount: netAmount,
//           note: "Estimated fees - using default values"
//         }
//       });
//     }
//   } catch (error) {
//     handleError(error, res, 'Fee calculation failed');
//   }
// });


