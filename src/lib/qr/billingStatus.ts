/**
 * QR Billing Status Helper
 * Phase 4: UI Conditional Actions
 * 
 * Provides utility functions for checking billing status across all QR views
 */

export type BillingStatus = 'none' | 'pending_frontdesk' | 'posted_to_folio' | 'paid_direct' | 'cancelled';

/**
 * Check if billing is completed (either posted to folio or paid)
 */
export function isBillingCompleted(billingStatus?: string | null): boolean {
  return billingStatus === 'posted_to_folio' || billingStatus === 'paid_direct';
}

/**
 * Get user-friendly label for billing status
 */
export function getBillingStatusLabel(billingStatus?: string | null): string {
  switch (billingStatus) {
    case 'none':
      return 'Not Billed';
    case 'pending_frontdesk':
      return 'Pending Front Desk';
    case 'posted_to_folio':
      return 'Billed to Room Folio';
    case 'paid_direct':
      return 'Paid via Room Folio';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

/**
 * Get badge color for billing status
 */
export function getBillingStatusColor(billingStatus?: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (billingStatus) {
    case 'pending_frontdesk':
      return 'secondary';
    case 'posted_to_folio':
    case 'paid_direct':
      return 'default';  // Use default for completed billing (will use primary theme color)
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Check if financial actions should be hidden for this request
 * (Hide Collect Payment, Transfer to Front Desk when already billed/paid)
 */
export function shouldHideFinancialActions(billingStatus?: string | null): boolean {
  return isBillingCompleted(billingStatus);
}
