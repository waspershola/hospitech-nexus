/**
 * Platform Fee Calculation
 * Calculates platform fees for bookings and QR payments
 */

import type { Database } from '@/integrations/supabase/types';

type PlatformFeeConfig = Database['public']['Tables']['platform_fee_configurations']['Row'];

export interface PlatformFeeBreakdown {
  baseAmount: number;
  platformFee: number;
  totalAmount: number;
  feeConfig?: PlatformFeeConfig | null;
}

/**
 * Calculate platform fee for bookings
 * @param amount - The amount to calculate fee on (after VAT and service charge)
 * @param feeConfig - Platform fee configuration
 * @returns Breakdown with base, fee, and total amounts
 */
export function calculatePlatformFee(
  amount: number,
  feeConfig: PlatformFeeConfig | null
): PlatformFeeBreakdown {
  // No fee if config is null or inactive
  if (!feeConfig || !feeConfig.active) {
    return {
      baseAmount: amount,
      platformFee: 0,
      totalAmount: amount,
    };
  }

  // Check if applies to bookings
  if (!feeConfig.applies_to?.includes('bookings')) {
    return {
      baseAmount: amount,
      platformFee: 0,
      totalAmount: amount,
    };
  }

  // Calculate fee amount
  const fee = feeConfig.fee_type === 'percentage'
    ? amount * (feeConfig.booking_fee / 100)
    : feeConfig.booking_fee;

  // Determine total based on payer mode
  // Guest pays (inclusive): add fee to amount
  // Property pays (exclusive): no change to guest total
  const totalAmount = feeConfig.payer === 'guest' && feeConfig.mode === 'inclusive'
    ? amount + fee
    : amount;

  return {
    baseAmount: amount,
    platformFee: fee,
    totalAmount,
    feeConfig,
  };
}

/**
 * Calculate platform fee for QR payments
 */
export function calculateQRPlatformFee(
  amount: number,
  feeConfig: PlatformFeeConfig | null
): PlatformFeeBreakdown {
  if (!feeConfig || !feeConfig.active) {
    return {
      baseAmount: amount,
      platformFee: 0,
      totalAmount: amount,
    };
  }

  // Check if applies to QR payments
  if (!feeConfig.applies_to?.includes('qr_payments')) {
    return {
      baseAmount: amount,
      platformFee: 0,
      totalAmount: amount,
    };
  }

  // Calculate fee using qr_fee instead of booking_fee
  const fee = feeConfig.fee_type === 'percentage'
    ? amount * (feeConfig.qr_fee / 100)
    : feeConfig.qr_fee;

  // Determine total based on payer mode
  const totalAmount = feeConfig.payer === 'guest' && feeConfig.mode === 'inclusive'
    ? amount + fee
    : amount;

  return {
    baseAmount: amount,
    platformFee: fee,
    totalAmount,
    feeConfig,
  };
}
