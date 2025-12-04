/**
 * Tenant Database Manager - Phase 3C
 * Manages per-tenant IndexedDB instances with complete isolation
 * OFFLINE-EXTREME-V1
 */

import { openDB, IDBPDatabase } from 'idb';
import type { TenantDB, TenantSession, SyncMetadata } from './offlineTypes';
import { OFFLINE_SCHEMA_VERSION } from './offlineTypes';

const DB_VERSION = 2; // OFFLINE-EXTREME-V1: Bumped for new stores

class TenantDBManager {
  private activeDatabases: Map<string, IDBPDatabase<TenantDB>> = new Map();
  private currentTenantId: string | null = null;

  /**
   * Get database name for tenant
   */
  private getDBName(tenantId: string): string {
    return `luxhp_offline_${tenantId}`;
  }

  /**
   * Open or get existing database for tenant
   * OFFLINE-EXTREME-V1: Added kpi_snapshots, night_audit_snapshots, conflicts stores
   */
  async openTenantDB(tenantId: string): Promise<IDBPDatabase<TenantDB>> {
    // Check if already open
    const existing = this.activeDatabases.get(tenantId);
    if (existing) {
      this.currentTenantId = tenantId;
      return existing;
    }

    const dbName = this.getDBName(tenantId);
    
    const db = await openDB<TenantDB>(dbName, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`[TenantDBManager] Upgrading DB from v${oldVersion} to v${newVersion}`);

        // Session store
        if (!db.objectStoreNames.contains('session')) {
          db.createObjectStore('session', { keyPath: 'tenant_id' });
        }

        // Rooms
        if (!db.objectStoreNames.contains('rooms')) {
          const roomStore = db.createObjectStore('rooms', { keyPath: 'id' });
          roomStore.createIndex('by-status', 'status');
          roomStore.createIndex('by-cached', 'cached_at');
          roomStore.createIndex('by-synced', 'last_synced_at');
        }

        // Bookings
        if (!db.objectStoreNames.contains('bookings')) {
          const bookingStore = db.createObjectStore('bookings', { keyPath: 'id' });
          bookingStore.createIndex('by-status', 'status');
          bookingStore.createIndex('by-guest', 'guest_id');
          bookingStore.createIndex('by-room', 'room_id');
          bookingStore.createIndex('by-cached', 'cached_at');
          bookingStore.createIndex('by-synced', 'last_synced_at');
        }

        // Guests
        if (!db.objectStoreNames.contains('guests')) {
          const guestStore = db.createObjectStore('guests', { keyPath: 'id' });
          guestStore.createIndex('by-phone', 'phone');
          guestStore.createIndex('by-email', 'email');
          guestStore.createIndex('by-cached', 'cached_at');
        }

        // Folios
        if (!db.objectStoreNames.contains('folios')) {
          const folioStore = db.createObjectStore('folios', { keyPath: 'id' });
          folioStore.createIndex('by-booking', 'booking_id');
          folioStore.createIndex('by-guest', 'guest_id');
          folioStore.createIndex('by-status', 'status');
          folioStore.createIndex('by-cached', 'cached_at');
        }

        // Folio Transactions
        if (!db.objectStoreNames.contains('folio_transactions')) {
          const txnStore = db.createObjectStore('folio_transactions', { keyPath: 'id' });
          txnStore.createIndex('by-folio', 'folio_id');
          txnStore.createIndex('by-type', 'transaction_type');
          txnStore.createIndex('by-cached', 'cached_at');
        }

        // Payments
        if (!db.objectStoreNames.contains('payments')) {
          const paymentStore = db.createObjectStore('payments', { keyPath: 'id' });
          paymentStore.createIndex('by-booking', 'booking_id');
          paymentStore.createIndex('by-status', 'status');
          paymentStore.createIndex('by-folio', 'stay_folio_id');
          paymentStore.createIndex('by-cached', 'cached_at');
        }

        // QR Requests
        if (!db.objectStoreNames.contains('qr_requests')) {
          const qrStore = db.createObjectStore('qr_requests', { keyPath: 'id' });
          qrStore.createIndex('by-status', 'status');
          qrStore.createIndex('by-room', 'room_id');
          qrStore.createIndex('by-cached', 'cached_at');
        }

        // Menu Items
        if (!db.objectStoreNames.contains('menu_items')) {
          const menuStore = db.createObjectStore('menu_items', { keyPath: 'id' });
          menuStore.createIndex('by-category', 'category');
          menuStore.createIndex('by-available', 'is_available');
          menuStore.createIndex('by-cached', 'cached_at');
        }

        // Housekeeping
        if (!db.objectStoreNames.contains('housekeeping')) {
          const hkStore = db.createObjectStore('housekeeping', { keyPath: 'id' });
          hkStore.createIndex('by-room', 'room_id');
          hkStore.createIndex('by-status', 'status');
          hkStore.createIndex('by-cached', 'cached_at');
        }

        // Offline Queue
        if (!db.objectStoreNames.contains('offline_queue')) {
          const queueStore = db.createObjectStore('offline_queue', { keyPath: 'id' });
          queueStore.createIndex('by-status', 'status');
          queueStore.createIndex('by-created', 'created_at');
          queueStore.createIndex('by-attempts', 'retries');
        }

        // Sync Metadata
        if (!db.objectStoreNames.contains('sync_metadata')) {
          db.createObjectStore('sync_metadata', { keyPath: 'entity' });
        }

        // ============= NEW STORES (DB_VERSION 2) =============
        // OFFLINE-EXTREME-V1: KPI Snapshots
        if (!db.objectStoreNames.contains('kpi_snapshots')) {
          const kpiStore = db.createObjectStore('kpi_snapshots', { keyPath: 'id' });
          kpiStore.createIndex('by-tenant', 'tenant_id');
          kpiStore.createIndex('by-date', 'date_key');
        }

        // OFFLINE-EXTREME-V1: Night Audit Snapshots
        if (!db.objectStoreNames.contains('night_audit_snapshots')) {
          const naStore = db.createObjectStore('night_audit_snapshots', { keyPath: 'id' });
          naStore.createIndex('by-tenant', 'tenant_id');
          naStore.createIndex('by-date', 'business_date');
        }

        // CONFLICT-RESOLUTION-V1: Conflicts store
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictStore = db.createObjectStore('conflicts', { keyPath: 'id' });
          conflictStore.createIndex('by-tenant', 'tenant_id');
          conflictStore.createIndex('by-entity', 'entity_type');
          conflictStore.createIndex('by-resolved', 'resolved_at');
        }
      },
    });

    this.activeDatabases.set(tenantId, db);
    this.currentTenantId = tenantId;
    
    console.log(`[TenantDBManager] Opened database v${DB_VERSION} for tenant: ${tenantId}`);
    return db;
  }

  /**
   * Get current tenant's database (must be opened first)
   */
  getCurrentDB(): IDBPDatabase<TenantDB> | null {
    if (!this.currentTenantId) return null;
    return this.activeDatabases.get(this.currentTenantId) || null;
  }

  /**
   * Get current tenant ID
   */
  getCurrentTenantId(): string | null {
    return this.currentTenantId;
  }

  /**
   * Close database for tenant
   */
  async closeTenantDB(tenantId: string): Promise<void> {
    const db = this.activeDatabases.get(tenantId);
    if (db) {
      db.close();
      this.activeDatabases.delete(tenantId);
      console.log(`[TenantDBManager] Closed database for tenant: ${tenantId}`);
    }

    if (this.currentTenantId === tenantId) {
      this.currentTenantId = null;
    }
  }

  /**
   * Purge all data for tenant (complete wipe)
   */
  async purgeTenantData(tenantId: string): Promise<void> {
    await this.closeTenantDB(tenantId);
    
    const dbName = this.getDBName(tenantId);
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      
      request.onsuccess = () => {
        console.log(`[TenantDBManager] Purged all data for tenant: ${tenantId}`);
        resolve();
      };
      
      request.onerror = () => {
        console.error(`[TenantDBManager] Failed to purge tenant: ${tenantId}`);
        reject(new Error('Failed to delete database'));
      };

      request.onblocked = () => {
        console.warn(`[TenantDBManager] Purge blocked for tenant: ${tenantId}`);
        reject(new Error('Database deletion blocked'));
      };
    });
  }

  /**
   * Save session for tenant
   */
  async saveSession(session: TenantSession): Promise<void> {
    const db = await this.openTenantDB(session.tenant_id);
    await db.put('session', session);
    console.log(`[TenantDBManager] Session saved for tenant: ${session.tenant_id}`);
  }

  /**
   * Get session for tenant
   */
  async getSession(tenantId: string): Promise<TenantSession | null> {
    const db = await this.openTenantDB(tenantId);
    const session = await db.get('session', tenantId);
    return session || null;
  }

  /**
   * Clear session for tenant
   */
  async clearSession(tenantId: string): Promise<void> {
    const db = this.activeDatabases.get(tenantId);
    if (db) {
      await db.delete('session', tenantId);
      console.log(`[TenantDBManager] Session cleared for tenant: ${tenantId}`);
    }
  }

  /**
   * Update sync metadata
   */
  async updateSyncMetadata(
    tenantId: string,
    entity: string,
    success: boolean,
    recordCount: number
  ): Promise<void> {
    const db = await this.openTenantDB(tenantId);
    const metadata: SyncMetadata = {
      entity,
      last_sync_at: Date.now(),
      last_sync_success: success,
      total_records: recordCount,
    };
    await db.put('sync_metadata', metadata);
  }

  /**
   * Get sync metadata for entity
   */
  async getSyncMetadata(tenantId: string, entity: string): Promise<SyncMetadata | null> {
    const db = await this.openTenantDB(tenantId);
    const metadata = await db.get('sync_metadata', entity);
    return metadata || null;
  }

  /**
   * Close all databases and clean up
   */
  async closeAll(): Promise<void> {
    for (const [tenantId, db] of this.activeDatabases.entries()) {
      db.close();
      console.log(`[TenantDBManager] Closed database for tenant: ${tenantId}`);
    }
    this.activeDatabases.clear();
    this.currentTenantId = null;
  }
}

// Singleton instance
export const tenantDBManager = new TenantDBManager();
