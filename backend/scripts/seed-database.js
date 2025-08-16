// scripts/seed-database.js
const mongoose = require('mongoose');
const { User, Project, Application, Milestone } = require('../models');
require('dotenv').config();

const sampleUsers = [
  {
    address: '0x1234567890123456789012345678901234567890',
    username: 'alice_developer',
    email: 'alice@example.com',
    password: 'password123',
    role: 'freelancer',
    profile: {
      bio: 'Full-stack developer with 5+ years experience',
      skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Solidity'],
      hourlyRate: 75,
      location: 'San Francisco, CA'
    }
  },
  {
    address: '0x2345678901234567890123456789012345678901',
    username: 'bob_designer',
    email: 'bob@example.com',
    password: 'password123',
    role: 'freelancer',
    profile: {
      bio: 'UI/UX Designer specializing in web and mobile applications',
      skills: ['Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'Prototyping'],
      hourlyRate: 60,
      location: 'New York, NY'
    }
  },
  {
    address: '0x3456789012345678901234567890123456789012',
    username: 'charlie_client',
    email: 'charlie@example.com',
    password: 'password123',
    role: 'client',
    profile: {
      bio: 'Startup founder looking for talented developers',
      location: 'Austin, TX'
    }
  }
];

const sampleProjects = [
  {
    title: 'E-commerce Website Development',
    description: 'Need a modern e-commerce website built with React and Node.js. Should include user authentication, product catalog, shopping cart, and payment integration.',
    client: {
      address: '0x3456789012345678901234567890123456789012',
      displayName: 'charlie_client'
    },
    budget: {
      total: 5000,
      totalBudget: 5000,
      type: 'fixed'
    },
    category: 'Development',
    skills: ['React', 'Node.js', 'MongoDB', 'Stripe API'],
    requirements: {
      skills: ['React', 'Node.js', 'Payment Integration'],
      deliverables: ['Responsive website', 'Admin dashboard', 'Documentation']
    },
    timeline: {
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    },
    status: 'open',
    milestones: {
      expected: 3,
      expectedMilestones: 3
    }
  },
  {
    title: 'Mobile App UI Design',
    description: 'Design a clean and modern UI for a fitness tracking mobile app. Need wireframes, mockups, and prototypes.',
    client: {
      address: '0x3456789012345678901234567890123456789012',
      displayName: 'charlie_client'
    },
    budget: {
      total: 2500,
      totalBudget: 2500,
      type: 'fixed'
    },
    category: 'Design',
    skills: ['UI/UX Design', 'Figma', 'Mobile Design', 'Prototyping'],
    requirements: {
      skills: ['Mobile UI Design', 'Prototyping', 'User Research'],
      deliverables: ['Wireframes', 'High-fidelity mockups', 'Interactive prototype', 'Design system']
    },
    timeline: {
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      applicationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
    },
    status: 'open',
    milestones: {
      expected: 2,
      expectedMilestones: 2
    }
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with sample data...');

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/freelance-platform';
    await mongoose.connect(mongoUri);

    // Clear existing data (development only)
    if (process.env.NODE_ENV === 'development') {
      await User.deleteMany({});
      await Project.deleteMany({});
      await Application.deleteMany({});
      await Milestone.deleteMany({});
      console.log('🗑️  Cleared existing data');
    }

    // Create users
    const users = await User.insertMany(sampleUsers);
    console.log(`✅ Created ${users.length} sample users`);

    // Create projects
    const projects = await Project.insertMany(sampleProjects);
    console.log(`✅ Created ${projects.length} sample projects`);

    // Create sample applications
    const sampleApplications = [
      {
        projectId: 1, // Mock project ID
        project: {
          title: sampleProjects[0].title,
          budget: sampleProjects[0].budget.total,
          client: sampleProjects[0].client.address
        },
        freelancer: {
          wallet: sampleUsers[0].address,
          displayName: sampleUsers[0].username
        },
        proposal: {
          coverLetter: 'I have extensive experience building e-commerce websites. I can deliver a high-quality, responsive website with all the features you need.',
          proposedBudget: 4800,
          proposedTimeline: 45,
          milestoneBreakdown: [
            {
              title: 'Frontend Development',
              description: 'Complete React frontend with responsive design',
              amount: 2000,
              duration: 20
            },
            {
              title: 'Backend & Payment Integration',
              description: 'Node.js backend with Stripe payment integration',
              amount: 1800,
              duration: 15
            },
            {
              title: 'Testing & Deployment',
              description: 'Testing, bug fixes, and deployment',
              amount: 1000,
              duration: 10
            }
          ]
        },
        status: 'submitted'
      },
      {
        projectId: 2, // Mock project ID
        project: {
          title: sampleProjects[1].title,
          budget: sampleProjects[1].budget.total,
          client: sampleProjects[1].client.address
        },
        freelancer: {
          wallet: sampleUsers[1].address,
          displayName: sampleUsers[1].username
        },
        proposal: {
          coverLetter: 'I specialize in mobile app UI/UX design and have worked on several fitness apps. I can create a modern, user-friendly design that will engage your users.',
          proposedBudget: 2300,
          proposedTimeline: 25,
          milestoneBreakdown: [
            {
              title: 'Wireframes & User Research',
              description: 'Create wireframes and conduct user research',
              amount: 800,
              duration: 8
            },
            {
              title: 'High-Fidelity Design & Prototype',
              description: 'Create final designs and interactive prototype',
              amount: 1500,
              duration: 17
            }
          ]
        },
        status: 'submitted'
      }
    ];

    const applications = await Application.insertMany(sampleApplications);
    console.log(`✅ Created ${applications.length} sample applications`);

    await mongoose.disconnect();
    console.log('✅ Database seeding completed');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;

