import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  DollarSign, 
  Clock, 
  Users,
  MapPin,
  Star,
  Calendar,
  Briefcase,
  CheckCircle,
  MessageCircle
} from 'lucide-react';
import { ApplicationModal } from '../modals/ApplicationModal';

export const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  // Mock project data - in real app, fetch based on ID
  const project = {
    id: parseInt(id || '1'),
    title: 'DeFi Trading Platform Development',
    description: `We are looking for an experienced blockchain developer to build a comprehensive DeFi trading platform. The platform should include advanced features such as yield farming, liquidity pools, and governance mechanisms.

Key Requirements:
• Build smart contracts for trading, staking, and governance
• Develop a modern React frontend with Web3 integration
• Implement yield farming and liquidity pool mechanisms
• Create an admin dashboard for platform management
• Ensure security through comprehensive testing and audits

The ideal candidate should have:
• 3+ years of experience in blockchain development
• Strong knowledge of Solidity and smart contract development
• Experience with DeFi protocols and mechanisms
• Proficiency in React, Node.js, and Web3 technologies
• Understanding of security best practices in blockchain`,
    budget: '$8,000 - $12,000',
    duration: '3-4 months',
    client: {
      name: 'CryptoTech Solutions',
      rating: 4.8,
      reviewsCount: 42,
      location: 'United States',
      memberSince: '2022',
      completedProjects: 28,
      totalSpent: '$145,000',
      verified: true,
    },
    postedTime: '2 hours ago',
    proposals: 12,
    skills: ['React', 'Node.js', 'Blockchain', 'Smart Contracts', 'Solidity', 'DeFi'],
    category: 'Blockchain Development',
    isUrgent: true,
    milestones: [
      { title: 'Project Setup & Smart Contract Architecture', amount: '$2,000', duration: '1 week' },
      { title: 'Core Smart Contracts Development', amount: '$3,000', duration: '3 weeks' },
      { title: 'Frontend Development & Web3 Integration', amount: '$3,000', duration: '4 weeks' },
      { title: 'Testing, Security Audit & Deployment', amount: '$2,000', duration: '2 weeks' },
    ],
    attachments: [
      { name: 'Technical Requirements.pdf', size: '2.4 MB' },
      { name: 'UI Mockups.figma', size: '1.8 MB' },
    ],
  };

  const similarProjects = [
    {
      id: 2,
      title: 'NFT Marketplace Development',
      budget: '$5,000 - $8,000',
      proposals: 8,
    },
    {
      id: 3,
      title: 'Blockchain Analytics Dashboard',
      budget: '$6,000 - $10,000',
      proposals: 6,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link
        to="/projects"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Projects
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
                  {project.isUrgent && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                      Urgent
                    </span>
                  )}
                  {project.client.verified && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Verified Client
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-4">Posted {project.postedTime}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="flex items-center text-gray-600">
                <DollarSign className="w-4 h-4 mr-2" />
                <span className="font-medium">{project.budget}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Clock className="w-4 h-4 mr-2" />
                <span>{project.duration}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Users className="w-4 h-4 mr-2" />
                <span>{project.proposals} proposals</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Briefcase className="w-4 h-4 mr-2" />
                <span>{project.category}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {project.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Project Description */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Description</h2>
            <div className="prose prose-gray max-w-none">
              {project.description.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Milestones</h2>
            <div className="space-y-4">
              {project.milestones.map((milestone, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">{milestone.title}</h3>
                    <p className="text-sm text-gray-600">{milestone.duration}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{milestone.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h2>
            <div className="space-y-3">
              {project.attachments.map((attachment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{attachment.name}</p>
                      <p className="text-sm text-gray-500">{attachment.size}</p>
                    </div>
                  </div>
                  <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Apply Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <button
              onClick={() => setShowApplicationModal(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold mb-4"
            >
              Apply for this Project
            </button>
            <p className="text-sm text-gray-600 text-center">
              {project.proposals} freelancers have already applied
            </p>
          </div>

          {/* Client Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">About the Client</h3>
            
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                {project.client.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{project.client.name}</h4>
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                  <span className="text-sm">{project.client.rating} ({project.client.reviewsCount} reviews)</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Location</span>
                <span className="text-gray-900">{project.client.location}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Member since</span>
                <span className="text-gray-900">{project.client.memberSince}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Projects completed</span>
                <span className="text-gray-900">{project.client.completedProjects}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total spent</span>
                <span className="text-gray-900">{project.client.totalSpent}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Client
              </button>
            </div>
          </div>

          {/* Similar Projects */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Similar Projects</h3>
            <div className="space-y-3">
              {similarProjects.map((similarProject) => (
                <div key={similarProject.id} className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-1">{similarProject.title}</h4>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{similarProject.budget}</span>
                    <span>{similarProject.proposals} proposals</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {showApplicationModal && (
        <ApplicationModal
          projectId={project.id}
          projectTitle={project.title}
          onClose={() => setShowApplicationModal(false)}
        />
      )}
    </div>
  );
};