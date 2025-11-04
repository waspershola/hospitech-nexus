import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuditLog } from '@/hooks/useAuditLog';

export function useRoomActions() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  const updateRoomStatus = async (roomId: string, status: string, reason?: string, manualOverride?: boolean) => {
    const { data: oldRoom } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    // Build update object
    const updateData: any = { status };
    
    // If manual override is specified, update metadata
    if (manualOverride !== undefined) {
      const currentMetadata = (oldRoom?.metadata as Record<string, any>) || {};
      updateData.metadata = {
        ...currentMetadata,
        manual_status_override: manualOverride
      };
    }

    const { data, error } = await supabase
      .from('rooms')
      .update(updateData)
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
    mutationFn: async (roomId: string) => {
      const today = new Date().toISOString().split('T')[0];
      
      // Find the booking that is active TODAY (check-in is today or in the past, checkout is today or in the future)
      const { data: booking, error: bookingFetchError } = await supabase
        .from('bookings')
        .select('id, status, metadata')
        .eq('room_id', roomId)
        .in('status', ['reserved', 'checked_in'])
        .lte('check_in', `${today}T23:59:59`)
        .gte('check_out', `${today}T00:00:00`)
        .order('check_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bookingFetchError) throw bookingFetchError;
      if (!booking) throw new Error('No active booking found for this room today');

      // Update booking status to checked_in with actual check-in timestamp
      const updatedMetadata = {
        ...(booking.metadata as object || {}),
        actual_checkin: new Date().toISOString()
      };

      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({ 
          status: 'checked_in',
          metadata: updatedMetadata
        })
        .eq('id', booking.id);

      if (bookingUpdateError) throw bookingUpdateError;

      // Log booking status change
      logAction({
        action: 'UPDATE',
        table_name: 'bookings',
        record_id: booking.id,
        before_data: { status: booking.status },
        after_data: { status: 'checked_in', metadata: updatedMetadata },
      });

      // Then update room status to occupied
      const { data, error } = await supabase
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', roomId)
        .select()
        .single();

      if (error) throw error;

      logAction({
        action: 'UPDATE',
        table_name: 'rooms',
        record_id: roomId,
        before_data: null,
        after_data: data,
      });

      return data;
    },
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
    mutationFn: ({ roomId, manualOverride = true }: { roomId: string; manualOverride?: boolean }) => 
      updateRoomStatus(roomId, 'maintenance', 'Marked out of service', manualOverride),
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
    markMaintenance: (roomId: string, manualOverride = true) => 
      markMaintenanceMutation.mutate({ roomId, manualOverride }),
    cancelBooking: cancelBookingMutation.mutate,
    updateRoomStatus,
    isLoading: checkInMutation.isPending || checkOutMutation.isPending || markCleanMutation.isPending || markMaintenanceMutation.isPending,
  };
}
