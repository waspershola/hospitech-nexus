import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Receivable {
  id: string;
  tenant_id: string;
  guest_id: string | null;
  organization_id: string | null;
  booking_id: string | null;
  amount: number;
  status: 'open' | 'paid' | 'written_off' | 'escalated';
  due_date: string | null;
  created_by: string | null;
  approved_by: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export function useReceivables(status?: 'open' | 'paid' | 'written_off' | 'escalated') {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['receivables', tenantId, status],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('receivables')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (status) {
        query = query.eq('status', status);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Receivable[];
    },
    enabled: !!tenantId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Receivable['status'] }) => {
      const updates: any = { status };
      if (status === 'paid') {
        updates.paid_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('receivables')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables', tenantId] });
      toast.success('Receivable updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update receivable: ${error.message}`);
    },
  });

  return {
    receivables: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    updateStatus: updateStatus.mutate,
    isUpdating: updateStatus.isPending,
  };
}