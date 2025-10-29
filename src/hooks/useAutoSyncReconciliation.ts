import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AutoSyncParams {
  provider_id: string;
  start_date?: string;
  end_date?: string;
}

export function useAutoSyncReconciliation() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: AutoSyncParams) => {
      if (!tenantId) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('auto-sync-reconciliation', {
        body: {
          tenant_id: tenantId,
          ...params,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Auto-sync failed');

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-records', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['payments', tenantId] });
      
      const summary = data.summary;
      toast.success(
        `Sync complete: ${summary.matched} matched, ${summary.unmatched} unmatched out of ${summary.total_processed} transactions`
      );
    },
    onError: (error: Error) => {
      toast.error(`Auto-sync failed: ${error.message}`);
    },
  });

  return {
    autoSync: mutation.mutate,
    autoSyncAsync: mutation.mutateAsync,
    isSyncing: mutation.isPending,
    error: mutation.error,
  };
}
