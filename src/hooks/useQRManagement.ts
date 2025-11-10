import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface QRCode {
  id: string;
  tenant_id: string;
  token: string;
  assigned_to: string;
  room_id: string | null;
  scope: string;
  services: any;
  display_name: string;
  welcome_message: string;
  status: string;
  expires_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  room?: {
    id: string;
    number: string;
  } | null;
}

interface CreateQRData {
  assigned_to: string;
  room_id?: string;
  scope: 'room' | 'common_area' | 'facility' | 'event';
  services: string[];
  display_name: string;
  welcome_message: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

interface UpdateQRData {
  assigned_to?: string;
  room_id?: string;
  scope?: 'room' | 'common_area' | 'facility' | 'event';
  services?: string[];
  display_name?: string;
  welcome_message?: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
  status?: 'active' | 'inactive' | 'expired';
}

export function useQRManagement() {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { tenantId } = useAuth();

  const fetchQRCodes = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select(`
          *,
          room:rooms(id, number)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQrCodes(data || []);
    } catch (err) {
      console.error('[useQRManagement] Error fetching QR codes:', err);
      toast.error('Failed to load QR codes');
    } finally {
      setIsLoading(false);
    }
  };

  const createQRCode = async (data: CreateQRData): Promise<QRCode | null> => {
    setIsCreating(true);
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to create QR codes');
      }

      const { data: result, error } = await supabase.functions.invoke('qr-generate', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          action: 'create',
          qr_codes: [data],
        },
      });

      if (error) throw error;

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to create QR code');
      }

      toast.success('QR code created successfully');
      await fetchQRCodes();
      return result.data;
    } catch (err) {
      console.error('[useQRManagement] Error creating QR code:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create QR code');
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const updateQRCode = async (qrId: string, data: UpdateQRData): Promise<boolean> => {
    setIsUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to update QR codes');
      }

      const { data: result, error } = await supabase.functions.invoke('qr-generate', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          action: 'update',
          qr_id: qrId,
          updates: data,
        },
      });

      if (error) throw error;

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to update QR code');
      }

      toast.success('QR code updated successfully');
      await fetchQRCodes();
      return true;
    } catch (err) {
      console.error('[useQRManagement] Error updating QR code:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update QR code');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteQRCode = async (qrId: string): Promise<boolean> => {
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to delete QR codes');
      }

      const { data: result, error } = await supabase.functions.invoke('qr-generate', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          action: 'delete',
          qr_id: qrId,
        },
      });

      if (error) throw error;

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to delete QR code');
      }

      toast.success('QR code deleted successfully');
      await fetchQRCodes();
      return true;
    } catch (err) {
      console.error('[useQRManagement] Error deleting QR code:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete QR code');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const bulkCreateQRCodes = async (
    scope: 'room' | 'common_area' | 'facility',
    quantity: number,
    prefix: string,
    services: string[],
    welcomeMessage: string
  ): Promise<boolean> => {
    setIsCreating(true);
    try {
      const promises = Array.from({ length: quantity }, (_, i) => {
        const displayName = prefix ? `${prefix}${i + 1}` : `${scope}-${i + 1}`;
        return createQRCode({
          assigned_to: displayName,
          scope,
          services,
          display_name: displayName,
          welcome_message: welcomeMessage,
        });
      });

      await Promise.all(promises);
      toast.success(`Successfully generated ${quantity} QR codes`);
      return true;
    } catch (err) {
      console.error('[useQRManagement] Error bulk creating QR codes:', err);
      toast.error('Failed to generate some QR codes');
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    fetchQRCodes();
  }, [tenantId]);

  return {
    qrCodes,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    fetchQRCodes,
    createQRCode,
    updateQRCode,
    deleteQRCode,
    bulkCreateQRCodes,
  };
}
