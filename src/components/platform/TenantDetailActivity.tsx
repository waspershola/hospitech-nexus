import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Clock } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface TenantDetailActivityProps {
  tenantId: string;
}

export default function TenantDetailActivity({ tenantId }: TenantDetailActivityProps) {
  const [actionFilter, setActionFilter] = useState<string>('all');

  const { data: activities, isLoading } = useQuery({
    queryKey: ['tenant-activity', tenantId, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('platform_audit_stream')
        .select('*')
        .eq('resource_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch actor emails separately
      const activitiesWithActors = await Promise.all(
        (data || []).map(async (activity) => {
          if (activity.actor_id) {
            const { data: actorData } = await supabase
              .from('platform_users')
              .select('email')
              .eq('id', activity.actor_id)
              .maybeSingle();
            
            return { ...activity, actor: actorData };
          }
          return { ...activity, actor: null };
        })
      );

      return activitiesWithActors;
    }
  });

  const exportToCSV = () => {
    if (!activities || activities.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'Action', 'Actor', 'Details'];
    const rows = activities.map(activity => [
      new Date(activity.created_at).toLocaleString(),
      activity.action,
      activity.actor?.email || 'System',
      JSON.stringify(activity.payload || {})
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenant-activity-${tenantId}-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Activity log exported');
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
      tenant_created: 'default',
      tenant_suspended: 'destructive',
      tenant_activated: 'default',
      assign_plan: 'secondary',
      reset_user_password: 'outline',
    };
    return <Badge variant={variants[action] || 'outline'}>{action.replace(/_/g, ' ')}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>All actions performed on this tenant</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="tenant_suspended">Suspended</SelectItem>
                <SelectItem value="tenant_activated">Activated</SelectItem>
                <SelectItem value="assign_plan">Plan Changes</SelectItem>
                <SelectItem value="reset_user_password">Password Resets</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!activities || activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activity recorded yet
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div 
                key={activity.id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {getActionBadge(activity.action)}
                    <span className="text-sm text-muted-foreground">
                      by {activity.actor?.email || 'System'}
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {activity.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  {activity.payload && Object.keys(activity.payload).length > 0 && (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded mt-2">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(activity.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
