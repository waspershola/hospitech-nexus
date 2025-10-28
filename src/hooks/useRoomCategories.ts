import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface RoomCategory {
  id: string;
  tenant_id: string;
  name: string;
  short_code: string;
  description: string | null;
  base_rate: number;
  max_occupancy: number;
  amenities: string[];
  created_at: string;
  updated_at: string;
}

export function useRoomCategories() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['room_categories', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('room_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as RoomCategory[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (category: Omit<RoomCategory, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
      if (!tenantId) throw new Error('No tenant ID');
      const { data, error } = await supabase
        .from('room_categories')
        .insert([{ ...category, tenant_id: tenantId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room_categories', tenantId] });
      toast.success('Category created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RoomCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('room_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room_categories', tenantId] });
      toast.success('Category updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('room_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room_categories', tenantId] });
      toast.success('Category deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });

  return {
    categories: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createCategory: createMutation.mutate,
    updateCategory: updateMutation.mutate,
    deleteCategory: deleteMutation.mutate,
  };
}
