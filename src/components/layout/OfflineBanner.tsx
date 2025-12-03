/**
 * Offline Banner Component
 * Shows a sticky banner when the app is offline (Electron only)
 */

import { WifiOff } from 'lucide-react';
import { useNetworkStore } from '@/state/networkStore';
import { isElectronContext } from '@/lib/offline/offlineTypes';

export function OfflineBanner() {
  const { online, hardOffline } = useNetworkStore();

  // Only show in Electron context when offline
  if (!isElectronContext()) return null;
  if (online && !hardOffline) return null;

  return (
    <div className="sticky top-0 z-50 bg-amber-600 text-amber-50 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      <span>Offline Mode — Changes will sync when connection is restored</span>
    </div>
  );
}
