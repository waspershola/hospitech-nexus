/**
 * OFFLINE-DESKTOP-V1: Auto-Update Manager
 * Handles app updates from GitHub releases with notification UI
 */

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadUrl: string;
}

export interface UpdateStatus {
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  progress: number;
  info: UpdateInfo | null;
  error: string | null;
}

/**
 * Auto-Update Manager for Desktop App
 * Wraps electron-updater functionality with React-friendly API
 */
class AutoUpdateManager {
  private status: UpdateStatus = {
    available: false,
    downloading: false,
    downloaded: false,
    progress: 0,
    info: null,
    error: null,
  };

  private listeners: Set<(status: UpdateStatus) => void> = new Set();

  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<UpdateStatus> {
    console.log('[AutoUpdateManager] CHECK-UPDATES-V1: Checking for updates');
    
    if (!window.electronAPI) {
      console.log('[AutoUpdateManager] Not in Electron environment');
      return this.status;
    }

    try {
      // Call Electron to check for updates
      const result = await window.electronAPI.checkForUpdates();
      
      this.status = {
        ...this.status,
        available: result.available,
        info: result.info || null,
        error: null,
      };

      this.notifyListeners();
      return this.status;
    } catch (error: any) {
      console.error('[AutoUpdateManager] Check updates error:', error);
      this.status = {
        ...this.status,
        error: error?.message || 'Failed to check for updates',
      };
      this.notifyListeners();
      return this.status;
    }
  }

  /**
   * Download update
   */
  async downloadUpdate(): Promise<void> {
    console.log('[AutoUpdateManager] DOWNLOAD-UPDATE-V1: Starting download');
    
    if (!window.electronAPI) {
      throw new Error('Not in Electron environment');
    }

    this.status = {
      ...this.status,
      downloading: true,
      progress: 0,
      error: null,
    };
    this.notifyListeners();

    try {
      await window.electronAPI.downloadUpdate();
    } catch (error: any) {
      console.error('[AutoUpdateManager] Download error:', error);
      this.status = {
        ...this.status,
        downloading: false,
        error: error?.message || 'Failed to download update',
      };
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Install update and restart app
   */
  async installUpdate(): Promise<void> {
    console.log('[AutoUpdateManager] INSTALL-UPDATE-V1: Installing update');
    
    if (!window.electronAPI) {
      throw new Error('Not in Electron environment');
    }

    try {
      await window.electronAPI.installUpdate();
      // App will restart automatically
    } catch (error: any) {
      console.error('[AutoUpdateManager] Install error:', error);
      this.status = {
        ...this.status,
        error: error?.message || 'Failed to install update',
      };
      this.notifyListeners();
      throw error;
    }
  }

  /**
   * Handle update progress event from Electron
   */
  onDownloadProgress(percent: number): void {
    this.status = {
      ...this.status,
      progress: percent,
    };
    this.notifyListeners();
  }

  /**
   * Handle update downloaded event from Electron
   */
  onUpdateDownloaded(info: UpdateInfo): void {
    console.log('[AutoUpdateManager] UPDATE-DOWNLOADED-V1', info);
    
    this.status = {
      ...this.status,
      downloading: false,
      downloaded: true,
      progress: 100,
      info,
    };
    this.notifyListeners();
  }

  /**
   * Subscribe to status changes
   */
  subscribe(callback: (status: UpdateStatus) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Get current status
   */
  getStatus(): UpdateStatus {
    return { ...this.status };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.getStatus()));
  }
}

// Singleton instance
let autoUpdateManagerInstance: AutoUpdateManager | null = null;

export function getAutoUpdateManager(): AutoUpdateManager {
  if (!autoUpdateManagerInstance) {
    autoUpdateManagerInstance = new AutoUpdateManager();

    // Setup Electron event listeners if available
    if (window.electronAPI) {
      window.electronAPI.onUpdateDownloadProgress?.((percent: number) => {
        autoUpdateManagerInstance?.onDownloadProgress(percent);
      });

      window.electronAPI.onUpdateDownloaded?.((info: UpdateInfo) => {
        autoUpdateManagerInstance?.onUpdateDownloaded(info);
      });
    }
  }
  return autoUpdateManagerInstance;
}
