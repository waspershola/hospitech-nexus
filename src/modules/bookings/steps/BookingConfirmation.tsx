import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinancials } from '@/hooks/useFinancials';
import { usePrintReceipt } from '@/hooks/usePrintReceipt';
import { useReceiptData } from '@/hooks/useReceiptData';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import { usePlatformFee } from '@/hooks/usePlatformFee';
import { useRoomAvailability, getUnavailableRooms } from '@/hooks/useRoomAvailability';
import { calculateBookingTotal } from '@/lib/finance/tax';
import { calculateGroupBookingTotal } from '@/lib/finance/groupBookingCalculator';
import { calculatePlatformFee } from '@/lib/finance/platformFee';
import { differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check, Building2, AlertCircle, Users, CheckCircle, Printer, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useOrganizationWallet } from '@/hooks/useOrganizationWallet';
import { PaymentStep } from '../components/PaymentStep';
import type { BookingData } from '../BookingFlow';

interface BookingConfirmationProps {
  bookingData: BookingData;
  onChange: (data: BookingData) => void;
  onComplete: () => void;
}

export function BookingConfirmation({ bookingData, onComplete }: BookingConfirmationProps) {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();
  const { data: financials } = useFinancials();
  const { data: platformFeeConfig } = usePlatformFee(tenantId);
  const { print, isPrinting } = usePrintReceipt();
  const { settings: receiptSettings } = useReceiptSettings();
  const isGroupBooking = bookingData.isGroupBooking && (bookingData.selectedRoomIds?.length || 0) > 1;
  const [showPayment, setShowPayment] = useState(false);
  const [createdBookings, setCreatedBookings] = useState<Array<{ id: string; guestId: string; amount: number }>>([]);

  // Platform tenant trial status (temporary: no trial exemption since we ended the trial manually)
  const platformTenant = {
    trial_end_date: null, // Trial already ended
    trial_exemption_enabled: false, // Not using trial exemption for now
  };
  
  // Get the default receipt settings
  const defaultSettings = receiptSettings?.[0];
  
  // Fetch receipt data for the first booking (if created)
  const { data: receiptData } = useReceiptData({ 
    bookingId: createdBookings[0]?.id || undefined 
  });
  
  // Fetch organization wallet if booking for org
  const { data: orgWallet } = useOrganizationWallet(bookingData.organizationId);

  // Pre-validate room availability before submission
  const roomIdsToCheck = isGroupBooking 
    ? bookingData.selectedRoomIds || []
    : bookingData.roomId ? [bookingData.roomId] : [];

  const { availabilityMap, isLoading: checkingAvailability } = useRoomAvailability(
    roomIdsToCheck,
    bookingData.checkIn,
    bookingData.checkOut
  );

  const unavailableRooms = getUnavailableRooms(availabilityMap, roomIdsToCheck);

  const { data: guest } = useQuery({
    queryKey: ['guest', bookingData.guestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', bookingData.guestId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingData.guestId,
  });

  const { data: room } = useQuery({
    queryKey: ['room', bookingData.roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, category:room_categories(name, base_rate)')
        .eq('id', bookingData.roomId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingData.roomId,
  });

  const { data: organization } = useQuery({
    queryKey: ['organization', bookingData.organizationId],
    queryFn: async () => {
      if (!bookingData.organizationId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', bookingData.organizationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingData.organizationId,
  });

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      // Final availability check before creating bookings
      if (unavailableRooms.length > 0) {
        const roomNumbers = await Promise.all(
          unavailableRooms.map(async (status) => {
            const { data } = await supabase
              .from('rooms')
              .select('number')
              .eq('id', status.roomId)
              .single();
            return data?.number || status.roomId;
          })
        );
        throw new Error(
          `Room(s) no longer available: ${roomNumbers.join(', ')}. ` +
          `${unavailableRooms[0].conflictingBookingRef ? `Conflicting booking: ${unavailableRooms[0].conflictingBookingRef}` : ''}`
        );
      }
      if (!tenantId || !bookingData.guestId || !bookingData.checkIn || !bookingData.checkOut) {
        throw new Error('Missing required booking information');
      }

      // CRITICAL: Calculate final total with ALL data (rooms, nights, add-ons, rate override)
      // This ensures add-ons selected in Step 4 are included in the final calculation
      let finalTotalAmount = 0;

      if (!financials) {
        throw new Error("Financial settings not loaded");
      }

      // Group booking: multiple rooms
      if (isGroupBooking) {
        if (!bookingData.selectedRoomIds || bookingData.selectedRoomIds.length === 0) {
          throw new Error('No rooms selected for group booking');
        }

        const groupId = crypto.randomUUID();
        const actionId = crypto.randomUUID();

        // Fetch all selected rooms to get their rates
        const { data: selectedRooms } = await supabase
          .from('rooms')
          .select('id, category:room_categories(base_rate)')
          .in('id', bookingData.selectedRoomIds);

        if (!selectedRooms || selectedRooms.length === 0) {
          throw new Error("Selected rooms not found");
        }

        // Calculate total rate from all selected rooms
        const totalRate = selectedRooms.reduce((sum, room) => {
          return sum + ((room.category as any)?.base_rate || 0);
        }, 0);
        const avgRate = totalRate / selectedRooms.length;

        const nights = differenceInDays(
          new Date(bookingData.checkOut!),
          new Date(bookingData.checkIn!)
        );

        const calculation = calculateGroupBookingTotal({
          roomRate: avgRate,
          nights,
          numberOfRooms: bookingData.selectedRoomIds.length,
          selectedAddonIds: bookingData.selectedAddons || [],
          financials,
          rateOverride: bookingData.rateOverride,
        });

        finalTotalAmount = groupDisplayTotal?.totalAmount || calculation.totalAmount;
        console.log('Group booking final total:', finalTotalAmount, 'with add-ons:', bookingData.selectedAddons, 'platform fee:', groupDisplayTotal?.platformFee);

        const numRooms = bookingData.selectedRoomIds.length;

        // Create bookings for each room
        const results = await Promise.all(
          bookingData.selectedRoomIds.map(async (roomId) => {
            const { data: createResult, error: createError } = await supabase.functions.invoke('create-booking', {
              body: {
                tenant_id: tenantId,
                guest_id: bookingData.guestId,
                room_id: roomId,
                organization_id: bookingData.organizationId,
                check_in: bookingData.checkIn!.toISOString(),
                check_out: bookingData.checkOut!.toISOString(),
                total_amount: groupDisplayTotal?.totalAmount ? (groupDisplayTotal.totalAmount / numRooms) : (finalTotalAmount / numRooms), // Use platform fee adjusted total
                action_id: `${actionId}-${roomId}`,
                department: 'front_desk',
                created_by: user?.id,
                group_booking: true,
                group_id: groupId,
                group_name: bookingData.groupName,
                group_size: bookingData.groupSize,
                group_leader: bookingData.groupLeaderName,
                addons: bookingData.selectedAddons,
                special_requests: bookingData.specialRequests,
                is_part_of_group: true,
                rate_override: bookingData.rateOverride,
                approval_status: bookingData.approvalStatus,
                total_rooms_in_group: bookingData.selectedRoomIds.length,
              },
            });

            if (createError) {
              throw new Error(`Failed to create booking for room: ${createError.message}`);
            }

            if (!createResult?.success) {
              throw new Error(createResult?.error || 'Booking creation failed');
            }

            return createResult.booking;
          })
        );

        return results;
      }

      // Single booking
      if (!bookingData.roomId) {
        throw new Error('No room selected');
      }

      // Calculate final total for single booking
      const { data: room } = await supabase
        .from('rooms')
        .select('category:room_categories(base_rate)')
        .eq('id', bookingData.roomId)
        .single();

      const roomRate = (room?.category as any)?.base_rate || 0;
      const nights = differenceInDays(
        new Date(bookingData.checkOut!),
        new Date(bookingData.checkIn!)
      );

      const calculation = calculateGroupBookingTotal({
        roomRate,
        nights,
        numberOfRooms: 1,
        selectedAddonIds: bookingData.selectedAddons || [],
        financials,
        rateOverride: bookingData.rateOverride,
      });

      finalTotalAmount = calculation.totalAmount;
      console.log('Single booking final total:', finalTotalAmount, 'with add-ons:', bookingData.selectedAddons);

      // Validate booking with edge function first
      const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-booking', {
        body: {
          tenant_id: tenantId,
          room_id: bookingData.roomId,
          guest_id: bookingData.guestId,
          organization_id: bookingData.organizationId,
          check_in: bookingData.checkIn.toISOString(),
          check_out: bookingData.checkOut.toISOString(),
        },
      });

      // Check for HTTP errors first
      if (validationError) {
        throw new Error(validationError.message || 'Validation request failed');
      }

      // Check the actual validation result
      if (!validationResult?.success) {
        throw new Error(validationResult?.error || 'Booking validation failed');
      }

      const actionId = crypto.randomUUID();

      // Use edge function to create booking (auto-creates payment for organizations)
      const { data: createResult, error: createError } = await supabase.functions.invoke('create-booking', {
        body: {
          tenant_id: tenantId,
          guest_id: bookingData.guestId,
          room_id: bookingData.roomId,
          organization_id: bookingData.organizationId,
          check_in: bookingData.checkIn.toISOString(),
          check_out: bookingData.checkOut.toISOString(),
          total_amount: finalTotal, // Use final total including platform fee
          action_id: actionId,
          department: 'front_desk',
          created_by: user?.id,
          rate_override: bookingData.rateOverride,
          addons: bookingData.selectedAddons,
          special_requests: bookingData.specialRequests,
          approval_status: bookingData.approvalStatus,
        },
      });

      // Check for HTTP errors first
      if (createError) {
        throw new Error(createError.message || 'Booking creation request failed');
      }

      // Check the actual creation result
      if (!createResult?.success) {
        throw new Error(createResult?.error || 'Booking creation failed');
      }

      return createResult.booking;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      
      // For organization bookings, complete immediately (auto-charged to wallet)
      if (bookingData.organizationId) {
        if (isGroupBooking) {
          toast.success(`Group booking created and charged to organization! ${bookingData.selectedRoomIds?.length} rooms reserved.`);
        } else {
          toast.success('Booking created and charged to organization!');
        }
        onComplete();
        return;
      }

      // For non-organization bookings, show payment step
      if (Array.isArray(data)) {
        // Group booking
        const bookingsForPayment = data.map((b: any) => ({
          id: b.id,
          guestId: b.guest_id,
          amount: b.total_amount,
        }));
        setCreatedBookings(bookingsForPayment);
        toast.success(`Group booking created! ${data.length} rooms reserved. Proceed to payment.`);
      } else {
        // Single booking
        setCreatedBookings([{
          id: data.id,
          guestId: data.guest_id,
          amount: data.total_amount,
        }]);
        toast.success('Booking created successfully! Proceed to payment.');
      }
      
      setShowPayment(true);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const nights = bookingData.checkIn && bookingData.checkOut
    ? Math.ceil((bookingData.checkOut.getTime() - bookingData.checkIn.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Calculate tax breakdown
  const selectedRate = room?.category?.base_rate || room?.rate || 0;
  const baseAmount = selectedRate * nights;
  const taxBreakdown = financials 
    ? calculateBookingTotal(baseAmount, financials)
    : { baseAmount, vatAmount: 0, serviceAmount: 0, totalAmount: baseAmount };

  // Calculate platform fee on top of tax total with trial exemption check
  const platformFeeBreakdown = calculatePlatformFee(
    taxBreakdown.totalAmount, 
    platformFeeConfig,
    {
      trialEndDate: platformTenant?.trial_end_date,
      trialExemptionEnabled: platformTenant?.trial_exemption_enabled,
    }
  );

  // Final total includes platform fee
  const finalTotal = platformFeeBreakdown.totalAmount;

  console.log('[BookingConfirmation] Platform fee calculation:', {
    platformFeeConfig,
    platformTenant,
    taxTotalAmount: taxBreakdown.totalAmount,
    platformFeeBreakdown,
    willDisplay: platformFeeBreakdown.platformFee > 0 && platformFeeConfig && platformFeeConfig.payer === 'guest',
    exemptReason: platformFeeBreakdown.exemptReason,
  });

  // Fetch selected rooms for group booking display calculation
  const { data: selectedRoomsData } = useQuery({
    queryKey: ['selected-rooms', bookingData.selectedRoomIds],
    queryFn: async () => {
      if (!bookingData.selectedRoomIds || bookingData.selectedRoomIds.length === 0) {
        return null;
      }
      const { data } = await supabase
        .from('rooms')
        .select('id, category:room_categories(base_rate)')
        .in('id', bookingData.selectedRoomIds);
      return data;
    },
    enabled: isGroupBooking && !!bookingData.selectedRoomIds,
  });

  // Calculate display total for group bookings
  const groupDisplayTotal = isGroupBooking && selectedRoomsData && financials
    ? (() => {
        const totalRate = selectedRoomsData.reduce((sum, room) => {
          return sum + ((room.category as any)?.base_rate || 0);
        }, 0);
        const avgRate = totalRate / selectedRoomsData.length;
        
        const calculation = calculateGroupBookingTotal({
          roomRate: avgRate,
          nights,
          numberOfRooms: bookingData.selectedRoomIds.length,
          selectedAddonIds: bookingData.selectedAddons || [],
          financials,
          rateOverride: bookingData.rateOverride,
        });
        
        // Apply platform fee to group total with trial exemption check
        const platformFeeBreakdown = calculatePlatformFee(
          calculation.totalAmount,
          platformFeeConfig,
          {
            trialEndDate: platformTenant?.trial_end_date,
            trialExemptionEnabled: platformTenant?.trial_exemption_enabled,
          }
        );
        
        return {
          ...calculation,
          platformFee: platformFeeBreakdown.platformFee,
          totalAmount: platformFeeBreakdown.totalAmount,
        };
      })()
    : null;

  // Use this for display
  const displayTotal = isGroupBooking 
    ? groupDisplayTotal?.totalAmount || 0
    : taxBreakdown.totalAmount;

  // Handle payment completion
  const handlePaymentComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    toast.success('Payment recorded successfully!');
    setTimeout(() => {
      onComplete();
    }, 1500);
  };

  const handleSkipPayment = () => {
    toast.info('Payment skipped. Booking recorded as accounts receivable.');
    setTimeout(() => {
      onComplete();
    }, 1500);
  };

  const handlePrintConfirmation = async () => {
    if (!receiptData || createdBookings.length === 0) return;
    await print({
      receiptType: 'reservation',
      bookingId: createdBookings[0].id,
      guestId: receiptData.guest?.id,
      organizationId: receiptData.organization?.id,
      settingsId: defaultSettings?.id,
      receiptData,
    }, defaultSettings);
  };

  // Show payment step after booking creation (for non-org bookings)
  if (showPayment && createdBookings.length > 0) {
    const totalPaymentAmount = createdBookings.reduce((sum, b) => sum + b.amount, 0);
    return (
      <div className="space-y-6">
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-300">
            {isGroupBooking 
              ? `${createdBookings.length} bookings created successfully!` 
              : 'Booking created successfully!'
            } Now collect payment from the guest.
          </AlertDescription>
        </Alert>

        <PaymentStep
          bookingId={createdBookings[0].id}
          guestId={createdBookings[0].guestId}
          totalAmount={totalPaymentAmount}
          onPaymentComplete={handlePaymentComplete}
          onSkip={handleSkipPayment}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Group Booking Badge */}
      {isGroupBooking && (
        <Alert className="bg-primary/10 border-primary/20">
          <Users className="h-4 w-4 text-primary" />
          <AlertDescription>
            <strong>Group Booking:</strong> {bookingData.groupName} • {bookingData.selectedRoomIds?.length} rooms
          </AlertDescription>
        </Alert>
      )}

      {/* Organization Credit Warning */}
      {orgWallet && orgWallet.nearLimit && (
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            Organization wallet is at {orgWallet.percentUsed.toFixed(0)}% of credit limit
          </p>
        </div>
      )}
      
      {orgWallet && orgWallet.overLimit && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">
            Organization credit limit exceeded. Booking may not be allowed.
          </p>
        </div>
      )}

      {/* Room Availability Warning */}
      {unavailableRooms.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Room(s) No Longer Available:</strong>
            <ul className="list-disc list-inside mt-2">
              {unavailableRooms.map((status) => {
                const roomNumber = roomIdsToCheck.find(id => id === status.roomId);
                return (
                  <li key={status.roomId}>
                    Room ID: {roomNumber?.substring(0, 8)}...
                    {status.conflictingBookingRef && ` (Booking: ${status.conflictingBookingRef})`}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2">
              Please go back and select different rooms or dates.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-3">Guest Details</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {guest?.name}</p>
            <p><span className="text-muted-foreground">Email:</span> {guest?.email}</p>
            <p><span className="text-muted-foreground">Phone:</span> {guest?.phone}</p>
          </div>
        </div>

        {organization && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg">Organization Booking</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Organization:</span> {organization.name}</p>
                <p><span className="text-muted-foreground">Contact:</span> {organization.contact_person}</p>
                {orgWallet && (
                  <>
                    <p>
                      <span className="text-muted-foreground">Wallet Balance:</span>{' '}
                      <span className={orgWallet.balance < 0 ? 'text-destructive font-medium' : 'text-green-600 font-medium'}>
                        ₦{Math.abs(orgWallet.balance).toLocaleString()} {orgWallet.balance < 0 ? '(owing)' : ''}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Credit Limit:</span>{' '}
                      ₦{orgWallet.credit_limit.toLocaleString()}
                    </p>
                  </>
                )}
                <Badge variant="secondary" className="mt-2">
                  Will be charged to organization account
                </Badge>
              </div>
            </div>
          </>
        )}

        <Separator />

        <div>
          <h3 className="font-semibold text-lg mb-3">
            {isGroupBooking ? 'Group & Rooms' : 'Room Details'}
          </h3>
          {isGroupBooking ? (
            <div className="space-y-3">
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Group Name:</span> {bookingData.groupName}</p>
                <p><span className="text-muted-foreground">Group Leader:</span> {bookingData.groupLeaderName}</p>
                <p><span className="text-muted-foreground">Group Size:</span> {bookingData.groupSize} guests</p>
                <p><span className="text-muted-foreground">Rooms:</span> {bookingData.selectedRoomIds?.length}</p>
              </div>
              <Badge variant="secondary">
                Multiple rooms will be reserved for this group
              </Badge>
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Room:</span> {room?.number}</p>
              <p><span className="text-muted-foreground">Type:</span> {room?.category?.name || room?.type}</p>
              <p>
                <span className="text-muted-foreground">Rate:</span>{' '}
                {bookingData.rateOverride ? (
                  <>
                    <span className="line-through text-muted-foreground text-xs">
                      ₦{room?.category?.base_rate || room?.rate}
                    </span>
                    {' '}
                    <span className="font-medium">₦{bookingData.rateOverride}</span>
                    {' '}
                    <Badge variant="secondary" className="text-xs">Overridden</Badge>
                  </>
                ) : (
                  <span>₦{room?.category?.base_rate || room?.rate}/night</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Booking Options Summary */}
        {(bookingData.selectedAddons?.length || bookingData.specialRequests || bookingData.requiresApproval) && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold text-lg mb-3">Booking Options</h3>
              <div className="space-y-2 text-sm">
                {bookingData.requiresApproval && (
                  <Alert className="border-yellow-500/50 bg-yellow-500/10">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800 dark:text-yellow-300">
                      This booking requires manager approval due to rate override
                    </AlertDescription>
                  </Alert>
                )}
                {bookingData.selectedAddons && bookingData.selectedAddons.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1">Add-ons:</p>
                    <div className="flex flex-wrap gap-1">
                      {bookingData.selectedAddons.map((addon) => (
                        <Badge key={addon} variant="secondary">{addon.replace('_', ' ')}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Included in total amount below
                    </p>
                  </div>
                )}
                {bookingData.specialRequests && (
                  <div>
                    <p className="text-muted-foreground mb-1">Special Requests:</p>
                    <p className="text-xs bg-muted/50 p-2 rounded">{bookingData.specialRequests}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <Separator />

        <div>
          <h3 className="font-semibold text-lg mb-3">Stay Details</h3>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Check-In:</span>{' '}
              {bookingData.checkIn?.toLocaleDateString()}
            </p>
            <p>
              <span className="text-muted-foreground">Check-Out:</span>{' '}
              {bookingData.checkOut?.toLocaleDateString()}
            </p>
            <p>
              <span className="text-muted-foreground">Nights:</span> {nights}
            </p>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-lg mb-3">Pricing</h3>
          {isGroupBooking ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total for {bookingData.selectedRoomIds?.length} rooms ({nights} {nights === 1 ? 'night' : 'nights'})</span>
                <span className="font-medium">₦{displayTotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Includes all taxes and charges</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Room Rate ({nights} {nights === 1 ? 'night' : 'nights'})</span>
                <span className="font-medium">₦{taxBreakdown.baseAmount.toLocaleString()}</span>
              </div>
              
              {taxBreakdown.vatAmount > 0 && financials && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    VAT ({financials.vat_rate}%)
                    {financials.vat_inclusive && <span className="text-xs ml-1">(inclusive)</span>}
                  </span>
                  <span className="font-medium">₦{taxBreakdown.vatAmount.toFixed(2)}</span>
                </div>
              )}
              
              {taxBreakdown.serviceAmount > 0 && financials && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Service Charge ({financials.service_charge}%)
                    {financials.service_charge_inclusive && <span className="text-xs ml-1">(inclusive)</span>}
                  </span>
                  <span className="font-medium">₦{taxBreakdown.serviceAmount.toFixed(2)}</span>
                </div>
              )}
              
              {platformFeeBreakdown.platformFee > 0 && platformFeeConfig && 
               platformFeeConfig.payer === 'guest' && platformFeeConfig.mode === 'inclusive' && (
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                  <span className="text-muted-foreground">
                    Platform Fee
                    {platformFeeConfig.fee_type === 'percentage' 
                      ? ` (${platformFeeConfig.booking_fee}%)` 
                      : ` (Flat)`}
                    {platformFeeConfig.payer === 'guest' && (
                      <span className="text-xs ml-1 text-amber-600">(charged to guest)</span>
                    )}
                  </span>
                  <span className="font-medium text-amber-600">
                    +₦{platformFeeBreakdown.platformFee.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Total Amount:</span>
          <span className="text-2xl font-bold text-primary">
            ₦{(isGroupBooking ? groupDisplayTotal?.totalAmount || displayTotal : finalTotal).toFixed(2)}
          </span>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button
          onClick={() => createBookingMutation.mutate()}
          disabled={createBookingMutation.isPending || checkingAvailability || unavailableRooms.length > 0}
          className="flex-1"
          size="lg"
        >
          {createBookingMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Booking...
            </>
          ) : checkingAvailability ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking Availability...
            </>
          ) : unavailableRooms.length > 0 ? (
            <>
              <XCircle className="w-4 h-4 mr-2" />
              Room(s) Not Available
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Confirm Booking
            </>
          )}
        </Button>
        
        {createdBookings.length > 0 && receiptData && (
          <Button
            onClick={handlePrintConfirmation}
            disabled={isPrinting}
            variant="outline"
            size="lg"
          >
            <Printer className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
