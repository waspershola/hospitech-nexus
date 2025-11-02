import { format } from 'date-fns';

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
 * Determines the correct room status for a specific date based on bookings
 * This ensures consistency between "Room Status" and "By Date" views
 */
export function getRoomStatusForDate(
  room: Room,
  date: Date,
  bookings: RoomBooking[]
): 'available' | 'reserved' | 'occupied' | 'check-in' | 'check-out' | 'maintenance' | 'out_of_order' | 'cleaning' {
  // Preserve maintenance/cleaning/out_of_order statuses
  if (['maintenance', 'out_of_order', 'cleaning'].includes(room.status)) {
    return room.status as any;
  }

  const dateStr = format(date, 'yyyy-MM-dd');
  
  // Find booking active on this date
  const activeBooking = bookings.find(b => {
    if (b.room_id !== room.id || b.status === 'cancelled') return false;
    
    // Normalize ISO timestamps to yyyy-MM-dd for proper comparison
    const checkInDate = format(new Date(b.check_in), 'yyyy-MM-dd');
    const checkOutDate = format(new Date(b.check_out), 'yyyy-MM-dd');
    
    return checkInDate <= dateStr && checkOutDate > dateStr;
  });
  
  if (!activeBooking) {
    return 'available';
  }
  
  // Normalize dates for check-in/check-out day comparison
  const checkInDate = format(new Date(activeBooking.check_in), 'yyyy-MM-dd');
  const checkOutDate = format(new Date(activeBooking.check_out), 'yyyy-MM-dd');
  
  // Check if it's check-in day
  if (checkInDate === dateStr) {
    return activeBooking.status === 'checked_in' ? 'check-in' : 'reserved';
  }
  
  // Check if it's check-out day
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
