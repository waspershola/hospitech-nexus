import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface StockMovement {
  id: string;
  tenant_id: string;
  item_id: string;
  movement_type: 'purchase' | 'issue' | 'return' | 'transfer' | 'adjustment' | 'wastage' | 'consumption' | 'expired';
  quantity: number;
  source?: string;
  destination?: string;
  reference_no?: string;
  unit_cost?: number;
  total_value?: number;
  approved_by?: string;
  created_by: string;
  notes?: string;
  metadata?: any;
  created_at: string;
}

interface StockOperationPayload {
  operation: 'receive' | 'issue' | 'return' | 'adjust' | 'wastage' | 'consumption' | 'transfer';
  item_id: string;
  quantity: number;
  source?: string;
  destination?: string;
  department?: string;
  reference_no?: string;
  unit_cost?: number;
  notes?: string;
  metadata?: Record<string, any>;
}

export function useStockMovements() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: movements, isLoading } = useQuery({
    queryKey: ['stock-movements', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          inventory_items (
            id,
            item_code,
            item_name,
            category,
            unit
          ),
          staff:created_by (
            id,
            full_name
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const performStockOperation = useMutation({
    mutationFn: async (payload: StockOperationPayload) => {
      const { data, error } = await supabase.functions.invoke('manage-stock', {
        body: payload,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['store-stock', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['department-stock', tenantId] });
      
      toast({
        title: 'Success',
        description: 'Stock operation completed successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform stock operation',
        variant: 'destructive',
      });
    },
  });

  return {
    movements,
    isLoading,
    performStockOperation,
  };
}