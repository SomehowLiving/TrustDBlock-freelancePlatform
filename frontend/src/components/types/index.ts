export interface WalletConnection {
  address: string;
  isConnected: boolean;
  chainId?: number;
}

export interface UserReputation {
  totalProjects: number;
  completedProjects: number;
  totalEarned: number;
  averageRating: number;
  totalRatings: number;
  nftCount: number;
  successRate: number;
  hasNFT: boolean;
  badges: string[];
}

export interface UserProfile {
  bio?: string;
  skills?: string[];
  hourlyRate?: number;
  availability?: 'available' | 'busy' | 'unavailable';
  location?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  avatar?: string;
  timezone?: string;
  portfolio?: Array<{
    title: string;
    description: string;
    url: string;
    image: string;
  }>;
}

export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
}

export interface AuthUser {
  id: string;
  address: string;
  username: string;
  email: string;
  role: 'client' | 'freelancer' | 'admin';
  profile: UserProfile;
  reputation: UserReputation;
  preferences: UserPreferences;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
  isVerified: boolean;
}

export interface ProjectData {
  id: string;
  projectId?: number;
  title: string;
  description: string;
  clientAddress: string;
  freelancerAddress?: string;
  budget: {
    total: number;
    escrowBalance: number;
    type: string;
  };
  milestones: {
    expected: number;
    completed: number;
    total: number;
  };
  timeline: {
    deadline: string;
    expectedDuration?: number;
    applicationDeadline?: string;
    startDate?: string;
    endDate?: string;
  };
  category: string;
  skills: string[];
  tags: string[];
  status: string;
  blockchain: {
    status: string;
    txHash?: string;
    depositTxHash?: string;
    blockNumber?: number;
  };
  applications: {
    count: number;
    shortlistedCount: number;
  };
  requirements?: {
    skills: string[];
    experience: string;
    deliverables: string[];
  };
  attachments: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  metadata?: {
    ipfsHash?: string;
    difficulty?: string;
    urgency?: string;
  };
  flags: {
    isCompleted: boolean;
    isDisputed: boolean;
    isFeatured: boolean;
    isUrgent: boolean;
    hasNDA: boolean;
  };
  activity: {
    viewCount: number;
    lastActivity: string;
    chatMessages: number;
  };
  client?: {
    username: string;
    reputation: any;
  };
  freelancer?: {
    username: string;
    reputation: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationData {
  id: string;
  projectId: string;
  freelancerAddress: string;
  proposal: {
    coverLetter: string;
    proposedBudget?: number;
    proposedTimeline?: number;
    milestoneBreakdown?: Array<{
      title: string;
      description: string;
      amount: number;
      duration: number;
    }>;
  };
  status: string;
  attachments: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  metadata?: {
    ipfsHash?: string;
    estimatedHours?: number;
    availability?: string;
  };
  timestamps: {
    submittedAt: string;
    shortlistedAt?: string;
    selectedAt?: string;
    respondedAt?: string;
  };
  interaction: {
    clientViewed: boolean;
    clientViewedAt?: string;
    questions?: Array<{
      question: string;
      answer: string;
      askedAt: string;
    }>;
  };
  freelancer?: {
    username: string;
    reputation: any;
    profile: any;
  };
  createdAt: Date;
}

export interface MilestoneData {
  id: string;
  milestoneId?: number;
  projectId: string;
  freelancerAddress: string;
  details: {
    title: string;
    description: string;
    amount: number;
    order: number;
  };
  timeline: {
    deadline: string;
    finalSubmitTime?: string;
    submissionTime?: string;
    approvalTime?: string;
    paymentTime?: string;
    disputedAt?: string;
    autoApprovedAt?: string;
  };
  status: string;
  blockchain: {
    status: string;
    txHash?: string;
    finalSubmitTxHash?: string;
    approveTxHash?: string;
    paymentTxHash?: string;
    disputeTxHash?: string;
    autoApproveTxHash?: string;
    extensionTxHash?: string;
    extensionApproveTxHash?: string;
  };
  submission?: {
    deliveryHash?: string;
    notes?: string;
    workSubmission?: {
      files: string[];
      notes: string;
      submittedAt: string;
    };
    attachments?: Array<{
      name: string;
      url: string;
      type: string;
      size: number;
    }>;
    submittedAt?: string;
  };
  approval?: {
    approvedBy?: string;
    approvedAt?: string;
    feedback?: string;
    rating?: number;
    clientFeedback?: {
      rating: number;
      comment: string;
      submittedAt: string;
    };
  };
  extension: {
    requested: boolean;
    requestedAt?: string;
    approved: boolean;
    approvedAt?: string;
    newDeadline?: string;
    reason?: string;
  };
  dispute: {
    raised: boolean;
    raisedBy?: string;
    raisedAt?: string;
    reason?: string;
    resolved?: boolean;
    resolvedAt?: string;
    winner?: string;
  };
  metadata: {
    ipfsHash?: string;
    revisionCount: number;
    communicationHash?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationData {
  id: string;
  recipient: string;
  type: string;
  data: {
    projectId?: number;
    milestoneId?: number;
    title: string;
    message: string;
    actionUrl?: string;
    relatedUser?: {
      wallet: string;
      displayName: string;
    };
  };
  status: {
    read: boolean;
    readAt?: string;
    archived: boolean;
  };
  delivery: {
    email: {
      sent: boolean;
      sentAt?: string;
    };
    push: {
      sent: boolean;
      sentAt?: string;
    };
  };
  createdAt: Date;
}

export interface CommunicationData {
  id: string;
  projectId: string;
  milestoneId?: string;
  participants: Array<{
    wallet: string;
    displayName: string;
    role: string;
  }>;
  thread: Array<{
    id: string;
    sender: {
      wallet: string;
      displayName: string;
      role: string;
    };
    message: {
      content: string;
      type: string;
      attachments?: Array<{
        name: string;
        url: string;
        type: string;
        size: number;
      }>;
    };
    timestamp: string;
    edited: {
      isEdited: boolean;
      editedAt?: string;
    };
    metadata: {
      readBy: Array<{
        wallet: string;
        readAt: string;
      }>;
      replyTo?: string;
    };
  }>;
  summary: {
    totalMessages: number;
    lastMessage?: {
      content: string;
      sender: string;
      timestamp: string;
    };
    unreadCounts: Array<{
      wallet: string;
      count: number;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DisputeData {
  id: string;
  disputeId: string;
  projectId: string;
  milestoneId: string;
  parties: {
    client: {
      wallet: string;
      displayName: string;
    };
    freelancer: {
      wallet: string;
      displayName: string;
    };
    raisedBy: string;
    againstAddress: string;
  };
  details: {
    reason: string;
    description?: string;
    category?: string;
    evidence?: Array<{
      type: string;
      url: string;
      description: string;
      uploadedBy: string;
      uploadedAt: string;
    }>;
  };
  resolution: {
    status: string;
    assignedTo?: string;
    winner?: string;
    reasoning?: string;
    amount?: string;
    resolvedBy?: string;
    resolvedAt?: string;
    txHash?: string;
    compensation?: {
      toClient: number;
      toFreelancer: number;
    };
  };
  timeline: {
    raisedAt: string;
    respondedAt?: string;
    resolvedAt?: string;
    escalatedAt?: string;
  };
  communication: Array<{
    from: string;
    message: string;
    attachments: string[];
    timestamp: string;
  }>;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  totalProjects?: number;
  activeProjects?: number;
  completedProjects?: number;
  totalSpent?: number;
  totalApplications?: number;
  totalEarned?: number;
  pendingMilestones?: number;
  reputation?: any;
  projects?: ProjectData[];
}