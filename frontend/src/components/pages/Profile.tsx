import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Edit, 
  Star, 
  MapPin, 
  Calendar, 
  Briefcase, 
  DollarSign, 
  Users, 
  ExternalLink,
  Award,
  TrendingUp
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const isOwnProfile = !address || address === user?.address;

  // Mock profile data - in real app, fetch based on address
  const profile = {
    address: address || user?.address || '',
    username: 'sarah_chen',
    email: 'sarah@example.com',
    role: 'freelancer' as const,
    isVerified: true,
    joinedDate: '2023-01-15',
    location: 'San Francisco, CA',
    timezone: 'PST (UTC-8)',
    profile: {
      bio: 'Full-stack developer with 6 years of experience specializing in React, Node.js, and blockchain technologies. Passionate about creating innovative solutions and delivering high-quality code.',
      skills: ['React', 'Node.js', 'TypeScript', 'Blockchain', 'Smart Contracts', 'Python', 'PostgreSQL'],
      hourlyRate: 85,
      availability: 'Available',
      portfolio: [
        { title: 'DeFi Trading Platform', url: 'https://example.com', image: 'https://images.pexels.com/photos/730547/pexels-photo-730547.jpeg?auto=compress&cs=tinysrgb&w=400' },
        { title: 'NFT Marketplace', url: 'https://example.com', image: 'https://images.pexels.com/photos/844124/pexels-photo-844124.jpeg?auto=compress&cs=tinysrgb&w=400' },
      ],
    },
    reputation: {
      rating: 4.9,
      reviewsCount: 47,
      completedProjects: 32,
      totalEarnings: 48750,
      successRate: 98,
    },
    stats: {
      responseTime: '< 1 hour',
      onTimeDelivery: '100%',
      repeatClients: '78%',
    },
  };

  const recentProjects = [
    {
      id: 1,
      title: 'E-commerce Platform Development',
      client: 'RetailCorp',
      completedDate: '2024-01-15',
      budget: '$4,500',
      rating: 5,
      review: 'Exceptional work! Sarah delivered beyond expectations.',
    },
    {
      id: 2,
      title: 'Smart Contract Audit',
      client: 'CryptoTech',
      completedDate: '2024-01-01',
      budget: '$2,800',
      rating: 5,
      review: 'Very thorough and professional. Highly recommended!',
    },
  ];

  const achievements = [
    { name: 'Top Freelancer', description: 'Top 5% of freelancers on the platform' },
    { name: 'Blockchain Expert', description: 'Completed 10+ blockchain projects' },
    { name: 'Client Favorite', description: '90% client repeat rate' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'history', label: 'Work History' },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start space-x-4">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {profile.username.charAt(0).toUpperCase()}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{profile.username}</h1>
                  {profile.isVerified && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Verified
                    </span>
                  )}
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full capitalize">
                    {profile.role}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-3">{profile.profile.bio}</p>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {profile.location}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Joined {new Date(profile.joinedDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1 text-yellow-400" />
                    {profile.reputation.rating} ({profile.reputation.reviewsCount} reviews)
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:items-end space-y-3">
              {isOwnProfile && (
                <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </button>
              )}
              
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  ${profile.profile.hourlyRate}/hour
                </div>
                <div className="text-sm text-gray-600">{profile.profile.availability}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{profile.reputation.completedProjects}</div>
              <div className="text-sm text-gray-600">Projects Completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">${profile.reputation.totalEarnings.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Earned</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{profile.reputation.successRate}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{profile.stats.responseTime}</div>
              <div className="text-sm text-gray-600">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{profile.stats.onTimeDelivery}</div>
              <div className="text-sm text-gray-600">On-Time Delivery</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Skills */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.profile.skills.map(skill => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Achievements */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Achievements</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {achievements.map((achievement, index) => (
                    <div key={index} className="p-4 bg-yellow-50 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Award className="w-5 h-5 text-yellow-600 mr-2" />
                        <h4 className="font-medium text-gray-900">{achievement.name}</h4>
                      </div>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Portfolio Tab */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Portfolio</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {profile.profile.portfolio.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900 mb-2">{item.title}</h4>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm"
                      >
                        View Project
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Client Reviews</h3>
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-400 fill-current mr-1" />
                  <span className="font-medium">{profile.reputation.rating}</span>
                  <span className="text-gray-500 ml-1">({profile.reputation.reviewsCount} reviews)</span>
                </div>
              </div>

              <div className="space-y-4">
                {recentProjects.map(project => (
                  <div key={project.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{project.title}</h4>
                      <div className="flex items-center">
                        {[...Array(project.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 mb-2">"{project.review}"</p>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{project.client}</span>
                      <span>{new Date(project.completedDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Work History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Work History</h3>
              <div className="space-y-4">
                {recentProjects.map(project => (
                  <div key={project.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{project.title}</h4>
                      <span className="text-green-600 font-medium">{project.budget}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Client: {project.client}</span>
                      <span>Completed: {new Date(project.completedDate).toLocaleDateString()}</span>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                        {project.rating}/5
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};