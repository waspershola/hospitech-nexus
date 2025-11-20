import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/roles';
import { useRoomActions } from '../hooks/useRoomActions';
import { useCheckout } from '@/hooks/useCheckout';
import { useBookingFolio } from '@/hooks/useBookingFolio';
import { useOrganizationWallet } from '@/hooks/useOrganizationWallet';
import { useForceCheckout } from '@/hooks/useForceCheckout';
import { usePaymentPreferences } from '@/hooks/usePaymentPreferences';
import { usePrintReceipt } from '@/hooks/usePrintReceipt';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import { getRoomStatusNow } from '@/lib/roomAvailability';
import { useOperationsHours } from '@/hooks/useOperationsHours';
import { ExtendStayModal } from './ExtendStayModal';
import { TransferRoomModal } from './TransferRoomModal';
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
import { Switch } from '@/components/ui/switch';
import { 
  Loader2, User, CreditCard, Calendar, AlertCircle, Clock, Building2, AlertTriangle, 
  Wallet, Zap, Coffee, BellOff, UserPlus, LogIn, LogOut, Wrench, Sparkles, FileText, Receipt, Edit, Printer, MessageSquare, Users, MoveRight
} from 'lucide-react';

interface RoomActionDrawerProps {
  roomId: string | null;
  contextDate?: Date | null;
  open: boolean;
  onClose: () => void;
  onOpenAssignDrawer?: (roomId: string, roomNumber: string) => void;
}

export function RoomActionDrawer({ roomId, contextDate, open, onClose, onOpenAssignDrawer }: RoomActionDrawerProps) {
  const navigate = useNavigate();
  const { tenantId, role } = useAuth();
  const canForceCheckout = hasPermission(role, PERMISSIONS.MANAGE_FINANCE);
  const queryClient = useQueryClient();
  const { checkIn, checkOut, markClean, markMaintenance } = useRoomActions();
  const { mutate: completeCheckout, isPending: isCheckingOut } = useCheckout();
  const { mutate: forceCheckout, isPending: isForcingCheckout } = useForceCheckout();
  const { preferences } = usePaymentPreferences();
  const { print: printReceiptFn } = usePrintReceipt();
  const { settings: receiptSettings } = useReceiptSettings();
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [transferRoomOpen, setTransferRoomOpen] = useState(false);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [chargeToOrgModalOpen, setChargeToOrgModalOpen] = useState(false);
  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [amendmentDrawerOpen, setAmendmentDrawerOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [showConfirmationDoc, setShowConfirmationDoc] = useState(false);
  const [realtimeDebounceTimer, setRealtimeDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [printReceipt, setPrintReceipt] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const { data: room, isLoading } = useQuery({
    queryKey: ['room-detail', roomId, contextDate ? format(contextDate, 'yyyy-MM-dd') : 'today'],
    queryFn: async () => {
      if (!roomId || !tenantId) return null;
      
      const now = new Date();
      // Use contextDate if provided (from By Date view), otherwise use current date
      const filterDate = contextDate ? new Date(contextDate) : now;
      const filterDateStr = format(filterDate, 'yyyy-MM-dd');
      
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
            room_id,
            organization_id,
            metadata,
            guest:guests(id, name, email, phone),
            organization:organizations(id, name, credit_limit, allow_negative_balance)
          )
        `)
        .eq('id', roomId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      
      // Filter bookings based on filterDate (contextDate or today)
      if (data && data.bookings) {
        const activeBookings = Array.isArray(data.bookings) 
          ? data.bookings.filter((b: any) => {
              if (['completed', 'cancelled'].includes(b.status)) return false;
              
              const checkInDate = format(new Date(b.check_in), 'yyyy-MM-dd');
              const checkOutDate = format(new Date(b.check_out), 'yyyy-MM-dd');
              
              // Show booking if it overlaps with the filter date:
              // 1. Checked in and still active on filter date
              if (b.status === 'checked_in' && checkInDate <= filterDateStr && checkOutDate > filterDateStr) {
                return true;
              }
              
              // 2. Reserved and arriving on filter date
              if (b.status === 'reserved' && checkInDate === filterDateStr) {
                return true;
              }
              
              // 3. For any date, also include reserved bookings that span the filter date
              if (b.status === 'reserved' && checkInDate <= filterDateStr && checkOutDate > filterDateStr) {
                return true;
              }
              
              return false;
            })
          : [];
        
        // Sort by check_in date (earliest first) to prioritize today's arrivals
        activeBookings.sort((a: any, b: any) => 
          new Date(a.check_in).getTime() - new Date(b.check_in).getTime()
        );
        
        return { ...data, bookings: activeBookings };
      }
      
      return data;
    },
    enabled: !!roomId && !!tenantId,
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

  // Phase 7: Intelligent booking selection for overlapping bookings
  const bookingsArray = Array.isArray(room?.bookings) ? room.bookings : room?.bookings ? [room.bookings] : [];
  
  // Debug logging for booking resolution
  console.log('RoomActionDrawer - Booking Resolution Debug:', {
    roomId: room?.id,
    roomNumber: room?.number,
    roomStatus: room?.status,
    bookingsCount: bookingsArray.length,
    bookings: bookingsArray.map((b: any) => ({
      id: b.id,
      status: b.status,
      checkIn: b.check_in,
      checkOut: b.check_out,
      guestName: b.guest?.name
    })),
    contextDate: contextDate ? format(contextDate, 'yyyy-MM-dd') : null
  });
  
  // Smart booking selection: prioritize by context date, then active bookings
  const activeBooking = (() => {
    if (!bookingsArray.length) {
      console.log('RoomActionDrawer - No bookings found for room');
      return null;
    }
    
    // If user manually selected a booking, use that
    if (selectedBookingId) {
      const selected = bookingsArray.find((b: any) => b.id === selectedBookingId);
      if (selected) {
        console.log('RoomActionDrawer - Using manually selected booking:', selected.id);
        return selected;
      }
    }
    
    // Single booking - use it
    if (bookingsArray.length === 1) {
      console.log('RoomActionDrawer - Single booking found:', bookingsArray[0].id);
      return bookingsArray[0];
    }
    
    // CONTEXT DATE FILTERING: If viewing from date calendar, prioritize bookings overlapping that date
    if (contextDate) {
      const contextDay = new Date(contextDate);
      contextDay.setHours(0, 0, 0, 0);
      
      // Find bookings that overlap with the context date
      const dateRelevantBookings = bookingsArray.filter((b: any) => {
        const checkIn = new Date(b.check_in);
        checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(b.check_out);
        checkOut.setHours(0, 0, 0, 0);
        
        // Booking overlaps if: checkIn <= contextDate < checkOut
        return checkIn <= contextDay && contextDay < checkOut;
      });
      
      // If we found bookings for this date, use the first one (most relevant)
      if (dateRelevantBookings.length > 0) {
        console.log('RoomActionDrawer - Using context date booking:', dateRelevantBookings[0].id);
        return dateRelevantBookings[0];
      }
    }
    
    // FALLBACK: Multiple bookings without context date - use smart selection
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Filter out bookings that have checked out or are in the past
    const activeBookings = bookingsArray.filter((b: any) => {
      const checkOut = new Date(b.check_out);
      checkOut.setHours(0, 0, 0, 0);
      return b.status !== 'checked_out' && checkOut >= now;
    });
    
    if (!activeBookings.length) return bookingsArray[0]; // Fallback to any booking
    
    // 1. Checked-in bookings first
    const checkedIn = activeBookings.filter((b: any) => b.status === 'checked_in');
    if (checkedIn.length) {
      console.log('RoomActionDrawer - Using checked-in booking:', checkedIn[0].id);
      return checkedIn[0];
    }
    
    // 2. Reserved bookings checking in today
    const checkingInToday = activeBookings.filter((b: any) => {
      if (b.status !== 'reserved') return false;
      const checkIn = new Date(b.check_in);
      checkIn.setHours(0, 0, 0, 0);
      return checkIn.getTime() === now.getTime();
    });
    if (checkingInToday.length) {
      console.log('RoomActionDrawer - Using today check-in booking:', checkingInToday[0].id);
      return checkingInToday[0];
    }
    
    // 3. Earliest future check-in among reserved bookings
    const upcomingBookings = activeBookings
      .filter((b: any) => b.status === 'reserved')
      .sort((a: any, b: any) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime());
    
    const selectedBooking = upcomingBookings[0] || activeBookings[0];
    console.log('RoomActionDrawer - Using fallback booking:', selectedBooking?.id);
    return selectedBooking;
  })();
  
  // Reset selected booking when room changes
  useEffect(() => {
    setSelectedBookingId(null);
  }, [roomId]);
  
  // No longer need isTransitioning check since we filter bookings to TODAY only
  // If there's no activeBooking, it means the room genuinely has no TODAY-relevant booking
  
  // Compute real-time status based on current time and operations hours
  const { data: operationsHours } = useOperationsHours();
  const computedStatus = (() => {
    if (!room) return 'available';
    
    // If viewing a specific date (not today), use different status logic
    if (contextDate) {
      const filterDateStr = format(contextDate, 'yyyy-MM-dd');
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // If viewing a future date, show booking status directly
      if (filterDateStr !== today) {
        if (activeBooking) {
          return activeBooking.status === 'checked_in' ? 'occupied' : 'reserved';
        }
        return 'available';
      }
    }
    
    // For today or no context date, use real-time status
    return getRoomStatusNow(
      room,
      activeBooking as any,
      operationsHours?.checkInTime,
      operationsHours?.checkOutTime
    );
  })();
  
  // Fetch folio balance for active booking
  const { data: folio } = useBookingFolio(activeBooking?.id || null);
  
  // Fetch organization wallet info if organization exists
  const { data: orgWallet } = useOrganizationWallet(activeBooking?.organization_id);

  // GROUP-UX-V1: Fetch group booking info if this room is part of a group
  const groupMetadata = activeBooking?.metadata as any;
  const { data: groupInfo } = useQuery({
    queryKey: ['group-booking-info', groupMetadata?.group_id, tenantId],
    queryFn: async () => {
      if (!groupMetadata?.is_part_of_group || !groupMetadata?.group_id || !tenantId) {
        return null;
      }
      
      const { data, error } = await supabase
        .from('group_bookings')
        .select('group_id, group_name, group_size, group_leader')
        .eq('group_id', groupMetadata.group_id)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!groupMetadata?.is_part_of_group && !!groupMetadata?.group_id && !!tenantId,
  });

  // Use activeBooking consistently throughout component
  const currentBooking = activeBooking;

  // VIEW-FOLIO-BUTTON-V1: Cross-tab folio update listener
  useEffect(() => {
    const handleFolioUpdate = (event: MessageEvent) => {
      if (event.data?.type === 'FOLIO_UPDATED' && event.data?.bookingId === activeBooking?.id) {
        console.log('[drawer] VIEW-FOLIO-BUTTON-V1: Cross-tab folio update received - refetching');
        queryClient.invalidateQueries({ queryKey: ['booking-folio', activeBooking.id, tenantId] });
        if (folio?.folioId) {
          queryClient.invalidateQueries({ queryKey: ['folio-by-id', folio.folioId] });
        }
      }
    };
    
    window.addEventListener('message', handleFolioUpdate);
    return () => window.removeEventListener('message', handleFolioUpdate);
  }, [activeBooking?.id, folio?.folioId, tenantId, queryClient]);

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
    
    const hasDebt = folio && folio.balance > 0;
    const allowDebt = preferences?.allow_checkout_with_debt ?? false;
    const hasOrgPayment = activeBooking.organization_id && orgWallet;

    // Option A: Honor allow_checkout_with_debt preference
    if (hasDebt && !allowDebt) {
      // Policy says NO checkout with debt - block it
      toast({ 
        title: 'Outstanding Balance', 
        description: `Balance due: ₦${folio.balance.toLocaleString()}. Payment required before checkout. Policy does not allow debt. Use Force Checkout for manager override.`,
        variant: 'destructive'
      });
      return;
    }

    // If allowDebt is TRUE and there's debt, confirm with user
    if (hasDebt && allowDebt) {
      const entityName = hasOrgPayment 
        ? activeBooking.organization?.name 
        : activeBooking.guest?.name;
      
      const confirmed = confirm(
        `Outstanding balance: ₦${folio.balance.toLocaleString()}\n\n` +
        `This will be tracked as receivable for ${entityName}.\n\n` +
        `Continue with checkout?`
      );
      
      if (!confirmed) return;
    }

    // Phase 3: Close drawer BEFORE checkout to prevent "Room not found" flash
    onClose();
    
    // Then complete checkout in background
    completeCheckout({ 
      bookingId: activeBooking.id,
      autoChargeToWallet: false
    }, {
      onSuccess: () => {
        // Print receipt if user toggled it on
        const defaultSettings = receiptSettings?.[0];
        if (printReceipt && defaultSettings) {
          printReceiptFn({
            receiptType: 'checkout',
            bookingId: activeBooking.id,
            settingsId: defaultSettings.id,
          }, defaultSettings);
        }
      }
    });
  };

  const handleForceCheckout = async () => {
    if (!room || !activeBooking || !folio) return;
    
    const confirmed = confirm(
      `⚠️ MANAGER OVERRIDE REQUIRED\n\n` +
      `This will check out the guest with an outstanding balance of ₦${folio.balance.toLocaleString()}.\n\n` +
      `A receivable will be created for tracking.\n\n` +
      `Continue with force checkout?`
    );
    
    if (!confirmed) return;
    
    onClose();
    
    forceCheckout({
      bookingId: activeBooking.id,
      reason: 'Manager override - guest checkout with outstanding balance',
      createReceivable: true,
    }, {
      onSuccess: () => {
        // Print receipt if user toggled it on
        const defaultSettings = receiptSettings?.[0];
        if (printReceipt && defaultSettings) {
          printReceiptFn({
            receiptType: 'checkout',
            bookingId: activeBooking.id,
            settingsId: defaultSettings.id,
          }, defaultSettings);
        }
      }
    });
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

  const handleSendPaymentReminder = async () => {
    if (!activeBooking || !folio) return;
    
    const guest = Array.isArray(activeBooking.guest) ? activeBooking.guest[0] : activeBooking.guest;
    if (!guest?.phone) {
      toast({ 
        title: 'No Phone Number', 
        description: 'Guest has no phone number on file', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      const { data: hotelMeta } = await supabase
        .from('hotel_configurations')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('key', 'hotel_name')
        .maybeSingle();

      const hotelName = hotelMeta?.value || 'Our Hotel';
      const message = `Hi ${guest.name}, this is a gentle reminder about your outstanding balance of ₦${folio.balance.toLocaleString()} at ${hotelName}. Please contact the front desk to settle. Thank you!`;

      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          tenant_id: tenantId,
          to: guest.phone,
          message,
          event_key: 'payment_reminder',
          booking_id: activeBooking.id,
          guest_id: guest.id,
        },
      });

      if (error) throw error;

      toast({ 
        title: 'Reminder Sent!', 
        description: `Payment reminder sent to ${guest.name}`,
      });
    } catch (error: any) {
      toast({ 
        title: 'Failed to Send', 
        description: error.message || 'Could not send SMS reminder', 
        variant: 'destructive' 
      });
    }
  };

  const getActions = () => {
    if (!room) return [];

    const hasDND = room.notes?.includes('[DND]');
    
    // Check if we're viewing today or a different date
    const isViewingToday = !contextDate || 
      format(contextDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

    // Use computedStatus instead of room.status for accurate, time-aware actions
    switch (computedStatus) {
      case 'available':
        // Room is genuinely available - show new booking actions
        return [
          { label: 'Assign Room', action: () => room && onOpenAssignDrawer?.(room.id, room.number), variant: 'default' as const, icon: UserPlus, tooltip: 'Full booking with guest details' },
          { label: 'Walk-in Check-In', action: handleQuickCheckIn, variant: 'outline' as const, icon: LogIn, tooltip: 'Express walk-in check-in' },
          { label: 'Set Out of Service', action: handleMarkMaintenance, variant: 'outline' as const, icon: Wrench, tooltip: 'Mark as out of service' },
        ];
      case 'reserved':
      case 'checking_in':
        // Reserved rooms
        if (!activeBooking) return [];
        
        // For future dates, show informational actions only
        if (!isViewingToday) {
          return [
            { label: 'View Reservation', action: () => setAmendmentDrawerOpen(true), variant: 'default' as const, icon: FileText, tooltip: 'View reservation details' },
            { label: 'Booking Confirmation', action: () => setShowConfirmationDoc(true), variant: 'outline' as const, icon: FileText, tooltip: 'View booking confirmation' },
            { label: 'Cancel Reservation', action: () => setCancelModalOpen(true), variant: 'destructive' as const, icon: AlertTriangle, tooltip: 'Cancel this reservation' },
          ];
        }
        
        // For today, show check-in actions
        return [
          { label: 'Check-In Guest', action: handleCheckIn, variant: 'default' as const, icon: LogIn, tooltip: 'Complete guest check-in' },
          { label: 'View Reservation', action: () => setAmendmentDrawerOpen(true), variant: 'outline' as const, icon: FileText, tooltip: 'View reservation details' },
          { label: 'Cancel Reservation', action: () => setCancelModalOpen(true), variant: 'destructive' as const, icon: AlertTriangle, tooltip: 'Cancel this reservation' },
        ];
      case 'occupied':
      case 'checking_out':
        if (!activeBooking) return [];
        
        // For future dates, show informational actions only
        if (!isViewingToday) {
          return [
            { label: 'View Booking', action: () => setAmendmentDrawerOpen(true), variant: 'default' as const, icon: FileText, tooltip: 'View booking details' },
            { label: 'Booking Confirmation', action: () => setShowConfirmationDoc(true), variant: 'outline' as const, icon: FileText, tooltip: 'View booking confirmation' },
          ];
        }
        
        // For today, show all checkout and service actions
        const hasOutstandingBalance = folio && folio.balance > 0;
        const actions = [
          { label: 'Check-Out', action: handleExpressCheckout, variant: 'default' as const, icon: LogOut, tooltip: 'Complete guest checkout' },
          { label: 'Extend Stay', action: () => setExtendModalOpen(true), variant: 'outline' as const, icon: Calendar, tooltip: 'Extend checkout date' },
          { label: 'Transfer Room', action: () => setTransferRoomOpen(true), variant: 'outline' as const, icon: MoveRight, tooltip: 'Transfer to different room' },
          { label: 'Add Service', action: handleRoomService, variant: 'outline' as const, icon: Sparkles, tooltip: 'Add room service charge' },
          { label: 'Post Payment', action: () => setQuickPaymentOpen(true), variant: 'outline' as const, icon: CreditCard, tooltip: 'Record payment' },
          { label: hasDND ? 'Remove DND' : 'Do Not Disturb', action: handleToggleDND, variant: hasDND ? 'secondary' : 'ghost' as const, icon: BellOff, tooltip: 'Toggle Do Not Disturb' },
        ];
        
        // Add Force Checkout ONLY if there's debt AND user has permission
        if (hasOutstandingBalance && canForceCheckout) {
          actions.splice(1, 0, { 
            label: 'Force Checkout', 
            action: handleForceCheckout, 
            variant: 'destructive' as const, 
            icon: AlertTriangle, 
            tooltip: 'Manager override - checkout with debt' 
          });
        }
        
        return actions;
      case 'overstay':
        if (!activeBooking) return [];
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : room ? (
            <>
              {/* Date Context Badge */}
              {contextDate && format(contextDate, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd') && (
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b -mx-4 -mt-4 mb-4">
                  <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Viewing for: {format(contextDate, 'MMMM dd, yyyy')}
                  </p>
                </div>
              )}
              
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <SheetTitle className="text-2xl font-display">Room {room.number}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className="capitalize">{computedStatus.replace('_', ' ')}</Badge>
                      
                      {/* GROUP-UX-V1: Group booking indicator */}
                      {groupInfo && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100">
                          <Users className="w-3 h-3 mr-1" />
                          Group: {groupInfo.group_name}
                        </Badge>
                      )}
                      
                      <span className="text-sm text-muted-foreground">
                        {room.category?.name || room.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* VIEW-FOLIO-BUTTON-V1: Navigate to individual folio */}
                    {folio?.folioId && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                console.log('VIEW-FOLIO-BUTTON-V1: Navigating to billing center', folio.folioId);
                                navigate(`/dashboard/billing/${folio.folioId}`);
                              }}
                              className="gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              View Folio
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View individual room folio</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {/* GROUP-UX-V1: Navigate to group billing center */}
                    {groupInfo && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                console.log('GROUP-UX-V1: Navigating to group billing center', groupInfo.group_id);
                                navigate(`/dashboard/group-billing/${groupInfo.group_id}`);
                              }}
                              className="gap-2"
                            >
                              <Users className="w-4 h-4" />
                              View Group Billing
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View master folio for entire group ({groupInfo.group_size} rooms)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
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
                  {!currentBooking && computedStatus === 'available' && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No booking active for today. Room is available.
                      </p>
                    </div>
                  )}
                  
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

                      {/* GROUP-UX-V1: Group booking section */}
                      {groupInfo && (
                        <>
                          <div className="space-y-3">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Group Booking
                            </h3>
                            <div className="text-sm space-y-2">
                              <p className="font-medium">{groupInfo.group_name}</p>
                              <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                                <span className="text-xs text-muted-foreground">Total Rooms</span>
                                <span className="font-semibold">{groupInfo.group_size}</span>
                              </div>
                              {groupInfo.group_leader && (
                                <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                                  <span className="text-xs text-muted-foreground">Group Leader</span>
                                  <span className="font-medium text-xs">{groupInfo.group_leader}</span>
                                </div>
                              )}
                              <Button 
                                variant="outline" 
                                className="w-full gap-2 mt-2"
                                onClick={() => navigate(`/dashboard/group-billing/${groupInfo.group_id}`)}
                              >
                                <Building2 className="w-4 h-4" />
                                View Master Folio
                              </Button>
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
                              queryClient.invalidateQueries({ queryKey: ['room-detail', roomId] });
                              queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
                              queryClient.invalidateQueries({ queryKey: ['booking-folio'] });
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
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => setQuickPaymentOpen(true)}
                                  className="w-full"
                                >
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Collect Payment
                                </Button>
                                {currentBooking.guest?.phone && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSendPaymentReminder}
                                    className="w-full"
                                  >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Send Payment Reminder
                                  </Button>
                                )}
                              </>
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

                  {/* Print Receipt Toggle */}
                  {(room.status === 'occupied' || room.status === 'overstay') && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Printer className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="print-receipt-toggle" className="cursor-pointer">
                          Print Receipt After Checkout
                        </Label>
                      </div>
                      <Switch
                        id="print-receipt-toggle"
                        checked={printReceipt}
                        onCheckedChange={setPrintReceipt}
                      />
                    </div>
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
              <TransferRoomModal
                open={transferRoomOpen}
                onClose={() => setTransferRoomOpen(false)}
                bookingId={currentBooking.id}
                currentRoomId={currentBooking.room_id}
                currentRoomNumber={room.number}
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
