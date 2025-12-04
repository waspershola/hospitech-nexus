/**
 * Offline Payment Manager - Phase 5
 * Handles local payment operations when offline with provider/location tracking
 */

import { tenantDBManager } from './tenantDBManager';
import { sessionManager } from './sessionManager';
import { offlineFolioManager } from './offlineFolioManager';
import type { CachedPayment } from './offlineTypes';

export interface LocalPayment {
  id: string;
  tenant_id: string;
  booking_id: string;
  guest_id: string;
  amount: number;
  payment_method: string;
  provider_id?: string;
  provider_name?: string;
  location_id?: string;
  location_name?: string;
  status: string;
  transaction_ref: string;
  recorded_by: string;
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * Offline Payment Manager Class
 * Manages payment operations in offline mode with provider/location context
 */
class OfflinePaymentManager {
  /**
   * Record payment locally (offline mode)
   */
  async recordPaymentOffline(params: {
    booking_id: string;
    guest_id: string;
    guest_name: string;
    amount: number;
    payment_method: string;
    provider_id?: string;
    provider_name?: string;
    location_id?: string;
    location_name?: string;
    overpayment_action?: 'wallet' | 'room_advance' | 'refund';
    metadata?: Record<string, any>;
  }): Promise<LocalPayment> {
    const tenantId = sessionManager.getTenantId();
    const userId = sessionManager.getUserId();

    if (!tenantId || !userId) {
      throw new Error('No active session');
    }

    const paymentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const transactionRef = `OFF-${Date.now()}-${paymentId.substring(0, 8).toUpperCase()}`;

    const payment: CachedPayment = {
      id: paymentId,
      tenant_id: tenantId,
      booking_id: params.booking_id,
      guest_id: params.guest_id,
      amount: params.amount,
      method: params.payment_method,
      provider_id: params.provider_id || null,
      location_id: params.location_id || null,
      status: 'completed', // Mark as completed locally, will sync when online
      transaction_ref: transactionRef,
      recorded_by: userId,
      stay_folio_id: null, // Will be linked when synced
      metadata: {
        ...params.metadata,
        guest_name: params.guest_name,
        provider_id: params.provider_id,
        provider_name: params.provider_name,
        location_id: params.location_id,
        location_name: params.location_name,
        overpayment_action: params.overpayment_action || 'wallet',
        offline_created: true,
        offline_created_at: now,
      },
      created_at: now,
      cached_at: Date.now(),
    };

    // Store in IndexedDB
    const db = await tenantDBManager.openTenantDB(tenantId);
    await db.put('payments', payment);

    console.log(
      `[OfflinePaymentManager] Recorded offline payment: ${paymentId} ` +
      `(${params.payment_method}, ₦${params.amount})`
    );

    // Try to link to folio if exists locally
    try {
      const folio = await offlineFolioManager.getFolioByBooking(params.booking_id);
      if (folio) {
        await offlineFolioManager.postPaymentOffline({
          folio_id: folio.id,
          payment_id: paymentId,
          amount: params.amount,
          description: `Payment via ${params.payment_method}`,
        });

        // Update payment with folio_id
        payment.stay_folio_id = folio.id;
        await db.put('payments', payment);

        console.log(`[OfflinePaymentManager] Linked payment to folio: ${folio.id}`);
      }
    } catch (error) {
      console.warn('[OfflinePaymentManager] Could not link payment to folio:', error);
    }

    return {
      id: paymentId,
      tenant_id: tenantId,
      booking_id: params.booking_id,
      guest_id: params.guest_id,
      amount: params.amount,
      payment_method: params.payment_method,
      provider_id: params.provider_id,
      provider_name: params.provider_name,
      location_id: params.location_id,
      location_name: params.location_name,
      status: 'completed',
      transaction_ref: transactionRef,
      recorded_by: userId,
      metadata: payment.metadata,
      created_at: now,
    };
  }

  /**
   * Get payments for a booking from local storage
   */
  async getBookingPayments(bookingId: string): Promise<CachedPayment[]> {
    const tenantId = sessionManager.getTenantId();
    if (!tenantId) {
      return [];
    }

    const db = await tenantDBManager.openTenantDB(tenantId);
    const payments = await db.getAllFromIndex('payments', 'by-booking', bookingId);

    return payments.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  /**
   * Get payment by ID from local storage
   */
  async getPayment(paymentId: string): Promise<CachedPayment | null> {
    const tenantId = sessionManager.getTenantId();
    if (!tenantId) {
      return null;
    }

    const db = await tenantDBManager.openTenantDB(tenantId);
    const payment = await db.get('payments', paymentId);

    return payment || null;
  }

  /**
   * Calculate total payments for a booking from local storage
   */
  async getTotalPayments(bookingId: string): Promise<number> {
    const payments = await this.getBookingPayments(bookingId);
    return payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
  }

  /**
   * Check if payment was created offline
   */
  isOfflinePayment(payment: CachedPayment): boolean {
    return payment.metadata?.offline_created === true;
  }

  /**
   * Get offline payments pending sync
   */
  async getOfflinePaymentsPendingSync(): Promise<CachedPayment[]> {
    const tenantId = sessionManager.getTenantId();
    if (!tenantId) {
      return [];
    }

    const db = await tenantDBManager.openTenantDB(tenantId);
    const allPayments = await db.getAll('payments');

    return allPayments.filter(p => this.isOfflinePayment(p));
  }
}

// Singleton instance
export const offlinePaymentManager = new OfflinePaymentManager();
