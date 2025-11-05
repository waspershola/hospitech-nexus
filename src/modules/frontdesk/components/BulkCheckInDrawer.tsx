import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

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
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().split('T')[0];

  // Fetch today's arrivals
  const { data: arrivals = [], isLoading } = useQuery({
    queryKey: ['arrivals-list', tenantId, todayISO],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          check_in,
          check_out,
          total_amount,
          guest_id,
          room_id,
          status,
          guest:guests(id, name, email, phone),
          room:rooms(
            id, 
            number,
            category:room_categories(name)
          )
        `)
        .eq('tenant_id', tenantId)
        .gte('check_in', todayISO + 'T00:00:00')
        .lt('check_in', todayISO + 'T23:59:59')
        .in('status', ['reserved', 'confirmed'])
        .order('check_in', { ascending: true });

      if (error) throw error;
      return (data || []) as ArrivalBooking[];
    },
    enabled: !!tenantId && open,
  });

  // Bulk check-in mutation
  const bulkCheckInMutation = useMutation({
    mutationFn: async (bookingIds: string[]) => {
      if (!tenantId) throw new Error('Not authenticated');

      const results = await Promise.allSettled(
        bookingIds.map(async (bookingId) => {
          const booking = arrivals.find(b => b.id === bookingId);
          if (!booking) throw new Error('Booking not found');

          // Update booking status
          const { error: bookingError } = await supabase
            .from('bookings')
            .update({
              status: 'checked_in',
              metadata: {
                checked_in_at: new Date().toISOString(),
                checked_in_by: 'bulk_checkin',
              }
            })
            .eq('id', bookingId);

          if (bookingError) throw bookingError;

          // Update room status
          const { error: roomError } = await supabase
            .from('rooms')
            .update({ 
              status: 'occupied',
              current_reservation_id: bookingId,
              current_guest_id: booking.guest_id,
            })
            .eq('id', booking.room_id);

          if (roomError) throw roomError;

          return { bookingId, success: true };
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { successful, failed, total: bookingIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['arrivals-list'] });

      if (data.failed === 0) {
        toast.success(`Successfully checked in ${data.successful} guest${data.successful > 1 ? 's' : ''}`);
      } else {
        toast.warning(`Checked in ${data.successful} guests, ${data.failed} failed`, {
          description: 'Some check-ins could not be completed',
        });
      }

      setSelectedBookings([]);
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

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Bulk Check-In - Today's Arrivals
          </SheetTitle>
          <SheetDescription>
            Check in multiple guests at once. Select guests from the list below.
          </SheetDescription>
        </SheetHeader>

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
      </SheetContent>
    </Sheet>
  );
}
