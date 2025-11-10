import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MenuItemData {
  id?: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  image_url: string;
  is_available: boolean;
  preparation_time?: string;
  dietary_tags?: string[];
  display_order?: number;
}

export function useMenuManagement() {
  const { tenantId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const createMenuItem = async (item: MenuItemData) => {
    if (!tenantId) return null;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          ...item,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Menu item created');
      return data;
    } catch (err) {
      console.error('Error creating menu item:', err);
      toast.error('Failed to create menu item');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItemData>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success('Menu item updated');
      return data;
    } catch (err) {
      console.error('Error updating menu item:', err);
      toast.error('Failed to update menu item');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMenuItem = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Menu item deleted');
      return true;
    } catch (err) {
      console.error('Error deleting menu item:', err);
      toast.error('Failed to delete menu item');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
  };
}
