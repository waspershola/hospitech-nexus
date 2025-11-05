import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, format } from 'date-fns';

export function useSMSAnalytics(days = 30) {
  const { tenantId } = useAuth();

  const startDate = subDays(new Date(), days);

  // Get usage logs
  const { data: usageLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['sms-usage-logs', tenantId, days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_sms_usage_logs')
        .select('*')
        .eq('tenant_id', tenantId!)
        .gte('sent_at', startDate.toISOString())
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Calculate summary statistics
  const analytics = usageLogs ? {
    totalSent: usageLogs.length,
    delivered: usageLogs.filter(log => log.status === 'delivered').length,
    failed: usageLogs.filter(log => log.status === 'failed').length,
    pending: usageLogs.filter(log => log.status === 'sent').length,
    totalCost: usageLogs.reduce((sum, log) => sum + Number(log.cost), 0),
    totalSegments: usageLogs.reduce((sum, log) => sum + log.segments, 0),
    deliveryRate: usageLogs.length > 0 
      ? (usageLogs.filter(log => log.status === 'delivered').length / usageLogs.length) * 100 
      : 0,
    
    // Group by event type
    byEventType: usageLogs.reduce((acc, log) => {
      if (!acc[log.event_key]) {
        acc[log.event_key] = {
          count: 0,
          cost: 0,
          delivered: 0,
          failed: 0,
        };
      }
      acc[log.event_key].count++;
      acc[log.event_key].cost += Number(log.cost);
      if (log.status === 'delivered') acc[log.event_key].delivered++;
      if (log.status === 'failed') acc[log.event_key].failed++;
      return acc;
    }, {} as Record<string, { count: number; cost: number; delivered: number; failed: number }>),

    // Group by date for trend chart
    byDate: usageLogs.reduce((acc, log) => {
      const date = format(new Date(log.sent_at), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = {
          sent: 0,
          delivered: 0,
          failed: 0,
          cost: 0,
        };
      }
      acc[date].sent++;
      if (log.status === 'delivered') acc[date].delivered++;
      if (log.status === 'failed') acc[date].failed++;
      acc[date].cost += Number(log.cost);
      return acc;
    }, {} as Record<string, { sent: number; delivered: number; failed: number; cost: number }>),

    // Recent logs for display
    recentLogs: usageLogs.slice(0, 10),
  } : null;

  return {
    analytics,
    usageLogs,
    isLoading: logsLoading,
  };
}
