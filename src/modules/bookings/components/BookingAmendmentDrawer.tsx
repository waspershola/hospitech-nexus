import { useState, useEffect } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertCircle, Calendar as CalendarIcon, Edit, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BookingAmendmentDrawerProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
}

export function BookingAmendmentDrawer({ open, onClose, bookingId }: BookingAmendmentDrawerProps) {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();

  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [rateOverride, setRateOverride] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [amendmentReason, setAmendmentReason] = useState('');

  // Fetch booking details
  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          guest:guests(*),
          room:rooms(*),
          organization:organizations(*)
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!bookingId,
  });

  // Fetch available rooms for potential room change
  const { data: availableRooms } = useQuery({
    queryKey: ['available-rooms', checkIn, checkOut, tenantId],
    queryFn: async () => {
      if (!checkIn || !checkOut || !tenantId) return [];

      const { data, error } = await supabase
        .from('rooms')
        .select('*, category:room_categories(*)')
        .eq('tenant_id', tenantId)
        .eq('status', 'available');

      if (error) throw error;

      // Filter out rooms that have conflicting bookings
      const { data: conflictingBookings } = await supabase
        .from('bookings')
        .select('room_id')
        .eq('tenant_id', tenantId)
        .neq('id', bookingId)
        .in('status', ['confirmed', 'checked-in'])
        .or(`and(check_in.lte.${checkOut.toISOString()},check_out.gte.${checkIn.toISOString()})`);

      const conflictingRoomIds = new Set(conflictingBookings?.map(b => b.room_id) || []);
      return data?.filter(room => !conflictingRoomIds.has(room.id)) || [];
    },
    enabled: !!checkIn && !!checkOut && !!tenantId,
  });

  // Initialize form with current booking data
  useEffect(() => {
    if (booking) {
      setCheckIn(new Date(booking.check_in));
      setCheckOut(new Date(booking.check_out));
      setSelectedRoomId(booking.room_id);
      const metadata = booking.metadata as any;
      setRateOverride(metadata?.rate_override?.toString() || '');
      setNotes(metadata?.special_requests || '');
    }
  }, [booking]);

  const amendmentMutation = useMutation({
    mutationFn: async () => {
      try {
        if (!amendmentReason.trim()) {
          throw new Error('Please provide a reason for the amendment');
        }

        // Get current session for authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[amend-booking-drawer] SESSION_ERROR:', sessionError);
          throw new Error(`SESSION_ERROR: ${sessionError.message}`);
        }
        
        if (!session?.access_token) {
          throw new Error('NO_SESSION: Please login to continue');
        }

        console.log('[amend-booking-drawer] AMEND-BOOKING-V1: Calling amend-booking edge function');

        // AMEND-BOOKING-V1: Call edge function for proper folio integration with explicit auth
        const { data, error } = await supabase.functions.invoke('amend-booking', {
          body: {
            booking_id: bookingId,
            check_in: checkIn?.toISOString(),
            check_out: checkOut?.toISOString(),
            room_id: selectedRoomId,
            rate_override: rateOverride ? parseFloat(rateOverride) : null,
            notes,
            amendment_reason: amendmentReason,
            staff_id: user?.id
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        console.log('[amend-booking-drawer] AMEND-BOOKING-V1: Edge function response:', { data, error });

        if (error) {
          console.error('[amend-booking-drawer] AMEND-BOOKING-V1: Edge function error:', error);
          
          // Check for 404 - function not deployed
          if (error.message?.includes('404') || error.context?.status === 404) {
            throw new Error('FUNCTION_NOT_DEPLOYED: The amend booking operation is not available. Please contact your system administrator.');
          }
          
          if (error.message?.includes('JWT') || error.message?.includes('jwt')) {
            throw new Error('SESSION_EXPIRED: Please refresh and try again');
          }
          
          if (error.message?.includes('tenant')) {
            throw new Error('TENANT_MISMATCH: Invalid tenant access');
          }

          if (error.message?.includes('401') || error.context?.status === 401) {
            throw new Error('UNAUTHORIZED: Authentication failed');
          }
          
          throw new Error(`Error: ${error.message}`);
        }

        if (!data?.success) {
          console.error('[amend-booking-drawer] AMEND-BOOKING-V1: Amendment failed:', data);
          throw new Error(data?.error || 'Failed to amend booking');
        }

        return data;
      } catch (err) {
        console.error('[amend-booking-drawer] Error:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      // QUERY-KEY-FIX-V1: Specific cache invalidation with IDs
      const folioId = data?.data?.folio_id;
      
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['room-detail'] });
      queryClient.invalidateQueries({ queryKey: ['booking-folio', bookingId, tenantId] });
      if (folioId) {
        queryClient.invalidateQueries({ queryKey: ['folio', folioId, tenantId] });
      }
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      
      const message = data?.data?.folio_adjusted 
        ? `Booking amended. Price ${data.data.price_difference > 0 ? 'increase' : 'decrease'} of ₦${Math.abs(data.data.price_difference).toLocaleString()} posted to folio.`
        : 'Booking amended successfully';
      
      toast.success(message);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to amend booking: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const metadata = booking?.metadata as any;
  const hasChanges = 
    checkIn?.toISOString() !== booking?.check_in ||
    checkOut?.toISOString() !== booking?.check_out ||
    selectedRoomId !== booking?.room_id ||
    rateOverride !== (metadata?.rate_override?.toString() || '');

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            <SheetTitle>Amend Booking</SheetTitle>
          </div>
          <SheetDescription>
            Modify booking details. All changes will be logged in the audit trail.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Current Booking Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1 text-sm">
                <p><strong>Guest:</strong> {booking?.guest?.name}</p>
                <p><strong>Current Room:</strong> {booking?.room?.number}</p>
                <p><strong>Status:</strong> <Badge variant="secondary" className="capitalize">{booking?.status}</Badge></p>
              </div>
            </AlertDescription>
          </Alert>

          <Separator />

          {/* Amendment Form */}
          <div className="space-y-4">
            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-in Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !checkIn && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkIn ? format(checkIn, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkIn}
                      onSelect={setCheckIn}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Check-out Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !checkOut && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkOut ? format(checkOut, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkOut}
                      onSelect={setCheckOut}
                      disabled={(date) => !checkIn || date <= checkIn}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Room Selection */}
            <div className="space-y-2">
              <Label>Room</Label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="">Select Room</option>
                {availableRooms?.map((room) => (
                  <option key={room.id} value={room.id}>
                    Room {room.number} - {room.category?.name} (₦{Number(room.rate).toLocaleString()}/night)
                  </option>
                ))}
              </select>
              {availableRooms && availableRooms.length === 0 && checkIn && checkOut && (
                <p className="text-sm text-destructive">No rooms available for selected dates</p>
              )}
            </div>

            {/* Rate Override */}
            <div className="space-y-2">
              <Label>Rate Override (per night)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Leave empty to use room rate"
                value={rateOverride}
                onChange={(e) => setRateOverride(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Special Requests/Notes</Label>
              <Textarea
                placeholder="Any special requests or notes..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Amendment Reason */}
            {hasChanges && (
              <div className="space-y-2">
                <Label>Reason for Amendment *</Label>
                <Textarea
                  placeholder="Explain why this booking is being amended..."
                  rows={3}
                  value={amendmentReason}
                  onChange={(e) => setAmendmentReason(e.target.value)}
                  className="border-primary/50"
                />
                {!amendmentReason && (
                  <p className="text-sm text-muted-foreground">Required when making changes</p>
                )}
              </div>
            )}
          </div>

          {/* Previous Amendments */}
          {metadata?.amendments && Array.isArray(metadata.amendments) && metadata.amendments.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Previous Amendments</h4>
                <div className="space-y-2">
                  {metadata.amendments.map((amendment: any, index: number) => (
                    <div key={index} className="text-xs bg-muted p-2 rounded">
                      <p className="font-medium">{format(new Date(amendment.amended_at), 'PPp')}</p>
                      <p className="text-muted-foreground">{amendment.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={amendmentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => amendmentMutation.mutate()}
              className="flex-1"
              disabled={amendmentMutation.isPending || !hasChanges || (hasChanges && !amendmentReason)}
            >
              {amendmentMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
