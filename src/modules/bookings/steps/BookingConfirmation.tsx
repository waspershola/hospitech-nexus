import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { BookingData } from '../BookingFlow';

interface BookingConfirmationProps {
  bookingData: BookingData;
  onChange: (data: BookingData) => void;
  onComplete: () => void;
}

export function BookingConfirmation({ bookingData, onComplete }: BookingConfirmationProps) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const { data: guest } = useQuery({
    queryKey: ['guest', bookingData.guestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', bookingData.guestId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingData.guestId,
  });

  const { data: room } = useQuery({
    queryKey: ['room', bookingData.roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, category:room_categories(name, base_rate)')
        .eq('id', bookingData.roomId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingData.roomId,
  });

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !bookingData.guestId || !bookingData.roomId || !bookingData.checkIn || !bookingData.checkOut) {
        throw new Error('Missing required booking information');
      }

      // Validate booking with edge function first
      const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-booking', {
        body: {
          tenant_id: tenantId,
          room_id: bookingData.roomId,
          guest_id: bookingData.guestId,
          organization_id: bookingData.organizationId,
          check_in: bookingData.checkIn.toISOString(),
          check_out: bookingData.checkOut.toISOString(),
          category_id: room?.category_id,
        },
      });

      if (validationError) {
        throw new Error(validationError.message || 'Validation failed');
      }

      if (!validationResult?.success) {
        throw new Error(validationResult?.error || 'Booking validation failed');
      }

      const actionId = crypto.randomUUID();

      const { data, error } = await supabase
        .from('bookings')
        .insert([{
          tenant_id: tenantId,
          guest_id: bookingData.guestId,
          organization_id: bookingData.organizationId,
          room_id: bookingData.roomId,
          check_in: bookingData.checkIn.toISOString(),
          check_out: bookingData.checkOut.toISOString(),
          total_amount: bookingData.totalAmount || 0,
          status: 'reserved',
          action_id: actionId,
          metadata: {
            created_via: 'front_desk',
            created_at: new Date().toISOString(),
          },
        }])
        .select()
        .single();

      if (error) throw error;

      // Update room status to reserved
      await supabase
        .from('rooms')
        .update({ status: 'reserved' })
        .eq('id', bookingData.roomId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      toast.success('Booking created successfully!');
      onComplete();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create booking: ${error.message}`);
    },
  });

  const nights = bookingData.checkIn && bookingData.checkOut
    ? Math.ceil((bookingData.checkOut.getTime() - bookingData.checkIn.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-3">Guest Details</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {guest?.name}</p>
            <p><span className="text-muted-foreground">Email:</span> {guest?.email}</p>
            <p><span className="text-muted-foreground">Phone:</span> {guest?.phone}</p>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-lg mb-3">Room Details</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Room:</span> {room?.number}</p>
            <p><span className="text-muted-foreground">Type:</span> {room?.category?.name || room?.type}</p>
            <p><span className="text-muted-foreground">Rate:</span> ₦{room?.category?.base_rate || room?.rate}/night</p>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-lg mb-3">Stay Details</h3>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Check-In:</span>{' '}
              {bookingData.checkIn?.toLocaleDateString()}
            </p>
            <p>
              <span className="text-muted-foreground">Check-Out:</span>{' '}
              {bookingData.checkOut?.toLocaleDateString()}
            </p>
            <p>
              <span className="text-muted-foreground">Nights:</span> {nights}
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Total Amount:</span>
          <span className="text-2xl font-bold text-primary">
            ₦{bookingData.totalAmount?.toFixed(2) || '0.00'}
          </span>
        </div>
      </Card>

      <Button
        onClick={() => createBookingMutation.mutate()}
        disabled={createBookingMutation.isPending}
        className="w-full"
        size="lg"
      >
        {createBookingMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Booking...
          </>
        ) : (
          <>
            <Check className="w-4 h-4 mr-2" />
            Confirm Booking
          </>
        )}
      </Button>
    </div>
  );
}
