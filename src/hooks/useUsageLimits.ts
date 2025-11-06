import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UsageLimit {
  usageType: string;
  usageName: string;
  currentUsage: number;
  limit: number;
  percentage: number;
  warningLevel: 'low' | 'medium' | 'high' | 'critical';
  overageRate?: number;
}

export function useUsageLimits(tenantId?: string) {
  // Fetch current subscription and plan
  const { data: subscription } = useQuery({
    queryKey: ['tenant-subscription', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('tenant_subscriptions')
        .select('*, platform_plans(*)')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch current month's usage
  const { data: usageRecords, isLoading } = useQuery({
    queryKey: ['usage-limits', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('platform_usage_records')
        .select('usage_type, quantity')
        .eq('tenant_id', tenantId)
        .gte('period_start', startOfMonth.toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Calculate usage limits
  const limits: UsageLimit[] = [];
  const warnings: UsageLimit[] = [];

  if (subscription?.platform_plans && usageRecords) {
    const plan = subscription.platform_plans as any;
    
    if (!plan.limits) {
      return {
        limits,
        warnings,
        hasExceededLimits: false,
        hasWarnings: false,
        isLoading,
        plan: subscription?.platform_plans,
      };
    }
    // Aggregate usage by type
    const usage: Record<string, number> = {};
    usageRecords.forEach((record) => {
      usage[record.usage_type] = (usage[record.usage_type] || 0) + Number(record.quantity);
    });

    // Define limits to check
    const limitsToCheck = [
      { key: 'sms_sent', name: 'SMS Messages', limit: plan.limits?.sms_sent },
      { key: 'storage_used', name: 'Storage (GB)', limit: plan.limits?.storage_used },
      { key: 'api_calls', name: 'API Calls', limit: plan.limits?.api_calls },
      { key: 'users_active', name: 'Active Users', limit: plan.limits?.users_active },
      { key: 'bookings_created', name: 'Bookings', limit: plan.limits?.bookings_created },
    ];

    limitsToCheck.forEach((item) => {
      if (!item.limit) return;

      const currentUsage = usage[item.key] || 0;
      const percentage = (currentUsage / item.limit) * 100;

      let warningLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (percentage >= 100) {
        warningLevel = 'critical';
      } else if (percentage >= 90) {
        warningLevel = 'high';
      } else if (percentage >= 80) {
        warningLevel = 'medium';
      }

      limits.push({
        usageType: item.key,
        usageName: item.name,
        currentUsage,
        limit: item.limit,
        percentage: Math.round(percentage),
        warningLevel,
        overageRate: plan.overage_rates?.[item.key],
      });
    });
  }

  // Filter warnings after limits are calculated
  warnings.push(...limits.filter((limit) => limit.percentage >= 80));

  // Check if any limits exceeded
  const hasExceededLimits = limits.some((limit) => limit.percentage >= 100);
  const hasWarnings = warnings.length > 0;

  return {
    limits,
    warnings,
    hasExceededLimits,
    hasWarnings,
    isLoading,
    plan: subscription?.platform_plans,
  };
}
