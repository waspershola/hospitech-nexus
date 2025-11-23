import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Clock, User, DollarSign, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityTimelineProps {
  requestId: string;
  tenantId: string;
}

interface ActivityLog {
  id: string;
  action_type: string;
  amount: number | null;
  payment_method: string | null;
  created_at: string;
  metadata: any;
  staff: {
    full_name: string;
    role: string;
  } | null;
}

const ACTION_ICONS: Record<string, any> = {
  assigned: User,
  started_handling: Clock,
  payment_collected: DollarSign,
  charged_to_folio: FileText,
  complimentary: CheckCircle,
  status_changed: AlertCircle,
  completed: CheckCircle,
};

const ACTION_LABELS: Record<string, string> = {
  assigned: 'Assigned to staff',
  started_handling: 'Started handling',
  payment_collected: 'Payment collected',
  charged_to_folio: 'Charged to folio',
  complimentary: 'Marked complimentary',
  status_changed: 'Status changed',
  completed: 'Completed',
};

export function ActivityTimeline({ requestId, tenantId }: ActivityTimelineProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['request-activity-log', requestId, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_request_activity_log', {
          p_request_id: requestId,
          p_tenant_id: tenantId,
        });

      if (error) throw error;
      return (data || []) as ActivityLog[];
    },
    enabled: !!requestId && !!tenantId,
  });

  if (isLoading) {
    return (
      <Card className="p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">No activity logged yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-4">Activity Timeline</h3>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = ACTION_ICONS[activity.action_type] || AlertCircle;
          const label = ACTION_LABELS[activity.action_type] || activity.action_type;
          
          return (
            <div key={activity.id} className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">
                  by {activity.staff?.full_name || 'System'} · {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
                {activity.amount && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Amount: ₦{activity.amount.toLocaleString()}
                  </p>
                )}
                {activity.payment_method && (
                  <p className="text-xs text-muted-foreground">
                    Method: {activity.payment_method}
                  </p>
                )}
                {activity.metadata?.note && (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    "{activity.metadata.note}"
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
