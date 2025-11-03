import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface InventoryItem {
  id: string;
  tenant_id: string;
  item_code: string;
  item_name: string;
  category: string;
  unit: string;
  reorder_level: number;
  cost_price: number;
  last_purchase_price?: number;
  supplier_id?: string;
  is_perishable: boolean;
  shelf_life_days?: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export function useInventoryItems() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading, error } = useQuery({
    queryKey: ['inventory-items', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          store_stock (
            quantity,
            location,
            last_updated
          ),
          suppliers (
            id,
            name
          )
        `)
        .eq('tenant_id', tenantId)
        .order('item_name');

      if (error) throw error;
      return data as any[];
    },
    enabled: !!tenantId,
  });

  const createItem = useMutation({
    mutationFn: async (itemData: Partial<InventoryItem>) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([{
          ...itemData,
          tenant_id: tenantId,
        } as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items', tenantId] });
      toast({
        title: 'Success',
        description: 'Item added to inventory',
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

  const updateItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('inventory_items')
        .update(data)
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items', tenantId] });
      toast({
        title: 'Success',
        description: 'Item updated successfully',
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

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items', tenantId] });
      toast({
        title: 'Success',
        description: 'Item deleted successfully',
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
    items,
    isLoading,
    error,
    createItem,
    updateItem,
    deleteItem,
  };
}