import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Star, 
  Clock, 
  Tag,
  MapPin,
  ExternalLink,
  Send,
  FileText,
  AlertCircle,
  CheckCircle,
  MessageCircle
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationData, setApplicationData] = useState({
    coverLetter: '',
    proposedBudget: '',
    proposedTimeline: ''
  });

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['/api/projects', id],
    enabled: !!id,
  });

  const { data: applications } = useQuery({
    queryKey: ['/api/projects', id, 'applications'],
    enabled: !!id && project?.clientAddress?.toLowerCase() === user?.address?.toLowerCase(),
  });

  const { data: milestones } = useQuery({
    queryKey: ['/api/projects', id, 'milestones'],
    enabled: !!id && (project?.status === 'active' || project?.status === 'completed'),
  });

  const applicationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `/api/projects/${id}/applications`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id] });
      setShowApplicationForm(false);
      setApplicationData({ coverLetter: '', proposedBudget: '', proposedTimeline: '' });
      toast({
        title: "Application Submitted",
        description: "Your application has been sent to the client.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Application Failed",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    },
  });

  const handleApplyToProject = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please connect your wallet to apply for this project.",
        variant: "destructive",
      });
      return;
    }

    if (user?.role !== 'freelancer') {
      toast({
        title: "Freelancer Account Required",
        description: "Only freelancers can apply to projects.",
        variant: "destructive",
      });
      return;
    }

    setShowApplicationForm(true);
  };

  const handleSubmitApplication = () => {
    if (!applicationData.coverLetter.trim()) {
      toast({
        title: "Cover Letter Required",
        description: "Please write a cover letter for your application.",
        variant: "destructive",
      });
      return;
    }

    applicationMutation.mutate({
      proposal: {
        coverLetter: applicationData.coverLetter,
        proposedBudget: applicationData.proposedBudget ? Number(applicationData.proposedBudget) : undefined,
        proposedTimeline: applicationData.proposedTimeline ? Number(applicationData.proposedTimeline) : undefined,
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="project-details-loading">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-5/6"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-16 bg-muted rounded"></div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Project Not Found</h3>
            <p className="text-muted-foreground mb-6">
              The project you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/projects">Browse Projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isClient = project.clientAddress?.toLowerCase() === user?.address?.toLowerCase();
  const isFreelancer = project.freelancerAddress?.toLowerCase() === user?.address?.toLowerCase();
  const hasApplied = applications?.some((app: any) => 
    app.freelancerAddress?.toLowerCase() === user?.address?.toLowerCase()
  );
  const canApply = isAuthenticated && 
                   user?.role === 'freelancer' && 
                   !isClient && 
                   !isFreelancer && 
                   !hasApplied && 
                   (project.status === 'open' || project.status === 'created');

  const getCategoryColor = (category: string) => {
    const colors = {
      'Development': 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      'Design': 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
      'Marketing': 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      'Writing': 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
      'Consulting': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
      'Other': 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
    };
    return colors[category as keyof typeof colors] || colors.Other;
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8" data-testid="project-details-container">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge className={getCategoryColor(project.category)} data-testid="badge-project-category">
              {project.category}
            </Badge>
            <Badge variant={project.status === 'open' ? 'default' : 'secondary'} data-testid="badge-project-status">
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </Badge>
            {project.flags.isFeatured && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-700" data-testid="badge-featured">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
            {project.flags.isUrgent && (
              <Badge variant="destructive" data-testid="badge-urgent">
                Urgent
              </Badge>
            )}
          </div>
          
          {(isClient || isFreelancer) && (
            <Button asChild data-testid="button-manage-project">
              <Link href={`/dashboard`}>
                Manage Project
              </Link>
            </Button>
          )}
        </div>

        <h1 className="text-4xl font-bold text-foreground" data-testid="text-project-title">
          {project.title}
        </h1>
        
        <div className="flex items-center space-x-6 text-muted-foreground">
          <div className="flex items-center" data-testid="text-budget">
            <DollarSign className="w-4 h-4 mr-1" />
            <span className="font-semibold text-foreground">${project.budget.total.toLocaleString()}</span>
            <span className="ml-1">({project.budget.type})</span>
          </div>
          <div className="flex items-center" data-testid="text-deadline">
            <Calendar className="w-4 h-4 mr-1" />
            <span>Due {formatDistanceToNow(new Date(project.timeline.deadline), { addSuffix: true })}</span>
          </div>
          <div className="flex items-center" data-testid="text-applications">
            <Users className="w-4 h-4 mr-1" />
            <span>{project.applications.count} applications</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card data-testid="card-project-description">
            <CardHeader>
              <CardTitle>Project Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-foreground whitespace-pre-wrap" data-testid="text-project-description">
                  {project.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Skills Required */}
          {project.skills.length > 0 && (
            <Card data-testid="card-skills-required">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Tag className="w-5 h-5 mr-2" />
                  Skills Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" data-testid={`badge-skill-${index}`}>
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Requirements */}
          {project.requirements && (
            <Card data-testid="card-requirements">
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.requirements.experience && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Experience Level</h4>
                    <p className="text-muted-foreground" data-testid="text-experience-level">
                      {project.requirements.experience}
                    </p>
                  </div>
                )}
                {project.requirements.deliverables && project.requirements.deliverables.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Deliverables</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {project.requirements.deliverables.map((deliverable, index) => (
                        <li key={index} data-testid={`text-deliverable-${index}`}>
                          {deliverable}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Milestones (if project is active) */}
          {milestones && milestones.length > 0 && (
            <Card data-testid="card-milestones">
              <CardHeader>
                <CardTitle>Project Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {milestones.map((milestone: any, index: number) => (
                    <div key={milestone.id} className="flex items-center space-x-4 p-3 border border-border rounded-lg" data-testid={`milestone-${index}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        milestone.status === 'completed' ? 'bg-green-100 text-green-600' :
                        milestone.status === 'active' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {milestone.status === 'completed' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground" data-testid={`text-milestone-title-${index}`}>
                          {milestone.details.title}
                        </h4>
                        <p className="text-sm text-muted-foreground" data-testid={`text-milestone-amount-${index}`}>
                          ${milestone.details.amount.toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={milestone.status === 'completed' ? 'default' : 'secondary'}>
                        {milestone.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Application Form */}
          {showApplicationForm && (
            <Card data-testid="card-application-form">
              <CardHeader>
                <CardTitle>Submit Application</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Cover Letter *</label>
                  <Textarea
                    placeholder="Explain why you're the perfect fit for this project..."
                    value={applicationData.coverLetter}
                    onChange={(e) => setApplicationData({ ...applicationData, coverLetter: e.target.value })}
                    className="mt-1"
                    rows={5}
                    data-testid="textarea-cover-letter"
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Proposed Budget ($)</label>
                    <Input
                      type="number"
                      placeholder="Your budget proposal"
                      value={applicationData.proposedBudget}
                      onChange={(e) => setApplicationData({ ...applicationData, proposedBudget: e.target.value })}
                      className="mt-1"
                      data-testid="input-proposed-budget"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-foreground">Timeline (days)</label>
                    <Input
                      type="number"
                      placeholder="Estimated days to complete"
                      value={applicationData.proposedTimeline}
                      onChange={(e) => setApplicationData({ ...applicationData, proposedTimeline: e.target.value })}
                      className="mt-1"
                      data-testid="input-proposed-timeline"
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button 
                    onClick={handleSubmitApplication}
                    disabled={applicationMutation.isPending}
                    data-testid="button-submit-application"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {applicationMutation.isPending ? 'Submitting...' : 'Submit Application'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowApplicationForm(false)}
                    data-testid="button-cancel-application"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Information */}
          <Card data-testid="card-client-info">
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback>
                    {project.client?.username?.[0]?.toUpperCase() || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium text-foreground" data-testid="text-client-name">
                    {project.client?.username || 'Anonymous Client'}
                  </h4>
                  <p className="text-sm text-muted-foreground">Client</p>
                </div>
              </div>

              {project.client?.reputation && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rating</span>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
                      <span className="font-medium" data-testid="text-client-rating">
                        {project.client.reputation.averageRating.toFixed(1)}
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">
                        ({project.client.reputation.totalRatings} reviews)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Projects Posted</span>
                    <span className="font-medium" data-testid="text-client-projects">
                      {project.client.reputation.totalProjects}
                    </span>
                  </div>
                </div>
              )}

              {isClient && (
                <Button asChild className="w-full" data-testid="button-manage-applications">
                  <Link href={`/projects/${project.id}/applications`}>
                    <Users className="w-4 h-4 mr-2" />
                    Manage Applications ({project.applications.count})
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Project Details */}
          <Card data-testid="card-project-details">
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Posted</span>
                <span className="text-sm font-medium" data-testid="text-posted-date">
                  {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Deadline</span>
                <span className="text-sm font-medium" data-testid="text-project-deadline">
                  {format(new Date(project.timeline.deadline), 'MMM dd, yyyy')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Milestones</span>
                <span className="text-sm font-medium" data-testid="text-milestone-count">
                  {project.milestones.expected}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Applications</span>
                <span className="text-sm font-medium" data-testid="text-application-count">
                  {project.applications.count}
                </span>
              </div>

              {project.metadata?.difficulty && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Difficulty</span>
                  <Badge variant="outline" className="text-xs" data-testid="badge-project-difficulty">
                    {project.metadata.difficulty}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            {canApply && (
              <Button 
                onClick={handleApplyToProject}
                className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
                data-testid="button-apply-to-project"
              >
                <Send className="w-4 h-4 mr-2" />
                Apply to Project
              </Button>
            )}

            {hasApplied && (
              <Button variant="outline" className="w-full" disabled data-testid="button-application-submitted">
                <CheckCircle className="w-4 h-4 mr-2" />
                Application Submitted
              </Button>
            )}

            {(isClient || isFreelancer) && (
              <Button asChild className="w-full" data-testid="button-project-communication">
                <Link href="/messages">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Project Communication
                </Link>
              </Button>
            )}

            <Button variant="outline" asChild className="w-full" data-testid="button-share-project">
              <Link href={`/projects`}>
                Browse More Projects
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
