/**
 * Electron RoomGrid Bridge - Phase 7A
 * Safe wrappers for Electron offline APIs that gracefully fall back in browser mode.
 * This module NEVER throws exceptions and NEVER breaks browser mode.
 */

import { isElectronContext } from '@/lib/environment/isElectron';

// Type definitions for Electron offline API responses
export interface OfflineRoomGridSnapshot {
  rooms: any[];
  metrics?: {
    available: number;
    occupied: number;
    reserved: number;
    cleaning: number;
    maintenance: number;
  };
  timestamp: string;
}

export interface OfflineRoomActionResult {
  success: boolean;
  room?: any;
  message?: string;
}

export interface BridgeResult<T> {
  data: T | null;
  error: Error | null;
  source: 'offline' | 'browser' | 'electron-no-api' | 'offline-error';
}

/**
 * Get room grid snapshot from Electron offline cache
 * Returns null in browser mode - caller should fall back to Supabase
 */
export async function getOfflineRoomGridSnapshot(
  tenantId: string,
  filters?: {
    statusFilter?: string | null;
    categoryFilter?: string | null;
    floorFilter?: number | null;
    searchQuery?: string;
  }
): Promise<BridgeResult<OfflineRoomGridSnapshot>> {
  // Guard: Not in Electron - return immediately
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  const api = (window as any).electronAPI;
  
  // Guard: Electron API not available or incomplete
  if (!api?.offlineApi?.roomGrid?.getSnapshot) {
    console.log('[ElectronBridge] offlineApi.roomGrid.getSnapshot not available');
    return { data: null, error: null, source: 'electron-no-api' };
  }

  try {
    const result = await api.offlineApi.roomGrid.getSnapshot(tenantId, filters);
    
    if (result?.error) {
      console.warn('[ElectronBridge] getSnapshot returned error:', result.error);
      return { data: null, error: new Error(result.error), source: 'offline-error' };
    }
    
    console.log('[ElectronBridge] getSnapshot success, rooms:', result?.rooms?.length ?? 0);
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[ElectronBridge] getSnapshot exception:', err);
    return { data: null, error: err as Error, source: 'offline-error' };
  }
}

/**
 * Update room status via Electron offline runtime
 * Returns null in browser mode - caller should fall back to Supabase
 */
export async function setOfflineRoomStatus(
  tenantId: string,
  roomId: string,
  newStatus: string,
  options?: { reason?: string; manualOverride?: boolean }
): Promise<BridgeResult<OfflineRoomActionResult>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  const api = (window as any).electronAPI;
  
  if (!api?.offlineApi?.roomGrid?.setRoomStatus) {
    console.log('[ElectronBridge] offlineApi.roomGrid.setRoomStatus not available');
    return { data: null, error: null, source: 'electron-no-api' };
  }

  try {
    const result = await api.offlineApi.roomGrid.setRoomStatus(tenantId, roomId, newStatus, options);
    
    if (result?.error) {
      return { data: null, error: new Error(result.error), source: 'offline-error' };
    }
    
    console.log('[ElectronBridge] setRoomStatus success:', { roomId, newStatus });
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[ElectronBridge] setRoomStatus exception:', err);
    return { data: null, error: err as Error, source: 'offline-error' };
  }
}

/**
 * Update housekeeping status via Electron offline runtime
 */
export async function setOfflineHousekeepingStatus(
  tenantId: string,
  roomId: string,
  hkStatus: string
): Promise<BridgeResult<OfflineRoomActionResult>> {
  if (!isElectronContext()) {
    return { data: null, error: null, source: 'browser' };
  }

  const api = (window as any).electronAPI;
  
  if (!api?.offlineApi?.roomGrid?.setHousekeepingStatus) {
    console.log('[ElectronBridge] offlineApi.roomGrid.setHousekeepingStatus not available');
    return { data: null, error: null, source: 'electron-no-api' };
  }

  try {
    const result = await api.offlineApi.roomGrid.setHousekeepingStatus(tenantId, roomId, hkStatus);
    
    if (result?.error) {
      return { data: null, error: new Error(result.error), source: 'offline-error' };
    }
    
    return { data: result, error: null, source: 'offline' };
  } catch (err) {
    console.error('[ElectronBridge] setHousekeepingStatus exception:', err);
    return { data: null, error: err as Error, source: 'offline-error' };
  }
}

/**
 * Bulk update rooms in Electron offline cache after successful Supabase fetch
 * Silent operation - does not affect the main data flow
 */
export async function bulkUpdateOfflineRooms(
  tenantId: string,
  rooms: any[]
): Promise<void> {
  if (!isElectronContext()) return;

  const api = (window as any).electronAPI;
  
  if (!api?.offlineApi?.offlineData?.bulkUpdateRooms) {
    return; // Silent - cache update is optional
  }

  try {
    await api.offlineApi.offlineData.bulkUpdateRooms(tenantId, rooms);
    console.log('[ElectronBridge] bulkUpdateRooms cached', rooms.length, 'rooms');
  } catch (err) {
    console.warn('[ElectronBridge] bulkUpdateRooms failed (non-critical):', err);
  }
}

/**
 * Check if offline data is available and fresh
 */
export function isOfflineDataAvailable(): boolean {
  if (!isElectronContext()) return false;
  
  const api = (window as any).electronAPI;
  return !!(api?.offlineApi?.roomGrid?.getSnapshot);
}
