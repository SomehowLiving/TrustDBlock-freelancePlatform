# Freelance Platform

A modern freelance platform that combines the best of both worlds: **on-chain security and transparency** with **off-chain performance and rich features**. Built with MongoDB for fast queries and Ethereum smart contracts for immutable payments and escrow.

## 🏗️ Architecture Overview

### Hybrid Design Philosophy

Our platform uses a **dual-layer architecture** that provides:

- **🔒 On-Chain Layer (Ethereum)**: Handles critical operations like payments, escrow, dispute resolution, and milestone approvals
- **⚡ Off-Chain Layer (MongoDB)**: Manages user profiles, project details, applications, messaging, and complex queries
- **🔄 Synchronization Layer**: Keeps both layers in sync using blockchain event listeners and transaction monitoring

### Key Benefits

| Feature | Traditional Web2 | Pure Web3 | Our Hybrid Solution |
|---------|------------------|-----------|-------------------|
| **Performance** | ✅ Fast | ❌ Slow | ✅ Fast queries, secure payments |
| **Cost** | ✅ Low | ❌ High gas fees | ✅ Low cost with selective on-chain ops |
| **Transparency** | ❌ Centralized | ✅ Transparent | ✅ Critical ops on-chain |
| **User Experience** | ✅ Smooth | ❌ Complex | ✅ Web2 UX with Web3 security |
| **Rich Features** | ✅ Full-featured | ❌ Limited | ✅ Full-featured + blockchain |

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm 8+
- MongoDB 5.0+
- Ethereum node/provider (local or remote)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/SomehowLiving/TrustDBlock-freelancePlatform.git
cd TrustDBlock-freelancePlatform

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

### Environment Setup

Update your `.env` file with the following key configurations:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/freelance-platform

# Blockchain
RPC_URL=http://localhost:8545
FREELANCE_PLATFORM_ADDRESS=0x...your-contract-address
USER_REGISTRY_ADDRESS=0x...your-contract-address

# Features
SYNC_ENABLED=true
SYNC_HISTORICAL_DATA=true
```

### Database Setup

```bash
# Setup database indexes and admin user
npm run setup:db

# Seed with sample data (development only)
npm run db:seed
```

### Contract Deployment

If you haven't deployed the smart contracts yet:

```bash
# Verify contracts are deployed and accessible
npm run blockchain:verify

# Deploy contracts (if needed)
# Follow your smart contract deployment process
```

### Start the Platform

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# With Docker
npm run docker:dev
```

Your platform will be available at:
- **API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Documentation**: http://localhost:3001/api/docs

## 📋 API Integration Guide

### Authentication

Include the wallet address in requests:

```bash
# Header-based authentication
curl -H "x-wallet-address: 0x..." http://localhost:3001/api/users/profile

# Body-based authentication
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x...", "title": "My Project"}'
```

### Core Workflow

#### 1. User Registration

```javascript
// Step 1: Create user in database
const response = await fetch('/api/users/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-wallet-address': userWallet
  },
  body: JSON.stringify({
    username: 'john_dev',
    email: 'john@example.com',
    password: 'secure_password',
    role: 'freelancer',
    bio: 'Full-stack developer',
    skills: ['JavaScript', 'React', 'Node.js']
  })
});

// Step 2: Execute blockchain transaction
const { contractCall } = response.data;
const tx = await contract[contractCall.method](...contractCall.params);
await tx.wait();

// Step 3: Confirm registration
await fetch(`/api/users/${userWallet}/confirm`, {
  method: 'POST',
  body: JSON.stringify({ txHash: tx.hash })
});
```

#### 2. Project Creation & Funding

```javascript
// Step 1: Create project in database
const projectResponse = await fetch('/api/projects', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-wallet-address': clientWallet
  },
  body: JSON.stringify({
    title: 'Build E-commerce Website',
    description: 'Need a modern e-commerce platform...',
    budget: 5000,
    category: 'Development',
    skills: ['React', 'Node.js', 'MongoDB'],
    timeline: {
      deadline: '2024-12-31T00:00:00Z',
      applicationDeadline: '2024-01-07T00:00:00Z'
    },
    expectedMilestones: 3
  })
});

// Step 2: Create project on blockchain
const { contractCall } = projectResponse.data;
const createTx = await contract[contractCall.method](...contractCall.params);
const receipt = await createTx.wait();

// Step 3: Sync project with blockchain ID
const projectId = projectResponse.data.project._id;
const onChainId = receipt.logs[0].args.projectId; // Extract from event
await fetch(`/api/projects/${projectId}/sync`, {
  method: 'POST',
  body: JSON.stringify({ onChainId, txHash: createTx.hash })
});

// Step 4: Deposit funds to activate project
const depositTx = await contract.depositFunds(onChainId, { value: ethers.parseEther('5000') });
await depositTx.wait();
```

#### 3. Application & Selection Process

```javascript
// Freelancer applies to project
const applicationResponse = await fetch(`/api/projects/${projectId}/apply`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-wallet-address': freelancerWallet
  },
  body: JSON.stringify({
    coverLetter: 'I have extensive experience...',
    proposedBudget: 4800,
    proposedTimeline: 45,
    milestoneBreakdown: [
      { title: 'Frontend', amount: 2000, duration: 20 },
      { title: 'Backend', amount: 1800, duration: 15 },
      { title: 'Testing', amount: 1000, duration: 10 }
    ]
  })
});

// Execute blockchain application
const { contractCall } = applicationResponse.data;
const applyTx = await contract[contractCall.method](...contractCall.params);
await applyTx.wait();

// Client selects freelancer
const selectResponse = await fetch(`/api/projects/${projectId}/select`, {
  method: 'POST',
  headers: { 'x-wallet-address': clientWallet },
  body: JSON.stringify({ freelancerAddress: freelancerWallet })
});

const selectTx = await contract[selectResponse.data.contractCall.method](...selectResponse.data.contractCall.params);
await selectTx.wait();
```

#### 4. Milestone Management

```javascript
// Create milestones (after freelancer accepts)
const milestonesResponse = await fetch(`/api/projects/${projectId}/milestones`, {
  method: 'POST',
  headers: { 'x-wallet-address': clientWallet },
  body: JSON.stringify({
    milestones: [
      {
        title: 'Frontend Development',
        description: 'Complete React frontend',
        amount: 2000,
        deadline: '2024-02-15T00:00:00Z'
      },
      {
        title: 'Backend Integration',
        description: 'API and database setup',
        amount: 1800,
        deadline: '2024-03-01T00:00:00Z'
      },
      {
        title: 'Testing & Deployment',
        description: 'Final testing and deployment',
        amount: 1000,
        deadline: '2024-03-15T00:00:00Z'
      }
    ]
  })
});

// Execute milestone creation on blockchain
const { contractCall } = milestonesResponse.data;
const milestonesTx = await contract[contractCall.method](...contractCall.params);
await milestonesTx.wait();
```

#### 5. Work Submission & Payment

```javascript
// Freelancer submits work
const submitResponse = await fetch(`/api/milestones/${milestoneId}/submit`, {
  method: 'POST',
  headers: { 'x-wallet-address': freelancerWallet },
  body: JSON.stringify({
    deliveryHash: 'QmDeliveryHash123', // IPFS hash of deliverables
    notes: 'Frontend is complete with all requested features',
    files: [
      { name: 'demo.mp4', url: 'ipfs://...', type: 'video/mp4', size: 1024000 }
    ]
  })
});

const submitTx = await contract[submitResponse.data.contractCall.method](...submitResponse.data.contractCall.params);
await submitTx.wait();

// Client approves milestone
const approveResponse = await fetch(`/api/milestones/${milestoneId}/approve`, {
  method: 'POST',
  headers: { 'x-wallet-address': clientWallet },
  body: JSON.stringify({
    rating: 5,
    feedback: 'Excellent work, exactly what we needed!'
  })
});

const approveTx = await contract[approveResponse.data.contractCall.method](...approveResponse.data.contractCall.params);
await approveTx.wait();

// Client releases payment
const releaseResponse = await fetch(`/api/milestones/${milestoneId}/release`, {
  method: 'POST',
  headers: { 'x-wallet-address': clientWallet }
});

const releaseTx = await contract[releaseResponse.data.contractCall.method](...releaseResponse.data.contractCall.params);
await releaseTx.wait();
```

### Advanced Features

#### Full-Text Search

```javascript
const searchResults = await fetch('/api/projects/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'React Node.js e-commerce',
    filters: {
      category: 'Development',
      budget: { min: 1000, max: 10000 },
      skills: ['React', 'Node.js'],
      timeline: { maxDays: 60 }
    },
    sort: { createdAt: -1 },
    page: 1,
    limit: 20
  })
});
```

#### User Dashboard

```javascript
const dashboard = await fetch(`/api/users/${userWallet}/dashboard`, {
  headers: { 'x-wallet-address': userWallet }
});

// Returns comprehensive user data:
// - Project statistics
// - Recent activities
// - Pending milestones
// - Earnings summary
// - Notifications
```

#### Platform Analytics

```javascript
const analytics = await fetch('/api/platform/analytics?period=30d');

// Returns platform-wide metrics:
// - Project statistics by status/category
// - User growth metrics
// - Transaction volume
// - Top performers
```

## 🔄 State Synchronization

The platform automatically keeps MongoDB and blockchain data synchronized through:

### Event Listeners

The system listens to blockchain events and updates MongoDB in real-time:

- `ProjectCreated` → Updates project status to 'open'
- `FundsDeposited` → Updates escrow balance
- `MilestoneSubmitted` → Updates milestone status
- `PaymentReleased` → Updates earnings and project progress

### Automatic Sync

```bash
# Enable automatic blockchain sync
SYNC_ENABLED=true

# Sync historical data on startup
SYNC_HISTORICAL_DATA=true
SYNC_FROM_BLOCK=0

# Manual sync
npm run blockchain:sync
```

### Data Consistency

The platform ensures data consistency through:

1. **Optimistic Updates**: UI updates immediately, with rollback on blockchain failure
2. **Event-Driven Sync**: Blockchain events trigger database updates
3. **Periodic Verification**: Regular checks ensure data integrity
4. **Manual Recovery**: Admin tools for resolving sync issues

## 🛠️ Development Tools

### Available Scripts

```bash
npm run dev              # Start in development mode
npm run test             # Run test suite
npm run test:coverage    # Run tests with coverage
npm run lint             # Lint code
npm run db:seed          # Seed database with sample data
npm run db:reset         # Reset database
npm run blockchain:sync  # Sync blockchain data
npm run blockchain:verify # Verify contract deployments
npm run monitor          # Start platform monitoring
npm run backup           # Backup database
npm run docker:dev       # Start with Docker
```

### Monitoring & Health Checks

```bash
# Check platform health
curl http://localhost:3001/health

# Monitor platform continuously
npm run monitor

# View logs
npm run logs

# Platform analytics dashboard
curl http://localhost:3001/api/platform/analytics
```

### Database Management

```bash
# Create indexes and admin user
npm run setup:db

# Seed with sample data
npm run db:seed

# Reset database (development only)
npm run db:reset

# Backup database
npm run backup

# Restore from backup
npm run restore backup-2024-01-01T10-00-00
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/freelance-platform` | ✅ |
| `RPC_URL` | Ethereum RPC endpoint | `http://localhost:8545` | ✅ |
| `FREELANCE_PLATFORM_ADDRESS` | Main contract address | - | ✅ |
| `USER_REGISTRY_ADDRESS` | User registry contract address | - | ✅ |
| `ADMIN_KEY` | Admin operations key | `demo-admin-key` | ✅ |
| `SYNC_ENABLED` | Enable blockchain sync | `true` | ❌ |
| `SYNC_HISTORICAL_DATA` | Sync historical events | `false` | ❌ |
| `PORT` | Server port | `3001` | ❌ |
| `NODE_ENV` | Environment mode | `development` | ❌ |

### Network Configurations

#### Local Development (Hardhat/Ganache)
```bash
RPC_URL=http://localhost:8545
CHAIN_ID=1337
```

#### Ethereum Testnets
```bash
# Goerli Testnet
RPC_URL=https://goerli.infura.io/v3/your-project-id
CHAIN_ID=5

# Sepolia Testnet
RPC_URL=https://sepolia.infura.io/v3/your-project-id
CHAIN_ID=11155111
```

#### Polygon Networks
```bash
# Polygon Mumbai Testnet
RPC_URL=https://rpc-mumbai.maticvigil.com
CHAIN_ID=80001

# Polygon Mainnet
RPC_URL=https://polygon-rpc.com
CHAIN_ID=137
```

## 🏛️ Database Schema

### Key Collections

#### Users Collection
```javascript
{
  address: "0x...",           // Ethereum address (unique)
  username: "john_dev",       // Display name
  email: "john@example.com",  // Email address
  role: "freelancer",         // client | freelancer | admin
  profile: {
    bio: "Full-stack developer...",
    skills: ["JavaScript", "React"],
    hourlyRate: 75,
    location: "San Francisco, CA"
  },
  reputation: {
    totalEarned: 15000,
    completedProjects: 12,
    averageRating: 4.8,
    successRate: 95
  }
}
```

#### Projects Collection
```javascript
{
  onChainId: 123,             // Blockchain project ID
  title: "E-commerce Website",
  description: "Build a modern...",
  client: {
    address: "0x...",
    displayName: "alice_client"
  },
  freelancer: {
    address: "0x...",
    selectedAt: "2024-01-15T..."
  },
  budget: {
    total: 5000,
    escrowBalance: 5000
  },
  status: "active",           // open | active | completed
  category: "Development",
  skills: ["React", "Node.js"],
  milestones: {
    expected: 3,
    completed: 1
  }
}
```

#### Milestones Collection
```javascript
{
  onChainId: 456,             // Blockchain milestone ID
  projectId: 123,             // Reference to project
  freelancer: "0x...",
  details: {
    title: "Frontend Development",
    amount: 2000,
    order: 1
  },
  timeline: {
    deadline: "2024-02-15T...",
    submittedAt: "2024-02-10T...",
    approvedAt: "2024-02-12T..."
  },
  status: "paid",             // pending | submitted | approved | paid
  submission: {
    deliveryHash: "QmHash...",
    notes: "Frontend complete"
  }
}
```

### Indexes for Performance

```javascript
// Optimized indexes for common queries
db.projects.createIndex({ status: 1, category: 1 })
db.projects.createIndex({ "client.address": 1 })
db.projects.createIndex({ title: "text", description: "text", skills: "text" })
db.milestones.createIndex({ projectId: 1, "details.order": 1 })
db.applications.createIndex({ "freelancer.wallet": 1, "timestamps.submittedAt": -1 })
```

## 🚨 Error Handling & Recovery

### Blockchain Sync Issues

If blockchain sync fails or data becomes inconsistent:

```bash
# Check sync status
curl http://localhost:3001/health

# Manual resync from specific block
SYNC_FROM_BLOCK=1000000 npm run blockchain:sync

# Verify contract data
npm run blockchain:verify

# Admin sync tool
curl -X POST http://localhost:3001/api/admin/sync-blockchain \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "your-admin-key"}'
```

### Database Recovery

```bash
# Restore from backup
npm run restore backup-folder-name

# Reset and reseed (development)
npm run db:reset && npm run db:seed

# Rebuild indexes
npm run setup:db
```

### Common Issues & Solutions

#### Issue: "User not registered on blockchain"
```javascript
// Solution: Complete user registration flow
const user = await User.findOne({ address: userWallet });
if (user && !user.isActive) {
  // User exists in DB but not on blockchain
  // Guide user through blockchain registration
}
```

#### Issue: "Project sync mismatch"
```javascript
// Solution: Verify and sync project data
const project = await Project.findOne({ onChainId: projectId });
const onChainProject = await contract.getProject(projectId);

// Compare and update if needed
if (project.status !== onChainProject.status) {
  project.status = onChainProject.status;
  await project.save();
}
```

#### Issue: "Event listener stopped"
```bash
# Check if sync is running
curl http://localhost:3001/health

# Restart sync
npm run blockchain:sync
```

## 🔒 Security Considerations

### Access Control

```javascript
// Wallet-based authentication
const validateWallet = (req, res, next) => {
  const walletAddress = req.headers['x-wallet-address'];
  if (!ethers.isAddress(walletAddress)) {
    return res.status(401).json({ error: 'Invalid wallet address' });
  }
  req.userAddress = walletAddress.toLowerCase();
  next();
};

// Resource authorization
const project = await Project.findById(projectId);
if (project.client.address !== req.userAddress) {
  return res.status(403).json({ error: 'Access denied' });
}
```

### Data Validation

```javascript
// Input sanitization
const { body, validationResult } = require('express-validator');

const validateProject = [
  body('title').isLength({ min: 3, max: 200 }).escape(),
  body('budget').isFloat({ min: 0 }).toFloat(),
  body('skills').isArray({ max: 10 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

### Rate Limiting

```javascript
// API rate limiting configured in app.js
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 100,                    // 100 requests per window
  message: 'Too many requests'
});
```

## 📊 Monitoring & Analytics

### Health Monitoring

The platform includes comprehensive health monitoring:

```bash
# Real-time monitoring
npm run monitor

# Check specific metrics
curl http://localhost:3001/health

# Platform analytics
curl http://localhost:3001/api/platform/analytics?period=7d
```

### Key Metrics

- **Response Times**: API endpoint performance
- **Database Health**: Connection status and query performance  
- **Blockchain Sync**: Event processing and sync status
- **Error Rates**: Failed requests and error patterns
- **Business Metrics**: Projects created, payments processed, user growth

### Alerting

Configure alerts via webhooks:

```bash
# Slack webhook for alerts
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Alerts triggered on:
# - Service health check failures
# - Blockchain sync issues
# - High error rates
# - Database connection problems
```

## 🚢 Deployment

### Production Checklist

- [ ] Set secure environment variables
- [ ] Configure production database
- [ ] Deploy smart contracts to mainnet
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Enable SSL/TLS
- [ ] Set up reverse proxy (nginx)
- [ ] Configure logging

### Docker Deployment

```bash
# Build production image
docker build -t freelance-platform .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Environment-specific compose files
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

### Environment-Specific Configs

#### Development
```bash
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/freelance-dev
RPC_URL=http://localhost:8545
SYNC_ENABLED=true
DETAILED_ERRORS=true
```

#### Staging
```bash
NODE_ENV=staging
MONGODB_URI=mongodb://staging-db:27017/freelance-staging
RPC_URL=https://goerli.infura.io/v3/project-id
SYNC_ENABLED=true
```

#### Production
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/freelance-prod
RPC_URL=https://mainnet.infura.io/v3/project-id
ADMIN_KEY=secure-random-key
SYNC_ENABLED=true
```

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install`
4. Set up environment: `cp .env.example .env`
5. Start development server: `npm run dev`
6. Run tests: `npm test`

### Code Standards

- ESLint configuration included
- Prettier for code formatting
- Jest for testing
- Conventional commit messages
- Pull request reviews required

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint:fix
```

## 📚 API Documentation

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register new user |
| GET | `/api/users/:address` | Get user profile |
| GET | `/api/users/:address/dashboard` | Get user dashboard |
| POST | `/api/projects` | Create project |
| GET | `/api/projects` | List projects |
| POST | `/api/projects/search` | Advanced project search |
| POST | `/api/projects/:id/apply` | Apply to project |
| POST | `/api/milestones/:id/submit` | Submit milestone work |
| POST | `/api/milestones/:id/approve` | Approve milestone |
| GET | `/api/platform/analytics` | Platform statistics |

### Response Format

All API responses follow a consistent format:

```javascript
// Success Response
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully",
  "requestId": "abc123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Error Response
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details",
  "requestId": "abc123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 📞 Support

### Getting Help

- **Documentation**: Check this README and API docs
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions
- **Email**: support@freelanceplatform.com

### Common Questions

**Q: Why hybrid architecture?**
A: Combines blockchain security with traditional database performance, giving users familiar web2 UX with web3 guarantees.

**Q: What happens if blockchain sync fails?**  
A: Platform continues operating with database data. Sync can be resumed manually, and consistency tools help resolve issues.

**Q: Can I use without blockchain?**
A: Core features work with database only, but payments and escrow require blockchain integration.

**Q: How do I handle gas fees?**
A: Consider meta-transactions, gas subsidies, or L2 solutions like Polygon for lower costs.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenZeppelin for smart contract libraries
- MongoDB for database excellence  
- Ethereum community for blockchain infrastructure
- Express.js for robust API framework

---

**Ready to build the future of freelancing?** 🚀
