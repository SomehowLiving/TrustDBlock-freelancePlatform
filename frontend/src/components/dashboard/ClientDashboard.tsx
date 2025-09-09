import React from 'react';
import { 
  Plus, 
  Briefcase, 
  Users, 
  DollarSign, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  LucideIcon
} from 'lucide-react';

// Define the type for the StatCard's props
interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

// StatCard component with glassmorphism styling
const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, color }) => {
  let iconColorClass = '';
  let trendColorClass = '';

  switch (color) {
    case 'blue':
      iconColorClass = 'text-sky-400';
      trendColorClass = 'text-sky-400';
      break;
    case 'green':
      iconColorClass = 'text-emerald-400';
      trendColorClass = 'text-emerald-400';
      break;
    case 'purple':
      iconColorClass = 'text-indigo-400';
      trendColorClass = 'text-indigo-400';
      break;
    case 'orange':
      iconColorClass = 'text-amber-400';
      trendColorClass = 'text-amber-400';
      break;
    default:
      iconColorClass = 'text-slate-400';
      trendColorClass = 'text-slate-400';
  }

  return (
    <div className="bg-slate-900/30 backdrop-blur-lg p-6 rounded-3xl border border-slate-700/50 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">{title}</h3>
        <Icon className={`w-6 h-6 ${iconColorClass}`} />
      </div>
      <div className="flex items-end space-x-2">
        <span className="text-4xl font-bold text-white">{value}</span>
        <span className={`text-sm font-medium ${trendColorClass}`}>{trend}</span>
      </div>
    </div>
  );
};

// Define the type for the Project objects
type ProjectStatus = 'in_progress' | 'review' | 'completed';

interface Project {
  id: number;
  title: string;
  freelancer: string;
  status: ProjectStatus;
  budget: string;
  deadline: string;
  progress: number;
}

export const ClientDashboard: React.FC = () => {
  const stats: StatCardProps[] = [
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

  const recentProjects: Project[] = [
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

  const getProjectStatusColor = (status: ProjectStatus): string => {
    switch (status) {
      case 'in_progress':
        return 'bg-sky-800/50 text-sky-300';
      case 'review':
        return 'bg-yellow-800/50 text-yellow-300';
      case 'completed':
        return 'bg-emerald-800/50 text-emerald-300';
      default:
        return 'bg-slate-800/50 text-slate-300';
    }
  };

  const getProjectStatusIcon = (status: ProjectStatus) => {
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
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans flex justify-center py-10">
      <div className="w-full max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <h1 className="text-3xl font-bold text-sky-400">Client Dashboard</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => console.log('Create Project')}
              className="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-full hover:bg-sky-700 transition-colors transform hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Project
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Recent Projects */}
        <div className="bg-slate-900/30 backdrop-blur-lg rounded-3xl border border-slate-700/50 shadow-xl">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-sky-400">Recent Projects</h2>
            <button
              onClick={() => console.log('View All Projects')}
              className="text-sky-400 hover:text-sky-500 text-sm font-medium transition-colors"
            >
              View All
            </button>
          </div>
          
          <div className="divide-y divide-slate-800">
            {recentProjects.map((project) => (
              <div key={project.id} className="p-6 transition-colors hover:bg-slate-800/20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-white">{project.title}</h3>
                  <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getProjectStatusColor(project.status)}`}>
                    {getProjectStatusIcon(project.status)}
                    <span className="ml-1 capitalize">{project.status.replace('_', ' ')}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center space-x-6 text-sm text-slate-400 mb-3">
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
                      <span className="text-slate-400">Progress</span>
                      <span className="font-medium text-white">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-sky-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <button
                    onClick={() => console.log(`Viewing details for project ${project.id}`)}
                    className="ml-4 text-sky-400 hover:text-sky-500 font-medium text-sm transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;