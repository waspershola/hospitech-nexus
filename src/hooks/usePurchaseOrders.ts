import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  po_number: string;
  supplier_id: string;
  status: string;
  items: any[];
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  delivery_date?: string;
  notes?: string;
  created_by: string;
  approved_by?: string;
  received_by?: string;
  created_at: string;
  updated_at: string;
}

export function usePurchaseOrders() {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user's staff ID
  const { data: staffData } = useQuery({
    queryKey: ['current-staff', tenantId, user?.id],
    queryFn: async () => {
      if (!user?.id || !tenantId) return null;
      
      const { data, error } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!tenantId,
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['purchase-orders', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers(id, name),
          creator:created_by(id, full_name),
          approver:approved_by(id, full_name),
          receiver:received_by(id, full_name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!tenantId,
  });

  const createOrder = useMutation({
    mutationFn: async (orderData: Omit<PurchaseOrder, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      if (!staffData?.id) {
        throw new Error('Staff record not found. Please contact your administrator.');
      }

      const { data, error } = await supabase
        .from('purchase_orders')
        .insert([{
          ...orderData,
          tenant_id: tenantId,
          created_by: staffData.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', tenantId] });
      toast({
        title: 'Success',
        description: 'Purchase order created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PurchaseOrder> }) => {
      const { error } = await supabase
        .from('purchase_orders')
        .update(data)
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', tenantId] });
      toast({
        title: 'Success',
        description: 'Purchase order updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    orders,
    isLoading,
    createOrder,
    updateOrder,
  };
}
