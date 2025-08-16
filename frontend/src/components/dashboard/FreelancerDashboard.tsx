import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Star, 
  DollarSign, 
  TrendingUp,
  Briefcase,
  Clock,
  CheckCircle,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { StatCard } from '../ui/StatCard';

export const FreelancerDashboard: React.FC = () => {
  const stats = [
    {
      title: 'Active Projects',
      value: '3',
      icon: Briefcase,
      trend: '+1 this week',
      color: 'blue',
    },
    {
      title: 'Total Earnings',
      value: '$18,750',
      icon: DollarSign,
      trend: '+15% this month',
      color: 'green',
    },
    {
      title: 'Success Rate',
      value: '98%',
      icon: TrendingUp,
      trend: 'Excellent rating',
      color: 'purple',
    },
    {
      title: 'Average Rating',
      value: '4.9',
      icon: Star,
      trend: 'Based on 24 reviews',
      color: 'orange',
    },
  ];

  const activeProjects = [
    {
      id: 1,
      title: 'DeFi Dashboard Development',
      client: 'TechCorp Inc.',
      status: 'in_progress',
      budget: '$4,500',
      deadline: '2024-02-20',
      progress: 45,
      milestones: { completed: 2, total: 5 },
    },
    {
      id: 2,
      title: 'Smart Contract Integration',
      client: 'BlockTech Ltd.',
      status: 'review',
      budget: '$3,200',
      deadline: '2024-02-10',
      progress: 85,
      milestones: { completed: 4, total: 4 },
    },
    {
      id: 3,
      title: 'Mobile App Backend',
      client: 'StartupXYZ',
      status: 'pending_approval',
      budget: '$2,800',
      deadline: '2024-02-15',
      progress: 100,
      milestones: { completed: 3, total: 3 },
    },
  ];

  const recommendedProjects = [
    {
      id: 4,
      title: 'React Native App Development',
      budget: '$5,000 - $8,000',
      skills: ['React Native', 'JavaScript', 'API Integration'],
      client: 'FinTech Startup',
      postedTime: '2 hours ago',
      proposals: 5,
    },
    {
      id: 5,
      title: 'Blockchain Analytics Platform',
      budget: '$6,000 - $10,000',
      skills: ['Blockchain', 'Python', 'Data Analytics'],
      client: 'CryptoAnalytics',
      postedTime: '5 hours ago',
      proposals: 3,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending_approval':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'review':
        return <AlertTriangle className="w-4 h-4" />;
      case 'pending_approval':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Freelancer Dashboard</h1>
        <Link
          to="/projects"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Search className="w-5 h-5 mr-2" />
          Find Projects
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Projects */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Active Projects</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {activeProjects.map((project) => (
              <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 line-clamp-1">{project.title}</h3>
                  <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    {getStatusIcon(project.status)}
                    <span className="ml-1 capitalize">{project.status.replace('_', ' ')}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                  <span>{project.client}</span>
                  <span>{project.budget}</span>
                  <span>Due {project.deadline}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {project.milestones.completed}/{project.milestones.total} milestones completed
                    </span>
                    <Link
                      to={`/projects/${project.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center"
                    >
                      View Details
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Projects */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recommended for You</h2>
              <Link
                to="/projects"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All
              </Link>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {recommendedProjects.map((project) => (
              <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                <h3 className="font-medium text-gray-900 mb-2">{project.title}</h3>
                <p className="text-lg font-semibold text-green-600 mb-3">{project.budget}</p>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {project.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{project.client}</span>
                  <span>{project.postedTime}</span>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500">{project.proposals} proposals</span>
                  <Link
                    to={`/projects/${project.id}`}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Apply Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};