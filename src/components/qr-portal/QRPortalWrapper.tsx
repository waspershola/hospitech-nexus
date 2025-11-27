import { useParams } from 'react-router-dom';
import { useQRToken } from '@/hooks/useQRToken';
import { useGuestNotifications } from '@/hooks/useGuestNotifications';
import { useGuestSession } from '@/hooks/useGuestSession';
import { GuestAudioPermissionPrompt } from './GuestAudioPermissionPrompt';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bell, BellOff } from 'lucide-react';
import { createContext, useContext } from 'react';

// GUEST-SESSION-SECURITY: Context to provide session token to all child components
interface GuestSessionContextType {
  guestSessionToken: string | null;
  isReady: boolean;
}

const GuestSessionContext = createContext<GuestSessionContextType>({
  guestSessionToken: null,
  isReady: false,
});

export const useGuestSessionContext = () => useContext(GuestSessionContext);

/**
 * QR Portal Wrapper - Provides global notification subscription for ALL QR pages
 * 
 * This wrapper ensures guests receive real-time notifications (sound + toast)
 * on ANY QR portal page, not just the landing page.
 */
export function QRPortalWrapper({ children }: { children: React.ReactNode }) {
  const { token } = useParams<{ token: string }>();
  const { qrData, isValidating } = useQRToken(token);
  
  // GUEST-SESSION-SECURITY: Initialize per-device session token
  const { guestSessionToken, isReady: isSessionReady } = useGuestSession(token);
  
  // Fetch all request IDs for this QR token for fallback matching
  // Only fetch if session is ready to avoid fetching legacy data
  const { data: requestIds = [] } = useQuery({
    queryKey: ['qr-request-ids', token, qrData?.tenant_id, guestSessionToken],
    queryFn: async () => {
      if (!token || !qrData?.tenant_id || !guestSessionToken) return [];
      
      // GUEST-SESSION-SECURITY: STRICT filtering - only show THIS device's requests
      const { data, error } = await supabase
        .from('requests')
        .select('id')
        .eq('qr_token', token)
        .eq('tenant_id', qrData.tenant_id)
        .eq('guest_session_token', guestSessionToken); // No permissive fallback
      
      if (error) {
        console.error('[QR-PORTAL-WRAPPER] Error fetching request IDs:', error);
        return [];
      }
      
      return data?.map(r => r.id) || [];
    },
    enabled: !!qrData && !!token && !isValidating && isSessionReady,
    staleTime: 30000, // Cache for 30s
  });
  
  // GLOBAL notification subscription - runs on ALL QR pages
  // Always play sounds when staff replies (no suppression)
  // GUEST-SESSION-SECURITY: Include session token for filtering
  useGuestNotifications({
    tenantId: qrData?.tenant_id || '',
    qrToken: token || '',
    guestSessionToken: guestSessionToken || undefined,
    requestIds,
    enabled: !!qrData && !!token && !isValidating && isSessionReady,
  });
  
  const notificationEnabled = !!qrData && !!token && !isValidating && isSessionReady;
  
  console.log('[QR-PORTAL-WRAPPER-SESSION] Session state:', {
    hasToken: !!token,
    hasQrData: !!qrData,
    isValidating,
    isSessionReady,
    hasSessionToken: !!guestSessionToken,
    sessionToken: guestSessionToken?.substring(0, 8) + '...',
  });
  
  // GUEST-SESSION-SECURITY: Provide session token to all child components via context
  return (
    <GuestSessionContext.Provider value={{ guestSessionToken, isReady: isSessionReady }}>
      <GuestAudioPermissionPrompt />
      {notificationEnabled && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-background/95 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg">
          <Bell className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">Notifications Active</span>
        </div>
      )}
      {children}
    </GuestSessionContext.Provider>
  );
}
