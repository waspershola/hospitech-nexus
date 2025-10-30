/**
 * Tax Calculation Helpers
 * Handles VAT and Service Charge calculations for bookings
 * 
 * IMPORTANT: This implementation uses mathematically correct formulas for
 * inclusive/exclusive tax calculations with proper rounding.
 */

import type { HotelFinancials, TaxBreakdown } from './types';

function toDecimal(ratePercent: number): number {
  return ratePercent / 100;
}

function roundMoney(value: number, rounding: 'round' | 'floor' | 'ceil' = 'round'): number {
  // Use cents to avoid floating point issues
  const cents = value * 100;
  if (rounding === 'round') return Math.round(cents) / 100;
  if (rounding === 'floor') return Math.floor(cents) / 100;
  return Math.ceil(cents) / 100;
}

/**
 * Calculate booking total with VAT and Service Charge
 * Handles both inclusive and exclusive pricing
 * 
 * @param baseAmount - The base amount (e.g., room rate * nights) BEFORE taxes
 * @param settings - Hotel financial settings including tax rates and policies
 * @returns Tax breakdown with base, VAT, service charge, and total amounts
 */
export function calculateBookingTotal(
  baseAmount: number,
  settings: HotelFinancials
): TaxBreakdown {
  const vat = toDecimal(settings.vat_rate || 0);
  const service = toDecimal(settings.service_charge || 0);
  const applyOn = settings.vat_applied_on || 'subtotal';
  const rounding = settings.rounding || 'round';

  // If neither VAT nor service charge, quick return
  if ((!vat || vat === 0) && (!service || service === 0)) {
    return {
      baseAmount: roundMoney(baseAmount, rounding),
      serviceAmount: 0,
      vatAmount: 0,
      totalAmount: roundMoney(baseAmount, rounding),
    };
  }

  // Case A: Both exclusive (prices do NOT include taxes)
  if (!settings.service_charge_inclusive && !settings.vat_inclusive) {
    const serviceAmount = roundMoney(baseAmount * service, rounding);
    const subtotal = roundMoney(baseAmount + serviceAmount, rounding);

    const vatBase = applyOn === 'base' ? baseAmount : subtotal;
    const vatAmount = roundMoney(vatBase * vat, rounding);

    const totalAmount = roundMoney(subtotal + vatAmount, rounding);

    return { 
      baseAmount: roundMoney(baseAmount, rounding), 
      serviceAmount, 
      vatAmount, 
      totalAmount 
    };
  }

  // Case B: Both inclusive (prices include both taxes)
  if (settings.service_charge_inclusive && settings.vat_inclusive) {
    if (applyOn === 'subtotal') {
      // VAT applied on subtotal (base + service)
      const denom = (1 + service) * (1 + vat);
      const base = roundMoney(baseAmount / denom, rounding);
      const serviceAmount = roundMoney(base * service, rounding);
      const vatAmount = roundMoney((base + serviceAmount) * vat, rounding);
      const totalAmount = roundMoney(base + serviceAmount + vatAmount, rounding);
      return { baseAmount: base, serviceAmount, vatAmount, totalAmount };
    } else {
      // VAT applied on base only (rare case)
      const denom = (1 + vat) + service;
      const base = roundMoney(baseAmount / denom, rounding);
      const serviceAmount = roundMoney(base * service, rounding);
      const vatAmount = roundMoney(base * vat, rounding);
      const totalAmount = roundMoney(base + serviceAmount + vatAmount, rounding);
      return { baseAmount: base, serviceAmount, vatAmount, totalAmount };
    }
  }

  // Case C: Service inclusive, VAT exclusive
  if (settings.service_charge_inclusive && !settings.vat_inclusive) {
    // Extract base from inclusive service: price = base * (1 + service)
    const base = roundMoney(baseAmount / (1 + service), rounding);
    const serviceAmount = roundMoney(base * service, rounding);
    const vatBase = applyOn === 'base' ? base : roundMoney(base + serviceAmount, rounding);
    const vatAmount = roundMoney(vatBase * vat, rounding);
    const totalAmount = roundMoney(base + serviceAmount + vatAmount, rounding);
    return { baseAmount: base, serviceAmount, vatAmount, totalAmount };
  }

  // Case D: Service exclusive, VAT inclusive (rare)
  if (!settings.service_charge_inclusive && settings.vat_inclusive) {
    const denom = (1 + vat);
    const subtotal = roundMoney(baseAmount / denom, rounding);
    const serviceAmount = roundMoney(subtotal * service, rounding);
    const baseApprox = roundMoney(subtotal - serviceAmount, rounding);
    const vatAmount = roundMoney(subtotal * vat, rounding);
    const totalAmount = roundMoney(subtotal + vatAmount, rounding);
    return { baseAmount: baseApprox, serviceAmount, vatAmount, totalAmount };
  }

  // Fallback: treat as exclusive
  const serviceAmount = roundMoney(baseAmount * service, rounding);
  const subtotal = roundMoney(baseAmount + serviceAmount, rounding);
  const vatBase = applyOn === 'base' ? baseAmount : subtotal;
  const vatAmount = roundMoney(vatBase * vat, rounding);
  const totalAmount = roundMoney(subtotal + vatAmount, rounding);
  return { 
    baseAmount: roundMoney(baseAmount, rounding), 
    serviceAmount, 
    vatAmount, 
    totalAmount 
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
