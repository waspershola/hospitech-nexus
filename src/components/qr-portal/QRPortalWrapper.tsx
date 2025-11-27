import { useParams } from 'react-router-dom';
import { useQRToken } from '@/hooks/useQRToken';
import { useGuestNotifications } from '@/hooks/useGuestNotifications';
import { GuestAudioPermissionPrompt } from './GuestAudioPermissionPrompt';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bell, BellOff } from 'lucide-react';

/**
 * QR Portal Wrapper - Provides global notification subscription for ALL QR pages
 * 
 * This wrapper ensures guests receive real-time notifications (sound + toast)
 * on ANY QR portal page, not just the landing page.
 */
export function QRPortalWrapper({ children }: { children: React.ReactNode }) {
  const { token } = useParams<{ token: string }>();
  const { qrData, isValidating } = useQRToken(token);
  
  // Fetch all request IDs for this QR token for fallback matching
  const { data: requestIds = [] } = useQuery({
    queryKey: ['qr-request-ids', token, qrData?.tenant_id],
    queryFn: async () => {
      if (!token || !qrData?.tenant_id) return [];
      
      const { data, error } = await supabase
        .from('requests')
        .select('id')
        .eq('qr_token', token)
        .eq('tenant_id', qrData.tenant_id);
      
      if (error) {
        console.error('[QR-PORTAL-WRAPPER] Error fetching request IDs:', error);
        return [];
      }
      
      return data?.map(r => r.id) || [];
    },
    enabled: !!qrData && !!token && !isValidating,
    staleTime: 30000, // Cache for 30s
  });
  
  // GLOBAL notification subscription - runs on ALL QR pages
  // Always play sounds when staff replies (no suppression)
  useGuestNotifications({
    tenantId: qrData?.tenant_id || '',
    qrToken: token || '',
    requestIds,
    enabled: !!qrData && !!token && !isValidating,
  });
  
  const notificationEnabled = !!qrData && !!token && !isValidating;
  
  return (
    <>
      <GuestAudioPermissionPrompt />
      {notificationEnabled && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-background/95 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg">
          <Bell className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">Notifications Active</span>
        </div>
      )}
      {children}
    </>
  );
}
