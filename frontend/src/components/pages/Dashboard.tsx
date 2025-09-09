import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import  {useAuthStore}  from '@store/authStore';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  Briefcase, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Star,
  Users,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Plus,
  Eye,
  Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuthStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const recentNotifications = notifications?.slice(0, 5) || [];
  const unreadCount = notifications?.filter((n: any) => !n.status.read).length || 0;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="dashboard-loading">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="grid md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isClient = user?.role === 'client';
  const isFreelancer = user?.role === 'freelancer';

  return (
    <div className="container mx-auto px-4 py-8 space-y-8" data-testid="dashboard-container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-dashboard-title">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
            {isClient ? 'Manage your projects and find the best talent' : 'Track your projects and discover new opportunities'}
          </p>
        </div>
        <Button asChild data-testid="button-create-project">
          <Link href={isClient ? "/projects/new" : "/projects"}>
            <Plus className="w-4 h-4 mr-2" />
            {isClient ? 'Post Project' : 'Browse Projects'}
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isClient ? (
          <>
            <Card data-testid="card-stat-total-projects">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-projects">{stats?.totalProjects || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Projects posted
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-active-projects">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-projects">{stats?.activeProjects || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Currently in progress
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-completed-projects">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-completed-projects">{stats?.completedProjects || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Successfully finished
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-total-spent">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-spent">${stats?.totalSpent?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Investment in talent
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card data-testid="card-stat-applications">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Applications</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-applications">{stats?.totalApplications || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Total submitted
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-active-projects-freelancer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-projects-freelancer">{stats?.activeProjects || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Currently working on
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-total-earned">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-earned">${stats?.totalEarned?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Lifetime earnings
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-pending-milestones">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Milestones</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-pending-milestones">{stats?.pendingMilestones || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting submission
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <Card data-testid="card-recent-projects">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Recent Projects</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/projects">
                    <Eye className="w-4 h-4 mr-2" />
                    View All
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stats?.projects && stats.projects.length > 0 ? (
                <div className="space-y-4">
                  {stats.projects.map((project: any) => (
                    <div 
                      key={project.id}
                      className="p-4 border border-border rounded-lg hover:border-primary/30 transition-colors"
                      data-testid={`project-item-${project.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-foreground" data-testid={`text-project-title-${project.id}`}>
                            <Link href={`/projects/${project.id}`} className="hover:text-primary">
                              {project.title}
                            </Link>
                          </h4>
                          <p className="text-sm text-muted-foreground">{project.category}</p>
                        </div>
                        <Badge 
                          variant={project.status === 'active' ? 'default' : 'secondary'}
                          data-testid={`badge-project-status-${project.id}`}
                        >
                          {project.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Budget: <span className="font-medium text-foreground">${project.budget.total.toLocaleString()}</span>
                        </span>
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                        </span>
                      </div>

                      {project.milestones && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{Math.round((project.milestones.completed / project.milestones.expected) * 100)}%</span>
                          </div>
                          <Progress value={(project.milestones.completed / project.milestones.expected) * 100} className="h-2" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8" data-testid="text-no-projects">
                  <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No projects yet</p>
                  <Button asChild className="mt-4">
                    <Link href={isClient ? "/projects/new" : "/projects"}>
                      {isClient ? 'Post Your First Project' : 'Find Projects'}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Reputation Card (for freelancers) */}
          {isFreelancer && stats?.reputation && (
            <Card data-testid="card-reputation">
              <CardHeader>
                <CardTitle className="text-lg">Reputation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Rating</span>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium" data-testid="text-average-rating">
                      {stats.reputation.averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <span className="font-medium text-green-600" data-testid="text-success-rate">
                    {stats.reputation.successRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Projects Completed</span>
                  <span className="font-medium" data-testid="text-projects-completed">
                    {stats.reputation.completedProjects}
                  </span>
                </div>
                {stats.reputation.badges.length > 0 && (
                  <div className="pt-2 border-t">
                    <span className="text-sm text-muted-foreground block mb-2">Achievement Badges</span>
                    <div className="flex flex-wrap gap-1">
                      {stats.reputation.badges.map((badge: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs" data-testid={`badge-achievement-${index}`}>
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notifications */}
          <Card data-testid="card-notifications">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Notifications</CardTitle>
                {unreadCount > 0 && (
                  <Badge variant="destructive" data-testid="badge-unread-count">
                    {unreadCount}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {recentNotifications.length > 0 ? (
                <div className="space-y-3">
                  {recentNotifications.map((notification: any) => (
                    <div 
                      key={notification.id}
                      className={`p-3 rounded-lg ${notification.status.read ? 'bg-muted/50' : 'bg-accent/50'}`}
                      data-testid={`notification-item-${notification.id}`}
                    >
                      <div className="flex items-start space-x-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground" data-testid={`text-notification-title-${notification.id}`}>
                            {notification.data.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate" data-testid={`text-notification-message-${notification.id}`}>
                            {notification.data.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4" data-testid="text-no-notifications">
                  <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card data-testid="card-quick-actions">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start" data-testid="button-view-messages">
                <Link href="/messages">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  View Messages
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full justify-start" data-testid="button-edit-profile">
                <Link href="/profile">
                  <Users className="w-4 h-4 mr-2" />
                  Edit Profile
                </Link>
              </Button>
              
              {isFreelancer && (
                <Button variant="outline" asChild className="w-full justify-start" data-testid="button-browse-projects">
                  <Link href="/projects">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Browse Projects
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
