import { format } from 'date-fns';

interface BookingForOverlap {
  status: string;
  check_in: string;
  check_out: string;
}

/**
 * SINGLE SOURCE OF TRUTH for booking overlap with a date
 * Used by RoomGrid, RoomActionDrawer, and any other component needing this logic
 * 
 * OVERSTAY-FIX-V1: Includes checked_in guests even if checkout date has passed
 * This ensures overstays are correctly identified and displayed.
 */
export function bookingOverlapsDate(booking: BookingForOverlap, targetDate: string): boolean {
  if (['completed', 'cancelled'].includes(booking.status)) {
    return false;
  }
  
  const checkInDate = format(new Date(booking.check_in), 'yyyy-MM-dd');
  const checkOutDate = format(new Date(booking.check_out), 'yyyy-MM-dd');
  
  // Standard overlap: booking spans the target date
  const standardOverlap = checkInDate <= targetDate && checkOutDate >= targetDate;
  
  // OVERSTAY-FIX-V1: Include checked_in guests even if checkout date passed
  // These are overstays that should appear on the grid and drawer
  const isOverstayStillCheckedIn = booking.status === 'checked_in' && checkInDate <= targetDate;
  
  return standardOverlap || isOverstayStillCheckedIn;
}
