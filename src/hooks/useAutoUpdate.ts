/**
 * OFFLINE-DESKTOP-V1: React hook for auto-updates
 * Provides update status and control functions
 */

import { useState, useEffect } from 'react';
import { getAutoUpdateManager } from '@/lib/offline/autoUpdateManager';
import type { UpdateStatus } from '@/lib/offline/autoUpdateManager';

export function useAutoUpdate() {
  const updateManager = getAutoUpdateManager();
  const [status, setStatus] = useState<UpdateStatus>(updateManager.getStatus());
  const [isChecking, setIsChecking] = useState(false);

  // Subscribe to status changes
  useEffect(() => {
    const unsubscribe = updateManager.subscribe(setStatus);
    return unsubscribe;
  }, [updateManager]);

  // Check for updates
  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      await updateManager.checkForUpdates();
    } finally {
      setIsChecking(false);
    }
  };

  // Download update
  const downloadUpdate = async () => {
    await updateManager.downloadUpdate();
  };

  // Install update and restart
  const installUpdate = async () => {
    await updateManager.installUpdate();
  };

  return {
    status,
    isChecking,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  };
}
