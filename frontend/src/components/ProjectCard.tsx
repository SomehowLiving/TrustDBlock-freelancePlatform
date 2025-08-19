import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ProjectData } from '@/types';
import { Clock, Users, Star, MapPin } from 'lucide-react';
import { Link } from 'wouter';
import { formatDistanceToNow } from 'date-fns';

interface ProjectCardProps {
  project: ProjectData;
  showActions?: boolean;
}

export function ProjectCard({ project, showActions = true }: ProjectCardProps) {
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

  const getUrgencyColor = (urgency?: string) => {
    if (urgency === 'high') return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
    if (urgency === 'medium') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
  };

  const formatBudget = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${amount}`;
  };

  const timeLeft = project.timeline.applicationDeadline 
    ? formatDistanceToNow(new Date(project.timeline.applicationDeadline), { addSuffix: true })
    : null;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 hover:border-primary/20" data-testid={`card-project-${project.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-3">
          <Badge className={getCategoryColor(project.category)} data-testid={`badge-category-${project.id}`}>
            {project.category}
          </Badge>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground" data-testid={`text-budget-${project.id}`}>
              {formatBudget(project.budget.total)}
            </div>
            {project.flags.isUrgent && (
              <Badge variant="destructive" className="text-xs" data-testid={`badge-urgent-${project.id}`}>
                Urgent
              </Badge>
            )}
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors" data-testid={`text-title-${project.id}`}>
          <Link href={`/projects/${project.id}`} className="hover:underline">
            {project.title}
          </Link>
        </h3>
        
        <p className="text-muted-foreground text-sm line-clamp-3 mb-3" data-testid={`text-description-${project.id}`}>
          {project.description}
        </p>
        
        {project.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {project.skills.slice(0, 4).map((skill, index) => (
              <Badge key={index} variant="secondary" className="text-xs" data-testid={`badge-skill-${project.id}-${index}`}>
                {skill}
              </Badge>
            ))}
            {project.skills.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{project.skills.length - 4} more
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div className="flex items-center space-x-4">
            {timeLeft && (
              <div className="flex items-center" data-testid={`text-deadline-${project.id}`}>
                <Clock className="w-4 h-4 mr-1" />
                <span>{timeLeft}</span>
              </div>
            )}
            <div className="flex items-center" data-testid={`text-proposals-${project.id}`}>
              <Users className="w-4 h-4 mr-1" />
              <span>{project.applications.count} proposals</span>
            </div>
          </div>
          {project.metadata?.difficulty && (
            <Badge variant="outline" className="text-xs" data-testid={`badge-difficulty-${project.id}`}>
              {project.metadata.difficulty}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {project.client?.username?.[0]?.toUpperCase() || 'C'}
            </div>
            <div>
              <span className="text-sm font-medium text-foreground" data-testid={`text-client-${project.id}`}>
                {project.client?.username || 'Anonymous Client'}
              </span>
              {project.client?.reputation && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                  <span>{project.client.reputation.averageRating.toFixed(1)}</span>
                  <span className="ml-1">({project.client.reputation.totalRatings} reviews)</span>
                </div>
              )}
            </div>
          </div>
          
          {showActions && (
            <Button size="sm" asChild data-testid={`button-apply-${project.id}`}>
              <Link href={`/projects/${project.id}`}>
                View Details
              </Link>
            </Button>
          )}
        </div>
      </CardContent>

      {project.flags.isFeatured && (
        <CardFooter className="pt-0">
          <div className="w-full p-2 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-center space-x-2 text-primary">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">Featured Project</span>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
