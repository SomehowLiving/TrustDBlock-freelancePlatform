// app.js - Main application file with hybrid architecture
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Import routes and middleware
const hybridRoutes = require('./HybridRoutes');
const { createBlockchainSyncMiddleware } = require('./middleware/blockchainSync');
const { ethers } = require('ethers');

// Import contract ABIs
const freelancePlatform = require('../abis/FreelancePlatform.json');
const userRegistry = require('../abis/UserRegistry.json');

class HybridFreelancePlatform {
  constructor() {
    this.app = express();
    this.syncManager = null;
    this.isShuttingDown = false;
  }

  // Initialize the application
  async initialize() {
    try {
      console.log('🚀 Initializing Hybrid Freelance Platform...');

      // Setup middleware
      await this.setupMiddleware();
      // Connect to MongoDB
      await this.connectDatabase();
      // Setup blockchain sync
      await this.setupBlockchainSync();
      // Setup routes
      this.setupRoutes();
      // Setup error handling
      this.setupErrorHandling();
      // Setup graceful shutdown
      this.setupGracefulShutdown();

      console.log('✅ Hybrid Freelance Platform initialized successfully');
      return this.app;

    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      throw error;
    }
  }

  // Setup Express middleware
  async setupMiddleware() {
    console.log('📦 Setting up middleware...');
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:8080',
          'http://192.168.253.1:8080'
        ];

    this.app.use(
      cors({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-address'],
      })
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000,
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api', limiter);

    // General middleware
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined'));
    }

    // Request context middleware
    this.app.use((req, res, next) => {
      req.startTime = Date.now();
      req.requestId = Math.random().toString(36).substring(7);
      
      // Add response helper methods
      res.success = (data, message = 'Success', statusCode = 200) => {
        res.status(statusCode).json({
          success: true,
          data,
          message,
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        });
      };

      res.error = (message, statusCode = 500, details = null) => {
        res.status(statusCode).json({
          success: false,
          error: message,
          details,
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        });
      };

      next();
    });

    console.log('✅ Middleware setup completed');
  }

  // Connect to MongoDB
  async connectDatabase() {
    try {
      console.log('🔌 Connecting to MongoDB...');

      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/freelance-platform';
      
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        // bufferCommands: false,
        // bufferMaxEntries: 0
      });

      // MongoDB connection event listeners
      mongoose.connection.on('connected', () => {
        console.log('✅ MongoDB connected successfully');
      });

      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('📤 MongoDB disconnected');
      });

      // Create indexes for better performance
      await this.createDatabaseIndexes();

      console.log('✅ Database setup completed');

    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  // Create database indexes
  async createDatabaseIndexes() {
    try {
      console.log('📊 Creating database indexes...');

      const { User, Project, Application, Milestone, Transaction, Dispute } = require('./models');

      // User indexes
      await User.collection.createIndex({ address: 1 }, { unique: true });
      await User.collection.createIndex({ email: 1 }, { unique: true });
      await User.collection.createIndex({ username: 1 }, { unique: true });
      await User.collection.createIndex({ role: 1 });
      await User.collection.createIndex({ 'reputation.averageRating': -1 });

      // Project indexes
      await Project.collection.createIndex({ onChainId: 1 }, { sparse: true });
      await Project.collection.createIndex({ projectId: 1 }, { sparse: true });
      await Project.collection.createIndex({ status: 1, category: 1 });
      await Project.collection.createIndex({ 'client.address': 1 });
      await Project.collection.createIndex({ 'freelancer.address': 1 });
      await Project.collection.createIndex({ 'budget.total': 1 });
      await Project.collection.createIndex({ createdAt: -1 });
      
      // Text search index for projects
      await Project.collection.createIndex({
        title: 'text',
        description: 'text',
        skills: 'text'
      });

      // Application indexes
      await Application.collection.createIndex({ projectId: 1, 'freelancer.wallet': 1 });
      await Application.collection.createIndex({ 'freelancer.wallet': 1, 'timestamps.submittedAt': -1 });
      await Application.collection.createIndex({ status: 1 });

      // Milestone indexes
      await Milestone.collection.createIndex({ onChainId: 1 }, { sparse: true });
      await Milestone.collection.createIndex({ milestoneId: 1 }, { sparse: true });
      await Milestone.collection.createIndex({ projectId: 1, 'details.order': 1 });
      await Milestone.collection.createIndex({ freelancer: 1, status: 1 });
      await Milestone.collection.createIndex({ status: 1, 'timeline.deadline': 1 });

      // Transaction indexes
      await Transaction.collection.createIndex({ txHash: 1 }, { unique: true });
      await Transaction.collection.createIndex({ 'entities.projectId': 1, type: 1 });
      await Transaction.collection.createIndex({ 'entities.from': 1, 'timestamps.createdAt': -1 });
      await Transaction.collection.createIndex({ type: 1, 'timestamps.createdAt': -1 });

      // Dispute indexes
      await Dispute.collection.createIndex({ disputeId: 1 }, { unique: true });
      await Dispute.collection.createIndex({ projectId: 1, milestoneId: 1 });
      await Dispute.collection.createIndex({ 'resolution.status': 1 });

      console.log('✅ Database indexes created successfully');

    } catch (error) {
      console.error('❌ Failed to create indexes:', error);
      // Don't throw error as this is not critical for app startup
    }
  }

  // Setup blockchain synchronization
  async setupBlockchainSync() {
    try {
      console.log('⛓️  Setting up blockchain synchronization...');

      // Contract configurations
      const contracts = {
        freelancePlatform: {
          address: process.env.FREELANCE_PLATFORM_ADDRESS || "0x1111111111111111111111111111111111111111",
          abi: freelancePlatform || []
        },
        userRegistry: {
          address: process.env.USER_REGISTRY_ADDRESS || "0x2222222222222222222222222222222222222222",
          abi: userRegistry || []
        }
      };

      // Setup provider
      const provider = new ethers.JsonRpcProvider(
        process.env.RPC_URL || "http://localhost:8545"
      );

      // Test blockchain connection
      try {
        const network = await provider.getNetwork();
        console.log(`🔗 Connected to blockchain network: ${network.name} (Chain ID: ${network.chainId})`);
      } catch (error) {
        console.warn('⚠️  Blockchain connection failed, running in database-only mode:', error.message);
      }

      // Create sync middleware
      const { syncManager, ensureDataConsistency, initialize } = createBlockchainSyncMiddleware(contracts, provider);
      
      // Initialize sync manager
      try {
        this.syncManager = await initialize();
        
        // Sync historical data if requested
        if (process.env.SYNC_HISTORICAL_DATA === 'true') {
          console.log('📚 Syncing historical blockchain data...');
          const fromBlock = parseInt(process.env.SYNC_FROM_BLOCK || '0');
          const result = await this.syncManager.syncHistoricalData(fromBlock);
          console.log(`✅ Historical sync completed: ${result.syncedEvents}/${result.totalEvents} events`);
        }

      } catch (error) {
        console.warn('⚠️  Blockchain sync initialization failed, continuing without sync:', error.message);
        this.syncManager = null;
      }

      // Add consistency middleware to routes
      this.app.use('/api', ensureDataConsistency);

      console.log('✅ Blockchain sync setup completed');

    } catch (error) {
      console.error('❌ Blockchain sync setup failed:', error);
      // Don't throw error - app can run without blockchain sync
    }
  }

  // Setup API routes
  setupRoutes() {
    console.log('🛣️  Setting up routes...');

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
        },
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        blockchain: this.syncManager ? 'syncing' : 'disabled'
      });
    });

    // API documentation endpoint
    this.app.get('/api/docs', (req, res) => {
      res.json({
        success: true,
        message: 'Hybrid Freelance Platform API',
        version: process.env.npm_package_version || '1.0.0',
        documentation: {
          baseUrl: `${req.protocol}://${req.get('host')}/api`,
          endpoints: {
            users: {
              register: 'POST /api/users/register',
              profile: 'GET /api/users/:address',
              update: 'PATCH /api/users/:address',
              dashboard: 'GET /api/users/:address/dashboard'
            },
            projects: {
              create: 'POST /api/projects',
              list: 'GET /api/projects',
              details: 'GET /api/projects/:id',
              apply: 'POST /api/projects/:id/apply',
              search: 'POST /api/projects/search'
            },
            milestones: {
              create: 'POST /api/projects/:id/milestones',
              submit: 'POST /api/milestones/:id/submit',
              approve: 'POST /api/milestones/:id/approve',
              release: 'POST /api/milestones/:id/release',
              dispute: 'POST /api/milestones/:id/dispute'
            },
            platform: {
              analytics: 'GET /api/platform/analytics',
              health: 'GET /api/health'
            }
          }
        }
      });
    });

    // Main API routes
    this.app.use('/api', hybridRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Hybrid Freelance Platform API',
        version: process.env.npm_package_version || '1.0.0',
        documentation: `${req.protocol}://${req.get('host')}/api/docs`,
        status: 'operational'
      });
    });

    console.log('✅ Routes setup completed');
  }

  // Setup error handling
  setupErrorHandling() {
    console.log('🛡️  Setting up error handling...');

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('❌ Unhandled error:', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query,
        requestId: req.requestId
      });

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Internal server error',
        ...(isDevelopment && { 
          stack: error.stack,
          details: {
            path: req.path,
            method: req.method,
            requestId: req.requestId
          }
        }),
        timestamp: new Date().toISOString()
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Promise Rejection:', reason);
      // Don't crash the process in production
      if (process.env.NODE_ENV === 'development') {
        process.exit(1);
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      // Graceful shutdown
      this.shutdown();
      process.exit(1);
    });

    console.log('✅ Error handling setup completed');
  }

  // Setup graceful shutdown
  setupGracefulShutdown() {
    console.log('🔄 Setting up graceful shutdown...');

    const shutdown = async (signal) => {
      if (this.isShuttingDown) return;
      
      console.log(`\n📤 Received ${signal}. Starting graceful shutdown...`);
      this.isShuttingDown = true;

      // Stop accepting new requests
      const server = this.server;
      if (server) {
        server.close(() => {
          console.log('✅ HTTP server closed');
        });
      }

      try {
        // Stop blockchain sync
        if (this.syncManager) {
          this.syncManager.stopEventListening();
          console.log('✅ Blockchain sync stopped');
        }

        // Close database connection
        await mongoose.connection.close();
        console.log('✅ Database connection closed');

        console.log('✅ Graceful shutdown completed');
        process.exit(0);

      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Listen for shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    console.log('✅ Graceful shutdown setup completed');
  }

  // Start the server
  async start(port = process.env.PORT || 3001) {
    try {
      this.server = this.app.listen(port, () => {
        console.log(`\n🎉 Hybrid Freelance Platform started successfully!`);
        console.log(`🌐 Server running on http://localhost:${port}`);
        console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
        console.log(`💊 Health Check: http://localhost:${port}/health`);
        console.log(`\n📊 Configuration:`);
        console.log(`   • Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   • Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
        console.log(`   • Blockchain Sync: ${this.syncManager ? 'Enabled' : 'Disabled'}`);
        console.log(`   • Rate Limiting: ${process.env.NODE_ENV === 'production' ? '100/15min' : '1000/15min'}`);
        console.log(`\n🚀 Ready to handle requests!`);
      });

      return this.server;
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      throw error;
    }
  }

  // Shutdown method
  async shutdown() {
    if (this.isShuttingDown) return;
    
    console.log('📤 Shutting down application...');
    this.isShuttingDown = true;

    try {
      if (this.server) {
        this.server.close();
      }

      if (this.syncManager) {
        this.syncManager.stopEventListening();
      }

      await mongoose.connection.close();
      console.log('✅ Application shutdown completed');

    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

// Factory function to create and initialize the application
async function createApp() {
  const platform = new HybridFreelancePlatform();
  const app = await platform.initialize();
  return { app, platform };
}

// Auto-start if this file is run directly
if (require.main === module) {
  createApp()
    .then(async ({ platform }) => {
      await platform.start();
    })
    .catch((error) => {
      console.error('❌ Failed to start application:', error);
      process.exit(1);
    });
}

module.exports = { HybridFreelancePlatform, createApp };