import { create } from 'zustand';
import { WalletConnection } from '@/types';

interface WalletState {
  wallet: WalletConnection | null;
  isConnecting: boolean;
  error: string | null;
  setWallet: (wallet: WalletConnection) => void;
  setConnecting: (connecting: boolean) => void;
  setError: (error: string | null) => void;
  disconnect: () => void;
  connectWallet: (walletType: string) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallet: null,
  isConnecting: false,
  error: null,

  setWallet: (wallet: WalletConnection) => {
    set({ wallet, error: null });
  },

  setConnecting: (connecting: boolean) => {
    set({ isConnecting: connecting });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  disconnect: () => {
    set({ wallet: null, error: null });
  },

  connectWallet: async (walletType: string) => {
    set({ isConnecting: true, error: null });

    try {
      let provider;
      let accounts;

      if (walletType === 'metamask') {
        if (typeof window.ethereum === 'undefined') {
          throw new Error('MetaMask is not installed');
        }
        
        provider = window.ethereum;
        accounts = await provider.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length === 0) {
          throw new Error('No accounts found');
        }

        // Get chain ID
        const chainId = await provider.request({ method: 'eth_chainId' });
        
        set({
          wallet: {
            address: accounts[0],
            isConnected: true,
            chainId: parseInt(chainId, 16)
          },
          isConnecting: false
        });

        return accounts[0];
      } else if (walletType === 'walletconnect') {
        // For now, use a mock since WalletConnect requires additional setup
        throw new Error('WalletConnect not yet implemented. Please use MetaMask.');
      } else if (walletType === 'coinbase') {
        // For now, use a mock since Coinbase Wallet requires additional setup
        throw new Error('Coinbase Wallet not yet implemented. Please use MetaMask.');
      } else {
        throw new Error('Unsupported wallet type');
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
        isConnecting: false
      });
      throw error;
    }
  },
}));
