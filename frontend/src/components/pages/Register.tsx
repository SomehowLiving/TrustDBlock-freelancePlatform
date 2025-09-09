import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWeb3 } from '../../contexts/Web3Context';
import { User, Briefcase, Shield, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import {registerUser} from '../../services/apiClient';

const registrationSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
   password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email('Invalid email address'),
  role: z.enum(['client', 'freelancer'], {
    required_error: 'Please select your role',
  }),
  bio: z.string().optional(),
  skills: z.string().optional(),
  hourlyRate: z.number().min(0).optional(),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

export const Register: React.FC = () => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { address } = useWeb3();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegistrationForm) => {
    setIsSubmitting(true);
    try {
      // Mock registration process
      // await new Promise(resolve => setTimeout(resolve, 2000));
      const payload = {
      username: data.username,
      email: data.email,
      password: data.password, // ⚠️ TODO: collect password in the form
      role: data.role,
      bio: data.bio,
      skills: data.skills ? data.skills.split(",").map(s => s.trim()) : [],
    };

      // // In a real app, this would make API calls to register the user
      // console.log('Registration data:', { ...data, address });
    const response = await registerUser(address!, payload);
    console.log("API response:", response);

      
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
    alert((error as Error).message || "Something went wrong");
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 bg-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Welcome to TrustDBlock!</h1>
                <p className="text-blue-100 mt-1">Let's set up your profile</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-200">Connected Wallet</p>
                <p className="text-sm font-mono">{address?.slice(0, 10)}...</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-8 py-4 bg-gray-50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-600">Wallet Connected</span>
              </div>
              <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-green-600' : 'text-gray-400'}`}>
                {step >= 2 ? <CheckCircle className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2"></div>}
                <span>Profile Setup</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-8">
            {/* Role Selection */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                What brings you to TrustDBlock?
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <label className={`cursor-pointer p-4 border-2 rounded-lg transition-colors ${
                  selectedRole === 'client' 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    value="client"
                    {...register('role')}
                    className="sr-only"
                  />
                  <div className="flex items-center space-x-3">
                    <Briefcase className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">I'm a Client</h3>
                      <p className="text-sm text-gray-600">I want to hire freelancers for projects</p>
                    </div>
                  </div>
                </label>

                <label className={`cursor-pointer p-4 border-2 rounded-lg transition-colors ${
                  selectedRole === 'freelancer' 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    value="freelancer"
                    {...register('role')}
                    className="sr-only"
                  />
                  <div className="flex items-center space-x-3">
                    <User className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">I'm a Freelancer</h3>
                      <p className="text-sm text-gray-600">I want to find work and get paid</p>
                    </div>
                  </div>
                </label>
              </div>
              {errors.role && (
                <p className="mt-2 text-red-600 text-sm">{errors.role.message}</p>
              )}
            </div>

            {/* Basic Information */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  {...register('username')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your username"
                />
                {errors.username && (
                  <p className="mt-1 text-red-600 text-sm">{errors.username.message}</p>
                )}
              </div>
                <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Password *
  </label>
  <input
    type="password"
    {...register("password")}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    placeholder="Enter your password"
  />
  {errors.password && (
    <p className="mt-1 text-red-600 text-sm">{errors.password.message}</p>
  )}
</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-red-600 text-sm">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Role-specific fields */}
            {selectedRole === 'freelancer' && (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skills (comma-separated)
                  </label>
                  <input
                    {...register('skills')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="React, Node.js, Blockchain, Smart Contracts"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hourly Rate (USD)
                  </label>
                  <input
                    {...register('hourlyRate', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="50"
                  />
                </div>
              </>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                {...register('bio')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tell us about yourself..."
              />
            </div>

            {/* Security Notice */}
            <div className="mb-8 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Blockchain Registration</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Your profile will be stored on-chain for transparency and security. 
                    You'll be asked to sign a transaction to complete registration.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Creating Account...</span>
                </>
              ) : (
                'Complete Registration'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};