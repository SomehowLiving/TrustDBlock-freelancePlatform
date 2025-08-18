// server.js - Entry point
require('dotenv').config();
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    const { platform } = await createApp();
    await platform.start(PORT);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();



// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');

// const router = require('./src/HybridRoutes');

// const app = express();
// app.use(cors({
//   origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080', 
//     'http://192.168.253.1:8080/', 'http://192.168.122.1:8080',' http://10.84.176.190:8080',
//   'http://127.0.0.1:8080'], // Add your frontend URLs
//   credentials: true
// }));
// const PORT = process.env.PORT || 3000;

// // Security middleware
// app.use(helmet());
// app.use(cors({
//   origin: process.env.FRONTEND_URL || '*',
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-address']
// }));

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api', limiter);

// // Body parsing middleware
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // Request logging middleware
// app.use((req, res, next) => {
//   console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
//   console.log('Headers:', req.headers);
//   if (req.body && Object.keys(req.body).length > 0) {
//     console.log('Body:', JSON.stringify(req.body, null, 2));
//   }
//   next();
// });

// // Health check endpoint
// app.get('/health', (req, res) => {
//   res.json({
//     status: 'OK',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     version: '1.0.0'
//   });
// });

// // API routes
// app.use('/api', router);

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error('Error:', err);
  
//   if (err.type === 'entity.parse.failed') {
//     return res.status(400).json({
//       success: false,
//       error: 'Invalid JSON in request body'
//     });
//   }
  
//   res.status(err.status || 500).json({
//     success: false,
//     error: err.message || 'Internal server error',
//     ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
//   });
// });

// // 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     error: `Route ${req.method} ${req.originalUrl} not found`
//   });
// });

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('SIGTERM received. Shutting down gracefully...');
//   process.exit(0);
// });

// process.on('SIGINT', () => {
//   console.log('SIGINT received. Shutting down gracefully...');
//   process.exit(0);
// });

// // Start server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`📝 API endpoints available at http://localhost:${PORT}/api`);
//   console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  
// });

// module.exports = app;

















  // // Log all available routes
  // console.log('\n📋 Available API Routes:');
  // console.log('================================');
  
  // const routes = [
  //   'POST /api/projects - Create new project',
  //   'GET /api/projects - Get all projects',
  //   'GET /api/projects/:id - Get project details',
  //   'POST /api/projects/:id/deposit - Deposit funds',
  //   'POST /api/projects/:id/apply - Apply for project',
  //   'POST /api/projects/:id/shortlist - Shortlist freelancers',
  //   'POST /api/projects/:id/select - Select freelancer',
  //   'POST /api/projects/:id/accept - Accept project',
  //   'POST /api/projects/:id/milestones - Create milestones',
  //   'POST /api/milestones/:id/submit - Submit milestone work',
  //   'POST /api/milestones/:id/approve - Approve milestone',
  //   'POST /api/milestones/:id/release - Release payment',
  //   'POST /api/milestones/:id/dispute - Dispute milestone',
  //   'GET /api/users/:address/projects - Get user projects',
  //   'GET /api/users/:address/reputation - Get user reputation',
  //   'POST /api/admin/resolve-dispute - Resolve dispute (admin)',
  //   'GET /api/platform/stats - Get platform statistics'
  // ];
  
  // routes.forEach(route => console.log(`  ${route}`));
  // console.log('================================\n');