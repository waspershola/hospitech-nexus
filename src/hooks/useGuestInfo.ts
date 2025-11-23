import { useState, useEffect } from 'react';

interface GuestInfo {
  name: string;
  phone: string;
  savedAt: string;
}

const STORAGE_KEY_PREFIX = 'qr-guest-info';
const EXPIRY_DAYS = 7;

/**
 * PHASE-1C: Guest Info Persistence Hook
 * Manages guest name and phone number with localStorage persistence
 * Scoped per QR token with 7-day expiration
 */
export function useGuestInfo(qrToken: string | null | undefined) {
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = qrToken ? `${STORAGE_KEY_PREFIX}-${qrToken}` : null;

  // Load guest info from localStorage on mount
  useEffect(() => {
    if (!storageKey) {
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as GuestInfo;
        
        // Check if expired (7 days)
        const savedDate = new Date(parsed.savedAt);
        const expiryDate = new Date(savedDate);
        expiryDate.setDate(expiryDate.getDate() + EXPIRY_DAYS);
        
        if (new Date() < expiryDate) {
          // Still valid
          setGuestInfo(parsed);
          console.log('[useGuestInfo] Loaded existing guest info:', {
            name: parsed.name,
            savedAt: parsed.savedAt,
            expiresAt: expiryDate.toISOString()
          });
        } else {
          // Expired - clear it
          localStorage.removeItem(storageKey);
          console.log('[useGuestInfo] Guest info expired, cleared');
        }
      }
    } catch (error) {
      console.error('[useGuestInfo] Failed to load guest info:', error);
      // Clear corrupted data
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    } finally {
      setIsLoading(false);
    }
  }, [storageKey]);

  const saveGuestInfo = (name: string, phone: string) => {
    if (!storageKey) return;

    const info: GuestInfo = {
      name: name.trim(),
      phone: phone.trim(),
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(info));
      setGuestInfo(info);
      console.log('[useGuestInfo] Saved guest info:', { name: info.name });
    } catch (error) {
      console.error('[useGuestInfo] Failed to save guest info:', error);
    }
  };

  const clearGuestInfo = () => {
    if (!storageKey) return;

    try {
      localStorage.removeItem(storageKey);
      setGuestInfo(null);
      console.log('[useGuestInfo] Cleared guest info');
    } catch (error) {
      console.error('[useGuestInfo] Failed to clear guest info:', error);
    }
  };

  return {
    guestInfo,
    isLoading,
    saveGuestInfo,
    clearGuestInfo,
    hasGuestInfo: !!guestInfo,
  };
}
