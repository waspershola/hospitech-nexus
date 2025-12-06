/**
 * Offline Seeding Diagnostics
 * Passive, developer-only utilities for verifying offline data seeding
 * Never throws errors - all functions return graceful responses
 */

import { isElectronContext } from '@/lib/environment/isElectron';
import { getElectronOfflineApi } from './electronOfflineBridge';

// ============ Types ============

export interface DiagnosticResult {
  supported: boolean;
  value?: boolean | string | number;
  message?: string;
}

export interface StoreCountsResult {
  supported: boolean;
  counts?: {
    rooms: number;
    bookings: number;
    guests: number;
    stayFolios: number;
    folioTransactions: number;
    folioPayments: number;
  };
  error?: string;
}

export interface SnapshotVerification {
  supported: boolean;
  hasData: boolean;
  count: number;
  sampleIds?: string[];
  error?: string;
}

export interface IndexedDBHealth {
  supported: boolean;
  healthy: boolean;
  details?: {
    dbName?: string;
    version?: number;
    stores?: string[];
  };
  error?: string;
}

export interface FullDiagnosticsResult {
  timestamp: string;
  environment: {
    isElectron: boolean;
    isOnline: boolean;
    tenantId: string | null;
  };
  indexedDBHealth: IndexedDBHealth;
  storeCounts: StoreCountsResult;
  snapshots: {
    rooms: SnapshotVerification;
    bookings: SnapshotVerification;
    guests: SnapshotVerification;
  };
}

// ============ Helpers ============

/**
 * Safe array extraction from API responses
 * Handles both direct arrays and { data: [...], error: null } formats
 */
function safeExtractArray(result: unknown): any[] {
  // Direct array response
  if (Array.isArray(result)) {
    return result;
  }
  
  // { data: [...] } response format
  if (result && typeof result === 'object' && 'data' in result) {
    const data = (result as any).data;
    return Array.isArray(data) ? data : [];
  }
  
  return [];
}

// ============ Diagnostic Utilities ============

/**
 * Check if running in Electron context
 */
export function checkElectronPresence(): DiagnosticResult {
  const isElectron = isElectronContext();
  return {
    supported: true,
    value: isElectron,
    message: isElectron ? 'Running in Electron' : 'Running in browser (Electron features unavailable)'
  };
}

/**
 * Check current offline mode status
 */
export function checkOfflineMode(): DiagnosticResult {
  const isOnline = navigator.onLine;
  const isElectron = isElectronContext();
  
  return {
    supported: true,
    value: !isOnline && isElectron,
    message: isElectron 
      ? (isOnline ? 'Online (seeding active)' : 'Offline (reading from IndexedDB)')
      : 'Browser mode (offline features unavailable)'
  };
}

/**
 * Check if tenant DB has been initialized
 */
export async function checkTenantDBInit(tenantId: string): Promise<DiagnosticResult> {
  if (!isElectronContext()) {
    return { supported: false, message: 'Not in Electron context' };
  }
  
  if (!tenantId) {
    return { supported: true, value: false, message: 'No tenant ID provided' };
  }
  
  try {
    const api = getElectronOfflineApi();
    if (!api) {
      return { supported: false, message: 'Electron offline API unavailable' };
    }
    
    // Try to get any data to verify DB is initialized
    if (api.getRooms) {
      const result = await api.getRooms(tenantId);
      const rooms = safeExtractArray(result);
      return { supported: true, value: true, message: `Tenant DB accessible for: ${tenantId} (${rooms.length} rooms)` };
    }
    
    return { supported: true, value: false, message: 'getRooms API not available' };
  } catch (e) {
    return { supported: true, value: false, message: `DB check failed: ${e}` };
  }
}

/**
 * Get counts from all IndexedDB stores
 */
export async function getStoreCounts(tenantId: string): Promise<StoreCountsResult> {
  if (!isElectronContext()) {
    return { supported: false, error: 'Not in Electron context' };
  }
  
  if (!tenantId) {
    return { supported: false, error: 'No tenant ID provided' };
  }
  
  try {
    const api = getElectronOfflineApi();
    if (!api) {
      return { supported: false, error: 'Electron offline API unavailable' };
    }
    
    // Get counts from each store using safe extraction
    const counts = {
      rooms: 0,
      bookings: 0,
      guests: 0,
      stayFolios: 0,
      folioTransactions: 0,
      folioPayments: 0
    };
    
    if (api.getRooms) {
      const rawRooms = await api.getRooms(tenantId);
      counts.rooms = safeExtractArray(rawRooms).length;
    }
    
    if (api.getBookings) {
      const rawBookings = await api.getBookings(tenantId);
      counts.bookings = safeExtractArray(rawBookings).length;
    }
    
    if (api.getGuests) {
      const rawGuests = await api.getGuests(tenantId);
      counts.guests = safeExtractArray(rawGuests).length;
    }
    
    if (api.getStayFolios) {
      const rawFolios = await api.getStayFolios(tenantId);
      counts.stayFolios = safeExtractArray(rawFolios).length;
    }
    
    return { supported: true, counts };
  } catch (e) {
    return { supported: false, error: `Failed to get store counts: ${e}` };
  }
}

/**
 * Verify bookings snapshot was seeded
 */
export async function verifyBookingsSnapshot(tenantId: string): Promise<SnapshotVerification> {
  if (!isElectronContext()) {
    return { supported: false, hasData: false, count: 0 };
  }
  
  if (!tenantId) {
    return { supported: false, hasData: false, count: 0, error: 'No tenant ID' };
  }
  
  try {
    const api = getElectronOfflineApi();
    if (!api?.getBookings) {
      return { supported: false, hasData: false, count: 0, error: 'API unavailable' };
    }
    
    const rawBookings = await api.getBookings(tenantId);
    const bookings = safeExtractArray(rawBookings);
    const count = bookings.length;
    const sampleIds = bookings.slice(0, 3).map((b: any) => b.id);
    
    return {
      supported: true,
      hasData: count > 0,
      count,
      sampleIds
    };
  } catch (e) {
    return { supported: false, hasData: false, count: 0, error: `${e}` };
  }
}

/**
 * Verify rooms snapshot was seeded
 */
export async function verifyRoomsSnapshot(tenantId: string): Promise<SnapshotVerification> {
  if (!isElectronContext()) {
    return { supported: false, hasData: false, count: 0 };
  }
  
  if (!tenantId) {
    return { supported: false, hasData: false, count: 0, error: 'No tenant ID' };
  }
  
  try {
    const api = getElectronOfflineApi();
    if (!api?.getRooms) {
      return { supported: false, hasData: false, count: 0, error: 'API unavailable' };
    }
    
    const rawRooms = await api.getRooms(tenantId);
    const rooms = safeExtractArray(rawRooms);
    const count = rooms.length;
    const sampleIds = rooms.slice(0, 3).map((r: any) => r.id);
    
    return {
      supported: true,
      hasData: count > 0,
      count,
      sampleIds
    };
  } catch (e) {
    return { supported: false, hasData: false, count: 0, error: `${e}` };
  }
}

/**
 * Verify guests snapshot was seeded
 */
export async function verifyGuestsSnapshot(tenantId: string): Promise<SnapshotVerification> {
  if (!isElectronContext()) {
    return { supported: false, hasData: false, count: 0 };
  }
  
  if (!tenantId) {
    return { supported: false, hasData: false, count: 0, error: 'No tenant ID' };
  }
  
  try {
    const api = getElectronOfflineApi();
    if (!api?.getGuests) {
      return { supported: false, hasData: false, count: 0, error: 'API unavailable' };
    }
    
    const rawGuests = await api.getGuests(tenantId);
    const guests = safeExtractArray(rawGuests);
    const count = guests.length;
    const sampleIds = guests.slice(0, 3).map((g: any) => g.id);
    
    return {
      supported: true,
      hasData: count > 0,
      count,
      sampleIds
    };
  } catch (e) {
    return { supported: false, hasData: false, count: 0, error: `${e}` };
  }
}

/**
 * Check IndexedDB health status
 */
export async function checkIndexedDBHealth(): Promise<IndexedDBHealth> {
  if (!isElectronContext()) {
    return { supported: false, healthy: false, error: 'Not in Electron context' };
  }
  
  try {
    const api = (window as any).electronAPI;
    if (api?.offlineApi?.getIndexedDBHealth) {
      const health = await api.offlineApi.getIndexedDBHealth();
      return {
        supported: true,
        healthy: health?.healthy ?? false,
        details: health
      };
    }
    
    // Fallback - try to access the API
    const offlineApi = getElectronOfflineApi();
    return {
      supported: true,
      healthy: !!offlineApi,
      details: { dbName: 'offline-data' }
    };
  } catch (e) {
    return { supported: false, healthy: false, error: `${e}` };
  }
}

/**
 * Run all diagnostics and return comprehensive results
 */
export async function runAllDiagnostics(tenantId: string | null): Promise<FullDiagnosticsResult> {
  const tid = tenantId || '';
  
  const [dbHealth, storeCounts, roomsSnap, bookingsSnap, guestsSnap] = await Promise.all([
    checkIndexedDBHealth(),
    getStoreCounts(tid),
    verifyRoomsSnapshot(tid),
    verifyBookingsSnapshot(tid),
    verifyGuestsSnapshot(tid)
  ]);
  
  return {
    timestamp: new Date().toISOString(),
    environment: {
      isElectron: isElectronContext(),
      isOnline: navigator.onLine,
      tenantId
    },
    indexedDBHealth: dbHealth,
    storeCounts,
    snapshots: {
      rooms: roomsSnap,
      bookings: bookingsSnap,
      guests: guestsSnap
    }
  };
}
