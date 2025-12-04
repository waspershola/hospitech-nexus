/**
 * Offline Banner - Phase 12
 * Displays sticky banner when in offline mode (Electron only)
 */

import { WifiOff, RefreshCw } from 'lucide-react';
import { useNetworkStore } from '@/stores/networkStore';
import { isElectronContext } from '@/lib/environment/isElectron';

export function OfflineBanner() {
  const { online, hardOffline } = useNetworkStore();

  // Only show in Electron mode when offline
  if (!isElectronContext()) {
    return null;
  }

  const isOffline = hardOffline || !online;

  if (!isOffline) {
    return null;
  }

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
      <WifiOff className="h-4 w-4" />
      <span>Offline Mode — Changes will sync when connection is restored</span>
      <RefreshCw className="h-4 w-4 animate-spin opacity-60" />
    </div>
  );
}
