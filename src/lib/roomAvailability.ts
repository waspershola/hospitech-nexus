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

  // DEFENSIVE: If room is occupied in DB but booking data missing, preserve occupied status
  // This prevents flickering to "available" when real-time updates don't include booking data
  if (!booking) {
    if (room.status === 'occupied') {
      console.log(`[getRoomStatusNow] Room ${room.number} is occupied in DB but no booking data - preserving occupied status`);
      return 'occupied'; // Preserve database status to prevent auto-reset
    }
    return 'available';
  }

  // PHASE 4: Verify booking belongs to same tenant as room (defensive check)
  if ((booking as any).tenant_id && room.tenant_id && (booking as any).tenant_id !== room.tenant_id) {
    console.error(`[getRoomStatusNow] TENANT MISMATCH: Room ${room.number} (${room.tenant_id}) has booking from different tenant (${(booking as any).tenant_id})`);
    return 'available'; // Treat as available if tenant mismatch
  }

  if (booking.status === 'cancelled' || booking.status === 'completed') {
    return 'available';
  }

  const now = new Date();
  const checkInDT = parseDateTime(booking.check_in, checkInTime);
  const checkOutDT = parseDateTime(booking.check_out, checkOutTime);

  // OVERSTAY: Past checkout time and still checked in
  if (booking.status === 'checked_in' && isAfter(now, checkOutDT)) {
    return 'overstay';
  }

  // Check-in day logic
  if (isToday(new Date(booking.check_in))) {
    // Priority 1: If guest has checked in, show occupied immediately
    if (booking.status === 'checked_in') {
      return 'occupied';
    }
    // Priority 2: Before check-in time and not checked in
    if (isBefore(now, checkInDT)) {
      return 'reserved';
    }
    // Priority 3: Check-in time passed but not checked in yet
    return 'checking_in';
  }

  // Check-out day logic
  if (isToday(new Date(booking.check_out))) {
    if (isAfter(now, checkOutDT)) {
      // Past checkout time
      if (booking.status === 'checked_in') {
        return 'overstay'; // Still occupied after checkout time
      }
      return 'available'; // Already checked out
    }
    return 'checking_out'; // Still before checkout time
  }

  // Mid-stay (between check-in and check-out)
  if (booking.status === 'checked_in') {
    return 'occupied';
  }

  // Future reservation
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
