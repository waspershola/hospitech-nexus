import { useState } from 'react';
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
import { useBookingFolio } from '@/hooks/useBookingFolio';
import { useOrganizationWallet } from '@/hooks/useOrganizationWallet';
import { AssignRoomModal } from './AssignRoomModal';
import { ExtendStayModal } from './ExtendStayModal';
import { AddChargeModal } from './AddChargeModal';
import { ChargeToOrgModal } from './ChargeToOrgModal';
import { RoomAuditTrail } from './RoomAuditTrail';
import { QuickPaymentForm } from './QuickPaymentForm';
import { toast } from '@/hooks/use-toast';
import { Loader2, User, CreditCard, Calendar, AlertCircle, Clock, Building2, AlertTriangle, Wallet, Zap, Coffee, BellOff } from 'lucide-react';

interface RoomActionDrawerProps {
  roomId: string | null;
  open: boolean;
  onClose: () => void;
}

export function RoomActionDrawer({ roomId, open, onClose }: RoomActionDrawerProps) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
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
  
  // Fetch organization wallet info if organization exists
  const { data: orgWallet } = useOrganizationWallet(activeBooking?.organization_id);

  const currentBooking = room?.bookings?.find((b: any) => 
    b.status === 'checked_in' || b.status === 'reserved'
  );

  const handleQuickCheckIn = () => {
    toast({ title: 'Quick Check-In', description: 'Opening simplified booking flow...' });
    onClose();
    setAssignModalOpen(true);
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

    checkOut(room.id);
    toast({ title: 'Express Checkout', description: 'Guest checked out successfully' });
    onClose();
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
          { label: 'Assign Room', action: () => setAssignModalOpen(true), variant: 'default' as const, tooltip: 'Full booking with all details' },
          { label: 'Quick Check-In', action: handleQuickCheckIn, variant: 'secondary' as const, icon: Zap, tooltip: 'Express walk-in check-in' },
          { label: 'Mark OOS', action: () => markMaintenance(room.id), variant: 'outline' as const, tooltip: 'Mark as Out of Service' },
        ];
      case 'occupied':
      case 'overstay':
        return [
          { label: 'Express Checkout', action: handleExpressCheckout, variant: 'default' as const, icon: Zap, tooltip: 'Quick checkout if balance settled' },
          { label: 'Take Payment', action: () => setQuickPaymentOpen(true), variant: 'secondary' as const, icon: CreditCard, tooltip: 'Record payment' },
          { label: 'Room Service', action: handleRoomService, variant: 'outline' as const, icon: Coffee, tooltip: 'Add service charge' },
          { label: 'Extend Stay', action: () => setExtendModalOpen(true), variant: 'outline' as const, tooltip: 'Extend checkout date' },
          { label: hasDND ? 'Remove DND' : 'Do Not Disturb', action: handleToggleDND, variant: hasDND ? 'default' : 'ghost' as const, icon: BellOff, tooltip: 'Toggle guest DND status' },
        ];
      case 'reserved':
        return [
          { label: 'Check In', action: () => checkIn(room.id), variant: 'default' as const, tooltip: 'Complete guest check-in' },
          { label: 'Take Payment', action: () => setQuickPaymentOpen(true), variant: 'secondary' as const, icon: CreditCard, tooltip: 'Record payment' },
          { label: 'Cancel', action: () => {}, variant: 'destructive' as const, tooltip: 'Cancel reservation' },
        ];
      case 'cleaning':
        return [
          { label: 'Mark Clean', action: () => markClean(room.id), variant: 'default' as const, tooltip: 'Mark room as ready' },
        ];
      case 'maintenance':
        return [
          { label: 'Complete Maintenance', action: () => markClean(room.id), variant: 'default' as const, tooltip: 'Mark maintenance complete' },
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
