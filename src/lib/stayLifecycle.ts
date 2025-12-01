// STAY-LIFECYCLE-V1: Unified stay lifecycle state calculation
// This module provides a single source of truth for determining room and booking status

import { format } from 'date-fns';

export type StayLifecycleState =
  | 'vacant'
  | 'reserved-future'
  | 'expected-arrival-today'
  | 'in-house'
  | 'departing-today'
  | 'overstay'
  | 'post-stay';

export type DisplayStatus =
  | 'available'
  | 'reserved'
  | 'occupied'
  | 'departing-today'
  | 'overstay'
  | 'no-show'
  | 'cleaning'
  | 'maintenance'
  | 'out_of_order';

export type AllowedAction =
  | 'check-in'
  | 'early-check-in'
  | 'checkout'
  | 'collect-payment'
  | 'add-charge'
  | 'extend-stay'
  | 'transfer-room'
  | 'view-folio'
  | 'amend-booking'
  | 'cancel-booking'
  | 'print-receipt'
  | 'view-only';

interface LifecycleResult {
  state: StayLifecycleState;
  displayStatus: DisplayStatus;
  allowedActions: AllowedAction[];
  statusMessage?: string;
}

interface BookingData {
  arrival_date?: string;
  check_in?: string;
  departure_date?: string;
  check_out?: string;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  status?: string;
  metadata?: any;
}

interface RoomData {
  status?: string;
  manual_override?: boolean;
}

/**
 * Calculate the current lifecycle state of a stay/booking
 * @param now Current date/time in hotel local time
 * @param checkInTime Hotel check-in time (e.g., "14:00")
 * @param checkOutTime Hotel check-out time (e.g., "12:00")
 * @param booking Booking/stay data
 * @param room Room data (for manual overrides like maintenance)
 * @returns Lifecycle state with display status and allowed actions
 */
export function calculateStayLifecycleState(
  now: Date,
  checkInTime: string = '14:00',
  checkOutTime: string = '12:00',
  booking: BookingData | null,
  room?: RoomData
): LifecycleResult {
  // Handle manual room statuses (maintenance, out_of_order, cleaning)
  if (room?.status === 'maintenance') {
    return {
      state: 'vacant',
      displayStatus: 'maintenance',
      allowedActions: [],
      statusMessage: 'Under maintenance',
    };
  }

  if (room?.status === 'out_of_order') {
    return {
      state: 'vacant',
      displayStatus: 'out_of_order',
      allowedActions: [],
      statusMessage: 'Out of order',
    };
  }

  if (room?.status === 'cleaning') {
    return {
      state: 'vacant',
      displayStatus: 'cleaning',
      allowedActions: [],
      statusMessage: 'Being cleaned',
    };
  }

  // No booking - room is vacant
  if (!booking || booking.status === 'cancelled') {
    return {
      state: 'vacant',
      displayStatus: 'available',
      allowedActions: [],
    };
  }

  // Post-checkout - stay is complete
  if (booking.status === 'completed') {
    return {
      state: 'post-stay',
      displayStatus: 'cleaning',
      allowedActions: ['view-folio', 'print-receipt'],
      statusMessage: 'Checked out',
    };
  }

  const today = format(now, 'yyyy-MM-dd');
  const currentTime = format(now, 'HH:mm');

  // Extract dates from booking
  const arrivalDate = booking.check_in ? format(new Date(booking.check_in), 'yyyy-MM-dd') : null;
  const departureDate = booking.check_out ? format(new Date(booking.check_out), 'yyyy-MM-dd') : null;

  if (!arrivalDate || !departureDate) {
    return {
      state: 'vacant',
      displayStatus: 'available',
      allowedActions: [],
    };
  }

  // Future reservation
  if (arrivalDate > today) {
    return {
      state: 'reserved-future',
      displayStatus: 'reserved',
      allowedActions: ['amend-booking', 'cancel-booking'],
      statusMessage: `Arriving ${arrivalDate}`,
    };
  }

  // Expected arrival today (not yet checked in)
  if (arrivalDate === today && booking.status !== 'checked_in') {
    const canCheckIn = currentTime >= checkInTime;
    const canEarlyCheckIn = currentTime < checkInTime;
    
    return {
      state: 'expected-arrival-today',
      displayStatus: 'reserved',
      allowedActions: canCheckIn
        ? ['check-in', 'amend-booking', 'cancel-booking']
        : canEarlyCheckIn
          ? ['early-check-in', 'amend-booking', 'cancel-booking']
          : ['amend-booking', 'cancel-booking'],
      statusMessage: canCheckIn
        ? 'Ready to check in'
        : `Check-in from ${checkInTime}`,
    };
  }

  // Checked in - determine if in-house, departing today, or overstay
  if (booking.status === 'checked_in') {
    // Departing today
    if (departureDate === today) {
      const isOverstay = currentTime >= checkOutTime;
      
      if (isOverstay) {
        return {
          state: 'overstay',
          displayStatus: 'overstay',
          allowedActions: [
            'checkout',
            'collect-payment',
            'add-charge',
            'extend-stay',
            'transfer-room',
            'view-folio',
          ],
          statusMessage: `Due out at ${checkOutTime}`,
        };
      }

      return {
        state: 'departing-today',
        displayStatus: 'departing-today',
        allowedActions: [
          'checkout',
          'collect-payment',
          'add-charge',
          'extend-stay',
          'transfer-room',
          'view-folio',
        ],
        statusMessage: `Due out at ${checkOutTime}`,
      };
    }

    // Already past departure date - overstay
    if (departureDate < today) {
      return {
        state: 'overstay',
        displayStatus: 'overstay',
        allowedActions: [
          'checkout',
          'collect-payment',
          'add-charge',
          'extend-stay',
          'transfer-room',
          'view-folio',
        ],
        statusMessage: `Due out ${departureDate}`,
      };
    }

    // Regular in-house guest
    return {
      state: 'in-house',
      displayStatus: 'occupied',
      allowedActions: [
        'checkout',
        'collect-payment',
        'add-charge',
        'extend-stay',
        'transfer-room',
        'view-folio',
      ],
      statusMessage: `Departing ${departureDate}`,
    };
  }

  // NO-SHOW or LATE ARRIVAL: Arrival was in the past but checkout hasn't passed
  // Guest was supposed to arrive but hasn't checked in yet - show as no-show
  if (arrivalDate < today && departureDate >= today && booking.status === 'reserved') {
    // On checkout day - this is effectively a no-show
    if (departureDate === today) {
      return {
        state: 'expected-arrival-today',
        displayStatus: 'no-show',
        allowedActions: ['check-in', 'cancel-booking', 'amend-booking'],
        statusMessage: 'No-show - expected arrival yesterday',
      };
    }
    
    // Multi-day stay, arrival passed but checkout is still in future
    return {
      state: 'expected-arrival-today',
      displayStatus: 'no-show',
      allowedActions: ['check-in', 'cancel-booking', 'amend-booking'],
      statusMessage: `Late arrival - expected ${arrivalDate}`,
    };
  }

  // Default fallback
  return {
    state: 'vacant',
    displayStatus: 'available',
    allowedActions: [],
  };
}

/**
 * Check if a specific action is allowed in the current lifecycle state
 */
export function isActionAllowed(
  lifecycle: LifecycleResult,
  action: AllowedAction
): boolean {
  return lifecycle.allowedActions.includes(action);
}
