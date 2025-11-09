import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePlatformSMSMonitoring() {
  // Fetch recent SMS delivery logs
  const { data: deliveryLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['platform-sms-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_sms_usage_logs')
        .select(`
          *,
          tenant:tenants(name)
        `)
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  // Fetch password delivery logs
  const { data: passwordLogs, isLoading: passwordLogsLoading } = useQuery({
    queryKey: ['platform-password-delivery-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('password_delivery_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  // Fetch SMS credit pool statistics (aggregate across all tenants)
  const { data: creditStats, isLoading: creditsLoading } = useQuery({
    queryKey: ['platform-sms-credit-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_sms_credit_pool')
        .select('total_credits, consumed_credits');

      if (error) throw error;

      const totalCredits = data.reduce((sum, pool) => sum + pool.total_credits, 0);
      const consumedCredits = data.reduce((sum, pool) => sum + pool.consumed_credits, 0);
      const remainingCredits = totalCredits - consumedCredits;

      return {
        totalCredits,
        consumedCredits,
        remainingCredits,
        utilizationRate: totalCredits > 0 ? (consumedCredits / totalCredits) * 100 : 0,
      };
    },
  });

  // Fetch provider health metrics
  const { data: providerHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['platform-sms-provider-health'],
    queryFn: async () => {
      const { data: providers, error: providerError } = await supabase
        .from('platform_sms_providers')
        .select('*')
        .order('created_at', { ascending: true });

      if (providerError) throw providerError;

      // Get recent logs for each provider to determine health
      const providersWithHealth = await Promise.all(
        providers.map(async (provider) => {
          const { data: recentLogs } = await supabase
            .from('tenant_sms_usage_logs')
            .select('status, sent_at')
            .eq('provider', provider.provider_type)
            .order('sent_at', { ascending: false })
            .limit(10);

          const successCount = recentLogs?.filter(log => log.status === 'sent').length || 0;
          const totalCount = recentLogs?.length || 0;
          const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;
          const lastUsed = recentLogs?.[0]?.sent_at || null;

          return {
            ...provider,
            successRate,
            lastUsed,
            recentMessageCount: totalCount,
          };
        })
      );

      return providersWithHealth;
    },
  });

  // Fetch today's SMS statistics
  const { data: todayStats, isLoading: todayLoading } = useQuery({
    queryKey: ['platform-sms-today-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('tenant_sms_usage_logs')
        .select('status, cost')
        .gte('sent_at', today.toISOString());

      if (error) throw error;

      const totalSent = data.filter(log => log.status === 'sent').length;
      const totalFailed = data.filter(log => log.status === 'failed').length;
      const totalCost = data.reduce((sum, log) => sum + (log.cost || 0), 0);

      return {
        totalSent,
        totalFailed,
        totalCost,
        successRate: totalSent + totalFailed > 0 ? (totalSent / (totalSent + totalFailed)) * 100 : 0,
      };
    },
  });

  // Fetch recent failures for alerts
  const { data: recentFailures, isLoading: failuresLoading } = useQuery({
    queryKey: ['platform-sms-recent-failures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_sms_usage_logs')
        .select(`
          *,
          tenant:tenants(name)
        `)
        .eq('status', 'failed')
        .order('failed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  return {
    deliveryLogs,
    passwordLogs,
    creditStats,
    providerHealth,
    todayStats,
    recentFailures,
    isLoading: logsLoading || passwordLogsLoading || creditsLoading || healthLoading || todayLoading || failuresLoading,
  };
}
