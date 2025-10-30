/**
 * Tax Calculation Helpers
 * Handles VAT and Service Charge calculations for bookings
 */

export interface HotelFinancials {
  vat_rate: number;
  vat_inclusive: boolean;
  service_charge: number;
  service_charge_inclusive: boolean;
}

export interface TaxBreakdown {
  baseAmount: number;
  vatAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  nights?: number;
  ratePerNight?: number;
}

/**
 * Calculate booking total with VAT and Service Charge
 * Handles both inclusive and exclusive pricing
 */
export function calculateBookingTotal(
  baseRate: number,
  nights: number,
  financials: HotelFinancials
): TaxBreakdown {
  const baseAmount = baseRate * nights;
  let vatAmount = 0;
  let serviceChargeAmount = 0;
  let totalAmount = baseAmount;
  
  // Calculate VAT
  if (financials.vat_rate > 0) {
    if (financials.vat_inclusive) {
      // VAT is included in base amount, extract it
      vatAmount = baseAmount - (baseAmount / (1 + financials.vat_rate / 100));
    } else {
      // VAT is added on top
      vatAmount = baseAmount * (financials.vat_rate / 100);
      totalAmount += vatAmount;
    }
  }
  
  // Calculate Service Charge
  if (financials.service_charge > 0) {
    const chargeBase = financials.vat_inclusive ? baseAmount : (baseAmount + vatAmount);
    
    if (financials.service_charge_inclusive) {
      // Service charge is included, extract it
      serviceChargeAmount = chargeBase - (chargeBase / (1 + financials.service_charge / 100));
    } else {
      // Service charge is added on top
      serviceChargeAmount = chargeBase * (financials.service_charge / 100);
      totalAmount += serviceChargeAmount;
    }
  }
  
  return {
    baseAmount,
    vatAmount,
    serviceChargeAmount,
    totalAmount,
    nights,
    ratePerNight: baseRate,
  };
}

/**
 * Calculate tax for a single amount (not based on nights)
 */
export function calculateTaxForAmount(
  amount: number,
  rate: number,
  inclusive: boolean = false
): number {
  if (rate === 0) return 0;
  
  if (inclusive) {
    // Extract tax from amount
    return amount - (amount / (1 + rate / 100));
  } else {
    // Add tax on top
    return amount * (rate / 100);
  }
}

/**
 * Format currency - supports both string (legacy) and settings object
 */
export function formatCurrency(
  amount: number, 
  settingsOrCurrency?: string | { 
    currency?: string;
    currency_symbol?: string;
    symbol_position?: string;
    decimal_separator?: string;
    thousand_separator?: string;
    decimal_places?: number;
  }
): string {
  // Handle legacy string parameter
  if (typeof settingsOrCurrency === 'string') {
    const symbol = settingsOrCurrency === 'NGN' ? '₦' : settingsOrCurrency;
    return `${symbol}${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  // Handle settings object
  const settings = settingsOrCurrency;
  const symbol = settings?.currency_symbol || '₦';
  const decimals = settings?.decimal_places ?? 2;
  const decimalSep = settings?.decimal_separator || '.';
  const thousandSep = settings?.thousand_separator || ',';
  const position = settings?.symbol_position || 'before';
  
  // Format the number
  const parts = amount.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
  const formatted = parts.join(decimalSep);
  
  return position === 'before' ? `${symbol}${formatted}` : `${formatted}${symbol}`;
}

/**
 * Get tax summary text for display
 */
export function getTaxSummary(breakdown: TaxBreakdown, financials: HotelFinancials): string {
  const parts: string[] = [];
  
  if (breakdown.nights && breakdown.ratePerNight) {
    parts.push(`${breakdown.nights} night${breakdown.nights > 1 ? 's' : ''} × ${formatCurrency(breakdown.ratePerNight)}`);
  }
  
  if (financials.vat_rate > 0) {
    parts.push(`VAT ${financials.vat_inclusive ? '(incl)' : ''}: ${financials.vat_rate}%`);
  }
  
  if (financials.service_charge > 0) {
    parts.push(`Service ${financials.service_charge_inclusive ? '(incl)' : ''}: ${financials.service_charge}%`);
  }
  
  return parts.join(' • ');
}
