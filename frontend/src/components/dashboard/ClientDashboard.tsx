import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Briefcase, 
  Users, 
  DollarSign, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { StatCard } from '../ui/StatCard';

export const ClientDashboard: React.FC = () => {
  const stats = [
    {
      title: 'Active Projects',
      value: '4',
      icon: Briefcase,
      trend: '+12% from last month',
      color: 'blue',
    },
    {
      title: 'Total Freelancers',
      value: '12',
      icon: Users,
      trend: '+3 this month',
      color: 'green',
    },
    {
      title: 'Total Spent',
      value: '$24,500',
      icon: DollarSign,
      trend: '+8% from last month',
      color: 'purple',
    },
    {
      title: 'Success Rate',
      value: '96%',
      icon: TrendingUp,
      trend: '+2% from last month',
      color: 'orange',
    },
  ];

  const recentProjects = [
    {
      id: 1,
      title: 'E-commerce Website Development',
      freelancer: 'Sarah Chen',
      status: 'in_progress',
      budget: '$5,000',
      deadline: '2024-02-15',
      progress: 65,
    },
    {
      id: 2,
      title: 'Mobile App UI/UX Design',
      freelancer: 'Michael Torres',
      status: 'review',
      budget: '$3,200',
      deadline: '2024-01-30',
      progress: 90,
    },
    {
      id: 3,
      title: 'Smart Contract Audit',
      freelancer: 'Elena Rodriguez',
      status: 'completed',
      budget: '$2,800',
      deadline: '2024-01-25',
      progress: 100,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'review':
        return <AlertCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Client Dashboard</h1>
        <Link
          to="/projects/create"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Project
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
            <Link
              to="/projects"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All
            </Link>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {recentProjects.map((project) => (
            <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">{project.title}</h3>
                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {getStatusIcon(project.status)}
                  <span className="ml-1 capitalize">{project.status.replace('_', ' ')}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {project.freelancer}
                </div>
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  {project.budget}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Due {project.deadline}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>
                <Link
                  to={`/projects/${project.id}`}
                  className="ml-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};