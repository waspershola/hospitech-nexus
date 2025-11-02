/**
 * Centralized Group Booking Calculator
 * Handles all financial calculations for group and single bookings
 */

import type { HotelFinancials } from './types';
import { calculateBookingTotal } from './tax';

export interface AddonDefinition {
  id: string;
  label: string;
  price: number;
  description: string;
  type: 'per_night' | 'one_time';
}

export const AVAILABLE_ADDONS: AddonDefinition[] = [
  { id: 'breakfast', label: 'Breakfast', price: 2500, description: 'Continental breakfast for 2', type: 'per_night' },
  { id: 'late_checkout', label: 'Late Checkout (2 PM)', price: 5000, description: 'Extend checkout to 2 PM', type: 'one_time' },
  { id: 'early_checkin', label: 'Early Check-In (10 AM)', price: 3000, description: 'Check in at 10 AM', type: 'one_time' },
  { id: 'airport_pickup', label: 'Airport Pickup', price: 15000, description: 'One-way transfer from airport', type: 'one_time' },
  { id: 'parking', label: 'Parking', price: 1500, description: 'Per night secure parking', type: 'per_night' },
  { id: 'wifi_premium', label: 'Premium WiFi', price: 1000, description: 'High-speed internet access', type: 'per_night' },
];

export interface BookingCalculationParams {
  roomRate: number;
  nights: number;
  numberOfRooms: number;
  selectedAddonIds: string[];
  financials: HotelFinancials;
  rateOverride?: number;
}

export interface BookingCalculationResult {
  baseAmount: number;
  addonsTotal: number;
  subtotal: number;
  vatAmount: number;
  serviceAmount: number;
  totalAmount: number;
  breakdown: {
    roomsSubtotal: number;
    addonsBreakdown: Array<{
      id: string;
      label: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
  };
}

/**
 * Calculate total for a booking (single or group)
 * Formula: Balance Due = (RoomRates + AddOns with taxes) - DepositPaid
 */
export function calculateGroupBookingTotal(params: BookingCalculationParams): BookingCalculationResult {
  const { roomRate, nights, numberOfRooms, selectedAddonIds, financials, rateOverride } = params;
  
  // Step 1: Base Room Calculation
  const effectiveRate = rateOverride || roomRate;
  const baseAmount = effectiveRate * nights * numberOfRooms;
  
  // Step 2: Add-ons Calculation
  const addonsBreakdown: Array<{
    id: string;
    label: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }> = [];
  
  let addonsTotal = 0;
  
  selectedAddonIds.forEach(addonId => {
    const addon = AVAILABLE_ADDONS.find(a => a.id === addonId);
    if (addon) {
      let quantity: number;
      let total: number;
      
      if (addon.type === 'per_night') {
        // Per-night add-ons: multiply by nights × rooms
        quantity = nights * numberOfRooms;
        total = addon.price * quantity;
      } else {
        // One-time add-ons: multiply by number of rooms only
        quantity = numberOfRooms;
        total = addon.price * quantity;
      }
      
      addonsBreakdown.push({
        id: addon.id,
        label: addon.label,
        quantity,
        unitPrice: addon.price,
        total,
      });
      
      addonsTotal += total;
    }
  });
  
  // Step 3: Subtotal (before tax)
  const subtotal = baseAmount + addonsTotal;
  
  // Step 4: Apply Financial Settings (tax and service charge)
  const taxCalculation = calculateBookingTotal(subtotal, financials);
  
  return {
    baseAmount,
    addonsTotal,
    subtotal,
    vatAmount: taxCalculation.vatAmount,
    serviceAmount: taxCalculation.serviceAmount,
    totalAmount: taxCalculation.totalAmount,
    breakdown: {
      roomsSubtotal: baseAmount,
      addonsBreakdown,
    },
  };
}

/**
 * Calculate balance due after deposit
 */
export function calculateBalanceDue(totalAmount: number, depositPaid: number = 0): number {
  return Math.max(0, totalAmount - depositPaid);
}
