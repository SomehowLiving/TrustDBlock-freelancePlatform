import React from 'react';
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { StatCard } from '../ui/StatCard';

export const AdminDashboard: React.FC = () => {
  const stats = [
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

  const recentDisputes = [
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
  ];

  const platformMetrics = [
    {
      label: 'User Growth',
      value: '+847 this month',
      trend: '+12%',
      color: 'text-green-600',
    },
    {
      label: 'Project Completion',
      value: '94.2%',
      trend: '+1.2%',
      color: 'text-green-600',
    },
    {
      label: 'Dispute Rate',
      value: '2.1%',
      trend: '-0.3%',
      color: 'text-green-600',
    },
    {
      label: 'Average Project Value',
      value: '$3,240',
      trend: '+8%',
      color: 'text-green-600',
    },
  ];

  const getDisputeStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'escalated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDisputeStatusIcon = (status: string) => {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Export Report
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Platform Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Metrics</h2>
          <div className="space-y-4">
            {platformMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-600">{metric.label}</span>
                <div className="text-right">
                  <span className="font-medium text-gray-900">{metric.value}</span>
                  <span className={`ml-2 text-sm ${metric.color}`}>{metric.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Disputes */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Disputes</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {recentDisputes.map((dispute) => (
              <div key={dispute.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">{dispute.project}</h3>
                  <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getDisputeStatusColor(dispute.status)}`}>
                    {getDisputeStatusIcon(dispute.status)}
                    <span className="ml-1 capitalize">{dispute.status}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
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
                  <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                    View Details
                  </button>
                  {dispute.status === 'pending' && (
                    <button className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
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
  );
};