import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../../contexts/Web3Context';
import { Wallet, Shield, ArrowLeft, Loader } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export const ConnectWallet: React.FC = () => {
  const { connectWallet, isConnecting, error, isConnected } = useWeb3();
  const navigate = useNavigate();
  const [selectedWallet, setSelectedWallet] = useState<'metamask' | 'walletconnect' | null>(null);

  React.useEffect(() => {
    if (isConnected) {
      navigate('/register');
    }
  }, [isConnected, navigate]);

  const handleConnect = async (walletType: 'metamask' | 'walletconnect') => {
    setSelectedWallet(walletType);
    try {
      await connectWallet(walletType);
    } catch (error) {
      setSelectedWallet(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Back to Home */}
        <Link
          to="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Connect Your Wallet
            </h1>
            <p className="text-gray-600">
              Choose your preferred wallet to get started with TrustDBlock
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Wallet Options */}
          <div className="space-y-4 mb-8">
            {/* MetaMask */}
            <button
              onClick={() => handleConnect('metamask')}
              disabled={isConnecting}
              className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-sm">M</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">MetaMask</h3>
                    <p className="text-sm text-gray-500">Most popular wallet</p>
                  </div>
                </div>
                {isConnecting && selectedWallet === 'metamask' ? (
                  <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <div className="w-3 h-3 rounded-full border-2 border-gray-300 group-hover:border-blue-600"></div>
                )}
              </div>
            </button>

            {/* WalletConnect */}
            <button
              onClick={() => handleConnect('walletconnect')}
              disabled={isConnecting}
              className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">W</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">WalletConnect</h3>
                    <p className="text-sm text-gray-500">Connect any wallet</p>
                  </div>
                </div>
                {isConnecting && selectedWallet === 'walletconnect' ? (
                  <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <div className="w-3 h-3 rounded-full border-2 border-gray-300 group-hover:border-blue-600"></div>
                )}
              </div>
            </button>
          </div>

          {/* Security Note */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Secure Connection</p>
                <p className="text-xs text-blue-700 mt-1">
                  Your wallet connection is encrypted and secure. We never store your private keys.
                </p>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isConnecting && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                <div className="text-center">
                  <LoadingSpinner />
                  <p className="mt-4 text-gray-600">
                    Connecting to {selectedWallet}...
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Please check your wallet for connection request
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};