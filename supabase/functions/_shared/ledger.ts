/**
 * LEDGER-SHARED-HELPER-V1: Unified ledger entry insertion helper
 * All edge functions must use this helper for consistent ledger recording
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
  category: string;
  
  // Optional financial fields
  paymentMethod?: string | null;
  paymentMethodId?: string | null;
  paymentProviderId?: string | null;
  paymentLocationId?: string | null;
  
  // Optional source tracking (matches actual ledger_entries table columns)
  sourceType?: string | null;
  paymentId?: string | null;
  walletTransactionId?: string | null;
  qrRequestId?: string | null;
  
  // Optional entity relationships
  folioId?: string | null;
  bookingId?: string | null;
  guestId?: string | null;
  roomId?: string | null;
  organizationId?: string | null;
  groupBookingId?: string | null;
  
  // Optional operational context
  department?: string | null;
  staffId?: string | null;
  shift?: string | null;
  
  // Optional metadata
  metadata?: Record<string, any> | null;
}

/**
 * Insert a ledger entry using the canonical RPC function
 * Maps to actual ledger_entries table columns (no reference_type/reference_id)
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
  
  // Call the canonical RPC with proper parameter mapping
  const { data: ledgerId, error } = await supabase.rpc('insert_ledger_entry', {
    p_tenant_id: args.tenantId,
    p_transaction_type: args.transactionType,
    p_amount: args.amount,
    p_description: args.description,
    p_reference_type: args.paymentId ? 'payment' : args.walletTransactionId ? 'wallet_transaction' : args.qrRequestId ? 'qr_request' : null,
    p_reference_id: args.paymentId || args.walletTransactionId || args.qrRequestId || null,
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
