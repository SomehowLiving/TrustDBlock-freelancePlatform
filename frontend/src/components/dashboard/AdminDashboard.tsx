import React from 'react';
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
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

// Define the type for the Dispute and Metric objects
type DisputeStatus = 'pending' | 'resolved' | 'escalated';

interface Dispute {
  id: number;
  project: string;
  client: string;
  freelancer: string;
  status: DisputeStatus;
  amount: string;
  createdAt: string;
}

interface PlatformMetric {
  label: string;
  value: string;
  trend: string;
  color: string;
}

// Main Admin Dashboard component
export const AdminDashboard: React.FC = () => {
  const stats: StatCardProps[] = [
    {
      title: 'Total Users',
      value: '12,847',
      icon: Users,
      trend: '+8% this month',
      color: 'blue',
    },
    {
      title: 'Active Projects',
      value: '1,284',
      icon: Briefcase,
      trend: '+15% this month',
      color: 'green',
    },
    {
      title: 'Platform Volume',
      value: '$2.4M',
      icon: DollarSign,
      trend: '+22% this month',
      color: 'purple',
    },
    {
      title: 'Success Rate',
      value: '94.2%',
      icon: TrendingUp,
      trend: '+1.2% this month',
      color: 'orange',
    },
  ];

  const recentDisputes: Dispute[] = [
    {
      id: 1,
      project: 'DeFi Dashboard Development',
      client: 'TechCorp Inc.',
      freelancer: 'Sarah Chen',
      status: 'pending',
      amount: '$1,500',
      createdAt: '2024-01-28',
    },
    {
      id: 2,
      project: 'Mobile App Design',
      client: 'StartupXYZ',
      freelancer: 'Michael Torres',
      status: 'resolved',
      amount: '$800',
      createdAt: '2024-01-25',
    },
    {
      id: 3,
      project: 'Smart Contract Audit',
      client: 'CryptoFund',
      freelancer: 'Jessica Lee',
      status: 'escalated',
      amount: '$5,000',
      createdAt: '2024-01-22',
    },
  ];

  const platformMetrics: PlatformMetric[] = [
    {
      label: 'User Growth',
      value: '+847 this month',
      trend: '+12%',
      color: 'text-emerald-400',
    },
    {
      label: 'Project Completion',
      value: '94.2%',
      trend: '+1.2%',
      color: 'text-emerald-400',
    },
    {
      label: 'Dispute Rate',
      value: '2.1%',
      trend: '-0.3%',
      color: 'text-red-400',
    },
    {
      label: 'Average Project Value',
      value: '$3,240',
      trend: '+8%',
      color: 'text-emerald-400',
    },
  ];

  const getDisputeStatusColor = (status: DisputeStatus): string => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-800/50 text-yellow-300';
      case 'resolved':
        return 'bg-emerald-800/50 text-emerald-300';
      case 'escalated':
        return 'bg-red-800/50 text-red-300';
      default:
        return 'bg-slate-800/50 text-slate-300';
    }
  };

  const getDisputeStatusIcon = (status: DisputeStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />;
      case 'escalated':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans flex justify-center py-10">
      <div className="w-full max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <h1 className="text-3xl font-bold text-sky-400">Admin Dashboard</h1>
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-slate-700/50 backdrop-blur-lg border border-slate-600/50 text-slate-300 rounded-full hover:bg-slate-600/50 transition-colors transform hover:scale-105">
              Export Report
            </button>
            <button className="px-4 py-2 bg-sky-600 text-white rounded-full hover:bg-sky-700 transition-colors transform hover:scale-105">
              Platform Settings
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Metrics and Disputes Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Platform Metrics */}
          <div className="bg-slate-900/30 backdrop-blur-lg rounded-3xl border border-slate-700/50 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-sky-400 mb-4">Platform Metrics</h2>
            <div className="space-y-4">
              {platformMetrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-slate-400">{metric.label}</span>
                  <div className="text-right">
                    <span className="font-medium text-white">{metric.value}</span>
                    <span className={`ml-2 text-sm ${metric.color}`}>{metric.trend}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Disputes */}
          <div className="lg:col-span-2 bg-slate-900/30 backdrop-blur-lg rounded-3xl border border-slate-700/50 shadow-xl">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h2 className="text-lg font-semibold text-sky-400">Recent Disputes</h2>
            </div>
            
            <div className="divide-y divide-slate-800">
              {recentDisputes.map((dispute) => (
                <div key={dispute.id} className="p-6 transition-colors hover:bg-slate-800/20">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3">
                    <h3 className="font-medium text-white">{dispute.project}</h3>
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getDisputeStatusColor(dispute.status)}`}>
                      {getDisputeStatusIcon(dispute.status)}
                      <span className="ml-1 capitalize">{dispute.status}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-400 mb-3">
                    <div>
                      <span className="font-medium">Client:</span> {dispute.client}
                    </div>
                    <div>
                      <span className="font-medium">Freelancer:</span> {dispute.freelancer}
                    </div>
                    <div>
                      <span className="font-medium">Amount:</span> {dispute.amount}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {dispute.createdAt}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button className="px-3 py-1 text-sm bg-sky-800/50 text-sky-300 rounded-full hover:bg-sky-700/50 transition-colors transform hover:scale-105">
                      View Details
                    </button>
                    {dispute.status === 'pending' && (
                      <button className="px-3 py-1 text-sm bg-emerald-800/50 text-emerald-300 rounded-full hover:bg-emerald-700/50 transition-colors transform hover:scale-105">
                        Resolve
                      </button>
                    )}
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

export default AdminDashboard;