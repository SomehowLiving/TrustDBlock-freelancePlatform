import React from 'react';
import { 
  Search, 
  Star, 
  DollarSign, 
  TrendingUp,
  Briefcase,
  Clock,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
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
type ProjectStatus = 'in_progress' | 'review' | 'pending_approval';

interface ActiveProject {
  id: number;
  title: string;
  client: string;
  status: ProjectStatus;
  budget: string;
  deadline: string;
  progress: number;
  milestones: { completed: number; total: number; };
}

interface RecommendedProject {
  id: number;
  title: string;
  budget: string;
  skills: string[];
  client: string;
  postedTime: string;
  proposals: number;
}

export const FreelancerDashboard: React.FC = () => {
  const stats: StatCardProps[] = [
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

  const activeProjects: ActiveProject[] = [
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

  const recommendedProjects: RecommendedProject[] = [
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

  const getStatusColor = (status: ProjectStatus): string => {
    switch (status) {
      case 'in_progress':
        return 'bg-sky-800/50 text-sky-300';
      case 'review':
        return 'bg-yellow-800/50 text-yellow-300';
      case 'pending_approval':
        return 'bg-indigo-800/50 text-indigo-300';
      default:
        return 'bg-slate-800/50 text-slate-300';
    }
  };

  const getStatusIcon = (status: ProjectStatus) => {
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
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans flex justify-center py-10">
      <div className="w-full max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <h1 className="text-3xl font-bold text-sky-400">Freelancer Dashboard</h1>
          <button
            onClick={() => console.log('Find Projects')}
            className="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-full hover:bg-sky-700 transition-colors transform hover:scale-105"
          >
            <Search className="w-5 h-5 mr-2" />
            Find Projects
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active Projects */}
          <div className="bg-slate-900/30 backdrop-blur-lg rounded-3xl border border-slate-700/50 shadow-xl">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h2 className="text-lg font-semibold text-sky-400">Active Projects</h2>
            </div>
            
            <div className="divide-y divide-slate-800">
              {activeProjects.map((project) => (
                <div key={project.id} className="p-6 transition-colors hover:bg-slate-800/20">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-white line-clamp-1">{project.title}</h3>
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {getStatusIcon(project.status)}
                      <span className="ml-1 capitalize">{project.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-slate-400 mb-3">
                    <span>{project.client}</span>
                    <span>{project.budget}</span>
                    <span>Due {project.deadline}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Progress</span>
                      <span className="font-medium text-white">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-sky-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">
                        {project.milestones.completed}/{project.milestones.total} milestones completed
                      </span>
                      <button
                        onClick={() => console.log(`Viewing details for project ${project.id}`)}
                        className="text-sky-400 hover:text-sky-500 text-sm font-medium inline-flex items-center"
                      >
                        View Details
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Projects */}
          <div className="bg-slate-900/30 backdrop-blur-lg rounded-3xl border border-slate-700/50 shadow-xl">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-sky-400">Recommended for You</h2>
                <button
                  onClick={() => console.log('View All Projects')}
                  className="text-sky-400 hover:text-sky-500 text-sm font-medium transition-colors"
                >
                  View All
                </button>
              </div>
            </div>
            
            <div className="divide-y divide-slate-800">
              {recommendedProjects.map((project) => (
                <div key={project.id} className="p-6 transition-colors hover:bg-slate-800/20">
                  <h3 className="font-medium text-white mb-2">{project.title}</h3>
                  <p className="text-lg font-semibold text-emerald-400 mb-3">{project.budget}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {project.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-sky-800/50 text-sky-300 rounded-full text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>{project.client}</span>
                    <span>{project.postedTime}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-500">{project.proposals} proposals</span>
                    <button
                      onClick={() => console.log('Apply to project')}
                      className="inline-flex items-center px-3 py-1 bg-sky-600 text-white text-sm rounded-full hover:bg-sky-700 transition-colors"
                    >
                      Apply Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreelancerDashboard;