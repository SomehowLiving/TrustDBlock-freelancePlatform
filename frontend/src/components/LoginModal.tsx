
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { apiRequest } from '@/lib/utils';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const { wallet } = useWalletStore();
  const { setAuth } = useAuthStore();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const loginMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/auth/login', data);
      return response.json();
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      onOpenChange(false);
      toast({
        title: "Login Successful!",
        description: "Welcome back to TrustDBlock!",
      });
      
      // Reset form
      setFormData({ email: '', password: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const walletLoginMutation = useMutation({
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({
      address: wallet?.address || '',
      password: formData.password
    });
  };

  const handleWalletLogin = () => {
    if (!wallet?.address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    // In a real implementation, you would sign a message here
    const mockSignature = "0x" + Array(128).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    const message = `Welcome to TrustDBlock! Sign this message to verify your wallet ownership.\n\nTimestamp: ${Date.now()}`;

    walletLoginMutation.mutate({
      address: wallet.address,
      signature: mockSignature,
      message
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Login to Your Account</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {wallet?.address && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Connected Wallet:</p>
                <p className="text-xs font-mono bg-gray-100 p-2 rounded">
                  {wallet.address}
                </p>
              </div>
              
              <Button
                onClick={handleWalletLogin}
                disabled={walletLoginMutation.isPending}
                className="w-full"
              >
                {walletLoginMutation.isPending ? 'Connecting...' : 'Login with Wallet'}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or login with password
                  </span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email or Wallet Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email or wallet address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="flex-1"
              >
                {loginMutation.isPending ? 'Logging in...' : 'Login'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
