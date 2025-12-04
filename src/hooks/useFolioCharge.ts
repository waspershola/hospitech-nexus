/**
 * Folio Charge Hook - Online-only SPA version
 * Direct Supabase RPC calls without offline wrapper
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface PostChargeParams {
  folioId: string;
  amount: number;
  description: string;
  department?: string;
  metadata?: Record<string, any>;
  requestId?: string;
  billingReferenceCode?: string;
}

export function useFolioCharge() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation({
    mutationFn: async (params: PostChargeParams) => {
      // Direct Supabase RPC call - no offline wrapper
      const { data, error } = await supabase.rpc('folio_post_charge', {
        p_tenant_id: tenantId,
        p_folio_id: String(params.folioId),
        p_amount: params.amount,
        p_description: params.description,
        p_department: params.department || null,
        p_staff_id: user?.id || null,
        p_metadata: params.metadata || null,
        p_request_id: params.requestId || null,
        p_billing_reference_code: params.billingReferenceCode || null,
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to post charge');

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate folio queries
      queryClient.invalidateQueries({ queryKey: ['folio', variables.folioId] });
      queryClient.invalidateQueries({ queryKey: ['booking-folio'] });
      
      toast.success('Charge posted to folio');
    },
    onError: (error: any) => {
      toast.error(`Failed to post charge: ${error.message}`);
    },
  });
}

// Re-export for backward compatibility
export { useFolioCharge as usePostFolioCharge };
