import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRoomActions } from '../hooks/useRoomActions';
import { useCheckout } from '@/hooks/useCheckout';
import { useBookingFolio } from '@/hooks/useBookingFolio';
import { useOrganizationWallet } from '@/hooks/useOrganizationWallet';
import { ExtendStayModal } from './ExtendStayModal';
import { AddChargeModal } from './AddChargeModal';
import { ChargeToOrgModal } from './ChargeToOrgModal';
import { RoomAuditTrail } from './RoomAuditTrail';
import { QuickPaymentForm } from './QuickPaymentForm';
import { PaymentHistory } from '@/modules/payments/PaymentHistory';
import { BookingAmendmentDrawer } from '@/modules/bookings/components/BookingAmendmentDrawer';
import { CancelBookingModal } from '@/modules/bookings/components/CancelBookingModal';
import { BookingConfirmationDocument } from '@/modules/bookings/components/BookingConfirmationDocument';
import { BookingPaymentManager } from '@/modules/bookings/components/BookingPaymentManager';
import { toast } from '@/hooks/use-toast';
import { 
  Loader2, User, CreditCard, Calendar, AlertCircle, Clock, Building2, AlertTriangle, 
  Wallet, Zap, Coffee, BellOff, UserPlus, LogIn, LogOut, Wrench, Sparkles, FileText, Receipt, Edit
} from 'lucide-react';

interface RoomActionDrawerProps {
  roomId: string | null;
  open: boolean;
  onClose: () => void;
  onOpenAssignDrawer?: (roomId: string, roomNumber: string) => void;
}

export function RoomActionDrawer({ roomId, open, onClose, onOpenAssignDrawer }: RoomActionDrawerProps) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const { checkIn, checkOut, markClean, markMaintenance } = useRoomActions();
  const { mutate: completeCheckout, isPending: isCheckingOut } = useCheckout();
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [chargeToOrgModalOpen, setChargeToOrgModalOpen] = useState(false);
  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [amendmentDrawerOpen, setAmendmentDrawerOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [showConfirmationDoc, setShowConfirmationDoc] = useState(false);
  const [realtimeDebounceTimer, setRealtimeDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const { data: room, isLoading } = useQuery({
    queryKey: ['room-detail', roomId],
    queryFn: async () => {
      if (!roomId || !tenantId) return null;
      
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          category:room_categories(name, short_code, base_rate),
          bookings!bookings_room_id_fkey(
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
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!roomId && !!tenantId, // Phase 1: Remove 'open' for instant loading
  });

  // Phase 2: Debounced realtime subscription for room changes
  useEffect(() => {
    if (!roomId || !tenantId) return;

    const channel = supabase
      .channel(`room-changes-${roomId}`) // Unique channel per room
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        () => {
          // Debounce invalidation to prevent rapid refetches
          if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
          
          const timer = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['room-detail', roomId] });
          }, 300); // Wait 300ms before refetching
          
          setRealtimeDebounceTimer(timer);
        }
      )
      .subscribe();

    return () => {
      if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
      supabase.removeChannel(channel);
    };
  }, [roomId, tenantId, queryClient]);

  // Phase 7: Use canonical fields for active booking (single source of truth)
  const bookingsArray = Array.isArray(room?.bookings) ? room.bookings : room?.bookings ? [room.bookings] : [];
  const activeBooking = room?.current_reservation_id
    ? bookingsArray.find((b: any) => b.id === room.current_reservation_id)
    : null;
  
  // Phase 4: Detect transition state (room shows occupied/reserved but no booking data)
  const isTransitioning = (room?.status === 'occupied' || room?.status === 'reserved') 
    && !activeBooking 
    && room?.current_reservation_id;
  
  // Fetch folio balance for active booking
  const { data: folio } = useBookingFolio(activeBooking?.id || null);
  
  // Fetch organization wallet info if organization exists
  const { data: orgWallet } = useOrganizationWallet(activeBooking?.organization_id);

  // Use activeBooking consistently throughout component
  const currentBooking = activeBooking;

  const handleQuickCheckIn = () => {
    if (!room || !onOpenAssignDrawer) return;
    
    toast({ 
      title: 'Quick Check-In', 
      description: 'Opening booking form...' 
    });
    
    // Call parent callback to open AssignRoomDrawer
    onOpenAssignDrawer(room.id, room.number);
  };

  const handleExpressCheckout = async () => {
    if (!room || !activeBooking) return;
    
    if (folio && folio.balance > 0) {
      toast({ 
        title: 'Outstanding Balance', 
        description: 'Please settle balance before express checkout',
        variant: 'destructive'
      });
      return;
    }

    // Phase 3: Close drawer BEFORE checkout to prevent "Room not found" flash
    onClose();
    
    // Then complete checkout in background
    completeCheckout({ bookingId: activeBooking.id });
  };

  const handleCheckIn = async () => {
    if (!room) return;
    await checkIn(room.id);
    toast({ title: 'Check-In Complete', description: 'Guest checked in successfully' });
    
    // Phase 6: Keep 600ms for check-in (allows user to see success)
    setTimeout(() => onClose(), 600);
  };

  const handleMarkClean = async () => {
    if (!room) return;
    await markClean(room.id);
    toast({ title: 'Room Cleaned', description: 'Room marked as clean and ready' });
    
    // Phase 6: Reduce to 400ms for faster feedback
    setTimeout(() => onClose(), 400);
  };

  const handleMarkMaintenance = async () => {
    if (!room) return;
    await markMaintenance(room.id);
    toast({ title: 'Maintenance Mode', description: 'Room marked for maintenance' });
    
    // Phase 6: Reduce to 400ms for faster feedback
    setTimeout(() => onClose(), 400);
  };

  const handleRoomService = () => {
    if (!activeBooking) return;
    setChargeModalOpen(true);
  };

  const handleToggleDND = async () => {
    if (!room) return;

    const currentNotes = room.notes || '';
    const hasDND = currentNotes.includes('[DND]');
    const newNotes = hasDND 
      ? currentNotes.replace('[DND]', '').trim()
      : `${currentNotes} [DND]`.trim();

    try {
      await supabase
        .from('rooms')
        .update({ notes: newNotes })
        .eq('id', roomId);

      queryClient.invalidateQueries({ queryKey: ['room-detail', roomId] });
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      toast({ 
        title: hasDND ? 'DND Removed' : 'Do Not Disturb', 
        description: hasDND ? 'Room can be serviced' : 'Guest requests no disturbance' 
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update DND status', variant: 'destructive' });
    }
  };

  const getActions = () => {
    if (!room) return [];

    const hasDND = room.notes?.includes('[DND]');

    switch (room.status) {
      case 'available':
        return [
          { label: 'Assign Room', action: () => room && onOpenAssignDrawer?.(room.id, room.number), variant: 'default' as const, icon: UserPlus, tooltip: 'Full booking with guest details' },
          { label: 'Walk-in Check-In', action: handleQuickCheckIn, variant: 'outline' as const, icon: LogIn, tooltip: 'Express walk-in check-in' },
          { label: 'Set Out of Service', action: handleMarkMaintenance, variant: 'outline' as const, icon: Wrench, tooltip: 'Mark as out of service' },
        ];
      case 'occupied':
        return [
          { label: 'Check-Out', action: handleExpressCheckout, variant: 'default' as const, icon: LogOut, tooltip: 'Complete guest checkout' },
          { label: 'Extend Stay', action: () => setExtendModalOpen(true), variant: 'outline' as const, icon: Calendar, tooltip: 'Extend checkout date' },
          { label: 'Transfer Room', action: () => toast({ title: 'Transfer Room', description: 'Feature coming soon' }), variant: 'outline' as const, icon: UserPlus, tooltip: 'Transfer to different room' },
          { label: 'Add Service', action: handleRoomService, variant: 'outline' as const, icon: Sparkles, tooltip: 'Add room service charge' },
          { label: 'Post Payment', action: () => setQuickPaymentOpen(true), variant: 'outline' as const, icon: CreditCard, tooltip: 'Record payment' },
          { label: hasDND ? 'Remove DND' : 'Do Not Disturb', action: handleToggleDND, variant: hasDND ? 'secondary' : 'ghost' as const, icon: BellOff, tooltip: 'Toggle Do Not Disturb' },
        ];
      case 'reserved':
        return [
          { label: 'Check-In', action: handleCheckIn, variant: 'default' as const, icon: LogIn, tooltip: 'Complete guest check-in' },
          { label: 'Cancel Reservation', action: () => setCancelModalOpen(true), variant: 'destructive' as const, icon: AlertTriangle, tooltip: 'Cancel this reservation' },
          { label: 'Modify Reservation', action: () => setAmendmentDrawerOpen(true), variant: 'outline' as const, icon: FileText, tooltip: 'Modify reservation details' },
          { label: 'Assign Different Room', action: () => room && onOpenAssignDrawer?.(room.id, room.number), variant: 'outline' as const, icon: UserPlus, tooltip: 'Move to different room' },
        ];
      case 'overstay':
        return [
          { label: 'Extend Stay', action: () => setExtendModalOpen(true), variant: 'default' as const, icon: Calendar, tooltip: 'Extend guest stay' },
          { label: 'Apply Overstay Charge', action: handleRoomService, variant: 'outline' as const, icon: CreditCard, tooltip: 'Apply overstay fees' },
          { label: 'Check-Out', action: handleExpressCheckout, variant: 'destructive' as const, icon: LogOut, tooltip: 'Force checkout' },
          { label: 'Transfer Room', action: () => toast({ title: 'Transfer Room', description: 'Feature coming soon' }), variant: 'outline' as const, icon: UserPlus, tooltip: 'Transfer to different room' },
        ];
      case 'cleaning':
        return [
          { label: 'Mark Clean', action: handleMarkClean, variant: 'default' as const, icon: Sparkles, tooltip: 'Mark as clean and ready' },
        ];
      case 'maintenance':
        return [
          { label: 'Mark as Available', action: handleMarkClean, variant: 'default' as const, icon: Sparkles, tooltip: 'Complete maintenance' },
          { label: 'Create Work Order', action: () => toast({ title: 'Work Order', description: 'Feature coming soon' }), variant: 'outline' as const, icon: Wrench, tooltip: 'Create maintenance work order' },
          { label: 'Assign to Housekeeping', action: () => toast({ title: 'Assign Staff', description: 'Feature coming soon' }), variant: 'outline' as const, icon: Sparkles, tooltip: 'Assign housekeeping staff' },
        ];
      default:
        return [];
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {isLoading || isTransitioning ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {isTransitioning ? 'Processing room transition...' : 'Loading...'}
              </p>
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

              <Tabs defaultValue={showConfirmationDoc ? "confirmation" : "details"} className="mt-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="payments">
                    <Receipt className="w-4 h-4 mr-2" />
                    Payments
                  </TabsTrigger>
                  <TabsTrigger value="confirmation">
                    <FileText className="w-4 h-4 mr-2" />
                    Confirmation
                  </TabsTrigger>
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
                            
                            {orgWallet?.overLimit && (
                              <Alert variant="destructive" className="mb-3">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  Credit limit exceeded! Balance: ₦{orgWallet.balance.toLocaleString()} / ₦{orgWallet.credit_limit.toLocaleString()}
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            {orgWallet?.nearLimit && !orgWallet?.overLimit && (
                              <Alert className="mb-3 border-yellow-500 text-yellow-700">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  Near credit limit: {orgWallet.percentUsed.toFixed(0)}% used
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            <div className="text-sm space-y-2">
                              <p className="font-medium">{currentBooking.organization.name}</p>
                              
                              {orgWallet && (
                                <>
                                  <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Wallet className="w-4 h-4 text-primary" />
                                      <span className="text-xs font-medium">Wallet Balance</span>
                                    </div>
                                    <span className={`font-semibold ${orgWallet.overLimit ? 'text-destructive' : orgWallet.nearLimit ? 'text-yellow-600' : 'text-foreground'}`}>
                                      ₦{orgWallet.balance.toLocaleString()}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Credit Limit</span>
                                    <span className="font-medium">₦{orgWallet.credit_limit.toLocaleString()}</span>
                                  </div>
                                  
                                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                    <div 
                                      className={`h-full transition-all ${orgWallet.overLimit ? 'bg-destructive' : orgWallet.nearLimit ? 'bg-yellow-500' : 'bg-primary'}`}
                                      style={{ width: `${Math.min(orgWallet.percentUsed, 100)}%` }}
                                    />
                                  </div>
                                </>
                              )}
                              
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
                                className="w-full"
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Collect Payment
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPaymentHistoryOpen(true)}
                              className="w-full"
                            >
                              <Receipt className="w-4 h-4 mr-2" />
                              View Payment History
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAmendmentDrawerOpen(true)}
                              className="w-full"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Amend Booking
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowConfirmationDoc(true)}
                              className="w-full"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Booking Confirmation
                            </Button>
                          </>
                        )}
                      </div>

                      {paymentHistoryOpen && (
                        <div className="mt-4">
                          <PaymentHistory 
                            bookingId={currentBooking.id}
                            onClose={() => setPaymentHistoryOpen(false)}
                          />
                        </div>
                      )}

                      <Separator />
                    </>
                  )}

                  <div className="space-y-3">
                    <h3 className="font-semibold">Quick Actions</h3>
                    <TooltipProvider>
                      <div className="space-y-2">
                        {getActions().map((action, i) => (
                          <Tooltip key={i}>
                            <TooltipTrigger asChild>
                              <Button
                                variant={action.variant}
                                className="w-full rounded-xl"
                                onClick={action.action}
                              >
                                {'icon' in action && action.icon && <action.icon className="w-4 h-4 mr-2" />}
                                {action.label}
                              </Button>
                            </TooltipTrigger>
                            {'tooltip' in action && action.tooltip && (
                              <TooltipContent>{action.tooltip}</TooltipContent>
                            )}
                          </Tooltip>
                        ))}
                      </div>
                    </TooltipProvider>
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

                <TabsContent value="payments" className="mt-6">
                  {currentBooking ? (
                    <BookingPaymentManager bookingId={currentBooking.id} />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No active booking for this room</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="confirmation" className="mt-6">
                  {currentBooking ? (
                    <BookingConfirmationDocument bookingId={currentBooking.id} />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No active booking for this room</p>
                    </div>
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
                organizationId={currentBooking.organization_id}
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
          {currentBooking && (
            <>
              {paymentHistoryOpen && (
                <PaymentHistory
                  bookingId={currentBooking.id}
                  onClose={() => setPaymentHistoryOpen(false)}
                />
              )}
              <BookingAmendmentDrawer
                open={amendmentDrawerOpen}
                onClose={() => setAmendmentDrawerOpen(false)}
                bookingId={currentBooking.id}
              />
              <CancelBookingModal
                open={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                bookingId={currentBooking.id}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
