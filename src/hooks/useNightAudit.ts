import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function useNightAudit() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: auditHistory, isLoading } = useQuery({
    queryKey: ['night-audit-runs', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('night_audit_runs')
        .select('*, night_audit_reports(count)')
        .eq('tenant_id', tenantId)
        .order('audit_date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId
  });

  const runAudit = useMutation({
    mutationFn: async (auditDate: Date) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase.functions.invoke('night-audit-run', {
        body: {
          tenant_id: tenantId,
          audit_date: format(auditDate, 'yyyy-MM-dd')
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Night audit failed');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['night-audit-runs', tenantId] });
      toast.success('Night audit completed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Night audit failed: ${error.message}`);
    }
  });

  return {
    auditHistory,
    isLoading,
    runAudit: runAudit.mutate,
    isRunning: runAudit.isPending
  };
}
