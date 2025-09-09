
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@store/authStore';
import { useWalletStore } from '@store/walletStore';
import { apiRequest, getContractAddresses, getEthersProvider } from '@/lib/utils';
import { useIPFS } from '@/hooks/useIPFS';
import { ethers } from 'ethers';
import userRegistryAbi from '../../../backend/abis/UserRegistry.json';

interface RegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegisterModal({ open, onOpenChange }: RegisterModalProps) {
  const { wallet } = useWalletStore();
  const { setAuth } = useAuthStore();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'freelancer',
    bio: '',
    skills: ''
  });

  const { uploadJSONToIPFS } = useIPFS();

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/users/register`, data, {
        'x-wallet-address': wallet?.address
      });
      return response.json();
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      onOpenChange(false);
      toast({
        title: "Registration Successful!",
        description: "Welcome to TrustDBlock! Your account has been created.",
      });
      
      // Reset form
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'freelancer',
        bio: '',
        skills: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet?.address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    const skillsArray = formData.skills
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0);

    try {
      // 1) Upload metadata to IPFS (optional - can use placeholder)
      let metadataCid = `QmUserMetadata${Date.now()}`; // placeholder
      try {
        const metadata = {
          username: formData.username,
          email: formData.email,
          role: formData.role,
          profile: { bio: formData.bio, skills: skillsArray }
        };
        const ipfs = await uploadJSONToIPFS(metadata);
        if (ipfs) metadataCid = ipfs.hash;
      } catch (e) {
        console.warn('IPFS upload failed, using placeholder:', e);
      }

      // 2) Call selfRegister from wallet
      const { signer } = await getEthersProvider();
      const { userRegistry } = getContractAddresses();
      const contract = new ethers.Contract(userRegistry, (userRegistryAbi as any).abi || userRegistryAbi, signer);
      const roleCapitalized = formData.role.charAt(0).toUpperCase() + formData.role.slice(1).toLowerCase();
      
      const tx = await contract.selfRegister(roleCapitalized, metadataCid);
      const receipt = await tx.wait();

      // 3) Backend verification call
      registerMutation.mutate({
        txHash: tx.hash,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        bio: formData.bio,
        skills: skillsArray
      });
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register on blockchain",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Your Account</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email"
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="freelancer">Freelancer</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio (Optional)</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell us about yourself"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills (Optional)</Label>
            <Input
              id="skills"
              value={formData.skills}
              onChange={(e) => handleInputChange('skills', e.target.value)}
              placeholder="React, Node.js, Python (comma-separated)"
            />
          </div>

          {wallet?.address && (
            <div className="space-y-2">
              <Label>Connected Wallet</Label>
              <Input
                value={wallet.address}
                disabled
                className="bg-gray-50"
              />
            </div>
          )}

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
              disabled={registerMutation.isPending || !wallet?.address}
              className="flex-1"
            >
              {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
