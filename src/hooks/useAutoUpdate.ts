/**
 * OFFLINE-DESKTOP-V1: React hook for auto-updates
 * Provides update status and control functions
 * GUARDED: Only runs in Electron context
 */

import { useState, useEffect } from 'react';
import { isElectronContext } from '@/lib/environment/isElectron';

// Default update status for browser mode
const DEFAULT_UPDATE_STATUS = {
  available: false,
  downloading: false,
  downloaded: false,
  progress: 0,
  error: null as string | null,
  info: null as any,
};

// Lazy import for Electron-only module
let getAutoUpdateManager: any = null;

export function useAutoUpdate() {
  // GUARD: Check Electron context
  const inElectron = isElectronContext();
  
  const [status, setStatus] = useState(DEFAULT_UPDATE_STATUS);
  const [isChecking, setIsChecking] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [updateManager, setUpdateManager] = useState<any>(null);

  // Initialize Electron-only modules
  useEffect(() => {
    if (!inElectron) return;
    
    const initModules = async () => {
      try {
        const autoUpdateModule = await import('@/lib/offline/autoUpdateManager');
        getAutoUpdateManager = autoUpdateModule.getAutoUpdateManager;
        const manager = getAutoUpdateManager();
        setUpdateManager(manager);
        setStatus(manager.getStatus());
        setInitialized(true);
      } catch (err) {
        console.warn('[useAutoUpdate] Failed to load offline modules:', err);
      }
    };
    
    initModules();
  }, [inElectron]);

  // Subscribe to status changes (Electron only)
  useEffect(() => {
    if (!inElectron || !initialized || !updateManager) return;
    
    const unsubscribe = updateManager.subscribe(setStatus);
    return unsubscribe;
  }, [inElectron, initialized, updateManager]);

  // Check for updates
  const checkForUpdates = async () => {
    if (!inElectron || !updateManager) return;
    
    setIsChecking(true);
    try {
      await updateManager.checkForUpdates();
    } finally {
      setIsChecking(false);
    }
  };

  // Download update
  const downloadUpdate = async () => {
    if (!inElectron || !updateManager) return;
    await updateManager.downloadUpdate();
  };

  // Install update and restart
  const installUpdate = async () => {
    if (!inElectron || !updateManager) return;
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
