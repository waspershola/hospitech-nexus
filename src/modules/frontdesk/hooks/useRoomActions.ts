import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuditLog } from '@/hooks/useAuditLog';

export function useRoomActions() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  const updateRoomStatus = async (roomId: string, status: string, reason?: string) => {
    const { data: oldRoom } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    const { data, error } = await supabase
      .from('rooms')
      .update({ status })
      .eq('id', roomId)
      .select()
      .single();

    if (error) throw error;

    logAction({
      action: 'UPDATE',
      table_name: 'rooms',
      record_id: roomId,
      before_data: oldRoom,
      after_data: data,
    });

    return data;
  };

  const checkInMutation = useMutation({
    mutationFn: (roomId: string) => updateRoomStatus(roomId, 'occupied', 'Guest checked in'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['room-detail'] });
      toast.success('Guest checked in successfully');
    },
    onError: (error: Error) => {
      toast.error(`Check-in failed: ${error.message}`);
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (roomId: string) => {
      // First get the active booking to update its metadata
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, metadata')
        .eq('room_id', roomId)
        .in('status', ['checked_in', 'reserved'])
        .single();

      // Update room status
      await updateRoomStatus(roomId, 'cleaning', 'Guest checked out');
      
      // Complete the active booking with updated metadata
      if (booking) {
        const updatedMetadata = {
          ...(booking.metadata as object || {}),
          actual_checkout: new Date().toISOString()
        };

        const { error } = await supabase
          .from('bookings')
          .update({ 
            status: 'completed',
            metadata: updatedMetadata
          })
          .eq('id', booking.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['room-detail'] });
      toast.success('Guest checked out successfully');
    },
    onError: (error: Error) => {
      toast.error(`Check-out failed: ${error.message}`);
    },
  });

  const markCleanMutation = useMutation({
    mutationFn: (roomId: string) => updateRoomStatus(roomId, 'available', 'Room cleaned'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['room-detail'] });
      toast.success('Room marked as clean');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update room: ${error.message}`);
    },
  });

  const markMaintenanceMutation = useMutation({
    mutationFn: (roomId: string) => updateRoomStatus(roomId, 'maintenance', 'Marked out of service'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['room-detail'] });
      toast.success('Room marked for maintenance');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update room: ${error.message}`);
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['room-detail'] });
      toast.success('Booking cancelled successfully');
    },
    onError: (error: Error) => {
      toast.error(`Cancellation failed: ${error.message}`);
    },
  });

  return {
    checkIn: checkInMutation.mutate,
    checkOut: checkOutMutation.mutate,
    markClean: markCleanMutation.mutate,
    markMaintenance: markMaintenanceMutation.mutate,
    cancelBooking: cancelBookingMutation.mutate,
    isLoading: checkInMutation.isPending || checkOutMutation.isPending || markCleanMutation.isPending || markMaintenanceMutation.isPending,
  };
}
