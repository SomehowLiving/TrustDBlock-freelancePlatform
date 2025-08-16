import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectWallet: (walletType: 'metamask' | 'walletconnect') => Promise<void>;
  disconnectWallet: () => void;
  error: string | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = useCallback(async (walletType: 'metamask' | 'walletconnect') => {
    setIsConnecting(true);
    setError(null);

    try {
      if (walletType === 'metamask') {
        if (typeof window.ethereum !== 'undefined') {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const web3Provider = new ethers.BrowserProvider(window.ethereum);
          const web3Signer = await web3Provider.getSigner();
          const userAddress = await web3Signer.getAddress();

          setProvider(web3Provider);
          setSigner(web3Signer);
          setAddress(userAddress);
          setIsConnected(true);
        } else {
          throw new Error('MetaMask is not installed');
        }
      } else if (walletType === 'walletconnect') {
        // WalletConnect integration would go here
        throw new Error('WalletConnect integration not implemented in MVP');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setIsConnected(false);
    setError(null);
  }, []);

  useEffect(() => {
    // Check if already connected on page load
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const web3Provider = new ethers.BrowserProvider(window.ethereum);
            const web3Signer = await web3Provider.getSigner();
            const userAddress = await web3Signer.getAddress();

            setProvider(web3Provider);
            setSigner(web3Signer);
            setAddress(userAddress);
            setIsConnected(true);
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkConnection();

    // Listen for account changes
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          // Reconnect with new account
          connectWallet('metamask');
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    }
  }, [connectWallet, disconnectWallet]);

  const value = {
    provider,
    signer,
    address,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    error,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};