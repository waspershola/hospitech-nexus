/**
 * Shared folio formatting utilities for consistent display across Group Billing UI
 * Version: GROUP-BILLING-UI-V1
 */

/**
 * Format monetary amount with currency symbol
 */
export function formatFolioMoney(amount: number, currency: string): string {
  const symbol = currency === 'NGN' ? '₦' : currency;
  return `${symbol}${Math.abs(amount).toLocaleString('en-US', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })}`;
}

/**
 * Check if balance represents a credit (overpayment)
 */
export function isCredit(balance: number): boolean {
  return balance < 0;
}

/**
 * Get formatted label for credit balances
 */
export function getCreditLabel(balance: number, currency: string): string {
  if (!isCredit(balance)) {
    return formatFolioMoney(balance, currency);
  }
  return `Credit: ${formatFolioMoney(Math.abs(balance), currency)}`;
}

/**
 * Get Tailwind color class for balance display
 */
export function getBalanceColor(balance: number): string {
  if (balance > 0) return 'text-destructive'; // Guest owes money
  if (balance < 0) return 'text-green-600';   // Credit/overpayment
  return 'text-muted-foreground';              // Zero balance
}

/**
 * Get badge variant for folio status
 */
export function getFolioStatusVariant(status: string): 'default' | 'secondary' | 'outline' {
  if (status === 'open') return 'default';
  if (status === 'closed') return 'secondary';
  return 'outline';
}
