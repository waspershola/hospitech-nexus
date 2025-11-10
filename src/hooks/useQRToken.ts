import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface QRData {
  qr_id: string;
  tenant_id: string;
  room_id: string | null;
  assigned_to: string;
  display_name: string;
  welcome_message: string;
  scope: string;
  services: string[];
  branding: {
    primary_color?: string;
    logo_url?: string;
    favicon_url?: string;
    qr_theme?: string;
    qr_primary_color?: string;
    qr_accent_color?: string;
  };
  tenant: {
    hotel_name?: string;
    contact_phone?: string;
    contact_email?: string;
    qr_menu_enabled?: boolean;
    qr_wifi_enabled?: boolean;
    qr_feedback_enabled?: boolean;
    qr_calling_enabled?: boolean;
  };
}

interface UseQRTokenReturn {
  qrData: QRData | null;
  isValidating: boolean;
  error: string | null;
  validateToken: (token: string) => Promise<boolean>;
}

export function useQRToken(): UseQRTokenReturn {
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setGuestMode } = useAuth();

  const validateToken = async (token: string): Promise<boolean> => {
    setIsValidating(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('qr-validate', {
        body: { token },
      });

      if (functionError) {
        console.error('[useQRToken] Validation error:', functionError);
        setError('Failed to validate QR code');
        setIsValidating(false);
        return false;
      }

      if (!data?.success) {
        setError(data?.error || 'Invalid QR code');
        setIsValidating(false);
        return false;
      }

      // Store QR data
      setQrData(data.data);

      // Set guest mode in auth context
      const guestId = `guest-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      setGuestMode(token, guestId, data.data.tenant_id);

      setIsValidating(false);
      return true;
    } catch (err) {
      console.error('[useQRToken] Unexpected error:', err);
      setError('An unexpected error occurred');
      setIsValidating(false);
      return false;
    }
  };

  return {
    qrData,
    isValidating,
    error,
    validateToken,
  };
}
