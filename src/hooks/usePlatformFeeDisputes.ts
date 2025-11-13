import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface PlatformFeeDispute {
  id: string;
  tenant_id: string;
  ledger_ids: string[];
  dispute_reason: string;
  supporting_docs: any[];
  requested_action: 'waive' | 'reduce' | 'review';
  requested_amount?: number;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  admin_notes?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDisputeInput {
  ledger_ids: string[];
  dispute_reason: string;
  supporting_docs?: any[];
  requested_action: 'waive' | 'reduce' | 'review';
  requested_amount?: number;
}

export function usePlatformFeeDisputes(tenantId?: string) {
  const { toast } = useToast();
  const { tenantId: authTenantId } = useAuth();
  const queryClient = useQueryClient();
  const effectiveTenantId = tenantId || authTenantId;

  // Fetch disputes for tenant
  const disputes = useQuery({
    queryKey: ['platform-fee-disputes', effectiveTenantId],
    queryFn: async () => {
      if (!effectiveTenantId) return [];

      const { data, error } = await supabase
        .from('platform_fee_disputes')
        .select('*')
        .eq('tenant_id', effectiveTenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PlatformFeeDispute[];
    },
    enabled: !!effectiveTenantId,
  });

  // Create dispute mutation
  const createDispute = useMutation({
    mutationFn: async (input: CreateDisputeInput) => {
      if (!effectiveTenantId) {
        throw new Error('No tenant ID available');
      }

      const { data, error } = await supabase
        .from('platform_fee_disputes')
        .insert({
          tenant_id: effectiveTenantId,
          ledger_ids: input.ledger_ids,
          dispute_reason: input.dispute_reason,
          supporting_docs: input.supporting_docs || [],
          requested_action: input.requested_action,
          requested_amount: input.requested_amount,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-fee-disputes', effectiveTenantId] });
      toast({
        title: 'Dispute Submitted',
        description: 'Your platform fee dispute has been submitted for review.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    disputes: disputes.data || [],
    isLoading: disputes.isLoading,
    createDispute,
    isSubmitting: createDispute.isPending,
  };
}
