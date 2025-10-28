import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRoomActions } from '../hooks/useRoomActions';
import { Loader2, User, CreditCard, Calendar, AlertCircle } from 'lucide-react';

interface RoomActionDrawerProps {
  roomId: string | null;
  open: boolean;
  onClose: () => void;
}

export function RoomActionDrawer({ roomId, open, onClose }: RoomActionDrawerProps) {
  const { tenantId } = useAuth();
  const { checkIn, checkOut, markClean, markMaintenance } = useRoomActions();

  const { data: room, isLoading } = useQuery({
    queryKey: ['room-detail', roomId],
    queryFn: async () => {
      if (!roomId) return null;
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          category:room_categories(name, base_rate),
          bookings!bookings_room_id_fkey(
            id,
            status,
            check_in,
            check_out,
            guest:guests(name, email, phone)
          )
        `)
        .eq('id', roomId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!roomId && open,
  });

  const currentBooking = room?.bookings?.find((b: any) => 
    b.status === 'checked_in' || b.status === 'reserved'
  );

  const getActions = () => {
    if (!room) return [];

    switch (room.status) {
      case 'available':
        return [
          { label: 'Assign Room', action: () => {}, variant: 'default' as const },
          { label: 'Reserve', action: () => {}, variant: 'secondary' as const },
          { label: 'Mark OOS', action: () => markMaintenance(room.id), variant: 'outline' as const },
        ];
      case 'occupied':
        return [
          { label: 'Check Out', action: () => checkOut(room.id), variant: 'default' as const },
          { label: 'Extend Stay', action: () => {}, variant: 'secondary' as const },
          { label: 'Add Charge', action: () => {}, variant: 'outline' as const },
        ];
      case 'reserved':
        return [
          { label: 'Check In', action: () => checkIn(room.id), variant: 'default' as const },
          { label: 'Cancel', action: () => {}, variant: 'destructive' as const },
        ];
      case 'cleaning':
        return [
          { label: 'Mark Clean', action: () => markClean(room.id), variant: 'default' as const },
        ];
      case 'maintenance':
        return [
          { label: 'Complete Maintenance', action: () => markClean(room.id), variant: 'default' as const },
        ];
      default:
        return [];
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : room ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-2xl">Room {room.number}</SheetTitle>
              <div className="flex items-center gap-2">
                <Badge>{room.status}</Badge>
                <span className="text-sm text-muted-foreground">
                  {room.category?.name || room.type}
                </span>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {currentBooking && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Guest Information
                    </h3>
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{currentBooking.guest?.name}</p>
                      <p className="text-muted-foreground">{currentBooking.guest?.email}</p>
                      <p className="text-muted-foreground">{currentBooking.guest?.phone}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Stay Details
                    </h3>
                    <div className="text-sm space-y-1">
                      <p>Check-in: {new Date(currentBooking.check_in).toLocaleDateString()}</p>
                      <p>Check-out: {new Date(currentBooking.check_out).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Folio Balance
                    </h3>
                    <p className="text-2xl font-bold text-primary">₦0.00</p>
                  </div>

                  <Separator />
                </>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold">Quick Actions</h3>
                <div className="space-y-2">
                  {getActions().map((action, i) => (
                    <Button
                      key={i}
                      variant={action.variant}
                      className="w-full"
                      onClick={() => {
                        action.action();
                        onClose();
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>

              {room.notes && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Notes
                    </h3>
                    <p className="text-sm text-muted-foreground">{room.notes}</p>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Room not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
