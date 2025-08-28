// router/index.js
const express = require('express');
const router = express.Router();

// Import modular routes
const userRegistryRoutes = require('./userRegistry');
const freelanceRoutes = require('./freelance');
const analyticsRoutes = require('./analytics');
const adminRoutes = require('./admin');

// Use the routes
router.use( userRegistryRoutes);
router.use( freelanceRoutes);
router.use( analyticsRoutes);
router.use( adminRoutes);

module.exports = router;


// in userRegistry.js
      // POST /users/register
      // POST /users/:address/confirm
      // GET /users/:address
      // PATCH /users/:address
      // GET /users/:address/dashboard
      // GET /users/:address/projects
      // GET /users/:address/reputation

// in admin.js
        // POST /admin/disputes/:id/resolve
        // GET /admin/disputes
        // POST /admin/sync-blockchain

//----freelance.js----
        // POST /projects (Create project)
        // POST /projects/:id/sync
        // GET /projects (Get projects with filtering)
        // GET /projects/:id
        // POST /projects/:id/apply
        // POST /projects/:id/select-freelancer
        // POST /projects/:id/shortlist-freelancers
        // POST /projects/:id/deposit
        // POST /projects/:id/sync-deposit
        // POST /projects/:id/accept
        // POST /projects/:id/milestones
        // POST /milestones/:id/submit
        // POST /milestones/:id/approve
        // POST /milestones/:id/auto-approve
        // POST /milestones/:id/release
        // POST /milestones/:id/dispute
        // POST /milestones/:id/request-extension
        // POST /milestones/:id/approve-extension
        // GET /platform/fees
        // POST /calculate-fees
        // POST /projects/search

// in analytics.js
        // GET /platform/analytics
        // GET /platform/stats
        // GET /health