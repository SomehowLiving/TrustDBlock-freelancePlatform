import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWalletStore } from '@/store/walletStore';
import { useAuthStore } from '@/store/authStore';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Shield, Smartphone, Chrome, Loader2 } from 'lucide-react';

interface WalletConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletConnectionModal({ open, onOpenChange }: WalletConnectionModalProps) {
  const { connectWallet, isConnecting, error } = useWalletStore();
  const { setAuth } = useAuthStore();
  const { toast } = useToast();
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: async (data: { address: string; signature?: string; message?: string }) => {
      const response = await apiRequest('POST', '/api/auth/wallet-login', data);
      return response.json();
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      onOpenChange(false);
      toast({
        title: "Wallet Connected Successfully!",
        description: "You are now logged in to TrustDBlock.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    },
  });

  const handleWalletConnect = async (walletType: string) => {
    setSelectedWallet(walletType);
    
    try {
      const address = await connectWallet(walletType);
      
      // In a real implementation, you would sign a message here
      // For demo purposes, we'll just use the address
      const mockSignature = "0x" + Array(128).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      const message = `Welcome to TrustDBlock! Sign this message to verify your wallet ownership.\n\nTimestamp: ${Date.now()}`;
      
      loginMutation.mutate({
        address,
        signature: mockSignature,
        message
      });
    } catch (error) {
      console.error('Wallet connection failed:', error);
    } finally {
      setSelectedWallet(null);
    }
  };

  const walletOptions = [
    {
      id: 'metamask',
      name: 'MetaMask',
      description: 'Connect using browser extension',
      icon: Chrome,
      popular: true
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      description: 'Connect using mobile wallet',
      icon: Smartphone,
      popular: false
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      description: 'Connect using Coinbase Wallet',
      icon: Shield,
      popular: false
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-primary to-blue-600 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            Connect Your Wallet
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            Choose your preferred wallet to get started with TrustDBlock
          </p>
        </DialogHeader>

        <div className="space-y-3">
          {walletOptions.map((wallet) => (
            <Button
              key={wallet.id}
              variant="outline"
              className="w-full h-auto p-4 flex items-center justify-start space-x-4 hover:border-primary hover:bg-primary/5"
              onClick={() => handleWalletConnect(wallet.id)}
              disabled={isConnecting || loginMutation.isPending}
              data-testid={`button-wallet-${wallet.id}`}
            >
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                {selectedWallet === wallet.id && (isConnecting || loginMutation.isPending) ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <wallet.icon className="w-6 h-6 text-foreground" />
                )}
              </div>
              <div className="text-left flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">{wallet.name}</span>
                  {wallet.popular && (
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{wallet.description}</p>
              </div>
            </Button>
          ))}
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            By connecting your wallet, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
