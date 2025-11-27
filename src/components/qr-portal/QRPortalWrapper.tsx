import { useParams } from 'react-router-dom';
import { useQRToken } from '@/hooks/useQRToken';
import { useGuestNotifications } from '@/hooks/useGuestNotifications';
import { GuestAudioPermissionPrompt } from './GuestAudioPermissionPrompt';

/**
 * QR Portal Wrapper - Provides global notification subscription for ALL QR pages
 * 
 * This wrapper ensures guests receive real-time notifications (sound + toast)
 * on ANY QR portal page, not just the landing page.
 */
export function QRPortalWrapper({ children }: { children: React.ReactNode }) {
  const { token } = useParams<{ token: string }>();
  const { qrData, isValidating } = useQRToken(token);
  
  // GLOBAL notification subscription - runs on ALL QR pages
  // Always play sounds when staff replies (no suppression)
  useGuestNotifications({
    tenantId: qrData?.tenant_id || '',
    qrToken: token || '',
    enabled: !!qrData && !!token && !isValidating,
  });
  
  return (
    <>
      <GuestAudioPermissionPrompt />
      {children}
    </>
  );
}
