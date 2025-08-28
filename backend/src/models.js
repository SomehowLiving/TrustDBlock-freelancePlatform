// MongoDB Schema Design for FreelancePlatform
// Using Mongoose for Node.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); 

// ========== USER MODEL ==========
const userSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['client', 'freelancer', 'admin'],
    default: 'freelancer',
    index: true
  },
  profile: {
    bio: String,
    skills: [String],
    hourlyRate: Number,
    availability: {
      type: String,
      enum: ['available', 'busy', 'unavailable'],
      default: 'available'
    },
    location: String,
    website: String,
    github: String,
    linkedin: String,
    avatar: String,
    timezone: String,
    portfolio: [{
      title: String,
      description: String,
      url: String,
      image: String
    }]
  },
  reputation: {
    totalProjects: { type: Number, default: 0 },
    completedProjects: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    nftCount: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    hasNFT: { type: Boolean, default: false },
    badges: [String]
  },
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    weeklyDigest: { type: Boolean, default: true }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastActiveAt: Date,
  isVerified: { type: Boolean, default: false }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Calculate success rate
userSchema.methods.calculateSuccessRate = function() {
  if (this.reputation.totalProjects === 0) return 0;
  return (this.reputation.completedProjects / this.reputation.totalProjects) * 100;
};

// Indexes for performance
userSchema.index({ wallet: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'reputation.averageRating': -1 });
userSchema.index({ 'reputation.projectsCompleted': -1 });
userSchema.index({ createdAt: -1 });

// ========== PROJECT MODEL ==========
const projectSchema = new mongoose.Schema({
  projectId: {
    type: Number,
    unique: true,
    sparse: true,
    index: true // blockchain ID
  },
  onChainId: {
    type: Number,
    unique: true,
    sparse: true,
    index: true // alias for projectId for consistency
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  client: {
    address: {
      type: String,
      required: true,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/,
      index: true
    },
    displayName: String
  },
  freelancer: {
    address: {
      type: String,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/,
      default: null,
      index: true
    },
    displayName: String,
    selectedAt: Date
  },
  
  budget: {
    total: {
      type: Number,
      required: true,
      min: 0
    },
    totalBudget: {
      type: Number,
      required: true,
      min: 0 // alias for backward compatibility
    },
    escrowBalance: {
      type: Number,
      default: 0
    },
    type: { type: String, enum: ['fixed', 'hourly'], default: 'fixed' }
  },
  
  milestones: {
    expected: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    expectedMilestones: {
      type: Number,
      required: true,
      min: 1,
      default: 1 // alias for backward compatibility
    },
    completed: { type: Number, default: 0 },
    completedMilestones: { type: Number, default: 0 }, // alias
    total: { type: Number, default: 0 }
  },
  
  timeline: {
    deadline: {
      type: Date,
      required: true
    },
    expectedDuration: Number, // in days
    applicationDeadline: Date,
    startDate: Date,
    endDate: Date,
    createdAt: { type: Date, default: Date.now }
  },
  
  category: {
    type: String,
    required: true,
    enum: ['Development', 'Design', 'Writing', 'Marketing', 'Consulting', 'Other'],
    default: 'Other',
    index: true
  },
  
  skills: [{
    type: String,
    trim: true
  }],
  tags: [{ type: String, index: true }],
  
  status: {
    type: String,
    enum: [
      'created', 'open', 'funded', 'active', 'completed', 'cancelled', 'disputed',
      'Draft', 'Open', 'Selecting', 'Negotiating', 'Active', 'Completed', 'Cancelled'
    ],
    default: 'created',
    index: true
  },
  
  blockchain: {
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed'],
      default: 'pending'
    },
    blockchainStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'failed'], // alias
      default: 'pending'
    },
    txHash: String,
    depositTxHash: String,
    blockNumber: Number
  },
  
  applications: {
    count: { type: Number, default: 0 },
    shortlistedCount: { type: Number, default: 0 }
  },
  
  // Embedded proposals for backward compatibility
  proposals: [{
    freelancer: {
      type: String,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/
    },
    bidAmount: Number,
    proposal: String,
    timeline: String,
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  requirements: {
    skills: [String],
    experience: String,
    deliverables: [String]
  },
  
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number
  }],
  
  metadata: {
    ipfsHash: String,
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'expert'] },
    urgency: { type: String, enum: ['low', 'medium', 'high'] }
  },
  
  flags: {
    isCompleted: { type: Boolean, default: false },
    isDisputed: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isUrgent: { type: Boolean, default: false },
    hasNDA: { type: Boolean, default: false }
  },
  
  activity: {
    viewCount: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now },
    chatMessages: { type: Number, default: 0 }
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate project progress
projectSchema.methods.calculateProgress = function() {
  const expected = this.milestones.expected || this.milestones.expectedMilestones || 0;
  const completed = this.milestones.completed || this.milestones.completedMilestones || 0;
  if (expected === 0) return 0;
  return (completed / expected) * 100;
};

// Compound indexes for complex queries
projectSchema.index({ status: 1, 'timeline.applicationDeadline': 1 });
projectSchema.index({ category: 1, status: 1 });
projectSchema.index({ 'client.wallet': 1, status: 1 });
projectSchema.index({ 'freelancer.wallet': 1, status: 1 });
projectSchema.index({ 'budget.total': 1, status: 1 });
projectSchema.index({ 'timeline.createdAt': -1 });
projectSchema.index({ tags: 1, status: 1 });

// ========== APPLICATION MODEL ==========
const applicationSchema = new mongoose.Schema({
  projectId: { 
    type: Number, 
    required: true, 
    index: true 
  },
  project: {
    title: String,
    budget: Number,
    client: String
  },
  freelancer: {
    wallet: { type: String, required: true, index: true },
    displayName: String
  },
  
  proposal: {
    coverLetter: { type: String, required: true },
    proposedBudget: Number,
    proposedTimeline: Number, // in days
    milestoneBreakdown: [{
      title: String,
      description: String,
      amount: Number,
      duration: Number
    }]
  },
  
  status: {
    type: String,
    enum: ['submitted', 'shortlisted', 'selected', 'rejected', 'withdrawn'],
    default: 'submitted',
    index: true
  },
  
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  
  metadata: {
    ipfsHash: String,
    estimatedHours: Number,
    availability: String
  },
  
  timestamps: {
    submittedAt: { type: Date, default: Date.now },
    shortlistedAt: Date,
    selectedAt: Date,
    respondedAt: Date
  },
  
  interaction: {
    clientViewed: { type: Boolean, default: false },
    clientViewedAt: Date,
    questions: [{
      question: String,
      answer: String,
      askedAt: Date
    }]
  }
});

applicationSchema.index({ projectId: 1, status: 1 });
applicationSchema.index({ 'freelancer.wallet': 1, 'timestamps.submittedAt': -1 });
applicationSchema.index({ projectId: 1, 'timestamps.submittedAt': -1 });

// ========== MILESTONE MODEL ==========
const milestoneSchema = new mongoose.Schema({
  milestoneId: {
    type: Number,
    unique: true,
    sparse: true,
    index: true
  },
  onChainId: {
    type: Number,
    unique: true,
    sparse: true,
    index: true // alias for consistency
  },
  projectId: { 
    type: Number, 
    required: true, 
    index: true 
  },
  project: {
    title: String,
    client: String,
    freelancer: String
  },
  freelancer: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/
  },
  
  details: {
    title: String,
    description: {
      type: String,
      required: true,
      maxlength: 1000
    },
    amount: { type: Number, required: true, min: 0 },
    order: Number // milestone sequence
  },
  
  timeline: {
    deadline: { type: Date, required: true },
    finalSubmitTime: Date,
    finalSubmittedAt: Date, // alias
    submissionTime: Date,
    approvalTime: Date,
    paymentTime: Date,
    approvedAt: Date, // alias
    paidAt: Date, // alias
    disputedAt: Date, // alias
    autoApprovedAt: Date
  },
  
  status: {
    type: String,
    enum: ['pending', 'submitted', 'approved', 'paid', 'disputed', 'cancelled', 'refunded', 'Pending', 'Submitted', 'Approved', 'Paid', 'Disputed', 'Cancelled', 'Refunded'],
    default: 'pending',
    index: true
  },
  
  blockchain: {
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed'],
      default: 'pending'
    },
    blockchainStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'failed'], // alias
      default: 'pending'
    },
    txHash: String,
    finalSubmitTxHash: String,
    approveTxHash: String,
    paymentTxHash: String,
    disputeTxHash: String,
    autoApproveTxHash: String,
    extensionTxHash: String,
    extensionApproveTxHash: String
  },
  
  submission: {
    deliveryHash: String,
    notes: String,
    workSubmission: {
      files: [String], // File URLs or paths - alias
      notes: String,
      submittedAt: Date
    },
    attachments: [{
      name: String,
      url: String,
      type: String,
      size: Number
    }],
    submittedAt: Date
  },
  
  approval: {
    approvedBy: String,
    approvedAt: Date,
    feedback: String,
    rating: Number,
    clientFeedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      submittedAt: Date
    }
  },
  
  extension: {
    requested: { type: Boolean, default: false },
    extensionRequested: { type: Boolean, default: false }, // alias
    requestedAt: Date,
    approved: { type: Boolean, default: false },
    extensionApproved: { type: Boolean, default: false }, // alias
    approvedAt: Date,
    extensionApprovedAt: Date, // alias
    newDeadline: Date,
    requestedDeadline: Date, // alias
    reason: String,
    extensionReason: String // alias
  },
  
  dispute: {
    raised: { type: Boolean, default: false },
    raisedBy: String,
    raisedAt: Date,
    reason: String,
    disputeReason: String, // alias
    resolved: Boolean,
    resolvedAt: Date,
    winner: String
  },
  
  metadata: {
    ipfsHash: String,
    revisionCount: { type: Number, default: 0 },
    communicationHash: String
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
milestoneSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Check if milestone is overdue
milestoneSchema.methods.isOverdue = function() {
  return new Date() > this.timeline.deadline && this.status === 'pending';
};

milestoneSchema.index({ projectId: 1, 'details.order': 1 });
milestoneSchema.index({ status: 1, 'timeline.deadline': 1 });
milestoneSchema.index({ 'timeline.deadline': 1, status: 1 });
milestoneSchema.index({ 'project.freelancer': 1, status: 1 });
milestoneSchema.index({ 'project.client': 1, status: 1 });

// ========== TRANSACTION MODEL ==========
const transactionSchema = new mongoose.Schema({
  txHash: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  blockNumber: { type: Number, index: true },
  blockHash: String,
  
  type: {
    type: String,
    enum: [
      'project_created', 'funds_deposited', 'freelancer_selected',
      'milestone_submitted', 'milestone_approved', 'payment_released',
      'dispute_raised', 'dispute_resolved', 'project_completed',
      'deposit', 'release', 'refund', 'fee', 'dispute_resolution'
    ],
    required: true,
    index: true
  },
  
  entities: {
    projectId: { type: Number, index: true },
    milestoneId: { type: Number, index: true },
    from: { type: String, index: true },
    to: { type: String, index: true },
    fromAddress: {
      type: String,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/
    },
    toAddress: {
      type: String,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/
    },
    client: String,
    freelancer: String
  },
  
  amounts: {
    value: Number,
    amount: {
      type: String,
      required: true // Store as string to preserve precision - alias
    },
    fee: {
      type: String,
      default: '0'
    },
    net: Number,
    gasUsed: String,
    gasPrice: String
  },
  
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
    index: true
  },
  
  confirmations: {
    type: Number,
    default: 0
  },
  
  eventData: mongoose.Schema.Types.Mixed,
  
  timestamps: {
    timestamp: {
      type: Date,
      default: Date.now // alias for backward compatibility
    },
    createdAt: { type: Date, default: Date.now },
    confirmedAt: Date,
    processedAt: Date
  }
});

transactionSchema.index({ 'entities.projectId': 1, type: 1 });
transactionSchema.index({ 'entities.from': 1, 'timestamps.createdAt': -1 });
transactionSchema.index({ 'entities.to': 1, 'timestamps.createdAt': -1 });
transactionSchema.index({ type: 1, 'timestamps.createdAt': -1 });

// ========== COMMUNICATION MODEL ==========
const communicationSchema = new mongoose.Schema({
  projectId: { 
    type: Number, 
    required: true, 
    index: true 
  },
  milestoneId: { type: Number, index: true },
  
  participants: [{
    wallet: String,
    displayName: String,
    role: String
  }],
  
  thread: [{
    sender: {
      wallet: { type: String, required: true },
      displayName: String,
      role: String
    },
    message: {
      content: String,
      type: { type: String, enum: ['text', 'file', 'milestone_update', 'system'], default: 'text' },
      attachments: [{
        name: String,
        url: String,
        type: String,
        size: Number
      }]
    },
    timestamp: { type: Date, default: Date.now },
    edited: {
      isEdited: { type: Boolean, default: false },
      editedAt: Date
    },
    metadata: {
      readBy: [{
        wallet: String,
        readAt: Date
      }],
      replyTo: String // messageId if replying
    }
  }],
  
  summary: {
    totalMessages: { type: Number, default: 0 },
    lastMessage: {
      content: String,
      sender: String,
      timestamp: Date
    },
    unreadCounts: [{
      wallet: String,
      count: Number
    }]
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

communicationSchema.index({ projectId: 1 });
communicationSchema.index({ 'participants.wallet': 1 });
communicationSchema.index({ 'summary.lastMessage.timestamp': -1 });

// ========== NOTIFICATION MODEL ==========
const notificationSchema = new mongoose.Schema({
  recipient: { 
    type: String, 
    required: true, 
    index: true 
  },
  
  type: {
    type: String,
    enum: [
      'application_received', 'application_shortlisted', 'freelancer_selected',
      'milestone_submitted', 'milestone_approved', 'payment_received',
      'dispute_raised', 'project_completed', 'deadline_reminder',
      'new_message', 'extension_requested'
    ],
    required: true,
    index: true
  },
  
  data: {
    projectId: Number,
    milestoneId: Number,
    title: String,
    message: String,
    actionUrl: String,
    relatedUser: {
      wallet: String,
      displayName: String
    }
  },
  
  status: {
    read: { type: Boolean, default: false, index: true },
    readAt: Date,
    archived: { type: Boolean, default: false }
  },
  
  delivery: {
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date
    },
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date
    }
  },
  
  createdAt: { type: Date, default: Date.now, index: true }
});

notificationSchema.index({ recipient: 1, 'status.read': 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });

// ========== ANALYTICS MODEL ==========
const analyticsSchema = new mongoose.Schema({
  date: { 
    type: Date, 
    required: true, 
    index: true 
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true,
    index: true
  },
  
  projects: {
    created: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 },
    active: { type: Number, default: 0 }
  },
  
  users: {
    newClients: { type: Number, default: 0 },
    newFreelancers: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 }
  },
  
  financial: {
    totalVolume: { type: Number, default: 0 },
    platformFees: { type: Number, default: 0 },
    averageProjectValue: { type: Number, default: 0 }
  },
  
  milestones: {
    created: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    disputed: { type: Number, default: 0 }
  },
  
  categories: [{
    name: String,
    projectCount: Number,
    volume: Number
  }],
  
  createdAt: { type: Date, default: Date.now }
});

analyticsSchema.index({ date: -1, type: 1 });

// ========== DISPUTE MODEL ==========
const disputeSchema = new mongoose.Schema({
  disputeId: {
    type: String,
    required: true,
    unique: true
  },
  projectId: { 
    type: Number, 
    required: true, 
    index: true 
  },
  milestoneId: { 
    type: Number, 
    required: true, 
    index: true 
  },
  
  parties: {
    client: {
      wallet: String,
      displayName: String
    },
    freelancer: {
      wallet: String,
      displayName: String
    },
    raisedBy: { 
      type: String, 
      required: true,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/
    },
    againstAddress: {
      type: String,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/
    }
  },
  
  details: {
    reason: { 
      type: String, 
      required: true,
      maxlength: 1000
    },
    description: String,
    category: {
      type: String,
      enum: ['quality', 'deadline', 'scope', 'payment', 'communication', 'other']
    },
    evidence: [{
      type: String, // File URLs or descriptions
      url: String,
      description: String,
      uploadedBy: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  resolution: {
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'closed', 'under_review'],
      default: 'open',
      index: true
    },
    assignedTo: String, // admin wallet
    winner: {
      type: String,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/
    },
    reasoning: String,
    amount: String,
    reason: String, // alias for reasoning
    resolvedBy: {
      type: String,
      lowercase: true,
      match: /^0x[a-fA-F0-9]{40}$/
    },
    resolvedAt: Date,
    txHash: String,
    compensation: {
      toClient: Number,
      toFreelancer: Number
    }
  },
  
  timeline: {
    raisedAt: { type: Date, default: Date.now },
    respondedAt: Date,
    resolvedAt: Date,
    escalatedAt: Date
  },
  
  communication: [{
    from: String,
    message: String,
    attachments: [String],
    timestamp: { type: Date, default: Date.now }
  }],
  
  adminNotes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
disputeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

disputeSchema.index({ 'resolution.status': 1, 'timeline.raisedAt': -1 });
disputeSchema.index({ 'parties.raisedBy': 1 });

// ========== MODELS EXPORT ==========
const User = mongoose.model('User', userSchema);
const Project = mongoose.model('Project', projectSchema);
const Application = mongoose.model('Application', applicationSchema);
const Milestone = mongoose.model('Milestone', milestoneSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Communication = mongoose.model('Communication', communicationSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Analytics = mongoose.model('Analytics', analyticsSchema);
const Dispute = mongoose.model('Dispute', disputeSchema);

module.exports = {
  User,
  Project,
  Application,
  Milestone,
  Transaction,
  Communication,
  Notification,
  Analytics,
  Dispute
};

// ========== DATABASE CONFIGURATION ==========
// Connection configuration with optimizations
const dbConfig = {
  // Connection options for performance and reliability
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0,
  bufferCommands: false,
  
  // Enable monitoring
  monitorCommands: true,
  
  // Compression
  compressors: ['zlib'],
  zlibCompressionLevel: 6
};

// ========== AGGREGATION PIPELINES ==========
// Common aggregation pipelines for quick access

const aggregationPipelines = {
  // Get project dashboard data
  getProjectDashboard: (userWallet, role) => {
    const matchStage = role === 'Client' 
      ? { 'client.wallet': userWallet }
      : { 'freelancer.wallet': userWallet };
    
    return [
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$budget.total' }
        }
      }
    ];
  },
  
  // Get user reputation data
  getUserReputation: (userWallet) => [
    { $match: { wallet: userWallet } },
    {
      $lookup: {
        from: 'projects',
        localField: 'wallet',
        foreignField: 'freelancer.wallet',
        as: 'completedProjects'
      }
    },
    {
      $project: {
        wallet: 1,
        reputation: 1,
        totalProjects: { $size: '$completedProjects' },
        recentProjects: {
          $slice: [
            { $sortArray: { input: '$completedProjects', sortBy: { updatedAt: -1 } } },
            5
          ]
        }
      }
    }
  ],
  
  // Get trending projects
  getTrendingProjects: () => [
    {
      $match: {
        status: 'Open',
        'timeline.applicationDeadline': { $gte: new Date() }
      }
    },
    {
      $addFields: {
        trendingScore: {
          $add: [
            { $multiply: ['$activity.viewCount', 0.3] },
            { $multiply: ['$applications.count', 0.5] },
            { $cond: [{ $eq: ['$flags.isFeatured', true] }, 10, 0] }
          ]
        }
      }
    },
    { $sort: { trendingScore: -1 } },
    { $limit: 20 }
  ]
};

// ========== INDEXES SUMMARY ==========
/*
Key Indexes for Performance:

1. User Model:
   - wallet (unique)
   - role
   - reputation fields for sorting

2. Project Model:
   - onChainId (unique)
   - client.wallet + status (compound)
   - freelancer.wallet + status (compound)
   - status + timeline.applicationDeadline (compound)
   - category + status (compound)
   - tags + status (compound)

3. Application Model:
   - projectId + status (compound)
   - freelancer.wallet + timestamps.submittedAt (compound)

4. Milestone Model:
   - onChainId (unique)
   - projectId + details.order (compound)
   - status + timeline.deadline (compound)

5. Transaction Model:
   - txHash (unique)
   - entities.projectId + type (compound)
   - entities.from + timestamps.createdAt (compound)

6. Notification Model:
   - recipient + status.read + createdAt (compound)

These indexes support:
- Fast user lookups by wallet
- Quick project filtering by status/category/client/freelancer
- Efficient milestone tracking
- Fast transaction history queries
- Optimized notification delivery
- Analytics aggregations
*/



















