import { supabase } from '@/integrations/supabase/client';

/**
 * Auto-complete bookings that are past their check-out date
 * Should be called on app initialization and periodically
 */
export async function autoCompleteOverdueBookings(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();
  
  // Find bookings that should have been completed
  const { data: overdueBookings } = await supabase
    .from('bookings')
    .select('id, room_id, check_out')
    .eq('tenant_id', tenantId)
    .in('status', ['reserved', 'checked_in'])
    .lt('check_out', todayStr);
  
  if (!overdueBookings || overdueBookings.length === 0) {
    return { completed: 0 };
  }
  
  console.log(`[autoCompleteOverdueBookings] Found ${overdueBookings.length} overdue bookings`);
  
  // Complete each booking
  for (const booking of overdueBookings) {
    // Update booking status
    await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', booking.id);
    
    // Update room status to cleaning
    await supabase
      .from('rooms')
      .update({ 
        status: 'cleaning'
      })
      .eq('id', booking.room_id);
  }
  
  return { completed: overdueBookings.length };
}

/**
 * Sync room status based on current bookings
 */
export async function syncRoomStatusFromBookings(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get all rooms with their active bookings
  const { data: rooms } = await supabase
    .from('rooms')
    .select(`
      id, 
      status,
      bookings!bookings_room_id_fkey(
        id, 
        status, 
        check_in, 
        check_out
      )
    `)
    .eq('tenant_id', tenantId);
  
  if (!rooms) return { synced: 0 };
  
  let syncedCount = 0;
  
  for (const room of rooms) {
    // Skip rooms in maintenance/cleaning/out_of_order
    if (['maintenance', 'cleaning', 'out_of_order'].includes(room.status)) {
      continue;
    }
    
    // Find active booking for today
    const activeBooking = (room.bookings || []).find((b: any) => {
      if (['completed', 'cancelled'].includes(b.status)) return false;
      
      const checkInDate = new Date(b.check_in);
      const checkOutDate = new Date(b.check_out);
      checkInDate.setHours(0, 0, 0, 0);
      checkOutDate.setHours(0, 0, 0, 0);
      
      return checkInDate <= today && checkOutDate > today;
    });
    
    // Determine correct status
    let correctStatus = 'available';
    if (activeBooking) {
      correctStatus = activeBooking.status === 'checked_in' ? 'occupied' : 'reserved';
    }
    
    // Update if status doesn't match
    if (room.status !== correctStatus) {
      await supabase
        .from('rooms')
        .update({ status: correctStatus })
        .eq('id', room.id);
      
      syncedCount++;
    }
  }
  
  return { synced: syncedCount };
}
