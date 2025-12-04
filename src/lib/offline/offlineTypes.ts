/**
 * Offline Desktop Types - Phase 3C
 * Enhanced type definitions for multi-tenant offline storage
 * OFFLINE-EXTREME-V1
 */

import type { DBSchema } from 'idb';
import type { QueuedRequest, ElectronAPI } from '../../../electron/types';

// ============= Schema Version =============
export const OFFLINE_SCHEMA_VERSION = 2;

// ============= Sync Status =============
export type SyncStatus = 'fresh' | 'stale' | 'conflict';

// ============= Session Management =============

export interface TenantSession {
  tenant_id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  roles: string[];
  expires_at: number;
  last_active: number;
}

// ============= Core Entity Types =============

export interface CachedRoom {
  id: string;
  tenant_id: string;
  number: string;
  floor: string | null;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_order';
  category: any;
  cached_at: number;
  last_synced_at: number;
  schema_version: number;
  sync_status: SyncStatus;
}

export interface CachedBooking {
  id: string;
  tenant_id: string;
  booking_reference: string;
  guest_id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  status: 'reserved' | 'checked_in' | 'checked_out' | 'cancelled' | 'completed';
  total_amount: number | null;
  metadata: any;
  cached_at: number;
  last_synced_at: number;
  schema_version: number;
  sync_status: SyncStatus;
}

export interface CachedGuest {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  id_number: string | null;
  cached_at: number;
  last_synced_at: number;
  schema_version: number;
  sync_status: SyncStatus;
}

export interface CachedFolio {
  id: string;
  tenant_id: string;
  booking_id: string;
  guest_id: string;
  room_id: string | null;
  folio_number: string;
  folio_type: 'room' | 'group_master' | 'incidental';
  status: 'open' | 'closed';
  total_charges: number;
  total_payments: number;
  balance: number;
  created_at: string;
  cached_at: number;
  last_synced_at: number;
  schema_version: number;
  sync_status: SyncStatus;
}

export interface CachedFolioTransaction {
  id: string;
  tenant_id: string;
  folio_id: string;
  transaction_type: 'charge' | 'payment';
  amount: number;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  department: string | null;
  created_by: string | null;
  created_at: string;
  metadata?: Record<string, any>;
  cached_at: number;
  last_synced_at: number;
  schema_version: number;
  sync_status: SyncStatus;
}

export interface CachedPayment {
  id: string;
  tenant_id: string;
  booking_id: string;
  guest_id: string;
  amount: number;
  method: string;
  provider_id: string | null;
  location_id: string | null;
  status: 'pending' | 'completed' | 'failed';
  stay_folio_id: string | null;
  transaction_ref: string | null;
  recorded_by: string | null;
  created_at: string;
  metadata?: Record<string, any>;
  cached_at: number;
  last_synced_at: number;
  schema_version: number;
  sync_status: SyncStatus;
}

export interface CachedQRRequest {
  id: string;
  tenant_id: string;
  qr_token: string;
  room_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  service_type: string;
  items: any;
  status: string;
  priority: string;
  metadata: any;
  created_at: string;
  cached_at: number;
  last_synced_at: number;
  schema_version: number;
  sync_status: SyncStatus;
}

export interface CachedMenuItem {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  price: number;
  is_available: boolean;
  cached_at: number;
  last_synced_at: number;
  schema_version: number;
  sync_status: SyncStatus;
}

export interface CachedHousekeeping {
  id: string;
  tenant_id: string;
  room_id: string;
  status: string;
  assigned_to: string | null;
  notes: string | null;
  cached_at: number;
  last_synced_at: number;
  schema_version: number;
  sync_status: SyncStatus;
}

// ============= KPI Snapshots =============
// OFFLINE-EXTREME-V1: Front Desk KPI caching

export interface CachedKPI {
  id: string; // Format: `${tenantId}_${dateKey}`
  tenant_id: string;
  date_key: string; // YYYY-MM-DD
  available: number;
  occupied: number;
  arrivals: number;
  departures: number;
  inHouse: number;
  pendingPayments: number;
  outOfService: number;
  overstays: number;
  dieselLevel: number;
  cached_at: number;
  last_synced_at: number;
  schema_version: number;
}

// ============= Night Audit Snapshots =============
// OFFLINE-EXTREME-V1: Night Audit offline support

export interface CachedNightAuditSnapshot {
  id: string; // Format: `${tenantId}_${businessDate}`
  tenant_id: string;
  business_date: string; // YYYY-MM-DD
  rooms_in_house: number;
  arrivals_count: number;
  departures_count: number;
  total_revenue: number;
  outstanding_balance: number;
  folio_summaries: Array<{
    folio_id: string;
    room_number: string;
    guest_name: string;
    balance: number;
  }>;
  audit_history: Array<{
    id: string;
    audit_date: string;
    status: string;
    total_revenue: number;
  }>;
  cached_at: number;
  last_synced_at: number;
  schema_version: number;
}

// ============= Conflict Records =============
// CONFLICT-RESOLUTION-V1: Track sync conflicts

export type ConflictEntityType = 'room' | 'booking' | 'folio' | 'request' | 'payment';
export type ConflictOperation = 'create' | 'update' | 'delete' | 'checkin' | 'checkout';
export type ConflictResolution = 'local_wins' | 'server_wins' | 'deferred' | 'dropped';

export interface ConflictRecord {
  id: string;
  tenant_id: string;
  entity_type: ConflictEntityType;
  entity_id: string;
  operation: ConflictOperation;
  local_payload: Record<string, any>;
  server_payload?: Record<string, any>;
  error_code?: string;
  error_message?: string;
  created_at: string;
  resolved_at?: string;
  resolution?: ConflictResolution;
}

// ============= Offline Queue =============

export interface OfflineQueueItem extends QueuedRequest {
  created_at: string;
  status: 'pending' | 'synced' | 'failed' | 'conflict';
  error?: string;
  last_attempt?: number;
  conflict_id?: string;
}

// ============= Sync Metadata =============

export interface SyncMetadata {
  entity: string;
  last_sync_at: number;
  last_sync_success: boolean;
  total_records: number;
}

// ============= Per-Tenant Database Schema =============

export interface TenantDB extends DBSchema {
  // Session
  session: {
    key: string;
    value: TenantSession;
  };

  // Core entities
  rooms: {
    key: string;
    value: CachedRoom;
    indexes: { 'by-status': string; 'by-cached': number; 'by-synced': number };
  };

  bookings: {
    key: string;
    value: CachedBooking;
    indexes: { 'by-status': string; 'by-guest': string; 'by-room': string; 'by-cached': number; 'by-synced': number };
  };

  guests: {
    key: string;
    value: CachedGuest;
    indexes: { 'by-phone': string | null; 'by-email': string | null; 'by-cached': number };
  };

  folios: {
    key: string;
    value: CachedFolio;
    indexes: { 'by-booking': string; 'by-guest': string; 'by-status': string; 'by-cached': number };
  };

  folio_transactions: {
    key: string;
    value: CachedFolioTransaction;
    indexes: { 'by-folio': string; 'by-type': string; 'by-cached': number };
  };

  payments: {
    key: string;
    value: CachedPayment;
    indexes: { 'by-booking': string; 'by-status': string; 'by-folio': string | null; 'by-cached': number };
  };

  qr_requests: {
    key: string;
    value: CachedQRRequest;
    indexes: { 'by-status': string; 'by-room': string | null; 'by-cached': number };
  };

  menu_items: {
    key: string;
    value: CachedMenuItem;
    indexes: { 'by-category': string; 'by-available': number; 'by-cached': number };
  };

  housekeeping: {
    key: string;
    value: CachedHousekeeping;
    indexes: { 'by-room': string; 'by-status': string; 'by-cached': number };
  };

  // KPI Snapshots - OFFLINE-EXTREME-V1
  kpi_snapshots: {
    key: string;
    value: CachedKPI;
    indexes: { 'by-tenant': string; 'by-date': string };
  };

  // Night Audit Snapshots - OFFLINE-EXTREME-V1
  night_audit_snapshots: {
    key: string;
    value: CachedNightAuditSnapshot;
    indexes: { 'by-tenant': string; 'by-date': string };
  };

  // Conflicts - CONFLICT-RESOLUTION-V1
  conflicts: {
    key: string;
    value: ConflictRecord;
    indexes: { 'by-tenant': string; 'by-entity': string; 'by-resolved': string | undefined };
  };

  // Offline queue
  offline_queue: {
    key: string;
    value: OfflineQueueItem;
    indexes: { 'by-status': string; 'by-created': string; 'by-attempts': number };
  };

  // Sync metadata
  sync_metadata: {
    key: string;
    value: SyncMetadata;
  };
}

// ============= Type Guards =============

export function isElectronContext(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

export function getElectronAPI(): ElectronAPI | null {
  return isElectronContext() ? window.electronAPI! : null;
}
