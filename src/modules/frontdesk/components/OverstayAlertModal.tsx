import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, User, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { differenceInHours, format } from 'date-fns';
import { useLateCheckoutFees } from '@/hooks/useLateCheckoutFees';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OverstayRoom {
  id: string;
  number: string;
  guest_name: string;
  check_out: string;
  balance: number;
}

interface OverstayAlertModalProps {
  open: boolean;
  onClose: () => void;
  overstayRooms: OverstayRoom[];
  onExtendStay: (roomId: string) => void;
  onCheckOut: (roomId: string) => void;
}

export function OverstayAlertModal({
  open,
  onClose,
  overstayRooms,
  onExtendStay,
  onCheckOut,
}: OverstayAlertModalProps) {
  const { tenantId } = useAuth();
  const { calculateLateFee } = useLateCheckoutFees();

  // Check for booking conflicts - rooms with new reservations for today
  const { data: conflictingBookings } = useQuery({
    queryKey: ['booking-conflicts', overstayRooms],
    queryFn: async () => {
      if (overstayRooms.length === 0 || !tenantId) return [];

      const roomIds = overstayRooms.map(r => r.id);
      const today = new Date().toISOString().split('T')[0];

      const { data } = await supabase
        .from('bookings')
        .select('id, room_id, guest:guests(name), check_in')
        .in('room_id', roomIds)
        .eq('status', 'reserved')
        .eq('check_in', today);

      return data || [];
    },
    enabled: open && overstayRooms.length > 0,
  });

  const getHoursOverdue = (checkOut: string) => {
    return Math.abs(differenceInHours(new Date(), new Date(checkOut)));
  };

  const hasConflict = (roomId: string) => {
    return conflictingBookings?.some((b: any) => b.room_id === roomId);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-warning" />
            <DialogTitle className="text-2xl">Overstay Alerts</DialogTitle>
          </div>
          <DialogDescription>
            {overstayRooms.length} {overstayRooms.length === 1 ? 'room has' : 'rooms have'} guests who have overstayed their checkout time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {overstayRooms.map((room) => {
            const hoursOverdue = getHoursOverdue(room.check_out);
            const daysOverdue = Math.floor(hoursOverdue / 24);
            const lateFee = calculateLateFee(room.check_out);
            const conflict = hasConflict(room.id);
            const conflictBooking = conflictingBookings?.find((b: any) => b.room_id === room.id);

            return (
              <div
                key={room.id}
                className={`border rounded-xl p-4 space-y-3 ${
                  conflict 
                    ? 'border-destructive bg-destructive/10' 
                    : 'border-warning/30 bg-warning/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg">Room {room.number}</h3>
                      <Badge variant="destructive" className="capitalize">
                        Overstay
                      </Badge>
                      {conflict && (
                        <Badge variant="destructive" className="bg-destructive/90">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          New Arrival Today
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{room.guest_name}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        Checkout was: {format(new Date(room.check_out), 'MMM dd, yyyy hh:mm a')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-warning">
                        {daysOverdue > 0 
                          ? `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`
                          : `${hoursOverdue} hours overdue`
                        }
                      </span>
                    </div>

                    {room.balance > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-destructive" />
                        <span className="font-medium text-destructive">
                          Outstanding Balance: ₦{room.balance.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {lateFee.feeAmount > 0 && (
                      <div className="flex items-center gap-2 text-sm mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                        <TrendingUp className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
                        <span className="font-medium text-yellow-700 dark:text-yellow-400">
                          Late Checkout Fee: ₦{lateFee.feeAmount.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {conflict && conflictBooking && (
                      <div className="flex items-center gap-2 text-sm mt-2 p-2 bg-destructive/10 rounded border border-destructive/30">
                        <Calendar className="w-4 h-4 text-destructive" />
                        <span className="font-medium text-destructive">
                          {conflictBooking.guest?.name} arriving today - URGENT ACTION REQUIRED
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-warning/20">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onExtendStay(room.id)}
                    className="flex-1"
                  >
                    Extend Stay
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onCheckOut(room.id)}
                    className="flex-1"
                  >
                    Check Out Now
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
