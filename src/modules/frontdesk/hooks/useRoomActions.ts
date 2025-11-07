import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useAuth } from '@/contexts/AuthContext';

export function useRoomActions() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();
  const { tenantId } = useAuth();

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

      // Send check-in SMS notification
      try {
        console.log('🔔 Starting check-in SMS flow for booking:', booking.id);
        
        const { data: smsSettings, error: smsSettingsError } = await supabase
          .from('tenant_sms_settings')
          .select('enabled, auto_send_checkin_reminder')
          .eq('tenant_id', tenantId)
          .maybeSingle();

        console.log('📱 SMS Settings:', { smsSettings, smsSettingsError });

        if (smsSettings?.enabled && smsSettings?.auto_send_checkin_reminder) {
          console.log('✅ SMS is enabled, fetching booking details...');
          
          const { data: fullBooking, error: bookingError } = await supabase
            .from('bookings')
            .select(`
              id,
              booking_reference,
              check_in,
              guest:guests(id, name, phone),
              room:rooms(number)
            `)
            .eq('id', booking.id)
            .single();

          console.log('📋 Full Booking:', { fullBooking, bookingError });

          if (fullBooking?.guest?.phone) {
            console.log('📞 Guest has phone:', fullBooking.guest.phone);
            
            const { data: hotelMeta } = await supabase
              .from('hotel_configurations')
              .select('value')
              .eq('tenant_id', tenantId)
              .eq('key', 'hotel_name')
              .maybeSingle();

            const hotelName = hotelMeta?.value || 'Our Hotel';
            const message = `Hi ${fullBooking.guest.name}, welcome to ${hotelName}! You're checked into Room ${fullBooking.room?.number}. Enjoy your stay!`;

            console.log('📝 SMS Message:', message);

            // Get user session for auth header
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            console.log('🔑 Session:', { hasSession: !!session, sessionError });

            if (!session) {
              console.error('❌ No session available for SMS authentication');
              toast.error('Unable to send SMS: Not authenticated');
              return data;
            }

            console.log('📤 Invoking send-sms function...');
            
            const smsResult = await supabase.functions.invoke('send-sms', {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              body: {
                tenant_id: tenantId,
                to: fullBooking.guest.phone,
                message,
                event_key: 'checkin_notification',
                booking_id: fullBooking.id,
                guest_id: fullBooking.guest.id,
              },
            });

            if (smsResult.error) {
              console.error('❌ Failed to send check-in SMS:', smsResult.error);
              toast.error('Failed to send check-in SMS notification');
            } else {
              console.log('✅ Check-in SMS sent successfully:', smsResult.data);
              toast.success('Check-in SMS sent!', { duration: 2000 });
            }
          } else {
            console.warn('⚠️ Guest has no phone number');
          }
        } else {
          console.log('ℹ️ SMS not enabled or check-in reminder disabled');
        }
      } catch (smsError) {
        console.error('❌ SMS notification error:', smsError);
        toast.error('SMS notification error');
      }

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

        // Send checkout confirmation SMS
        try {
          console.log('🔔 Starting checkout SMS flow for booking:', booking.id);
          
          const { data: smsSettings, error: smsSettingsError } = await supabase
            .from('tenant_sms_settings')
            .select('enabled, auto_send_checkout_confirmation')
            .eq('tenant_id', tenantId)
            .maybeSingle();

          console.log('📱 SMS Settings:', { smsSettings, smsSettingsError });

          if (smsSettings?.enabled && smsSettings?.auto_send_checkout_confirmation) {
            console.log('✅ SMS is enabled, fetching booking details...');
            
            const { data: fullBooking, error: bookingError } = await supabase
              .from('bookings')
              .select(`
                id,
                guest:guests(id, name, phone),
                room:rooms(number)
              `)
              .eq('id', booking.id)
              .single();

            console.log('📋 Full Booking:', { fullBooking, bookingError });

            if (fullBooking?.guest?.phone) {
              console.log('📞 Guest has phone:', fullBooking.guest.phone);
              
              const { data: hotelMeta } = await supabase
                .from('hotel_configurations')
                .select('value')
                .eq('tenant_id', tenantId)
                .eq('key', 'hotel_name')
                .maybeSingle();

              const hotelName = hotelMeta?.value || 'Our Hotel';
              const message = `Thank you for staying at ${hotelName}! We hope you enjoyed your stay in Room ${fullBooking.room?.number}. Safe travels!`;

              console.log('📝 SMS Message:', message);

              const { data: { session }, error: sessionError } = await supabase.auth.getSession();
              console.log('🔑 Session:', { hasSession: !!session, sessionError });

              if (!session) {
                console.error('❌ No session available for SMS authentication');
                toast.error('Unable to send SMS: Not authenticated');
                return;
              }

              console.log('📤 Invoking send-sms function...');
              
              const smsResult = await supabase.functions.invoke('send-sms', {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: {
                  tenant_id: tenantId,
                  to: fullBooking.guest.phone,
                  message,
                  event_key: 'checkout_confirmation',
                  booking_id: fullBooking.id,
                  guest_id: fullBooking.guest.id,
                },
              });

              if (smsResult.error) {
                console.error('❌ Failed to send checkout SMS:', smsResult.error);
                toast.error('Failed to send checkout SMS notification');
              } else {
                console.log('✅ Checkout SMS sent successfully:', smsResult.data);
                toast.success('Checkout SMS sent!', { duration: 2000 });
              }
            } else {
              console.warn('⚠️ Guest has no phone number');
            }
          } else {
            console.log('ℹ️ SMS not enabled or checkout confirmation disabled');
          }
        } catch (smsError) {
          console.error('❌ Checkout SMS notification error:', smsError);
          toast.error('SMS notification error');
        }
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
