import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWeb3 } from './Web3Context';
import { apiClient } from '../services/apiClient';

export interface User {
  address: string;
  username: string;
  email: string;
  role: 'client' | 'freelancer' | 'admin';
  isVerified: boolean;
  profile: {
    bio?: string;
    skills?: string[];
    hourlyRate?: number;
    availability?: string;
    portfolio?: string[];
  };
  reputation: {
    rating: number;
    completedProjects: number;
    totalEarnings: number;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User['profile']>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { address, signer, isConnected } = useWeb3();

  const login = useCallback(async () => {
    if (!address || !signer) return;

    setIsLoading(true);
    try {
      // Check if user exists
      const existingUser = await apiClient.get(`/users/${address}`);
      if (existingUser.data) {
        setUser(existingUser.data);
      } else {
        // User doesn't exist, they need to register
        setUser(null);
      }
    } catch (error) {
      console.error('Login error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, signer]);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: Partial<User['profile']>) => {
    if (!user) return;

    try {
      const response = await apiClient.patch(`/users/${user.address}`, { profile: data });
      setUser(response.data);
    } catch (error) {
      throw new Error('Failed to update profile');
    }
  }, [user]);

  useEffect(() => {
    if (isConnected && address) {
      login();
    } else {
      setUser(null);
    }
  }, [isConnected, address, login]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};