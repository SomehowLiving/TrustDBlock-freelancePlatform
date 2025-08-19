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
  },
  {
    address: '0x4567890123456789012345678901234567890123',
    username: 'diana_devops',
    email: 'diana@example.com',
    password: 'password123',
    role: 'freelancer',
    profile: {
      bio: 'DevOps engineer with expertise in cloud infrastructure and CI/CD pipelines',
      skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins'],
      hourlyRate: 85,
      location: 'Seattle, WA'
    }
  },
  {
    address: '0x5678901234567890123456789012345678901234',
    username: 'evan_ml',
    email: 'evan@example.com',
    password: 'password123',
    role: 'freelancer',
    profile: {
      bio: 'Machine Learning engineer with focus on NLP and computer vision',
      skills: ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Transformers'],
      hourlyRate: 100,
      location: 'Boston, MA'
    }
  },
  {
    address: '0x6789012345678901234567890123456789012345',
    username: 'frank_enterprise',
    email: 'frank@example.com',
    password: 'password123',
    role: 'client',
    profile: {
      bio: 'CTO at an enterprise SaaS company seeking experienced developers',
      location: 'Chicago, IL'
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
  },
  {
    title: 'Cloud Infrastructure Automation',
    description: 'Looking for a DevOps engineer to set up automated deployment pipelines and infrastructure as code using AWS and Terraform.',
    client: {
      address: '0x6789012345678901234567890123456789012345',
      displayName: 'frank_enterprise'
    },
    budget: {
      total: 6000,
      totalBudget: 6000,
      type: 'fixed'
    },
    category: 'DevOps',
    skills: ['AWS', 'Terraform', 'CI/CD', 'Jenkins'],
    requirements: {
      skills: ['Infrastructure as Code', 'Pipeline Automation', 'Monitoring'],
      deliverables: ['Terraform scripts', 'Jenkins pipeline', 'Documentation']
    },
    timeline: {
      deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
      applicationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
    },
    status: 'open',
    milestones: {
      expected: 3,
      expectedMilestones: 3
    }
  },
  {
    title: 'AI-Powered Resume Parser',
    description: 'Build a machine learning model to parse resumes and extract structured information like name, skills, experience, etc.',
    client: {
      address: '0x6789012345678901234567890123456789012345',
      displayName: 'frank_enterprise'
    },
    budget: {
      total: 8000,
      totalBudget: 8000,
      type: 'fixed'
    },
    category: 'Machine Learning',
    skills: ['NLP', 'Python', 'Spacy', 'Transformers'],
    requirements: {
      skills: ['Resume Parsing', 'NER', 'Model Deployment'],
      deliverables: ['Trained model', 'API endpoint', 'Model evaluation report']
    },
    timeline: {
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      applicationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days
    },
    status: 'open',
    milestones: {
      expected: 4,
      expectedMilestones: 4
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
      },
      {
        projectId: 3, // Mock project ID
        project: {
          title: additionalProjects[0].title,
          budget: additionalProjects[0].budget.total,
          client: additionalProjects[0].client.address
        },
        freelancer: {
          wallet: additionalUsers[0].address,
          displayName: additionalUsers[0].username
        },
        proposal: {
          coverLetter: 'I’ve implemented cloud-native solutions for startups and enterprises alike. I can automate your AWS infrastructure securely and efficiently.',
          proposedBudget: 5800,
          proposedTimeline: 40,
          milestoneBreakdown: [
            {
              title: 'Infrastructure Setup',
              description: 'Provision AWS infrastructure using Terraform',
              amount: 2000,
              duration: 10
            },
            {
              title: 'CI/CD Pipeline',
              description: 'Set up Jenkins pipelines with staging and production workflows',
              amount: 2500,
              duration: 20
            },
            {
              title: 'Monitoring & Handover',
              description: 'Set up CloudWatch & documentation handover',
              amount: 1300,
              duration: 10
            }
          ]
        },
        status: 'submitted'
      },
      {
        projectId: 4, // Mock project ID
        project: {
          title: additionalProjects[1].title,
          budget: additionalProjects[1].budget.total,
          client: additionalProjects[1].client.address
        },
        freelancer: {
          wallet: additionalUsers[1].address,
          displayName: additionalUsers[1].username
        },
        proposal: {
          coverLetter: 'I’ve worked on multiple NLP applications including resume parsers and job matching algorithms. I can deliver a high-accuracy solution.',
          proposedBudget: 7500,
          proposedTimeline: 50,
          milestoneBreakdown: [
            {
              title: 'Data Collection & Preprocessing',
              description: 'Collect and clean resume datasets',
              amount: 2000,
              duration: 10
            },
            {
              title: 'Model Training',
              description: 'Train a transformer-based NER model',
              amount: 2500,
              duration: 15
            },
            {
              title: 'API Development',
              description: 'Deploy model via RESTful API',
              amount: 2000,
              duration: 15
            },
            {
              title: 'Testing & Delivery',
              description: 'Evaluate model, test integration, and finalize docs',
              amount: 1000,
              duration: 10
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

