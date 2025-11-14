import { supabase } from '@/integrations/supabase/client';

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
