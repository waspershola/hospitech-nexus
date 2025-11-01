import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useReceiptPrintLogs(filters?: {
  startDate?: string;
  endDate?: string;
  receiptType?: string;
  userId?: string;
}) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['receipt-print-logs', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('receipt_print_logs')
        .select(`
          *,
          profiles:printed_by(full_name, email),
          bookings:booking_id(id, guest_id),
          payments:payment_id(id, amount)
        `)
        .eq('tenant_id', tenantId)
        .order('printed_at', { ascending: false });

      // Apply filters
      if (filters?.startDate) {
        query = query.gte('printed_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('printed_at', filters.endDate);
      }
      if (filters?.receiptType) {
        query = query.eq('receipt_type', filters.receiptType);
      }
      if (filters?.userId) {
        query = query.eq('printed_by', filters.userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const reprintMutation = useMutation({
    mutationFn: async (logId: string) => {
      if (!tenantId) throw new Error('Tenant ID required');

      const { data: log, error } = await supabase
        .from('receipt_print_logs')
        .select('*')
        .eq('id', logId)
        .single();

      if (error) throw error;
      if (!log) throw new Error('Print log not found');

      // Trigger reprint by returning the log data
      return log;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt-print-logs', tenantId] });
    },
  });

  return {
    logs: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    reprint: reprintMutation.mutate,
    isReprinting: reprintMutation.isPending,
  };
}
