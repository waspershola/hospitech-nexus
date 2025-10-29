import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRoomActions } from '../hooks/useRoomActions';
import { useBookingFolio } from '@/hooks/useBookingFolio';
import { AssignRoomModal } from './AssignRoomModal';
import { ExtendStayModal } from './ExtendStayModal';
import { AddChargeModal } from './AddChargeModal';
import { ChargeToOrgModal } from './ChargeToOrgModal';
import { RoomAuditTrail } from './RoomAuditTrail';
import { QuickPaymentForm } from './QuickPaymentForm';
import { Loader2, User, CreditCard, Calendar, AlertCircle, Clock, Building2 } from 'lucide-react';

interface RoomActionDrawerProps {
  roomId: string | null;
  open: boolean;
  onClose: () => void;
}

export function RoomActionDrawer({ roomId, open, onClose }: RoomActionDrawerProps) {
  const { tenantId } = useAuth();
  const { checkIn, checkOut, markClean, markMaintenance } = useRoomActions();
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [chargeToOrgModalOpen, setChargeToOrgModalOpen] = useState(false);
  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);

  const { data: room, isLoading } = useQuery({
    queryKey: ['room-detail', roomId],
    queryFn: async () => {
      if (!roomId || !tenantId) return null;
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          category:room_categories(name, short_code, base_rate),
          bookings(
            id,
            check_in,
            check_out,
            status,
            total_amount,
            guest_id,
            organization_id,
            guest:guests(id, name, email, phone),
            organization:organizations(id, name, credit_limit, allow_negative_balance)
          )
        `)
        .eq('id', roomId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!roomId && !!tenantId,
  });

  // Get current active booking
  const activeBooking = room?.bookings?.find((b: any) => b.status !== 'cancelled' && b.status !== 'completed');
  
  // Fetch folio balance for active booking
  const { data: folio } = useBookingFolio(activeBooking?.id || null);

  const currentBooking = room?.bookings?.find((b: any) => 
    b.status === 'checked_in' || b.status === 'reserved'
  );

  const getActions = () => {
    if (!room) return [];

    switch (room.status) {
      case 'available':
        return [
          { label: 'Assign Room', action: () => setAssignModalOpen(true), variant: 'default' as const },
          { label: 'Reserve', action: () => setAssignModalOpen(true), variant: 'secondary' as const },
          { label: 'Mark OOS', action: () => markMaintenance(room.id), variant: 'outline' as const },
        ];
      case 'occupied':
      case 'overstay':
        return [
          { label: 'Take Payment', action: () => setQuickPaymentOpen(true), variant: 'default' as const, icon: CreditCard },
          { label: 'Check Out', action: () => checkOut(room.id), variant: 'secondary' as const },
          { label: 'Extend Stay', action: () => setExtendModalOpen(true), variant: 'outline' as const },
          { label: 'Add Charge', action: () => setChargeModalOpen(true), variant: 'outline' as const },
          { label: 'Charge to Org', action: () => setChargeToOrgModalOpen(true), variant: 'outline' as const, icon: Building2 },
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
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : room ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl font-display">Room {room.number}</SheetTitle>
                <div className="flex items-center gap-2">
                  <Badge className="capitalize">{room.status}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {room.category?.name || room.type}
                  </span>
                </div>
              </SheetHeader>

              <Tabs defaultValue="details" className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="history">
                    <Clock className="w-4 h-4 mr-2" />
                    History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6 mt-6">
                  {currentBooking && (
                    <>
                      {currentBooking.organization && (
                        <>
                          <div className="space-y-3">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              Organization
                            </h3>
                            <div className="text-sm space-y-1">
                              <p className="font-medium">{currentBooking.organization.name}</p>
                              <p className="text-muted-foreground">
                                Credit Limit: ₦{currentBooking.organization.credit_limit?.toLocaleString() || '0'}
                              </p>
                              {currentBooking.organization.allow_negative_balance && (
                                <Badge variant="outline" className="text-xs">
                                  Negative Balance Allowed
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Separator />
                        </>
                      )}

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
                        {quickPaymentOpen ? (
                          <QuickPaymentForm
                            bookingId={currentBooking.id}
                            guestId={currentBooking.guest?.id || ''}
                            expectedAmount={folio?.balance || 0}
                            onSuccess={() => {
                              setQuickPaymentOpen(false);
                              // Refetch folio data
                              window.location.reload();
                            }}
                            onCancel={() => setQuickPaymentOpen(false)}
                          />
                        ) : (
                          <>
                            <p className={`text-2xl font-bold ${folio && folio.balance > 0 ? 'text-warning' : 'text-success'}`}>
                              {folio 
                                ? `${folio.currency === 'NGN' ? '₦' : folio.currency}${folio.balance.toFixed(2)}`
                                : '₦0.00'
                              }
                            </p>
                            {folio && folio.balance > 0 && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => setQuickPaymentOpen(true)}
                                className="mt-2 w-full"
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Take Payment
                              </Button>
                            )}
                          </>
                        )}
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
                          className="w-full rounded-xl"
                          onClick={action.action}
                        >
                          {'icon' in action && action.icon && <action.icon className="w-4 h-4 mr-2" />}
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
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                  <RoomAuditTrail roomId={room.id} />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Room not found</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {room && (
        <>
          <AssignRoomModal
            open={assignModalOpen}
            onClose={() => setAssignModalOpen(false)}
            roomId={room.id}
            roomNumber={room.number}
          />
          {currentBooking && (
            <>
              <ExtendStayModal
                open={extendModalOpen}
                onClose={() => setExtendModalOpen(false)}
                bookingId={currentBooking.id}
                currentCheckOut={currentBooking.check_out}
                roomNumber={room.number}
              />
              <AddChargeModal
                open={chargeModalOpen}
                onClose={() => setChargeModalOpen(false)}
                bookingId={currentBooking.id}
                roomNumber={room.number}
              />
              <ChargeToOrgModal
                open={chargeToOrgModalOpen}
                onClose={() => setChargeToOrgModalOpen(false)}
                bookingId={currentBooking.id}
                guestId={currentBooking.guest?.id}
                roomNumber={room.number}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
