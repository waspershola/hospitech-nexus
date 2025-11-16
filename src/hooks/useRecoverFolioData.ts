import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface RecoveryResults {
  folios_created: number;
  charges_posted: number;
  failed_folios: Array<{ booking_id: string; error: string }>;
  failed_charges: Array<{ folio_id: string; error: string }>;
}

export function useRecoverFolioData() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase.functions.invoke('recover-folio-data', {
        body: { tenant_id: tenantId }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Recovery failed');

      return data.results as RecoveryResults;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['stay_folios', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['booking-folio'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      
      if (results.folios_created > 0 || results.charges_posted > 0) {
        toast.success('Data Recovery Complete', {
          description: `Created ${results.folios_created} folios and posted ${results.charges_posted} charges.`
        });
      } else {
        toast.info('No Recovery Needed', {
          description: 'All folios are up to date.'
        });
      }

      if (results.failed_folios.length > 0 || results.failed_charges.length > 0) {
        toast.warning('Some Issues Found', {
          description: `${results.failed_folios.length} folios and ${results.failed_charges.length} charges failed. Check console for details.`
        });
        console.error('Recovery failures:', results);
      }
    },
    onError: (error: Error) => {
      toast.error('Recovery Failed', {
        description: error.message
      });
    },
  });
}
