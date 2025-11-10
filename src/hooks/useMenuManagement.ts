import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { optimizeImage, validateImageFile } from '@/lib/imageOptimization';

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
    if (!tenantId) return false;
    
    setIsLoading(true);
    try {
      // Get the item to find its image URL
      const { data: item } = await supabase
        .from('menu_items')
        .select('image_url')
        .eq('id', id)
        .single();

      // Delete the menu item
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Delete the image from storage if it's hosted on Supabase
      if (item?.image_url && item.image_url.includes('menu-images')) {
        const filePath = item.image_url.split('/menu-images/').pop();
        if (filePath) {
          await supabase.storage.from('menu-images').remove([filePath]);
        }
      }

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

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!tenantId) return null;

    setIsLoading(true);
    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        return null;
      }

      // Optimize image
      const optimizedFile = await optimizeImage(file);
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${tenantId}/${timestamp}_${optimizedFile.name}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('menu-images')
        .upload(fileName, optimizedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(fileName);

      toast.success('Image uploaded successfully');
      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteImage = async (imageUrl: string): Promise<boolean> => {
    if (!imageUrl.includes('menu-images')) return true;

    try {
      const filePath = imageUrl.split('/menu-images/').pop();
      if (!filePath) return false;

      const { error } = await supabase.storage
        .from('menu-images')
        .remove([filePath]);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error deleting image:', err);
      return false;
    }
  };

  return {
    isLoading,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    uploadImage,
    deleteImage,
  };
}
