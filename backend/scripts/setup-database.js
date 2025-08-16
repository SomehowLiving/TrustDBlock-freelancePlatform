// scripts/setup-database.js
const mongoose = require('mongoose');
require('dotenv').config();

async function setupDatabase() {
  try {
    console.log('🔧 Setting up database...');

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/freelance-platform';
    await mongoose.connect(mongoUri);

    console.log('✅ Connected to MongoDB');

    // Import models to ensure they're registered
    const { User, Project, Application, Milestone, Transaction, Dispute } = require('../models');

    // Create collections and indexes
    console.log('📊 Creating indexes...');
    
    await User.createIndexes();
    await Project.createIndexes();
    await Application.createIndexes();
    await Milestone.createIndexes();
    await Transaction.createIndexes();
    await Dispute.createIndexes();

    console.log('✅ Database indexes created');

    // Create admin user if it doesn't exist
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({
        address: '0xadmin1111111111111111111111111111111111111',
        username: 'admin',
        email: 'admin@freelanceplatform.com',
        password: 'admin123',
        role: 'admin',
        isActive: true,
        profile: {
          bio: 'Platform Administrator'
        }
      });
      console.log('✅ Admin user created');
    }

    await mongoose.disconnect();
    console.log('✅ Database setup completed');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;

