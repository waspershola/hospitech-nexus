import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle2, DollarSign, UserCheck, Clock, 
  AlertCircle, Shield, ShieldAlert, Loader2 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Activity {
  id: string;
  action_type: string;
  amount?: number;
  payment_method?: string;
  metadata?: Record<string, any>;
  created_at: string;
  staff?: { full_name: string; email: string };
  provider?: { name: string };
  location?: { name: string };
}

interface RequestActivityTimelineProps {
  requestId: string;
  activities?: Activity[];
  isLoading?: boolean;
}

export function RequestActivityTimeline({ requestId, activities = [], isLoading = false }: RequestActivityTimelineProps) {
  const getActionIcon = (actionType: string) => {
    const icons: Record<string, any> = {
      assigned: UserCheck,
      started_handling: Clock,
      payment_collected: DollarSign,
      charged_to_folio: DollarSign,
      complimentary: CheckCircle2,
      status_changed: AlertCircle,
      completed: CheckCircle2,
      phone_verified: Shield,
      phone_mismatch: ShieldAlert,
    };
    return icons[actionType] || AlertCircle;
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      assigned: 'Assigned to staff',
      started_handling: 'Started handling',
      payment_collected: 'Payment collected',
      charged_to_folio: 'Charged to folio',
      complimentary: 'Marked complimentary',
      status_changed: 'Status changed',
      completed: 'Completed',
      phone_verified: 'Guest phone verified',
      phone_mismatch: 'Phone verification failed',
    };
    return labels[actionType] || actionType;
  };

  const getActionColor = (actionType: string) => {
    if (actionType === 'phone_mismatch') return 'destructive';
    if (actionType === 'phone_verified') return 'default';
    if (actionType === 'completed' || actionType === 'payment_collected') return 'default';
    return 'secondary';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 text-sm">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => {
        const Icon = getActionIcon(activity.action_type);
        
        return (
          <div key={activity.id}>
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-muted p-2">
                  <Icon className="h-4 w-4" />
                </div>
                {index < activities.length - 1 && (
                  <div className="w-px h-full bg-border mt-2" />
                )}
              </div>
              
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {getActionLabel(activity.action_type)}
                    </p>
                    {activity.staff && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        by {activity.staff.full_name}
                      </p>
                    )}
                    
                    {activity.amount && (
                      <p className="text-sm font-semibold text-primary mt-1">
                        ₦{activity.amount.toLocaleString()}
                      </p>
                    )}
                    
                    {activity.payment_method && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {activity.payment_method}
                        </Badge>
                        {activity.location && (
                          <Badge variant="outline" className="text-xs">
                            {activity.location.name}
                          </Badge>
                        )}
                        {activity.provider && (
                          <Badge variant="outline" className="text-xs">
                            {activity.provider.name}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {activity.metadata?.reason && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{activity.metadata.reason}"
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={getActionColor(activity.action_type) as any} className="text-xs">
                      {getActionLabel(activity.action_type)}
                    </Badge>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {index < activities.length - 1 && <Separator className="my-2" />}
          </div>
        );
      })}
    </div>
  );
}
