import { format, isToday, isBefore, isAfter } from 'date-fns';

export interface RoomBooking {
  id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  status: string;
  guest_id?: string;
}

export interface Room {
  id: string;
  number: string;
  status: string;
  [key: string]: any;
}

/**
 * Parse date string with time to create a full DateTime object
 */
function parseDateTime(dateStr: string, timeStr: string): Date {
  const date = new Date(dateStr);
  const [hours, minutes] = timeStr.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Get current status for a room based on active booking and current time
 * This is the SINGLE SOURCE OF TRUTH for room status logic
 */
export function getRoomStatusNow(
  room: Room,
  booking: RoomBooking | null | undefined,
  checkInTime: string = '14:00',
  checkOutTime: string = '12:00'
): 'available' | 'reserved' | 'occupied' | 'checking_in' | 'checking_out' | 'overstay' | 'maintenance' | 'out_of_order' | 'cleaning' {
  // Preserve manual maintenance/cleaning/out_of_order statuses
  if (['maintenance', 'out_of_order', 'cleaning'].includes(room.status)) {
    return room.status as any;
  }

  if (!booking || booking.status === 'cancelled' || booking.status === 'completed') {
    return 'available';
  }

  const now = new Date();
  const checkInDT = parseDateTime(booking.check_in, checkInTime);
  const checkOutDT = parseDateTime(booking.check_out, checkOutTime);
  const checkInDate = new Date(booking.check_in);
  const checkOutDate = new Date(booking.check_out);

  // CHECKED-IN status takes priority regardless of dates
  if (booking.status === 'checked_in') {
    // OVERSTAY: Past checkout time and still checked in
    if (isAfter(now, checkOutDT)) {
      return 'overstay';
    }
    
    // Check-out day (before checkout time)
    if (isToday(checkOutDate)) {
      return 'checking_out';
    }
    
    // Any other checked-in state = occupied
    return 'occupied';
  }

  // RESERVED status logic (guest hasn't checked in yet)
  
  // Check-in is in the PAST and guest still hasn't checked in
  if (isBefore(checkInDate, now) && !isToday(checkInDate)) {
    // Guest should have arrived but didn't - show as checking_in (late arrival)
    return 'checking_in';
  }

  // Check-in is TODAY
  if (isToday(checkInDate)) {
    // Before check-in time
    if (isBefore(now, checkInDT)) {
      return 'reserved';
    }
    // After check-in time but guest hasn't checked in yet
    return 'checking_in';
  }

  // Future reservation (check-in is tomorrow or later)
  return 'reserved';
}

/**
 * Determines the correct room status for a specific date based on bookings
 * Used for historical/future date views (By Date view)
 */
export function getRoomStatusForDate(
  room: Room,
  date: Date,
  bookings: RoomBooking[],
  checkOutTime: string = '12:00'
): 'available' | 'reserved' | 'occupied' | 'check-in' | 'check-out' | 'maintenance' | 'out_of_order' | 'cleaning' {
  // Preserve maintenance/cleaning/out_of_order statuses
  if (['maintenance', 'out_of_order', 'cleaning'].includes(room.status)) {
    return room.status as any;
  }

  const dateStr = format(date, 'yyyy-MM-dd');
  
  // Find booking active on this date
  const activeBooking = bookings.find(b => {
    if (b.room_id !== room.id || b.status === 'cancelled' || b.status === 'completed') return false;
    
    const checkInDate = format(new Date(b.check_in), 'yyyy-MM-dd');
    const checkOutDate = format(new Date(b.check_out), 'yyyy-MM-dd');
    
    return checkInDate <= dateStr && checkOutDate > dateStr;
  });
  
  if (!activeBooking) {
    return 'available';
  }
  
  const checkInDate = format(new Date(activeBooking.check_in), 'yyyy-MM-dd');
  const checkOutDate = format(new Date(activeBooking.check_out), 'yyyy-MM-dd');
  
  // Check-in day
  if (checkInDate === dateStr) {
    return activeBooking.status === 'checked_in' ? 'check-in' : 'reserved';
  }
  
  // Check-out day
  if (checkOutDate === dateStr) {
    return 'check-out';
  }
  
  // Mid-stay
  return activeBooking.status === 'checked_in' ? 'occupied' : 'reserved';
}

/**
 * Get room status badge variant for consistent UI display
 */
export function getRoomStatusBadgeVariant(status: string): string {
  switch (status) {
    case 'available': return 'default';
    case 'reserved': return 'secondary';
    case 'occupied': return 'destructive';
    case 'check-in': return 'default';
    case 'check-out': return 'outline';
    case 'maintenance': return 'outline';
    case 'cleaning': return 'secondary';
    case 'out_of_order': return 'destructive';
    default: return 'default';
  }
}
