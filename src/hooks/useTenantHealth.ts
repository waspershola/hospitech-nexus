import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TenantHealthScore {
  tenant_id: string;
  tenant_name: string;
  overall_score: number;
  payment_score: number;
  usage_score: number;
  engagement_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  recommendations: string[];
}

export interface HealthSummary {
  total_tenants: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export function useTenantHealth(tenantId?: string) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-health', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculate-tenant-health', {
        body: tenantId ? { tenant_id: tenantId } : {},
      });

      if (error) throw error;
      return data as {
        success: boolean;
        health_scores: TenantHealthScore[];
        summary: HealthSummary;
      };
    },
  });

  const recalculate = useMutation({
    mutationFn: async (specificTenantId?: string) => {
      const { data, error } = await supabase.functions.invoke('calculate-tenant-health', {
        body: specificTenantId ? { tenant_id: specificTenantId } : {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Health scores recalculated successfully');
      queryClient.invalidateQueries({ queryKey: ['tenant-health'] });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to recalculate health scores';
      toast.error(errorMessage);
    },
  });

  return {
    healthScores: data?.health_scores || [],
    summary: data?.summary,
    isLoading,
    recalculate,
    isRecalculating: recalculate.isPending,
  };
}
