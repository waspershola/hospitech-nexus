import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  parent_id?: string;
  allowed_roles?: string[];
  order_index: number;
  is_active: boolean;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export function usePlatformNavigation() {
  const queryClient = useQueryClient();

  const { data: navigationItems, isLoading, error } = useQuery({
    queryKey: ['platform-navigation'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('platform-navigation', {
        method: 'GET',
      });

      if (error) throw error;
      return data as NavigationItem[];
    },
  });

  const syncDefaultNavigation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('platform-navigation/sync', {
        method: 'POST',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-navigation'] });
      toast.success('Default navigation synced successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to sync navigation');
    },
  });

  const createNavItem = useMutation({
    mutationFn: async (itemData: Partial<NavigationItem>) => {
      const { data, error } = await supabase.functions.invoke('platform-navigation', {
        method: 'POST',
        body: itemData,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-navigation'] });
      toast.success('Navigation item created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create navigation item');
    },
  });

  const updateNavItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NavigationItem> & { id: string }) => {
      const { data, error } = await supabase.functions.invoke(`platform-navigation/${id}`, {
        method: 'PATCH',
        body: updates,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-navigation'] });
      toast.success('Navigation item updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update navigation item');
    },
  });

  const deleteNavItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke(`platform-navigation/${id}`, {
        method: 'DELETE',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-navigation'] });
      toast.success('Navigation item deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete navigation item');
    },
  });

  return {
    navigationItems,
    isLoading,
    error,
    syncDefaultNavigation,
    createNavItem,
    updateNavItem,
    deleteNavItem,
  };
}
