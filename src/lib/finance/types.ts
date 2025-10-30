/**
 * Finance-related TypeScript types
 */

export interface HotelFinancials {
  id?: string;
  tenant_id?: string;
  vat_rate: number;
  vat_inclusive: boolean;
  service_charge: number;
  service_charge_inclusive: boolean;
  vat_applied_on?: 'base' | 'subtotal'; // default 'subtotal'
  rounding?: 'round' | 'floor' | 'ceil'; // default 'round'
  currency: string;
  currency_symbol?: string;
  symbol_position?: string;
  decimal_separator?: string;
  thousand_separator?: string;
  decimal_places?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TaxBreakdown {
  baseAmount: number;
  vatAmount: number;
  serviceAmount: number;
  totalAmount: number;
  nights?: number;
  ratePerNight?: number;
}

export interface PaymentType {
  type: 'full' | 'partial' | 'overpayment' | 'pay_later';
  amount: number;
  balance: number;
}

export interface WalletBalance {
  balance: number;
  credit_limit: number;
  percentUsed: number;
  overLimit: boolean;
  nearLimit: boolean;
}
