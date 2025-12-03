/**
 * Offline Runtime Controller - Electron Only
 * 
 * Central lifecycle management for offline/online transitions in Electron desktop app.
 * Controls Supabase realtime connection and manages channel subscriptions.
 * 
 * In SPA (browser): All methods are safe no-ops.
 * In Electron: Coordinates realtime disconnect/reconnect on network changes.
 */

import { supabase } from '@/integrations/supabase/client';
import { isElectronContext } from './offlineTypes';
import { realtimeRegistry, type RealtimeChannelDescriptor } from '@/lib/realtime/realtimeRegistry';

type LifecycleCallback = () => void;

interface OfflineRuntimeState {
  initialized: boolean;
  offline: boolean;
  hardOffline: boolean;
  realtimeConnected: boolean;
}

class OfflineRuntimeControllerImpl {
  private state: OfflineRuntimeState = {
    initialized: false,
    offline: false,
    hardOffline: false,
    realtimeConnected: true,
  };

  private onOnlineCallbacks: Set<LifecycleCallback> = new Set();
  private onOfflineCallbacks: Set<LifecycleCallback> = new Set();
  private reconnectDebounceTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize the controller (call once at app bootstrap in Electron)
   */
  init(): void {
    if (!isElectronContext()) {
      console.log('[OfflineRuntime] SPA mode - controller disabled');
      return;
    }

    if (this.state.initialized) {
      console.log('[OfflineRuntime] Already initialized');
      return;
    }

    // Read initial state from globals
    const networkState = window.__NETWORK_STATE__;
    this.state.offline = !networkState?.online;
    this.state.hardOffline = networkState?.hardOffline || window.__HARD_OFFLINE__ || false;
    this.state.initialized = true;

    console.log('[OfflineRuntime] Initialized:', {
      offline: this.state.offline,
      hardOffline: this.state.hardOffline,
    });

    // If starting offline, disconnect realtime immediately
    if (this.isOffline()) {
      this.disconnectRealtime();
    }
  }

  /**
   * Check if currently offline (network down OR forced offline)
   */
  isOffline(): boolean {
    if (!isElectronContext()) return false;
    return this.state.offline || this.state.hardOffline;
  }

  /**
   * Check if hard/forced offline mode is active
   */
  isHardOffline(): boolean {
    if (!isElectronContext()) return false;
    return this.state.hardOffline;
  }

  /**
   * Update network state (called from networkStore on state changes)
   */
  updateNetworkState(online: boolean, hardOffline: boolean): void {
    if (!isElectronContext()) return;

    const wasOffline = this.isOffline();
    this.state.offline = !online;
    this.state.hardOffline = hardOffline;
    const isNowOffline = this.isOffline();

    console.log('[OfflineRuntime] Network state updated:', {
      online,
      hardOffline,
      wasOffline,
      isNowOffline,
    });

    if (wasOffline && !isNowOffline) {
      this.handleOnline();
    } else if (!wasOffline && isNowOffline) {
      this.handleOffline();
    }
  }

  /**
   * Register callback for when coming back online
   */
  onOnline(callback: LifecycleCallback): () => void {
    this.onOnlineCallbacks.add(callback);
    return () => this.onOnlineCallbacks.delete(callback);
  }

  /**
   * Register callback for when going offline
   */
  onOffline(callback: LifecycleCallback): () => void {
    this.onOfflineCallbacks.add(callback);
    return () => this.onOfflineCallbacks.delete(callback);
  }

  /**
   * Register a realtime channel with the controller
   */
  registerRealtimeChannel(desc: RealtimeChannelDescriptor): string {
    const id = realtimeRegistry.register(desc);
    
    // If online, subscribe immediately
    if (!this.isOffline() && isElectronContext()) {
      realtimeRegistry.subscribeOne(id);
    }
    
    return id;
  }

  /**
   * Unregister a realtime channel
   */
  unregisterRealtimeChannel(id: string): void {
    realtimeRegistry.unregister(id);
  }

  /**
   * Disconnect all realtime channels (called when going offline)
   */
  disconnectRealtime(): void {
    if (!isElectronContext()) return;

    console.log('[OfflineRuntime] Disconnecting realtime...');
    
    try {
      // Unsubscribe all registered channels
      realtimeRegistry.unsubscribeAll();
      
      // Disconnect the realtime connection
      supabase.realtime.disconnect();
      this.state.realtimeConnected = false;
      
      console.log('[OfflineRuntime] Realtime disconnected');
    } catch (error) {
      console.error('[OfflineRuntime] Error disconnecting realtime:', error);
    }
  }

  /**
   * Reconnect realtime and resubscribe channels (called when coming online)
   */
  reconnectRealtime(): void {
    if (!isElectronContext()) return;
    if (this.isOffline()) {
      console.log('[OfflineRuntime] Still offline, skipping reconnect');
      return;
    }

    console.log('[OfflineRuntime] Reconnecting realtime...');
    
    try {
      // Connect to realtime
      supabase.realtime.connect();
      this.state.realtimeConnected = true;
      
      // Resubscribe all registered channels
      realtimeRegistry.subscribeAll();
      
      const channelCount = realtimeRegistry.getActiveCount();
      console.log(`[OfflineRuntime] Re-subscribed ${channelCount} channels`);
    } catch (error) {
      console.error('[OfflineRuntime] Error reconnecting realtime:', error);
    }
  }

  /**
   * Handle going offline
   */
  private handleOffline(): void {
    console.log('[OfflineRuntime] Entering offline mode');
    
    // Disconnect realtime immediately
    this.disconnectRealtime();
    
    // Notify listeners
    this.onOfflineCallbacks.forEach(cb => {
      try {
        cb();
      } catch (error) {
        console.error('[OfflineRuntime] Error in onOffline callback:', error);
      }
    });
  }

  /**
   * Handle coming back online (with debounce to avoid network flapping)
   */
  private handleOnline(): void {
    // Clear any pending reconnect
    if (this.reconnectDebounceTimer) {
      clearTimeout(this.reconnectDebounceTimer);
    }

    // Debounce reconnection by 2 seconds to ensure stable connection
    this.reconnectDebounceTimer = setTimeout(() => {
      if (this.isOffline()) {
        console.log('[OfflineRuntime] Network flapped, still offline');
        return;
      }

      console.log('[OfflineRuntime] Back online - reconnecting');
      
      // Reconnect realtime
      this.reconnectRealtime();
      
      // Notify listeners
      this.onOnlineCallbacks.forEach(cb => {
        try {
          cb();
        } catch (error) {
          console.error('[OfflineRuntime] Error in onOnline callback:', error);
        }
      });
    }, 2000);
  }

  /**
   * Get current state (for debugging)
   */
  getState(): OfflineRuntimeState {
    return { ...this.state };
  }
}

// Singleton instance
export const offlineRuntimeController = new OfflineRuntimeControllerImpl();

// Export type for external use
export type { RealtimeChannelDescriptor };
