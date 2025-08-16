import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ClientDashboard } from '../dashboard/ClientDashboard';
import { FreelancerDashboard } from '../dashboard/FreelancerDashboard';
import { AdminDashboard } from '../dashboard/AdminDashboard';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'client':
      return <ClientDashboard />;
    case 'freelancer':
      return <FreelancerDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <div>Unknown user role</div>;
  }
};