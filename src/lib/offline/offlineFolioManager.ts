/**
 * Offline Folio Manager - Phase 5
 * Handles local folio operations when offline with balance calculations
 * OFFLINE-EXTREME-V1: Updated for schema v2
 */

import { tenantDBManager } from './tenantDBManager';
import { sessionManager } from './sessionManager';
import type { CachedFolio, CachedFolioTransaction } from './offlineTypes';

export interface LocalFolioCharge {
  id: string;
  folio_id: string;
  amount: number;
  description: string;
  department?: string;
  reference_type?: string;
  reference_id?: string;
  transaction_type: 'charge' | 'payment';
  created_at: string;
  created_by: string;
  metadata?: Record<string, any>;
}

export interface LocalFolioBalance {
  folio_id: string;
  total_charges: number;
  total_payments: number;
  balance: number;
  last_updated: string;
}

/**
 * Offline Folio Manager Class
 * Manages folio operations in offline mode with local storage
 */
class OfflineFolioManager {
  /**
   * Create a folio locally (offline mode)
   */
  async createFolioOffline(params: {
    booking_id: string;
    guest_id: string;
    room_id: string;
    folio_number: string;
    folio_type: string;
  }): Promise<CachedFolio> {
    const tenantId = sessionManager.getTenantId();
    const userId = sessionManager.getUserId();

    if (!tenantId || !userId) {
      throw new Error('No active session');
    }

    const folioId = crypto.randomUUID();
    const now = new Date().toISOString();
    const nowMs = Date.now();

    const folio: CachedFolio = {
      id: folioId,
      tenant_id: tenantId,
      booking_id: params.booking_id,
      guest_id: params.guest_id,
      room_id: params.room_id,
      folio_number: params.folio_number,
      folio_type: params.folio_type as 'room' | 'group_master' | 'incidental',
      status: 'open',
      total_charges: 0,
      total_payments: 0,
      balance: 0,
      created_at: now,
      cached_at: nowMs,
      last_synced_at: nowMs,
      schema_version: 2,
      sync_status: 'fresh',
    };

    // Store in IndexedDB
    const db = await tenantDBManager.openTenantDB(tenantId);
    await db.put('folios', folio);

    console.log(`[OfflineFolioManager] Created offline folio: ${folioId}`);

    return folio;
  }

  /**
   * Post charge to folio locally
   */
  async postChargeOffline(params: {
    folio_id: string;
    amount: number;
    description: string;
    department?: string;
    reference_type?: string;
    reference_id?: string;
    metadata?: Record<string, any>;
  }): Promise<LocalFolioCharge> {
    const tenantId = sessionManager.getTenantId();
    const userId = sessionManager.getUserId();

    if (!tenantId || !userId) {
      throw new Error('No active session');
    }

    const transactionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const nowMs = Date.now();

    const transaction: CachedFolioTransaction = {
      id: transactionId,
      tenant_id: tenantId,
      folio_id: params.folio_id,
      transaction_type: 'charge',
      amount: params.amount,
      description: params.description,
      department: params.department || null,
      reference_type: params.reference_type || null,
      reference_id: params.reference_id || null,
      created_by: userId,
      created_at: now,
      metadata: params.metadata,
      cached_at: nowMs,
      last_synced_at: nowMs,
      schema_version: 2,
      sync_status: 'fresh',
    };

    // Store transaction in IndexedDB
    const db = await tenantDBManager.openTenantDB(tenantId);
    await db.put('folio_transactions', transaction);

    // Update folio balance locally
    await this.recalculateFolioBalance(params.folio_id);

    console.log(`[OfflineFolioManager] Posted offline charge: ${transactionId} (₦${params.amount})`);

    return {
      id: transactionId,
      folio_id: params.folio_id,
      amount: params.amount,
      description: params.description,
      department: params.department,
      reference_type: params.reference_type,
      reference_id: params.reference_id,
      transaction_type: 'charge',
      created_at: now,
      created_by: userId,
      metadata: params.metadata,
    };
  }

  /**
   * Post payment to folio locally
   */
  async postPaymentOffline(params: {
    folio_id: string;
    payment_id: string;
    amount: number;
    description?: string;
  }): Promise<LocalFolioCharge> {
    const tenantId = sessionManager.getTenantId();
    const userId = sessionManager.getUserId();

    if (!tenantId || !userId) {
      throw new Error('No active session');
    }

    const transactionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const nowMs = Date.now();

    const transaction: CachedFolioTransaction = {
      id: transactionId,
      tenant_id: tenantId,
      folio_id: params.folio_id,
      transaction_type: 'payment',
      amount: params.amount,
      description: params.description || 'Payment received',
      department: null,
      reference_type: 'payment',
      reference_id: params.payment_id,
      created_by: userId,
      created_at: now,
      metadata: { payment_id: params.payment_id },
      cached_at: nowMs,
      last_synced_at: nowMs,
      schema_version: 2,
      sync_status: 'fresh',
    };

    // Store transaction in IndexedDB
    const db = await tenantDBManager.openTenantDB(tenantId);
    await db.put('folio_transactions', transaction);

    // Update folio balance locally
    await this.recalculateFolioBalance(params.folio_id);

    console.log(`[OfflineFolioManager] Posted offline payment: ${transactionId} (₦${params.amount})`);

    return {
      id: transactionId,
      folio_id: params.folio_id,
      amount: params.amount,
      description: transaction.description,
      transaction_type: 'payment',
      created_at: now,
      created_by: userId,
    };
  }

  /**
   * Recalculate folio balance from local transactions
   */
  async recalculateFolioBalance(folioId: string): Promise<LocalFolioBalance> {
    const tenantId = sessionManager.getTenantId();
    if (!tenantId) {
      throw new Error('No active session');
    }

    const db = await tenantDBManager.openTenantDB(tenantId);
    
    // Get folio
    const folio = await db.get('folios', folioId);
    if (!folio) {
      throw new Error('Folio not found in local storage');
    }

    // Get all transactions for this folio
    const allTransactions = await db.getAllFromIndex('folio_transactions', 'by-folio', folioId);

    // Calculate totals
    let totalCharges = 0;
    let totalPayments = 0;

    for (const txn of allTransactions) {
      if (txn.transaction_type === 'charge') {
        totalCharges += txn.amount;
      } else if (txn.transaction_type === 'payment') {
        totalPayments += txn.amount;
      }
    }

    const balance = totalCharges - totalPayments;
    const now = new Date().toISOString();

    // Update folio
    const updatedFolio: CachedFolio = {
      ...folio,
      total_charges: totalCharges,
      total_payments: totalPayments,
      balance,
      cached_at: Date.now(),
    };

    await db.put('folios', updatedFolio);

    console.log(
      `[OfflineFolioManager] Recalculated balance for ${folioId}: ` +
      `Charges=₦${totalCharges}, Payments=₦${totalPayments}, Balance=₦${balance}`
    );

    return {
      folio_id: folioId,
      total_charges: totalCharges,
      total_payments: totalPayments,
      balance,
      last_updated: now,
    };
  }

  /**
   * Get folio balance from local storage
   */
  async getFolioBalance(folioId: string): Promise<LocalFolioBalance | null> {
    const tenantId = sessionManager.getTenantId();
    if (!tenantId) {
      return null;
    }

    const db = await tenantDBManager.openTenantDB(tenantId);
    const folio = await db.get('folios', folioId);

    if (!folio) {
      return null;
    }

    return {
      folio_id: folioId,
      total_charges: folio.total_charges,
      total_payments: folio.total_payments,
      balance: folio.balance,
      last_updated: folio.created_at,
    };
  }

  /**
   * Get all transactions for a folio from local storage
   */
  async getFolioTransactions(folioId: string): Promise<CachedFolioTransaction[]> {
    const tenantId = sessionManager.getTenantId();
    if (!tenantId) {
      return [];
    }

    const db = await tenantDBManager.openTenantDB(tenantId);
    const transactions = await db.getAllFromIndex('folio_transactions', 'by-folio', folioId);

    return transactions.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  /**
   * Check if folio exists locally
   */
  async folioExistsLocally(folioId: string): Promise<boolean> {
    const tenantId = sessionManager.getTenantId();
    if (!tenantId) {
      return false;
    }

    const db = await tenantDBManager.openTenantDB(tenantId);
    const folio = await db.get('folios', folioId);

    return !!folio;
  }

  /**
   * Get folio by booking ID from local storage
   */
  async getFolioByBooking(bookingId: string): Promise<CachedFolio | null> {
    const tenantId = sessionManager.getTenantId();
    if (!tenantId) {
      return null;
    }

    const db = await tenantDBManager.openTenantDB(tenantId);
    const folios = await db.getAllFromIndex('folios', 'by-booking', bookingId);

    // Return first open folio
    return folios.find(f => f.status === 'open') || folios[0] || null;
  }
}

// Singleton instance
export const offlineFolioManager = new OfflineFolioManager();
