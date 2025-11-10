import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WiFiCredential {
  id?: string;
  location: string;
  network_name: string;
  password: string;
  instructions?: string;
  is_active: boolean;
  display_order?: number;
}

export function useWiFiManagement() {
  const { tenantId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const createCredential = async (credential: WiFiCredential) => {
    if (!tenantId) return null;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wifi_credentials')
        .insert({
          ...credential,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('WiFi credentials added');
      return data;
    } catch (err) {
      console.error('Error creating WiFi credential:', err);
      toast.error('Failed to add WiFi credentials');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCredential = async (id: string, updates: Partial<WiFiCredential>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wifi_credentials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success('WiFi credentials updated');
      return data;
    } catch (err) {
      console.error('Error updating WiFi credential:', err);
      toast.error('Failed to update WiFi credentials');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCredential = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('wifi_credentials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('WiFi credentials deleted');
      return true;
    } catch (err) {
      console.error('Error deleting WiFi credential:', err);
      toast.error('Failed to delete WiFi credentials');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createCredential,
    updateCredential,
    deleteCredential,
  };
}
