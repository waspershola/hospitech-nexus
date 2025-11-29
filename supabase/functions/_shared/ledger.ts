/**
 * LEDGER-SHARED-HELPER-V1: Unified ledger entry insertion helper
 * All edge functions must use this helper instead of calling RPC directly
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

export type LedgerTransactionType =
  | 'debit'
  | 'credit'
  | 'refund'
  | 'reversal'
  | 'wallet_topup'
  | 'wallet_deduction';

export interface InsertLedgerEntryArgs {
  tenantId: string;
  amount: number;
  transactionType: LedgerTransactionType;
  description: string;
  category: string; // e.g. 'room_charge', 'guest_payment', 'qr_service', 'wallet_payment'
  
  // Optional financial context
  paymentMethod?: string | null; // TEXT snapshot for historical stability
  paymentMethodId?: string | null; // FK to payment_methods
  paymentProviderId?: string | null; // FK to finance_providers
  paymentLocationId?: string | null; // FK to finance_locations
  
  // Optional source tracking
  sourceType?: string | null; // 'folio', 'qr-request', 'wallet', 'payment', 'checkin-guest'
  referenceType?: string | null; // 'payment', 'room_charge', 'qr_request', 'wallet_transaction'
  referenceId?: string | null; // UUID or transaction ref
  
  // Optional entity relationships
  folioId?: string | null;
  bookingId?: string | null;
  guestId?: string | null;
  roomId?: string | null;
  organizationId?: string | null;
  
  // Optional operational context
  department?: string | null;
  staffId?: string | null; // FK to staff.id (not user_id)
  shift?: string | null; // 'morning', 'afternoon', 'evening', 'night'
  
  // Optional metadata
  metadata?: Record<string, any> | null;
}

/**
 * Insert a ledger entry using the canonical RPC function
 * Throws on error (no silent failures)
 */
export async function insertLedgerEntry(
  supabase: SupabaseClient,
  args: InsertLedgerEntryArgs
): Promise<string> {
  console.log('[ledger-helper] LEDGER-SHARED-HELPER-V1: Inserting ledger entry', {
    tenantId: args.tenantId,
    amount: args.amount,
    type: args.transactionType,
    category: args.category,
    sourceType: args.sourceType,
  });
  
  // Call the canonical RPC function
  const { data: ledgerId, error } = await supabase.rpc('insert_ledger_entry', {
    p_tenant_id: args.tenantId,
    p_transaction_type: args.transactionType,
    p_amount: args.amount,
    p_description: args.description,
    p_reference_type: args.referenceType ?? null,
    p_reference_id: args.referenceId ?? null,
    p_payment_method: args.paymentMethod ?? null,
    p_category: args.category,
    p_department: args.department ?? null,
    p_source_type: args.sourceType ?? null,
    p_folio_id: args.folioId ?? null,
    p_booking_id: args.bookingId ?? null,
    p_guest_id: args.guestId ?? null,
    p_room_id: args.roomId ?? null,
    p_payment_method_id: args.paymentMethodId ?? null,
    p_payment_provider_id: args.paymentProviderId ?? null,
    p_payment_location_id: args.paymentLocationId ?? null,
    p_organization_id: args.organizationId ?? null,
    p_shift: args.shift ?? null,
    p_staff_id: args.staffId ?? null,
    p_metadata: args.metadata ?? {},
  });
  
  if (error) {
    console.error('[ledger-helper] LEDGER-SHARED-HELPER-V1: Failed to insert ledger entry', {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      tenantId: args.tenantId,
      amount: args.amount,
      type: args.transactionType,
    });
    throw error;
  }
  
  console.log('[ledger-helper] LEDGER-SHARED-HELPER-V1: Ledger entry created successfully', {
    ledgerId,
    tenantId: args.tenantId,
    amount: args.amount,
    type: args.transactionType,
  });
  
  return ledgerId as string;
}
