import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isElectronContext } from '@/lib/environment/isElectron';
import { 
  offlineCheckIn, 
  saveBookingEvent, 
  updateBookingCache,
  updateRoomCache 
} from '@/lib/offline/electronCheckinCheckoutBridge';
import { setOfflineRoomStatus } from '@/lib/offline/electronRoomGridBridge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Users, Loader2, DollarSign } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useTodayArrivals } from '@/hooks/useTodayArrivals';

interface BulkCheckInDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface ArrivalBooking {
  id: string;
  check_in: string;
  check_out: string;
  total_amount: number;
  guest_id: string;
  room_id: string;
  status: string;
  guest: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  room: {
    id: string;
    number: string;
    category?: {
      name: string;
    };
  };
}

export function BulkCheckInDrawer({ open, onClose }: BulkCheckInDrawerProps) {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [step, setStep] = useState<'selection' | 'payment'>('selection');
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});

  // ARRIVALS-SHARED-V1: Use shared hook for consistent arrivals data
  const {
    data: todayArrivals = [],
    isLoading,
    refetch
  } = useTodayArrivals();

  // Map to ArrivalBooking type for component compatibility
  const arrivals = todayArrivals as unknown as ArrivalBooking[];

  // CACHE-RESET-V1: Force refresh when drawer opens
  useEffect(() => {
    if (open && tenantId) {
      // Clear stale cache first to ensure fresh data
      queryClient.resetQueries({ queryKey: ['today-arrivals', tenantId] });
      refetch();
    }
  }, [open, tenantId, refetch, queryClient]);

  // Bulk check-in mutation - PHASE-8: Support offline check-in in Electron
  const bulkCheckInMutation = useMutation({
    mutationFn: async (bookingIds: string[]) => {
      if (!tenantId) throw new Error('Not authenticated');

      const results = await Promise.allSettled(
        bookingIds.map(async (bookingId) => {
          const booking = arrivals.find(b => b.id === bookingId);
          if (!booking) throw new Error('Booking not found');

          // PHASE-8: Try Electron offline check-in first
          if (isElectronContext() && tenantId) {
            console.log('[BulkCheckInDrawer] PHASE-8 Attempting offline check-in:', { bookingId });
            
            const offlineResult = await offlineCheckIn(tenantId, {
              id: bookingId,
              room_id: booking.room_id,
              guest_id: booking.guest_id,
              status: 'checked_in',
              metadata: { checked_in_at: new Date().toISOString() }
            });

            if (offlineResult.source === 'offline' && offlineResult.data?.success) {
              console.log('[BulkCheckInDrawer] PHASE-8 Offline check-in succeeded:', { bookingId });
              
              // Save check-in event to journal
              await saveBookingEvent(tenantId, {
                type: 'checkin_performed',
                bookingId,
                roomId: booking.room_id,
                timestamp: new Date().toISOString(),
                payload: { guestId: booking.guest_id, folioCreated: false, bulk: true }
              });

              // Update booking cache
              await updateBookingCache(tenantId, {
                id: bookingId,
                status: 'checked_in',
                room_id: booking.room_id
              });

              // Update room cache to occupied
              await updateRoomCache(tenantId, { id: booking.room_id, status: 'occupied' });
              await setOfflineRoomStatus(tenantId, booking.room_id, 'occupied', { reason: 'Bulk check-in (offline)' });

              return { bookingId, success: true, offline: true };
            }
            
            console.log('[BulkCheckInDrawer] PHASE-8 Falling through to online:', offlineResult.source);
          }

          // ONLINE PATH: Call checkin-guest to create folio atomically
          const { data: folioResult, error: folioError } = await supabase.functions.invoke('checkin-guest', {
            body: { booking_id: bookingId }
          });

          if (folioError) throw new Error(`Check-in failed: ${folioError.message}`);
          if (!folioResult?.folio?.id) throw new Error('Folio creation failed');

          // Update room status only AFTER folio is created
          const { error: roomError } = await supabase
            .from('rooms')
            .update({ 
              status: 'occupied',
              current_reservation_id: bookingId,
              current_guest_id: booking.guest_id,
            })
            .eq('id', booking.room_id);

          if (roomError) throw roomError;

          return { bookingId, success: true, folioId: folioResult.folio.id };
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { successful, failed, total: bookingIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['today-arrivals'] });

      if (data.failed === 0) {
        toast.success(`Successfully checked in ${data.successful} guest${data.successful > 1 ? 's' : ''}`);
      } else {
        toast.warning(`Checked in ${data.successful} guests, ${data.failed} failed`, {
          description: 'Some check-ins could not be completed',
        });
      }

      setSelectedBookings([]);
      setPaymentAmounts({});
      setStep('selection');
      if (data.failed === 0) {
        onClose();
      }
    },
    onError: (error: Error) => {
      toast.error('Bulk check-in failed', {
        description: error.message,
      });
    },
  });

  // Record payments mutation
  const recordPaymentsMutation = useMutation({
    mutationFn: async (payments: Array<{ bookingId: string; amount: number; guestId: string }>) => {
      if (!tenantId || !user) throw new Error('Not authenticated');

      const results = await Promise.allSettled(
        payments.map(async ({ bookingId, amount, guestId }) => {
          const { data, error } = await supabase.functions.invoke('create-payment', {
            body: {
              tenant_id: tenantId,
              booking_id: bookingId,
              guest_id: guestId,
              amount,
              payment_method: 'cash',
              payment_provider: 'cash',
              status: 'completed',
              description: 'Bulk check-in payment',
              metadata: {
                collected_by: user.id,
                collection_type: 'bulk_checkin',
              },
            },
          });

          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || 'Payment failed');

          return { bookingId, success: true };
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { successful, failed, total: payments.length };
    },
    onSuccess: (data) => {
      // QUERY-KEY-FIX-V1: Invalidate all affected booking folios
      // Note: BulkCheckIn affects multiple bookings, so invalidate all booking-folio queries
      queryClient.invalidateQueries({ queryKey: ['booking-folio'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });

      if (data.failed === 0) {
        toast.success(`Successfully recorded ${data.successful} payment${data.successful > 1 ? 's' : ''}`);
      } else {
        toast.warning(`Recorded ${data.successful} payments, ${data.failed} failed`, {
          description: 'Some payments could not be recorded',
        });
      }

      setStep('selection');
      setSelectedBookings([]);
      setPaymentAmounts({});
      onClose();
    },
    onError: (error: Error) => {
      toast.error('Payment recording failed', {
        description: error.message,
      });
    },
  });

  const handleToggleBooking = (bookingId: string) => {
    setSelectedBookings(prev =>
      prev.includes(bookingId)
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBookings.length === arrivals.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(arrivals.map(a => a.id));
    }
  };

  const handleBulkCheckIn = () => {
    if (selectedBookings.length === 0) {
      toast.error('Please select at least one guest to check in');
      return;
    }
    bulkCheckInMutation.mutate(selectedBookings);
  };

  const handleProceedToPayment = () => {
    if (selectedBookings.length === 0) {
      toast.error('Please select at least one guest');
      return;
    }
    
    // Initialize payment amounts with total amounts
    const initialAmounts: Record<string, string> = {};
    selectedBookings.forEach(bookingId => {
      const arrival = arrivals.find(a => a.id === bookingId);
      if (arrival) {
        initialAmounts[bookingId] = arrival.total_amount.toString();
      }
    });
    setPaymentAmounts(initialAmounts);
    setStep('payment');
  };

  const handleRecordPayments = () => {
    const payments = selectedBookings
      .map(bookingId => {
        const arrival = arrivals.find(a => a.id === bookingId);
        const amount = parseFloat(paymentAmounts[bookingId] || '0');
        
        if (!arrival || amount <= 0) return null;
        
        return {
          bookingId,
          amount,
          guestId: arrival.guest_id,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (payments.length === 0) {
      toast.error('Please enter valid payment amounts');
      return;
    }

    recordPaymentsMutation.mutate(payments);
  };

  const handleSkipPayment = () => {
    setStep('selection');
    setSelectedBookings([]);
    setPaymentAmounts({});
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {step === 'selection' ? (
              <>
                <Users className="w-5 h-5" />
                Bulk Check-In - Today's Arrivals
              </>
            ) : (
              <>
                <DollarSign className="w-5 h-5" />
                Collect Payments
              </>
            )}
          </SheetTitle>
          <SheetDescription>
            {step === 'selection' 
              ? 'Check in multiple guests at once. Select guests from the list below.'
              : 'Record payments for selected guests. Enter full or partial amounts.'
            }
          </SheetDescription>
        </SheetHeader>

        {step === 'selection' ? (
          <div className="mt-6 space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Arrivals Today</p>
              <p className="text-2xl font-bold">{arrivals.length}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-sm text-muted-foreground">Selected</p>
              <p className="text-2xl font-bold text-primary">{selectedBookings.length}</p>
            </div>
          </div>

          {/* Select All */}
          {arrivals.length > 0 && (
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <Checkbox
                id="select-all"
                checked={selectedBookings.length === arrivals.length}
                onCheckedChange={handleSelectAll}
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium cursor-pointer flex-1"
              >
                Select All ({arrivals.length} guests)
              </label>
            </div>
          )}

          <Separator />

          {/* Arrivals List */}
          <ScrollArea className="h-[calc(100vh-400px)]">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : arrivals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No arrivals scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {arrivals.map((arrival) => (
                  <div
                    key={arrival.id}
                    className={`p-4 border rounded-lg transition-colors cursor-pointer ${
                      selectedBookings.includes(arrival.id)
                        ? 'bg-primary/5 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleToggleBooking(arrival.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedBookings.includes(arrival.id)}
                        onCheckedChange={() => handleToggleBooking(arrival.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{arrival.guest.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {arrival.guest.email}
                            </p>
                            {arrival.guest.phone && (
                              <p className="text-sm text-muted-foreground">
                                {arrival.guest.phone}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary">
                            Room {arrival.room.number}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Check-in: {format(new Date(arrival.check_in), 'h:mm a')}
                          </span>
                          <span>•</span>
                          <span>
                            {arrival.room.category?.name || 'Standard'}
                          </span>
                          <span>•</span>
                          <span>
                            ₦{arrival.total_amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={bulkCheckInMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleProceedToPayment}
              className="flex-1"
              disabled={selectedBookings.length === 0 || bulkCheckInMutation.isPending}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Collect Payments ({selectedBookings.length})
            </Button>
            <Button
              onClick={handleBulkCheckIn}
              className="flex-1"
              disabled={selectedBookings.length === 0 || bulkCheckInMutation.isPending}
            >
              {bulkCheckInMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking In...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Check In ({selectedBookings.length})
                </>
              )}
            </Button>
          </div>
        </div>
        ) : (
          // Payment Step
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Recording payments for {selectedBookings.length} guest{selectedBookings.length > 1 ? 's' : ''}</p>
              <p className="text-xs text-muted-foreground">Enter the amount collected for each guest below</p>
            </div>

            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="space-y-3 pr-4">
                {selectedBookings.map(bookingId => {
                  const arrival = arrivals.find(a => a.id === bookingId);
                  if (!arrival) return null;

                  return (
                    <div key={bookingId} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{arrival.guest.name}</p>
                          <p className="text-xs text-muted-foreground">Room {arrival.room.number}</p>
                        </div>
                        <Badge>₦{arrival.total_amount.toLocaleString()}</Badge>
                      </div>

                      <div>
                        <Label htmlFor={`payment-${bookingId}`}>Amount Collected</Label>
                        <Input
                          id={`payment-${bookingId}`}
                          type="number"
                          step="0.01"
                          value={paymentAmounts[bookingId] || ''}
                          onChange={(e) => setPaymentAmounts(prev => ({
                            ...prev,
                            [bookingId]: e.target.value
                          }))}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleSkipPayment}
                className="flex-1"
                disabled={recordPaymentsMutation.isPending}
              >
                Skip Payment
              </Button>
              <Button
                onClick={handleRecordPayments}
                className="flex-1"
                disabled={recordPaymentsMutation.isPending}
              >
                {recordPaymentsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Record Payments
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
