import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { useFolioPDF } from '@/hooks/useFolioPDF';
import { getRoomStatusNow } from '@/lib/roomAvailability';
import { useOperationsHours } from '@/hooks/useOperationsHours';
import { calculateStayLifecycleState, isActionAllowed } from '@/lib/stayLifecycle';
import { ExtendStayModal } from './ExtendStayModal';
import { TransferRoomModal } from './TransferRoomModal';
import { AddChargeModal } from './AddChargeModal';
import { ChargeToOrgModal } from './ChargeToOrgModal';
import { RoomAuditTrail } from './RoomAuditTrail';
import { QuickPaymentForm } from './QuickPaymentForm';
import { PaymentHistory } from '@/modules/payments/PaymentHistory';
import { IncomingReservationCard } from './IncomingReservationCard';
import { BookingAmendmentDrawer } from '@/modules/bookings/components/BookingAmendmentDrawer';
import { CancelBookingModal } from '@/modules/bookings/components/CancelBookingModal';
import { BookingConfirmationDocument } from '@/modules/bookings/components/BookingConfirmationDocument';
import { ForceCheckoutModal } from './ForceCheckoutModal';
import { BookingPaymentManager } from '@/modules/bookings/components/BookingPaymentManager';
import { ManagerApprovalModal } from '@/modules/payments/ManagerApprovalModal';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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
  const { printFolio, isPrinting } = useFolioPDF();
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [transferRoomOpen, setTransferRoomOpen] = useState(false);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [chargeToOrgModalOpen, setChargeToOrgModalOpen] = useState(false);
  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [amendmentDrawerOpen, setAmendmentDrawerOpen] = useState(false);
  const [incomingPaymentOpen, setIncomingPaymentOpen] = useState(false);
  const [incomingPaymentData, setIncomingPaymentData] = useState<{
    bookingId: string;
    guestId: string;
    balance: number;
  } | null>(null);
  const [incomingHistoryOpen, setIncomingHistoryOpen] = useState(false);
  const [incomingHistoryBookingId, setIncomingHistoryBookingId] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [showConfirmationDoc, setShowConfirmationDoc] = useState(false);
  const [realtimeDebounceTimer, setRealtimeDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [printReceipt, setPrintReceipt] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [showManagerApproval, setShowManagerApproval] = useState(false);
  const [pendingCheckoutData, setPendingCheckoutData] = useState<{ balance: number } | null>(null);
  const [showEarlyCheckInApproval, setShowEarlyCheckInApproval] = useState(false);
  const [forceCheckoutModalOpen, setForceCheckoutModalOpen] = useState(false);

  const { data: room, isLoading, isError } = useQuery({
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
      
      // PHASE-3-FIX: Use same overlap rule as RoomGrid for consistency
      // Filter bookings based on filterDate (contextDate or today)
      if (data && data.bookings) {
        const allBookings = Array.isArray(data.bookings) ? data.bookings : [];
        
        // Apply the same overlap rule as RoomGrid: checkInDate <= filterDate AND checkOutDate >= filterDate
        const overlappingBookings = allBookings.filter((b: any) => {
          if (['completed', 'cancelled'].includes(b.status)) return false;
          
          const checkInDate = format(new Date(b.check_in), 'yyyy-MM-dd');
          const checkOutDate = format(new Date(b.check_out), 'yyyy-MM-dd');
          
          // Booking overlaps filterDate if it spans the date (inclusive on both ends)
          return checkInDate <= filterDateStr && checkOutDate >= filterDateStr;
        });
        
        // Use same priority selection as RoomGrid
        let activeBooking;
        
        // Priority 1: Checked-in guests (currently occupying the room)
        activeBooking = overlappingBookings.find((b: any) => b.status === 'checked_in');
        
        // Priority 2: Arrivals on filter date (reserved status, check-in on filter date)
        if (!activeBooking) {
          activeBooking = overlappingBookings.find((b: any) => {
            const checkInDate = format(new Date(b.check_in), 'yyyy-MM-dd');
            return b.status === 'reserved' && checkInDate === filterDateStr;
          });
        }
        
        // Priority 3: Other overlapping bookings (reserved multi-day stays spanning filter date)
        if (!activeBooking) {
          activeBooking = overlappingBookings[0] ?? null;
        }
        
        // SAME-DAY-TURNOVER-V1: Keep all overlapping bookings for turnover detection
        return { ...data, bookings: overlappingBookings };
      }
      
      return data;
    },
    enabled: !!roomId && !!tenantId,
    staleTime: 30 * 1000, // FOLIO-PREFETCH-V1: Cache for 30 seconds
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

  // PHASE-3-FIX: Use identical overlap rule as RoomGrid for booking resolution
  const bookingsArray = Array.isArray(room?.bookings) ? room.bookings : room?.bookings ? [room.bookings] : [];
  
  // Determine filter date: use contextDate if provided (By Date view), otherwise today (Room Status view)
  const filterDate = contextDate || new Date();
  const filterDateStr = format(filterDate, 'yyyy-MM-dd');
  
  // IDENTICAL OVERLAP RULE AS ROOMGRID: checkInDate <= viewDate AND checkOutDate >= viewDate
  const activeBooking = (() => {
    if (!bookingsArray.length) {
      return null;
    }
    
    // If user manually selected a booking, use that
    if (selectedBookingId) {
      const selected = bookingsArray.find((b: any) => b.id === selectedBookingId);
      if (selected) {
        return selected;
      }
    }
    
    // OVERSTAY-FIX-V1: Filter bookings that overlap with filterDate using IDENTICAL rule as RoomGrid
    const overlappingBookings = bookingsArray.filter((b: any) => {
      if (['completed', 'cancelled'].includes(b.status)) return false;
      
      const checkInDate = format(new Date(b.check_in), 'yyyy-MM-dd');
      const checkOutDate = format(new Date(b.check_out), 'yyyy-MM-dd');
      
      // Standard overlap: booking spans the date
      const standardOverlap = checkInDate <= filterDateStr && checkOutDate >= filterDateStr;
      
      // OVERSTAY-FIX-V1: Include checked_in guests even if checkout date passed
      const isOverstayStillCheckedIn = b.status === 'checked_in' && checkInDate <= filterDateStr;
      
      return standardOverlap || isOverstayStillCheckedIn;
    });
    
    if (!overlappingBookings.length) return null;
    
    // IDENTICAL PRIORITY RULES AS ROOMGRID:
    // Priority 1: Checked-in guests (currently occupying the room)
    let activeBooking = overlappingBookings.find((b: any) => b.status === 'checked_in');
    
    // Priority 2: Arrivals today (reserved status, check-in today)
    if (!activeBooking) {
      activeBooking = overlappingBookings.find((b: any) => {
        const checkInDate = format(new Date(b.check_in), 'yyyy-MM-dd');
        return b.status === 'reserved' && checkInDate === filterDateStr;
      });
    }
    
    // Priority 3: Other overlapping bookings (reserved multi-day stays spanning today)
    if (!activeBooking) {
      activeBooking = overlappingBookings[0] ?? null;
    }
    
    return activeBooking;
  })();

  // SAME-DAY-TURNOVER-V1: Detect incoming reservation for departing rooms
  const incomingReservation = (() => {
    if (!activeBooking || activeBooking.status !== 'checked_in') return null;
    
    const checkOutDate = format(new Date(activeBooking.check_out), 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // OVERSTAY-INCOMING-V1: Include overstays (checkout <= today) but exclude future departures
    if (checkOutDate > today) return null;
    
    // Find reserved booking with check-in today (different from active)
    const incoming = bookingsArray.find((b: any) => {
      if (b.id === activeBooking.id || b.status !== 'reserved') return false;
      const checkInDate = format(new Date(b.check_in), 'yyyy-MM-dd');
      return checkInDate === today;
    }) || null;
    
    console.log('SAME-DAY-TURNOVER-DEBUG', {
      roomNumber: room?.number,
      activeBookingId: activeBooking?.id,
      activeCheckOut: checkOutDate,
      today,
      isCheckOutToday: checkOutDate === today,
      bookingsCount: bookingsArray.length,
      bookings: bookingsArray.map((b: any) => ({
        id: b.id,
        status: b.status,
        checkIn: format(new Date(b.check_in), 'yyyy-MM-dd'),
        checkOut: format(new Date(b.check_out), 'yyyy-MM-dd'),
        guest: b.guest?.name
      })),
      incomingFound: !!incoming
    });
    
    return incoming;
  })();
  
  // Reset selected booking when room changes
  useEffect(() => {
    setSelectedBookingId(null);
  }, [roomId]);
  
  // No longer need isTransitioning check since we filter bookings to TODAY only
  // If there's no activeBooking, it means the room genuinely has no TODAY-relevant booking
  
  // DRAWER-LIFECYCLE-INTEGRATION-V1: Calculate lifecycle state
  const { data: operationsHours } = useOperationsHours();
  
  const lifecycle = activeBooking
    ? calculateStayLifecycleState(
        new Date(),
        operationsHours?.checkInTime || '14:00',
        operationsHours?.checkOutTime || '12:00',
        activeBooking,
        room
      )
    : null;
  
  // OVERSTAY-FIX-V1: Use lifecycle display status for UI (NO FALLBACK to database status)
  const computedStatus = (() => {
    if (!room) return 'available';
    
    // Manual statuses always respected (maintenance, cleaning, etc.)
    if (['maintenance', 'out_of_order', 'cleaning'].includes(room.status)) {
      return room.status;
    }
    
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
    
    // For today, use lifecycle display status if available
    if (lifecycle) {
      return lifecycle.displayStatus;
    }
    
    // OVERSTAY-FIX-V1: When no overlapping booking and no lifecycle,
    // room should show as available (consistent with Grid)
    // DO NOT fall back to database status for occupied/reserved/overstay
    // This prevents showing stale statuses when no active booking exists
    return 'available';
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
        // QUERY-KEY-FIX-V1: Specific cache invalidation with consistent keys
        console.log('[drawer] VIEW-FOLIO-BUTTON-V1: Cross-tab folio update received - refetching');
        queryClient.invalidateQueries({ queryKey: ['booking-folio', activeBooking.id, tenantId] });
        if (folio?.folioId) {
          queryClient.invalidateQueries({ queryKey: ['folio', folio.folioId, tenantId] });
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
    const managerThreshold = preferences?.manager_approval_threshold || 5000;

    // Check if manager approval is required for outstanding debt
    if (hasDebt && folio.balance >= managerThreshold) {
      setPendingCheckoutData({ balance: folio.balance });
      setShowManagerApproval(true);
      return;
    }

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
    setForceCheckoutModalOpen(true);
  };

  const handleConfirmForceCheckout = (reason: string, createReceivable: boolean, approvalToken: string) => {
    if (!activeBooking) return;
    
    forceCheckout({
      bookingId: activeBooking.id,
      reason,
      createReceivable,
      approvalToken,
    }, {
      onSuccess: () => {
        setForceCheckoutModalOpen(false);
        onClose();
        
        // Print receipt if user toggled it on
        const defaultSettings = receiptSettings?.[0];
        if (printReceipt && defaultSettings) {
          printReceiptFn({
            receiptType: 'checkout',
            bookingId: activeBooking.id,
            settingsId: defaultSettings.id,
          }, defaultSettings);
        }
      },
      onError: () => {
        // Keep modal open on error so user can see the error toast
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

  const handleEarlyCheckIn = () => {
    setShowEarlyCheckInApproval(true);
  };

  const handleEarlyCheckInApproved = async (approvalToken: string) => {
    if (!room) return;
    
    setShowEarlyCheckInApproval(false);
    
    // EARLY-CHECKIN-V1: Proceed with check-in after manager approval
    await checkIn(room.id);
    
    toast({ 
      title: 'Early Check-In Approved', 
      description: 'Guest checked in before official check-in time' 
    });
    
    // Navigate to clean front desk route without search parameters
    setTimeout(() => {
      onClose();
      navigate('/dashboard/front-desk', { replace: true });
    }, 600);
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
      // PAYMENT-REMINDER-FIX-V1: Query hotel_meta instead of hotel_configurations
      const { data: hotelMetaData } = await supabase
        .from('hotel_meta')
        .select('hotel_name')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      const hotelName = hotelMetaData?.hotel_name || 'the hotel';
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

  // DRAWER-CONDITIONAL-ACTIONS-V1: Lifecycle-based action filtering
  const getActions = () => {
    if (!room) return [];

    const hasDND = room.notes?.includes('[DND]');
    
    // Check if we're viewing today or a different date
    const isViewingToday = !contextDate || 
      format(contextDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

    // If we have a lifecycle state, use it for smarter actions
    if (lifecycle && isViewingToday) {
      const canCheckIn = isActionAllowed(lifecycle, 'check-in');
      const canEarlyCheckIn = isActionAllowed(lifecycle, 'early-check-in');
      const canCheckout = isActionAllowed(lifecycle, 'checkout');
      const canCollectPayment = isActionAllowed(lifecycle, 'collect-payment');
      const canAddCharge = isActionAllowed(lifecycle, 'add-charge');
      const canExtendStay = isActionAllowed(lifecycle, 'extend-stay');
      const canTransferRoom = isActionAllowed(lifecycle, 'transfer-room');
      const canAmendBooking = isActionAllowed(lifecycle, 'amend-booking');
      const canCancelBooking = isActionAllowed(lifecycle, 'cancel-booking');

      // Build actions array based on allowed actions
      const actions = [];

      // Check-in action (normal or early with manager approval)
      if (canCheckIn && activeBooking) {
        actions.push({ 
          label: 'Check-In Guest', 
          action: handleCheckIn, 
          variant: 'default' as const, 
          icon: LogIn, 
          tooltip: 'Complete guest check-in' 
        });
      } else if (canEarlyCheckIn && activeBooking) {
        actions.push({ 
          label: 'Early Check-In (Requires Approval)', 
          action: handleEarlyCheckIn, 
          variant: 'default' as const, 
          icon: LogIn, 
          tooltip: 'Check-in before official time - requires manager approval' 
        });
      }

      // Checkout action - PHASE-6-OVERSTAY-FIX-V2
      if (canCheckout && activeBooking) {
        const hasOutstandingBalance = folio && folio.balance > 0;
        
        if (lifecycle.state === 'overstay') {
          // Overstay WITH balance → Force Checkout (manager approval required)
          if (hasOutstandingBalance && canForceCheckout) {
            actions.push({ 
              label: 'Force Checkout', 
              action: handleForceCheckout, 
              variant: 'destructive' as const, 
              icon: AlertTriangle, 
              tooltip: 'Manager override - checkout with outstanding balance' 
            });
          } else {
            // Overstay WITHOUT balance → Regular checkout
            actions.push({ 
              label: 'Check-Out', 
              action: handleExpressCheckout, 
              variant: 'destructive' as const, 
              icon: LogOut, 
              tooltip: 'Complete checkout' 
            });
          }
        } else {
          // Non-overstay → Regular checkout
          actions.push({ 
            label: 'Check-Out', 
            action: handleExpressCheckout, 
            variant: 'default' as const, 
            icon: LogOut, 
            tooltip: 'Complete guest checkout' 
          });
          
          // Add Force Checkout option for non-overstay with debt
          if (hasOutstandingBalance && canForceCheckout) {
            actions.push({ 
              label: 'Force Checkout', 
              action: handleForceCheckout, 
              variant: 'destructive' as const, 
              icon: AlertTriangle, 
              tooltip: 'Manager override - checkout with debt' 
            });
          }
        }
      }

      // SAME-DAY-TURNOVER-V1 + OVERSTAY-BOOK-V1: Add "Book for Today" if departing today OR overstay with no incoming reservation
      if ((lifecycle.state === 'departing-today' || lifecycle.state === 'overstay') && !incomingReservation && room && onOpenAssignDrawer) {
        actions.push({
          label: 'Book for Today',
          action: () => onOpenAssignDrawer(room.id, room.number),
          variant: 'outline' as const,
          icon: UserPlus,
          tooltip: 'Book this room for a new guest today after checkout'
        });
      }

      // Extend stay
      if (canExtendStay && activeBooking) {
        actions.push({ 
          label: 'Extend Stay', 
          action: () => setExtendModalOpen(true), 
          variant: 'outline' as const, 
          icon: Calendar, 
          tooltip: 'Extend checkout date' 
        });
      }

      // Transfer room
      if (canTransferRoom && activeBooking) {
        actions.push({ 
          label: 'Transfer Room', 
          action: () => setTransferRoomOpen(true), 
          variant: 'outline' as const, 
          icon: MoveRight, 
          tooltip: 'Transfer to different room' 
        });
      }

      // Add service/charge
      if (canAddCharge && activeBooking) {
        actions.push({ 
          label: lifecycle.state === 'overstay' ? 'Apply Overstay Charge' : 'Add Service', 
          action: handleRoomService, 
          variant: 'outline' as const, 
          icon: Sparkles, 
          tooltip: lifecycle.state === 'overstay' ? 'Apply overstay fees' : 'Add room service charge' 
        });
      }

      // Collect payment
      if (canCollectPayment && activeBooking) {
        actions.push({ 
          label: 'Post Payment', 
          action: () => setQuickPaymentOpen(true), 
          variant: 'outline' as const, 
          icon: CreditCard, 
          tooltip: 'Record payment' 
        });
      }

      // Amend/View reservation
      if (canAmendBooking && activeBooking) {
        actions.push({ 
          label: 'View Reservation', 
          action: () => setAmendmentDrawerOpen(true), 
          variant: 'outline' as const, 
          icon: FileText, 
          tooltip: 'View reservation details' 
        });
      }

      // Cancel booking
      if (canCancelBooking && activeBooking) {
        actions.push({ 
          label: 'Cancel Reservation', 
          action: () => setCancelModalOpen(true), 
          variant: 'destructive' as const, 
          icon: AlertTriangle, 
          tooltip: 'Cancel this reservation' 
        });
      }

      // DND toggle (always available for occupied rooms)
      if (lifecycle.state === 'in-house' || lifecycle.state === 'departing-today' || lifecycle.state === 'overstay') {
        actions.push({ 
          label: hasDND ? 'Remove DND' : 'Do Not Disturb', 
          action: handleToggleDND, 
          variant: hasDND ? 'secondary' : 'ghost' as const, 
          icon: BellOff, 
          tooltip: 'Toggle Do Not Disturb' 
        });
      }

      // If no actions from lifecycle, show room management actions
      if (actions.length === 0) {
        // CLEANING-FIX-V1: Check cleaning/maintenance FIRST (they have state='vacant' but need different actions)
        if (lifecycle.displayStatus === 'cleaning') {
          return [
            { label: 'Mark Clean', action: handleMarkClean, variant: 'default' as const, icon: Sparkles, tooltip: 'Mark as clean and ready' },
          ];
        }
        
        if (lifecycle.displayStatus === 'maintenance') {
          return [
            { label: 'Mark as Available', action: handleMarkClean, variant: 'default' as const, icon: Sparkles, tooltip: 'Complete maintenance' },
          ];
        }
        
        // Now check for truly vacant/available rooms
        if (lifecycle.state === 'vacant' || lifecycle.displayStatus === 'available') {
          return [
            { label: 'Assign Room', action: () => room && onOpenAssignDrawer?.(room.id, room.number), variant: 'default' as const, icon: UserPlus, tooltip: 'Full booking with guest details' },
            { label: 'Walk-in Check-In', action: handleQuickCheckIn, variant: 'outline' as const, icon: LogIn, tooltip: 'Express walk-in check-in' },
            { label: 'Set Out of Service', action: handleMarkMaintenance, variant: 'outline' as const, icon: Wrench, tooltip: 'Mark as out of service' },
          ];
        }
      }

      return actions;
    }

    // Fallback: Use old computedStatus logic if no lifecycle
    switch (computedStatus) {
      case 'available':
        return [
          { label: 'Assign Room', action: () => room && onOpenAssignDrawer?.(room.id, room.number), variant: 'default' as const, icon: UserPlus, tooltip: 'Full booking with guest details' },
          { label: 'Walk-in Check-In', action: handleQuickCheckIn, variant: 'outline' as const, icon: LogIn, tooltip: 'Express walk-in check-in' },
          { label: 'Set Out of Service', action: handleMarkMaintenance, variant: 'outline' as const, icon: Wrench, tooltip: 'Mark as out of service' },
        ];
      case 'reserved':
      case 'checking_in':
        if (!activeBooking) return [];
        
        if (!isViewingToday) {
          return [
            { label: 'View Reservation', action: () => setAmendmentDrawerOpen(true), variant: 'default' as const, icon: FileText, tooltip: 'View reservation details' },
            { label: 'Booking Confirmation', action: () => setShowConfirmationDoc(true), variant: 'outline' as const, icon: FileText, tooltip: 'View booking confirmation' },
            { label: 'Cancel Reservation', action: () => setCancelModalOpen(true), variant: 'destructive' as const, icon: AlertTriangle, tooltip: 'Cancel this reservation' },
          ];
        }
        
        return [
          { label: 'Check-In Guest', action: handleCheckIn, variant: 'default' as const, icon: LogIn, tooltip: 'Complete guest check-in' },
          { label: 'View Reservation', action: () => setAmendmentDrawerOpen(true), variant: 'outline' as const, icon: FileText, tooltip: 'View reservation details' },
          { label: 'Cancel Reservation', action: () => setCancelModalOpen(true), variant: 'destructive' as const, icon: AlertTriangle, tooltip: 'Cancel this reservation' },
        ];
      case 'occupied':
      case 'checking_out':
      case 'departing-today':
        if (!activeBooking) return [];
        
        if (!isViewingToday) {
          return [
            { label: 'View Booking', action: () => setAmendmentDrawerOpen(true), variant: 'default' as const, icon: FileText, tooltip: 'View booking details' },
            { label: 'Booking Confirmation', action: () => setShowConfirmationDoc(true), variant: 'outline' as const, icon: FileText, tooltip: 'View booking confirmation' },
          ];
        }
        
        const hasOutstandingBalance = folio && folio.balance > 0;
        const actions = [
          { label: 'Check-Out', action: handleExpressCheckout, variant: 'default' as const, icon: LogOut, tooltip: 'Complete guest checkout' },
          { label: 'Extend Stay', action: () => setExtendModalOpen(true), variant: 'outline' as const, icon: Calendar, tooltip: 'Extend checkout date' },
          { label: 'Transfer Room', action: () => setTransferRoomOpen(true), variant: 'outline' as const, icon: MoveRight, tooltip: 'Transfer to different room' },
          { label: 'Add Service', action: handleRoomService, variant: 'outline' as const, icon: Sparkles, tooltip: 'Add room service charge' },
          { label: 'Post Payment', action: () => setQuickPaymentOpen(true), variant: 'outline' as const, icon: CreditCard, tooltip: 'Record payment' },
          { label: hasDND ? 'Remove DND' : 'Do Not Disturb', action: handleToggleDND, variant: hasDND ? 'secondary' : 'ghost' as const, icon: BellOff, tooltip: 'Toggle Do Not Disturb' },
        ];
        
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
        // PHASE-6-OVERSTAY-FIX: Check for outstanding balance and use force checkout
        const hasOverstayBalance = folio && folio.balance > 0;
        const checkoutAction = hasOverstayBalance && canForceCheckout 
          ? { label: 'Force Checkout', action: handleForceCheckout, variant: 'destructive' as const, icon: AlertTriangle, tooltip: 'Manager override - checkout with outstanding balance' }
          : { label: 'Check-Out', action: handleExpressCheckout, variant: 'destructive' as const, icon: LogOut, tooltip: 'Complete checkout' };
        
        return [
          { label: 'Extend Stay', action: () => setExtendModalOpen(true), variant: 'default' as const, icon: Calendar, tooltip: 'Extend guest stay' },
          { label: 'Apply Overstay Charge', action: handleRoomService, variant: 'outline' as const, icon: CreditCard, tooltip: 'Apply overstay fees' },
          checkoutAction,
          { label: 'Transfer Room', action: () => setTransferRoomOpen(true), variant: 'outline' as const, icon: MoveRight, tooltip: 'Transfer to different room' },
        ];
      case 'cleaning':
        return [
          { label: 'Mark Clean', action: handleMarkClean, variant: 'default' as const, icon: Sparkles, tooltip: 'Mark as clean and ready' },
        ];
      case 'maintenance':
        return [
          { label: 'Mark as Available', action: handleMarkClean, variant: 'default' as const, icon: Sparkles, tooltip: 'Complete maintenance' },
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
            // FOLIO-PREFETCH-V1: Skeleton loading states
            <div className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" /> {/* Guest Info Card */}
                <Skeleton className="h-20 w-full" /> {/* Stay Details */}
                <Skeleton className="h-16 w-full" /> {/* Folio Summary */}
              </div>
              
              <div className="flex gap-2 mt-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
              </div>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-sm text-muted-foreground">Error loading room details</p>
            </div>
          ) : !room ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Room not found</p>
            </div>
          ) : (
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
                    
                    {/* PRINT-FOLIO-DRAWER-V1: Print folio button */}
                    {folio?.folioId && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                console.log('PRINT-FOLIO-DRAWER-V1: Printing folio', folio.folioId);
                                printFolio({ folioId: folio.folioId });
                              }}
                              disabled={isPrinting}
                              className="gap-2"
                            >
                              <Printer className="w-4 h-4" />
                              {isPrinting ? 'Preparing...' : 'Print Folio'}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Print guest folio PDF</p>
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

                      {/* SAME-DAY-TURNOVER-V2: Upcoming reservation with payment status */}
                      {(lifecycle?.state === 'departing-today' || lifecycle?.state === 'overstay') && incomingReservation && (
                        <>
                          <IncomingReservationCard
                            incomingReservation={incomingReservation}
                            checkInTime={operationsHours?.checkInTime || '14:00'}
                            onCollectPayment={(bookingId, guestId, balance) => {
                              setIncomingPaymentData({ bookingId, guestId, balance });
                              setIncomingPaymentOpen(true);
                            }}
                            onViewHistory={(bookingId) => {
                              setIncomingHistoryBookingId(bookingId);
                              setIncomingHistoryOpen(true);
                            }}
                          />
                          
                          {/* Payment history for incoming reservation */}
                          {incomingHistoryOpen && incomingHistoryBookingId && (
                            <div className="mt-4">
                              <PaymentHistory 
                                bookingId={incomingHistoryBookingId}
                                onClose={() => {
                                  setIncomingHistoryOpen(false);
                                  setIncomingHistoryBookingId(null);
                                }}
                              />
                            </div>
                          )}
                          
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
                              // QUERY-KEY-FIX-V1: Specific cache invalidation with IDs
                              setQuickPaymentOpen(false);
                              queryClient.invalidateQueries({ queryKey: ['room-detail', roomId] });
                              queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
                              if (currentBooking?.id) {
                                queryClient.invalidateQueries({ queryKey: ['booking-folio', currentBooking.id, tenantId] });
                              }
                            }}
                            onCancel={() => setQuickPaymentOpen(false)}
                          />
                        ) : (
                          <>
                            {folio && (
                              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Charges:</span>
                                  <span className="font-medium">{folio.currency === 'NGN' ? '₦' : folio.currency}{folio.totalCharges.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Payments:</span>
                                  <span className="font-medium text-green-600">{folio.currency === 'NGN' ? '₦' : folio.currency}{folio.totalPayments.toFixed(2)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                  <span className="font-semibold">Balance:</span>
                                  <span className={`text-lg font-bold ${folio.balance > 0 ? 'text-destructive' : folio.balance < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                    {folio.balance < 0 ? `Credit: ${folio.currency === 'NGN' ? '₦' : folio.currency}${Math.abs(folio.balance).toFixed(2)}` : `${folio.currency === 'NGN' ? '₦' : folio.currency}${folio.balance.toFixed(2)}`}
                                  </span>
                                </div>
                              </div>
                            )}
                            {!folio && (
                              <p className="text-muted-foreground">No folio data available</p>
                            )}
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
                            {groupInfo && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/dashboard/group-billing/${groupInfo.group_id}`)}
                                className="w-full"
                              >
                                <Users className="w-4 h-4 mr-2" />
                                View Group Billing
                              </Button>
                            )}
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

                  {/* DRAWER-STATUS-ALERTS-V1: Lifecycle-based status alerts */}
                  {lifecycle && lifecycle.state === 'departing-today' && (
                    <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-700 dark:text-orange-300">
                        <strong>Due Out Today</strong> — Checkout time: {operationsHours?.checkOutTime || '12:00'}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {lifecycle && lifecycle.state === 'overstay' && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Overstay Alert</strong> — Guest was due out at {operationsHours?.checkOutTime || '12:00'}
                        {lifecycle.statusMessage && ` · ${lifecycle.statusMessage}`}
                      </AlertDescription>
                    </Alert>
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
      
      {/* Manager Approval Modal for Checkout with Debt */}
      {activeBooking && pendingCheckoutData && (
        <ManagerApprovalModal
          open={showManagerApproval}
          amount={pendingCheckoutData.balance}
          type="checkout_with_debt"
          actionReference={activeBooking.id}
          onApprove={(approvalToken) => {
            setShowManagerApproval(false);
            setPendingCheckoutData(null);
            
            // Proceed with checkout after approval
            onClose();
            completeCheckout({ 
              bookingId: activeBooking.id,
              autoChargeToWallet: false
            }, {
              onSuccess: () => {
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
          }}
          onReject={() => {
            setShowManagerApproval(false);
            setPendingCheckoutData(null);
          }}
        />
      )}
      
      {/* EARLY-CHECKIN-V1: Manager Approval Modal for Early Check-In */}
      {activeBooking && (
        <ManagerApprovalModal
          open={showEarlyCheckInApproval}
          amount={0}
          type="early-check-in"
          actionReference={activeBooking.id}
          onApprove={handleEarlyCheckInApproved}
          onReject={() => setShowEarlyCheckInApproval(false)}
        />
      )}
      
      {/* FORCE-CHECKOUT-PIN-V1: Force Checkout Modal with Manager PIN */}
      {activeBooking && folio && (
        <ForceCheckoutModal
          open={forceCheckoutModalOpen}
          onClose={() => setForceCheckoutModalOpen(false)}
          onConfirm={handleConfirmForceCheckout}
          balance={folio.balance}
          guestName={activeBooking.guest?.name}
          roomNumber={room?.number}
          bookingId={activeBooking.id}
          isLoading={isForcingCheckout}
        />
      )}
      
      {/* SAME-DAY-TURNOVER-V2: Payment Dialog for Incoming Reservation */}
      {incomingPaymentData && (
        <Dialog open={incomingPaymentOpen} onOpenChange={setIncomingPaymentOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Collect Payment - Incoming Reservation</DialogTitle>
            </DialogHeader>
            <QuickPaymentForm
              bookingId={incomingPaymentData.bookingId}
              guestId={incomingPaymentData.guestId}
              expectedAmount={incomingPaymentData.balance}
              onSuccess={() => {
                setIncomingPaymentOpen(false);
                setIncomingPaymentData(null);
              }}
              onCancel={() => {
                setIncomingPaymentOpen(false);
                setIncomingPaymentData(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
