import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@store/authStore';
import { useWalletStore } from '@store/walletStore';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Settings, 
  Star, 
  Award, 
  MapPin, 
  Globe, 
  Github, 
  Linkedin,
  Plus,
  X,
  Edit,
  Save,
  DollarSign,
  Briefcase,
  Clock,
  Shield,
  ExternalLink
} from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const { wallet } = useWalletStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [portfolioForm, setPortfolioForm] = useState({
    title: '',
    description: '',
    url: '',
    image: ''
  });
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);

  const form = useForm({
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      profile: {
        bio: user?.profile?.bio || '',
        hourlyRate: user?.profile?.hourlyRate || 0,
        availability: user?.profile?.availability || 'available',
        location: user?.profile?.location || '',
        website: user?.profile?.website || '',
        github: user?.profile?.github || '',
        linkedin: user?.profile?.linkedin || '',
        timezone: user?.profile?.timezone || ''
      },
      preferences: {
        emailNotifications: user?.preferences?.emailNotifications ?? true,
        pushNotifications: user?.preferences?.pushNotifications ?? true,
        weeklyDigest: user?.preferences?.weeklyDigest ?? true
      }
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', '/api/users/me', data);
      return response.json();
    },
    onSuccess: (data) => {
      updateUser(data);
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    updateProfileMutation.mutate(data);
  };

  const addSkill = () => {
    if (newSkill.trim() && user?.profile?.skills) {
      const updatedSkills = [...(user.profile.skills || []), newSkill.trim()];
      updateProfileMutation.mutate({
        profile: {
          ...user.profile,
          skills: updatedSkills
        }
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    if (user?.profile?.skills) {
      const updatedSkills = user.profile.skills.filter(skill => skill !== skillToRemove);
      updateProfileMutation.mutate({
        profile: {
          ...user.profile,
          skills: updatedSkills
        }
      });
    }
  };

  const addPortfolioItem = () => {
    if (portfolioForm.title.trim() && portfolioForm.url.trim()) {
      const updatedPortfolio = [...(user?.profile?.portfolio || []), portfolioForm];
      updateProfileMutation.mutate({
        profile: {
          ...user?.profile,
          portfolio: updatedPortfolio
        }
      });
      setPortfolioForm({ title: '', description: '', url: '', image: '' });
      setShowPortfolioForm(false);
    }
  };

  const removePortfolioItem = (index: number) => {
    if (user?.profile?.portfolio) {
      const updatedPortfolio = user.profile.portfolio.filter((_, i) => i !== index);
      updateProfileMutation.mutate({
        profile: {
          ...user?.profile,
          portfolio: updatedPortfolio
        }
      });
    }
  };

  const availabilityOptions = [
    { value: 'available', label: 'Available', color: 'bg-green-500' },
    { value: 'busy', label: 'Busy', color: 'bg-yellow-500' },
    { value: 'unavailable', label: 'Unavailable', color: 'bg-red-500' }
  ];

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Please log in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8" data-testid="profile-container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-profile-title">
            Profile Settings
          </h1>
          <p className="text-muted-foreground" data-testid="text-profile-description">
            Manage your account settings and preferences
          </p>
        </div>
        
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} data-testid="button-edit-profile">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={updateProfileMutation.isPending}
              data-testid="button-save-profile"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Overview */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card data-testid="card-profile-overview">
            <CardHeader>
              <CardTitle>Profile Overview</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Avatar className="w-24 h-24 mx-auto">
                <AvatarFallback className="text-2xl">
                  {user.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h3 className="text-xl font-semibold text-foreground" data-testid="text-username">
                  {user.username}
                </h3>
                <p className="text-muted-foreground capitalize" data-testid="text-user-role">
                  {user.role}
                </p>
              </div>

              {wallet?.address && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center space-x-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-sm font-mono" data-testid="text-wallet-address">
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Verified Wallet</p>
                </div>
              )}

              {user.profile?.availability && (
                <div className="flex items-center justify-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    availabilityOptions.find(opt => opt.value === user.profile?.availability)?.color || 'bg-gray-500'
                  }`}></div>
                  <span className="text-sm capitalize" data-testid="text-availability">
                    {user.profile.availability}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reputation Card (for freelancers) */}
          {user.role === 'freelancer' && user.reputation && (
            <Card data-testid="card-reputation-overview">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  Reputation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-foreground" data-testid="text-average-rating">
                      {user.reputation.averageRating.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">Average Rating</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground" data-testid="text-completed-projects">
                      {user.reputation.completedProjects}
                    </div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground" data-testid="text-total-earned">
                      ${user.reputation.totalEarned.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Earned</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground" data-testid="text-success-rate">
                      {user.reputation.successRate}%
                    </div>
                    <div className="text-xs text-muted-foreground">Success Rate</div>
                  </div>
                </div>

                {user.reputation.badges.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium text-foreground mb-2">Achievements</h4>
                    <div className="flex flex-wrap gap-1">
                      {user.reputation.badges.map((badge, index) => (
                        <Badge key={index} variant="secondary" className="text-xs" data-testid={`badge-achievement-${index}`}>
                          <Award className="w-3 h-3 mr-1" />
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card data-testid="card-basic-information">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Username</label>
                  <Input
                    {...form.register('username')}
                    disabled={!isEditing}
                    className="mt-1"
                    data-testid="input-username"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <Input
                    {...form.register('email')}
                    disabled={!isEditing}
                    className="mt-1"
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Bio</label>
                <Textarea
                  {...form.register('profile.bio')}
                  placeholder="Tell us about yourself and your expertise..."
                  disabled={!isEditing}
                  className="mt-1"
                  rows={3}
                  data-testid="textarea-bio"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Location</label>
                  <Input
                    {...form.register('profile.location')}
                    placeholder="City, Country"
                    disabled={!isEditing}
                    className="mt-1"
                    data-testid="input-location"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Timezone</label>
                  <Input
                    {...form.register('profile.timezone')}
                    placeholder="UTC+0"
                    disabled={!isEditing}
                    className="mt-1"
                    data-testid="input-timezone"
                  />
                </div>
              </div>

              {user.role === 'freelancer' && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Hourly Rate ($)</label>
                    <Input
                      {...form.register('profile.hourlyRate', { valueAsNumber: true })}
                      type="number"
                      placeholder="50"
                      disabled={!isEditing}
                      className="mt-1"
                      data-testid="input-hourly-rate"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Availability</label>
                    <Select 
                      value={form.watch('profile.availability')}
                      onValueChange={(value) => form.setValue('profile.availability', value)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="mt-1" data-testid="select-availability">
                        <SelectValue placeholder="Select availability" />
                      </SelectTrigger>
                      <SelectContent>
                        {availabilityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${option.color}`}></div>
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card data-testid="card-social-links">
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  Website
                </label>
                <Input
                  {...form.register('profile.website')}
                  placeholder="https://yourwebsite.com"
                  disabled={!isEditing}
                  className="mt-1"
                  data-testid="input-website"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground flex items-center">
                  <Github className="w-4 h-4 mr-2" />
                  GitHub
                </label>
                <Input
                  {...form.register('profile.github')}
                  placeholder="https://github.com/username"
                  disabled={!isEditing}
                  className="mt-1"
                  data-testid="input-github"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground flex items-center">
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </label>
                <Input
                  {...form.register('profile.linkedin')}
                  placeholder="https://linkedin.com/in/username"
                  disabled={!isEditing}
                  className="mt-1"
                  data-testid="input-linkedin"
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          {user.role === 'freelancer' && (
            <Card data-testid="card-skills">
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill..."
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      data-testid="input-new-skill"
                    />
                    <Button type="button" onClick={addSkill} data-testid="button-add-skill">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {user.profile?.skills?.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1" data-testid={`badge-skill-${index}`}>
                      {skill}
                      {isEditing && (
                        <X 
                          className="w-3 h-3 cursor-pointer hover:text-destructive" 
                          onClick={() => removeSkill(skill)}
                        />
                      )}
                    </Badge>
                  )) || (
                    <p className="text-muted-foreground text-sm">No skills added yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Portfolio */}
          {user.role === 'freelancer' && (
            <Card data-testid="card-portfolio">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Portfolio</CardTitle>
                  {isEditing && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowPortfolioForm(!showPortfolioForm)}
                      data-testid="button-add-portfolio"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Project
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showPortfolioForm && (
                  <div className="p-4 border border-border rounded-lg space-y-3">
                    <Input
                      placeholder="Project title"
                      value={portfolioForm.title}
                      onChange={(e) => setPortfolioForm({ ...portfolioForm, title: e.target.value })}
                      data-testid="input-portfolio-title"
                    />
                    <Textarea
                      placeholder="Project description"
                      value={portfolioForm.description}
                      onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                      rows={2}
                      data-testid="textarea-portfolio-description"
                    />
                    <Input
                      placeholder="Project URL"
                      value={portfolioForm.url}
                      onChange={(e) => setPortfolioForm({ ...portfolioForm, url: e.target.value })}
                      data-testid="input-portfolio-url"
                    />
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={addPortfolioItem} data-testid="button-save-portfolio">
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setShowPortfolioForm(false)}
                        data-testid="button-cancel-portfolio"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {user.profile?.portfolio?.map((item, index) => (
                    <div key={index} className="p-4 border border-border rounded-lg space-y-2" data-testid={`portfolio-item-${index}`}>
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-foreground" data-testid={`text-portfolio-title-${index}`}>
                          {item.title}
                        </h4>
                        {isEditing && (
                          <X 
                            className="w-4 h-4 cursor-pointer hover:text-destructive" 
                            onClick={() => removePortfolioItem(index)}
                          />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-portfolio-description-${index}`}>
                        {item.description}
                      </p>
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-primary hover:text-primary/80"
                        data-testid={`link-portfolio-url-${index}`}
                      >
                        View Project
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )) || (
                    <p className="text-muted-foreground text-sm col-span-2">No portfolio items added yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notification Preferences */}
          <Card data-testid="card-notification-preferences">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Email Notifications</label>
                  <p className="text-xs text-muted-foreground">Receive email updates about your projects</p>
                </div>
                <Switch
                  checked={form.watch('preferences.emailNotifications')}
                  onCheckedChange={(checked) => form.setValue('preferences.emailNotifications', checked)}
                  disabled={!isEditing}
                  data-testid="switch-email-notifications"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Push Notifications</label>
                  <p className="text-xs text-muted-foreground">Receive real-time notifications in browser</p>
                </div>
                <Switch
                  checked={form.watch('preferences.pushNotifications')}
                  onCheckedChange={(checked) => form.setValue('preferences.pushNotifications', checked)}
                  disabled={!isEditing}
                  data-testid="switch-push-notifications"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Weekly Digest</label>
                  <p className="text-xs text-muted-foreground">Get weekly summary of your activity</p>
                </div>
                <Switch
                  checked={form.watch('preferences.weeklyDigest')}
                  onCheckedChange={(checked) => form.setValue('preferences.weeklyDigest', checked)}
                  disabled={!isEditing}
                  data-testid="switch-weekly-digest"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
