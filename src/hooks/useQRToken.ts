import { useState, useEffect, useCallback } from 'react';
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
  room_status?: 'occupied' | 'available' | 'cleaning' | 'out_of_order'; // PHASE-2-SIMPLIFICATION
  session_expired?: boolean; // PHASE-2-SIMPLIFICATION
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

interface CachedSession {
  qrData: QRData;
  expiresAt: number;
  token: string;
}

interface UseQRTokenReturn {
  qrData: QRData | null;
  isValidating: boolean;
  error: string | null;
  validateToken: (token: string) => Promise<boolean>;
}

const QR_SESSION_KEY = 'qr_portal_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Helper to get cached session
const getCachedSession = (token: string): QRData | null => {
  try {
    const cached = localStorage.getItem(QR_SESSION_KEY);
    if (!cached) return null;

    const session: CachedSession = JSON.parse(cached);
    
    // Check if token matches and session hasn't expired
    if (session.token === token && session.expiresAt > Date.now()) {
      console.log('[useQRToken] Using cached session (expires in', Math.round((session.expiresAt - Date.now()) / 1000 / 60), 'minutes)');
      return session.qrData;
    }

    // Session expired or token mismatch, clear it
    localStorage.removeItem(QR_SESSION_KEY);
    return null;
  } catch (err) {
    console.error('[useQRToken] Error reading cached session:', err);
    localStorage.removeItem(QR_SESSION_KEY);
    return null;
  }
};

// Helper to cache session
const cacheSession = (token: string, qrData: QRData): void => {
  try {
    const session: CachedSession = {
      qrData,
      token,
      expiresAt: Date.now() + SESSION_DURATION,
    };
    localStorage.setItem(QR_SESSION_KEY, JSON.stringify(session));
    console.log('[useQRToken] Session cached for 24 hours');
  } catch (err) {
    console.error('[useQRToken] Error caching session:', err);
  }
};

export function useQRToken(initialToken?: string): UseQRTokenReturn {
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setGuestMode } = useAuth();

  const validateToken = useCallback(async (token: string): Promise<boolean> => {
    // Check cache first
    const cached = getCachedSession(token);
    if (cached) {
      setQrData(cached);
      setIsValidating(false);
      setError(null);
      
      // Set guest mode from cached data
      const guestId = `guest-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      setGuestMode(token, guestId, cached.tenant_id);
      
      return true;
    }

    // No cache, validate with server
    setIsValidating(true);
    setError(null);

    try {
      console.log('[useQRToken] Validating token with server...');
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
        setError(data?.error || 'Invalid QR code or expired. Please scan again.');
        setIsValidating(false);
        return false;
      }

      // Store QR data in state
      setQrData(data.data);
      
      // Cache the session for 24h
      cacheSession(token, data.data);

      // Set guest mode in auth context
      const guestId = `guest-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      setGuestMode(token, guestId, data.data.tenant_id);

      setIsValidating(false);
      return true;
    } catch (err) {
      console.error('[useQRToken] Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsValidating(false);
      return false;
    }
  }, [setGuestMode]);

  // Auto-validate on mount if initialToken provided
  useEffect(() => {
    if (initialToken && !qrData && !isValidating) {
      validateToken(initialToken);
    }
  }, [initialToken, qrData, isValidating, validateToken]);

  return {
    qrData,
    isValidating,
    error,
    validateToken,
  };
}
