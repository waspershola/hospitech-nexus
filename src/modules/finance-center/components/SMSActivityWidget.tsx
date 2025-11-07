import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { MessageSquare, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SMSLog {
  id: string;
  event_key: string;
  recipient: string;
  status: string;
  cost: number;
  sent_at: string;
  message_preview: string;
  provider: string;
}

export function SMSActivityWidget() {
  const { tenantId } = useAuth();

  // Fetch recent SMS logs
  const { data: recentLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['sms-recent-logs', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('tenant_sms_usage_logs')
        .select('id, event_key, recipient, status, cost, sent_at, message_preview, provider')
        .eq('tenant_id', tenantId)
        .order('sent_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as SMSLog[];
    },
    enabled: !!tenantId,
  });

  // Fetch today's stats
  const { data: todayStats } = useQuery({
    queryKey: ['sms-today-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('tenant_sms_usage_logs')
        .select('id, status, cost')
        .eq('tenant_id', tenantId)
        .gte('sent_at', today.toISOString());
      
      if (error) throw error;
      
      const total = data.length;
      const sent = data.filter(log => log.status === 'sent').length;
      const failed = data.filter(log => log.status === 'failed').length;
      const creditsUsed = data.reduce((sum, log) => sum + (log.cost || 0), 0);
      
      return { total, sent, failed, creditsUsed };
    },
    enabled: !!tenantId,
  });

  // Fetch remaining credits
  const { data: creditPool } = useQuery({
    queryKey: ['sms-credits', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('platform_sms_credit_pool')
        .select('total_credits, consumed_credits')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const getEventBadgeVariant = (eventKey: string) => {
    switch (eventKey) {
      case 'checkin_confirmation':
        return 'default';
      case 'checkout_confirmation':
        return 'secondary';
      case 'payment_reminder':
        return 'destructive';
      case 'payment_confirmation':
        return 'default';
      case 'checkin_reminder':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getEventLabel = (eventKey: string) => {
    const labels: Record<string, string> = {
      checkin_confirmation: 'Check-In',
      checkout_confirmation: 'Check-Out',
      payment_reminder: 'Payment Reminder',
      payment_confirmation: 'Payment Receipt',
      checkin_reminder: 'Check-In Reminder',
      manual: 'Manual Send',
    };
    return labels[eventKey] || eventKey;
  };

  const remainingCredits = creditPool 
    ? creditPool.total_credits - creditPool.consumed_credits 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          SMS Activity
        </CardTitle>
        <CardDescription>
          Recent SMS notifications and usage statistics
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Today's Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-2xl font-bold">{todayStats?.total || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              Sent
            </p>
            <p className="text-2xl font-bold text-green-600">{todayStats?.sent || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-red-600" />
              Failed
            </p>
            <p className="text-2xl font-bold text-red-600">{todayStats?.failed || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Credits
            </p>
            <p className="text-2xl font-bold">{remainingCredits}</p>
            <p className="text-xs text-muted-foreground">remaining</p>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Recent Activity */}
        <div>
          <h4 className="text-sm font-medium mb-3">Recent Activity</h4>
          <ScrollArea className="h-[300px]">
            {logsLoading ? (
              <div className="text-center text-muted-foreground py-8">
                Loading activity...
              </div>
            ) : !recentLogs || recentLogs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No SMS activity yet
              </div>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getEventBadgeVariant(log.event_key)}>
                          {getEventLabel(log.event_key)}
                        </Badge>
                        <Badge 
                          variant={log.status === 'sent' ? 'default' : 'destructive'}
                          className={log.status === 'sent' ? 'bg-green-600' : ''}
                        >
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        To: {log.recipient}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {log.message_preview}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.sent_at), 'MMM d, HH:mm')}
                      </p>
                      <p className="text-xs font-medium">
                        {log.cost} {log.cost === 1 ? 'credit' : 'credits'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
