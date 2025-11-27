/**
 * PER-DEVICE GUEST SESSION MANAGEMENT
 * 
 * Generates a unique session token per device per QR scan.
 * - Stored in localStorage with 24-hour expiry
 * - Scoped per QR token to isolate different room scans
 * - Used to filter ALL guest reads/writes
 * 
 * Architecture:
 * - Device A scans Room 310 → gets session token A
 * - Device B scans Room 310 → gets session token B
 * - Device A only sees requests created with token A
 * - Device B only sees requests created with token B
 * - Staff see ALL requests (no session filtering)
 * 
 * Security: Prevents data leakage between devices sharing same QR code
 */

import { useEffect, useState } from 'react';

interface GuestSession {
  token: string;
  qrToken: string;
  createdAt: string;
  expiresAt: string;
}

const GUEST_SESSION_KEY_PREFIX = 'luxhp_guest_session_';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useGuestSession(qrToken: string | null | undefined) {
  const [guestSessionToken, setGuestSessionToken] = useState<string | null>(null);
  const [isNewSession, setIsNewSession] = useState(false);

  useEffect(() => {
    if (!qrToken) {
      setGuestSessionToken(null);
      return;
    }

    const storageKey = `${GUEST_SESSION_KEY_PREFIX}${qrToken}`;
    
    try {
      // Try to load existing session
      const storedData = localStorage.getItem(storageKey);
      
      if (storedData) {
        const session: GuestSession = JSON.parse(storedData);
        
        // Check if session is expired
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        
        if (now < expiresAt && session.qrToken === qrToken) {
          // Session is still valid
          console.log('[GUEST-SESSION] Loaded existing session:', {
            token: session.token.substring(0, 8) + '...',
            expiresAt: session.expiresAt,
            timeRemaining: Math.round((expiresAt.getTime() - now.getTime()) / 1000 / 60 / 60) + 'h',
          });
          setGuestSessionToken(session.token);
          setIsNewSession(false);
          return;
        }
        
        console.log('[GUEST-SESSION] Existing session expired');
      }
      
      // Generate new session
      const now = new Date();
      const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
      const newToken = crypto.randomUUID();
      
      const newSession: GuestSession = {
        token: newToken,
        qrToken,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
      
      // Store in localStorage
      localStorage.setItem(storageKey, JSON.stringify(newSession));
      
      console.log('[GUEST-SESSION] Created new session:', {
        token: newToken.substring(0, 8) + '...',
        qrToken: qrToken.substring(0, 8) + '...',
        expiresAt: expiresAt.toISOString(),
        duration: '24h',
      });
      
      setGuestSessionToken(newToken);
      setIsNewSession(true);
      
    } catch (error) {
      console.error('[GUEST-SESSION] Error managing session:', error);
      
      // Fallback: generate ephemeral session (not persisted)
      const fallbackToken = crypto.randomUUID();
      console.warn('[GUEST-SESSION] Using ephemeral session (localStorage unavailable)');
      setGuestSessionToken(fallbackToken);
      setIsNewSession(true);
    }
  }, [qrToken]);

  return {
    guestSessionToken,
    isNewSession,
    isReady: !!guestSessionToken,
  };
}
