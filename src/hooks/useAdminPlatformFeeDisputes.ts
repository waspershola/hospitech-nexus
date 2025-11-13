import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminPlatformFeeDispute {
  id: string;
  tenant_id: string;
  tenant_name?: string;
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
  total_disputed_amount?: number;
}

export interface UpdateDisputeInput {
  disputeId: string;
  status: 'under_review' | 'approved' | 'rejected';
  admin_notes?: string;
  resolution_notes?: string;
}

export function useAdminPlatformFeeDisputes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all disputes for admin review
  const disputes = useQuery({
    queryKey: ['admin-platform-fee-disputes'],
    queryFn: async () => {
      // Fetch disputes with tenant info and ledger totals
      const { data: disputesData, error: disputesError } = await supabase
        .from('platform_fee_disputes')
        .select(`
          *,
          tenants!inner(name)
        `)
        .order('created_at', { ascending: false });

      if (disputesError) throw disputesError;

      // Fetch ledger entries to calculate total disputed amounts
      const disputes = await Promise.all(
        (disputesData || []).map(async (dispute) => {
          const { data: ledgerData, error: ledgerError } = await supabase
            .from('platform_fee_ledger')
            .select('fee_amount')
            .in('id', dispute.ledger_ids);

          const total_disputed_amount = ledgerData?.reduce((sum, entry) => sum + entry.fee_amount, 0) || 0;

          return {
            ...dispute,
            tenant_name: dispute.tenants?.name,
            total_disputed_amount,
          };
        })
      );

      return disputes as AdminPlatformFeeDispute[];
    },
  });

  // Update dispute status mutation
  const updateDispute = useMutation({
    mutationFn: async (input: UpdateDisputeInput) => {
      const updateData: any = {
        status: input.status,
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: input.admin_notes,
        resolution_notes: input.resolution_notes,
      };

      const { data: dispute, error: updateError } = await supabase
        .from('platform_fee_disputes')
        .update(updateData)
        .eq('id', input.disputeId)
        .select()
        .single();

      if (updateError) throw updateError;

      // If approved and requested action is waive, automatically process waiver
      if (input.status === 'approved' && dispute) {
        const { data: fullDispute } = await supabase
          .from('platform_fee_disputes')
          .select('ledger_ids, requested_action, resolution_notes')
          .eq('id', input.disputeId)
          .single();

        if (fullDispute?.requested_action === 'waive') {
          // Call waive-platform-fee edge function
          const { error: waiveError } = await supabase.functions.invoke('waive-platform-fee', {
            body: {
              ledger_ids: fullDispute.ledger_ids,
              waived_reason: `Dispute approved: ${fullDispute.resolution_notes || 'Fee dispute resolved in favor of tenant'}`,
            },
          });

          if (waiveError) {
            console.error('Auto-waiver failed:', waiveError);
            throw new Error('Dispute approved but automatic waiver failed. Please waive fees manually.');
          }
        }
      }

      return dispute;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-platform-fee-disputes'] });
      
      const statusMessages = {
        under_review: 'Dispute marked as under review',
        approved: 'Dispute approved and processed',
        rejected: 'Dispute rejected',
      };

      toast({
        title: 'Dispute Updated',
        description: statusMessages[variables.status],
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get pending count
  const pendingCount = disputes.data?.filter(d => d.status === 'pending').length || 0;

  return {
    disputes: disputes.data || [],
    isLoading: disputes.isLoading,
    updateDispute,
    isUpdating: updateDispute.isPending,
    pendingCount,
  };
}
