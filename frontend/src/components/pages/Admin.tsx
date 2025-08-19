import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { DisputeData, ProjectData, AuthUser } from '@/types';
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  Briefcase, 
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Gavel,
  FileText,
  Calendar,
  Filter
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export default function Admin() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDispute, setSelectedDispute] = useState<DisputeData | null>(null);
  const [disputeFilter, setDisputeFilter] = useState('all');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Admin Access Required</h3>
            <p className="text-muted-foreground">
              You need administrator privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: disputes, isLoading: disputesLoading } = useQuery({
    queryKey: ['/api/disputes'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    refetchInterval: 30000,
  });

  const { data: allProjects } = useQuery({
    queryKey: ['/api/projects', { limit: 50 }],
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: allUsers } = useQuery({
    queryKey: ['/api/users'],
    refetchInterval: 60000,
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ disputeId, resolution }: { disputeId: string, resolution: any }) => {
      const response = await apiRequest('PUT', `/api/disputes/${disputeId}`, {
        resolution: {
          ...resolution,
          resolvedBy: user?.address,
          resolvedAt: new Date().toISOString()
        },
        adminNotes: resolutionNotes
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/disputes'] });
      setSelectedDispute(null);
      setResolutionNotes('');
      toast({
        title: "Dispute Resolved",
        description: "The dispute has been successfully resolved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Resolution Failed",
        description: error.message || "Failed to resolve dispute",
        variant: "destructive",
      });
    },
  });

  const filteredDisputes = disputes?.filter((dispute: DisputeData) => {
    if (disputeFilter === 'all') return true;
    return dispute.resolution.status === disputeFilter;
  }) || [];

  const getStatusColor = (status: string) => {
    const colors = {
      'open': 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      'investigating': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
      'resolved': 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      'closed': 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
    };
    return colors[status as keyof typeof colors] || colors.open;
  };

  const handleResolveDispute = (winner: string, reasoning: string) => {
    if (!selectedDispute) return;

    resolveDisputeMutation.mutate({
      disputeId: selectedDispute.id,
      resolution: {
        status: 'resolved',
        winner,
        reasoning
      }
    });
  };

  // Calculate platform statistics
  const platformStats = {
    totalProjects: allProjects?.length || 0,
    activeProjects: allProjects?.filter((p: ProjectData) => p.status === 'active').length || 0,
    completedProjects: allProjects?.filter((p: ProjectData) => p.status === 'completed').length || 0,
    totalUsers: allUsers?.length || 0,
    activeDisputes: disputes?.filter((d: DisputeData) => d.resolution.status === 'open').length || 0,
    totalDisputes: disputes?.length || 0
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8" data-testid="admin-container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-admin-title">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground" data-testid="text-admin-description">
            Platform management and dispute resolution
          </p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">
          Administrator
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="card-stat-total-projects">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-projects">
              {platformStats.totalProjects}
            </div>
            <p className="text-xs text-muted-foreground">
              {platformStats.activeProjects} active
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-total-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-users">
              {platformStats.totalUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              Platform users
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-active-disputes">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Disputes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="text-active-disputes">
              {platformStats.activeDisputes}
            </div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-completed-projects">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Projects</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-completed-projects">
              {platformStats.completedProjects}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully finished
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="disputes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="disputes" data-testid="tab-disputes">Disputes</TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-projects">Projects</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Disputes Tab */}
        <TabsContent value="disputes" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Disputes List */}
            <div className="lg:col-span-2">
              <Card data-testid="card-disputes-list">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Gavel className="w-5 h-5 mr-2" />
                      Disputes
                    </CardTitle>
                    <Select value={disputeFilter} onValueChange={setDisputeFilter} data-testid="select-dispute-filter">
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Disputes</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {disputesLoading ? (
                    <div className="space-y-4" data-testid="disputes-loading">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="p-4 border border-border rounded-lg">
                            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredDisputes.length > 0 ? (
                    <div className="space-y-4">
                      {filteredDisputes.map((dispute: DisputeData) => (
                        <div
                          key={dispute.id}
                          className={`p-4 border border-border rounded-lg cursor-pointer transition-colors ${
                            selectedDispute?.id === dispute.id ? 'border-primary bg-accent/50' : 'hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedDispute(dispute)}
                          data-testid={`dispute-item-${dispute.id}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-foreground" data-testid={`text-dispute-id-${dispute.id}`}>
                                Dispute #{dispute.disputeId}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Project ID: {dispute.projectId}
                              </p>
                            </div>
                            <Badge className={getStatusColor(dispute.resolution.status)} data-testid={`badge-dispute-status-${dispute.id}`}>
                              {dispute.resolution.status}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3" data-testid={`text-dispute-reason-${dispute.id}`}>
                            {dispute.details.reason}
                          </p>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              Raised by: {dispute.parties.raisedBy.slice(0, 6)}...{dispute.parties.raisedBy.slice(-4)}
                            </span>
                            <span>
                              {formatDistanceToNow(new Date(dispute.timeline.raisedAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8" data-testid="no-disputes">
                      <Gavel className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-sm font-medium text-foreground mb-2">No Disputes</h3>
                      <p className="text-xs text-muted-foreground">
                        {disputeFilter === 'all' ? 'No disputes have been raised' : `No ${disputeFilter} disputes`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Dispute Details */}
            <div>
              {selectedDispute ? (
                <Card data-testid="card-dispute-details">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Dispute Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Dispute Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dispute ID:</span>
                          <span className="font-medium" data-testid="text-selected-dispute-id">#{selectedDispute.disputeId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Project ID:</span>
                          <span className="font-medium" data-testid="text-selected-project-id">{selectedDispute.projectId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Category:</span>
                          <span className="font-medium">{selectedDispute.details.category || 'General'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Raised:</span>
                          <span className="font-medium">
                            {format(new Date(selectedDispute.timeline.raisedAt), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium text-foreground mb-2">Parties Involved</h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">C</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Client</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {selectedDispute.parties.client.wallet.slice(0, 6)}...{selectedDispute.parties.client.wallet.slice(-4)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">F</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Freelancer</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {selectedDispute.parties.freelancer.wallet.slice(0, 6)}...{selectedDispute.parties.freelancer.wallet.slice(-4)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium text-foreground mb-2">Dispute Reason</h4>
                      <p className="text-sm text-muted-foreground" data-testid="text-selected-dispute-reason">
                        {selectedDispute.details.reason}
                      </p>
                      {selectedDispute.details.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {selectedDispute.details.description}
                        </p>
                      )}
                    </div>

                    {selectedDispute.resolution.status === 'open' && (
                      <>
                        <Separator />
                        
                        <div className="space-y-3">
                          <h4 className="font-medium text-foreground">Resolve Dispute</h4>
                          
                          <Textarea
                            placeholder="Resolution notes and reasoning..."
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            rows={3}
                            data-testid="textarea-resolution-notes"
                          />
                          
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleResolveDispute(selectedDispute.parties.client.wallet, resolutionNotes)}
                              disabled={resolveDisputeMutation.isPending || !resolutionNotes.trim()}
                              data-testid="button-resolve-for-client"
                            >
                              Resolve for Client
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolveDispute(selectedDispute.parties.freelancer.wallet, resolutionNotes)}
                              disabled={resolveDisputeMutation.isPending || !resolutionNotes.trim()}
                              data-testid="button-resolve-for-freelancer"
                            >
                              Resolve for Freelancer
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    {selectedDispute.resolution.status === 'resolved' && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium text-foreground mb-2">Resolution</h4>
                          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <p className="text-sm text-green-700 dark:text-green-400 mb-1">
                              Resolved in favor of: {selectedDispute.resolution.winner?.slice(0, 6)}...{selectedDispute.resolution.winner?.slice(-4)}
                            </p>
                            {selectedDispute.resolution.reasoning && (
                              <p className="text-xs text-green-600 dark:text-green-300">
                                {selectedDispute.resolution.reasoning}
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card data-testid="card-no-dispute-selected">
                  <CardContent className="text-center py-8">
                    <Gavel className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-sm font-medium text-foreground mb-2">Select a Dispute</h3>
                    <p className="text-xs text-muted-foreground">
                      Choose a dispute from the list to view details and resolve
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <Card data-testid="card-projects-overview">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Briefcase className="w-5 h-5 mr-2" />
                Platform Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allProjects && allProjects.length > 0 ? (
                <div className="space-y-4">
                  {allProjects.slice(0, 10).map((project: ProjectData) => (
                    <div key={project.id} className="p-4 border border-border rounded-lg" data-testid={`project-admin-item-${project.id}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-foreground" data-testid={`text-project-admin-title-${project.id}`}>
                            {project.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">{project.category}</p>
                        </div>
                        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                          {project.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Budget:</span>
                          <span className="font-medium ml-1">${project.budget.total.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Applications:</span>
                          <span className="font-medium ml-1">{project.applications.count}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created:</span>
                          <span className="font-medium ml-1">
                            {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {allProjects.length > 10 && (
                    <div className="text-center pt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing 10 of {allProjects.length} projects
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No projects found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card data-testid="card-users-overview">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Platform Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allUsers && allUsers.length > 0 ? (
                <div className="space-y-4">
                  {allUsers.slice(0, 10).map((platformUser: AuthUser) => (
                    <div key={platformUser.id} className="p-4 border border-border rounded-lg" data-testid={`user-admin-item-${platformUser.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>{platformUser.username[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium text-foreground" data-testid={`text-user-admin-name-${platformUser.id}`}>
                              {platformUser.username}
                            </h4>
                            <p className="text-sm text-muted-foreground">{platformUser.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge variant={platformUser.role === 'admin' ? 'destructive' : 'secondary'}>
                            {platformUser.role}
                          </Badge>
                          {platformUser.isVerified && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Joined:</span>
                          <span className="font-medium ml-1">
                            {formatDistanceToNow(new Date(platformUser.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Active:</span>
                          <span className="font-medium ml-1">
                            {platformUser.lastLogin 
                              ? formatDistanceToNow(new Date(platformUser.lastLogin), { addSuffix: true })
                              : 'Never'
                            }
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <span className={`font-medium ml-1 ${platformUser.isActive ? 'text-green-600' : 'text-red-600'}`}>
                            {platformUser.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {allUsers.length > 10 && (
                    <div className="text-center pt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing 10 of {allUsers.length} users
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card data-testid="card-project-analytics">
              <CardHeader>
                <CardTitle>Project Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Success Rate</span>
                  <span className="font-bold text-green-600">
                    {platformStats.totalProjects > 0 
                      ? Math.round((platformStats.completedProjects / platformStats.totalProjects) * 100)
                      : 0
                    }%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Active Projects</span>
                  <span className="font-bold">{platformStats.activeProjects}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Dispute Rate</span>
                  <span className="font-bold text-red-600">
                    {platformStats.totalProjects > 0 
                      ? Math.round((platformStats.totalDisputes / platformStats.totalProjects) * 100)
                      : 0
                    }%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-platform-health">
              <CardHeader>
                <CardTitle>Platform Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Users</span>
                  <span className="font-bold">{platformStats.totalUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Open Disputes</span>
                  <span className="font-bold text-red-600">{platformStats.activeDisputes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Platform Status</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Operational
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
