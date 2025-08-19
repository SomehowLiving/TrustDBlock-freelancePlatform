import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MilestoneData } from '@/types';
import { Calendar, CheckCircle, Clock, DollarSign, AlertCircle, FileText } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface MilestoneCardProps {
  milestone: MilestoneData;
  userRole?: 'client' | 'freelancer' | 'admin';
  onStatusChange?: (milestoneId: string, newStatus: string, updates?: any) => void;
}

export function MilestoneCard({ milestone, userRole, onStatusChange }: MilestoneCardProps) {
  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
      'submitted': 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      'approved': 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      'paid': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
      'disputed': 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      'cancelled': 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getProgressValue = () => {
    switch (milestone.status) {
      case 'pending': return 0;
      case 'submitted': return 50;
      case 'approved': return 75;
      case 'paid': return 100;
      case 'disputed': return 25;
      default: return 0;
    }
  };

  const isOverdue = new Date() > new Date(milestone.timeline.deadline) && 
                   milestone.status === 'pending';

  const deadlineText = formatDistanceToNow(new Date(milestone.timeline.deadline), { addSuffix: true });

  const handleSubmit = () => {
    onStatusChange?.(milestone.id, 'submitted', {
      submission: {
        submittedAt: new Date().toISOString(),
        notes: 'Milestone completed and submitted for review'
      }
    });
  };

  const handleApprove = () => {
    onStatusChange?.(milestone.id, 'approved', {
      approval: {
        approvedBy: 'client',
        approvedAt: new Date().toISOString(),
        feedback: 'Work approved'
      }
    });
  };

  const handleReject = () => {
    onStatusChange?.(milestone.id, 'pending', {
      approval: {
        feedback: 'Work needs revision'
      }
    });
  };

  return (
    <Card className="hover:shadow-md transition-all duration-300" data-testid={`card-milestone-${milestone.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(milestone.status)} data-testid={`badge-status-${milestone.id}`}>
              {milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive" className="text-xs" data-testid={`badge-overdue-${milestone.id}`}>
                <AlertCircle className="w-3 h-3 mr-1" />
                Overdue
              </Badge>
            )}
            {milestone.dispute.raised && (
              <Badge variant="destructive" className="text-xs" data-testid={`badge-disputed-${milestone.id}`}>
                Disputed
              </Badge>
            )}
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-foreground" data-testid={`text-amount-${milestone.id}`}>
              ${milestone.details.amount.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Milestone {milestone.details.order}
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-2" data-testid={`text-title-${milestone.id}`}>
          {milestone.details.title}
        </h3>

        <p className="text-sm text-muted-foreground mb-3" data-testid={`text-description-${milestone.id}`}>
          {milestone.details.description}
        </p>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{getProgressValue()}%</span>
          </div>
          <Progress value={getProgressValue()} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Timeline Info */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-muted-foreground">
              <Calendar className="w-4 h-4 mr-1" />
              <span>Due {deadlineText}</span>
            </div>
            {milestone.timeline.submissionTime && (
              <div className="flex items-center text-muted-foreground">
                <Clock className="w-4 h-4 mr-1" />
                <span>Submitted {formatDistanceToNow(new Date(milestone.timeline.submissionTime), { addSuffix: true })}</span>
              </div>
            )}
          </div>

          {/* Submission Details */}
          {milestone.submission?.notes && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center text-sm font-medium text-foreground mb-1">
                <FileText className="w-4 h-4 mr-1" />
                Submission Notes
              </div>
              <p className="text-sm text-muted-foreground">{milestone.submission.notes}</p>
            </div>
          )}

          {/* Approval Feedback */}
          {milestone.approval?.feedback && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                <CheckCircle className="w-4 h-4 mr-1" />
                Client Feedback
              </div>
              <p className="text-sm text-green-600 dark:text-green-300">{milestone.approval.feedback}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            {userRole === 'freelancer' && milestone.status === 'pending' && (
              <Button 
                size="sm" 
                onClick={handleSubmit}
                data-testid={`button-submit-${milestone.id}`}
              >
                Submit Milestone
              </Button>
            )}
            
            {userRole === 'client' && milestone.status === 'submitted' && (
              <>
                <Button 
                  size="sm" 
                  onClick={handleApprove}
                  data-testid={`button-approve-${milestone.id}`}
                >
                  Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleReject}
                  data-testid={`button-reject-${milestone.id}`}
                >
                  Request Changes
                </Button>
              </>
            )}

            {milestone.status === 'approved' && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <DollarSign className="w-3 h-3 mr-1" />
                Payment Released
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
