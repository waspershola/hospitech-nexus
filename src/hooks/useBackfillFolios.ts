import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface BackfillResult {
  processed: number;
  created_folios: number;
  linked_charges: number;
  linked_payments: number;
  errors: any[];
  folios: any[];
}

interface BackfillResponse {
  success: boolean;
  dry_run: boolean;
  message: string;
  results: BackfillResult;
}

export function useBackfillFolios() {
  const { tenantId } = useAuth();

  const backfillMutation = useMutation({
    mutationFn: async ({ dryRun = true }: { dryRun?: boolean }) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `https://akchmpmzcupzjaeewdui.supabase.co/functions/v1/backfill-folios`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            dry_run: dryRun,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Backfill failed');
      }

      const result: BackfillResponse = await response.json();
      return result;
    },
    onSuccess: (data) => {
      if (data.dry_run) {
        toast.info('Dry Run Complete', {
          description: `Found ${data.results.processed} bookings to backfill. Ready to execute.`
        });
      } else {
        toast.success('Backfill Complete', {
          description: `Created ${data.results.created_folios} folios, linked ${data.results.linked_charges} charges and ${data.results.linked_payments} payments.`
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Backfill Failed', {
        description: error.message
      });
    },
  });

  return {
    backfill: backfillMutation.mutate,
    isBackfilling: backfillMutation.isPending,
    result: backfillMutation.data,
    error: backfillMutation.error,
  };
}
