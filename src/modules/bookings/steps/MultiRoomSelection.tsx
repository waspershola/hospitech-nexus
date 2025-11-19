import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinancials } from '@/hooks/useFinancials';
import { useRoomAvailability } from '@/hooks/useRoomAvailability';
import { calculateGroupBookingTotal } from '@/lib/finance/groupBookingCalculator';
import { RoomAvailabilityGrid } from '../components/RoomAvailabilityGrid';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Check, AlertCircle, Bed, XCircle } from 'lucide-react';
import type { BookingData } from '../BookingFlow';

interface MultiRoomSelectionProps {
  bookingData: BookingData;
  onChange: (data: BookingData) => void;
  onNext: () => void;
}

export function MultiRoomSelection({ bookingData, onChange }: MultiRoomSelectionProps) {
  const { tenantId } = useAuth();
  const { data: financials } = useFinancials();
  const [checkIn, setCheckIn] = useState(bookingData.checkIn || new Date());
  const [checkOut, setCheckOut] = useState(
    bookingData.checkOut || new Date(Date.now() + 86400000)
  );
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(
    bookingData.selectedRoomIds || []
  );

  const { data: allRooms } = useQuery({
    queryKey: ['rooms-all', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          category:room_categories(name, base_rate, max_occupancy)
        `)
        .eq('tenant_id', tenantId)
        .order('number', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Get all room IDs for availability check
  const allRoomIds = allRooms?.map(r => r.id) || [];
  
  // Use the new availability hook
  const { availabilityMap, isLoading: checkingAvailability } = useRoomAvailability(
    allRoomIds,
    checkIn,
    checkOut
  );

  // Separate available and unavailable rooms
  const availableRooms = allRooms?.filter((room) => {
    const status = availabilityMap.get(room.id);
    return status?.isAvailable !== false;
  }) || [];

  const unavailableRooms = allRooms?.filter((room) => {
    const status = availabilityMap.get(room.id);
    return status?.isAvailable === false;
  }) || [];

  // Use available rooms for selection
  const rooms = availableRooms;

  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate total for all selected rooms using centralized calculator
  const calculateTotal = () => {
    if (!financials || selectedRoomIds.length === 0 || !rooms || rooms.length === 0) return 0;
    
    // Get average rate from selected rooms
    let totalRate = 0;
    selectedRoomIds.forEach(roomId => {
      const room = rooms.find(r => r.id === roomId);
      const rate = room?.category?.base_rate || room?.rate || 0;
      totalRate += rate;
    });
    const avgRate = totalRate / selectedRoomIds.length;
    
    // Use centralized calculator
    const calculation = calculateGroupBookingTotal({
      roomRate: avgRate,
      nights,
      numberOfRooms: selectedRoomIds.length,
      selectedAddonIds: bookingData.selectedAddons || [],
      financials,
      rateOverride: bookingData.rateOverride,
    });
    
    return calculation.totalAmount;
  };

  useEffect(() => {
    onChange({
      ...bookingData,
      checkIn,
      checkOut,
      selectedRoomIds,
      // Don't set totalAmount here - it will be calculated in BookingConfirmation
      // after add-ons are selected in the next step
    });
  }, [checkIn, checkOut, selectedRoomIds]);

  const handleRoomToggle = (roomId: string) => {
    setSelectedRoomIds(prev =>
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const totalAmount = calculateTotal();

  return (
    <div className="space-y-6">
      <Alert>
        <Bed className="h-4 w-4" />
        <AlertDescription>
          Select multiple rooms for group: <strong>{bookingData.groupName}</strong>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="checkIn">Check-In Date</Label>
          <Input
            id="checkIn"
            type="date"
            value={checkIn.toISOString().split('T')[0]}
            onChange={(e) => setCheckIn(new Date(e.target.value))}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="checkOut">Check-Out Date</Label>
          <Input
            id="checkOut"
            type="date"
            value={checkOut.toISOString().split('T')[0]}
            onChange={(e) => setCheckOut(new Date(e.target.value))}
            min={checkIn.toISOString().split('T')[0]}
          />
        </div>
      </div>

      {/* Availability Summary Grid */}
      {selectedRoomIds.length > 0 && (
        <RoomAvailabilityGrid
          rooms={allRooms || []}
          availabilityMap={availabilityMap}
          selectedRoomIds={selectedRoomIds}
          checkIn={checkIn}
          checkOut={checkOut}
        />
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Available Rooms</h4>
          <Badge variant="secondary">
            {selectedRoomIds.length} room(s) selected
          </Badge>
        </div>

        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {rooms?.map((room) => {
            const isSelected = selectedRoomIds.includes(room.id);
            const rate = room.category?.base_rate || room.rate || 0;
            
            // Calculate individual room total (1 room for display purposes)
            const roomCalc = financials
              ? calculateGroupBookingTotal({
                  roomRate: rate,
                  nights,
                  numberOfRooms: 1,
                  selectedAddonIds: [], // Don't include add-ons in per-room display
                  financials,
                })
              : { totalAmount: rate * nights };

            return (
              <Card
                key={room.id}
                className={`p-4 cursor-pointer transition-all ${
                  isSelected ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => handleRoomToggle(room.id)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleRoomToggle(room.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Room {room.number}</p>
                        <p className="text-sm text-muted-foreground">
                          {room.category?.name} • {room.type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₦{roomCalc.totalAmount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          for {nights} night{nights !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {checkingAvailability ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Checking room availability...
            </AlertDescription>
          </Alert>
        ) : rooms?.length === 0 ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                No rooms available for the selected dates ({checkIn.toLocaleDateString()} - {checkOut.toLocaleDateString()}).
                {unavailableRooms.length > 0 && (
                  <div className="mt-2">
                    <strong>Unavailable rooms:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {unavailableRooms.slice(0, 5).map(room => {
                        const status = availabilityMap.get(room.id);
                        return (
                          <li key={room.id}>
                            Room {room.number} {room.category?.name && `(${room.category.name})`}
                            {status?.conflictingBookingRef && ` - Booking: ${status.conflictingBookingRef}`}
                          </li>
                        );
                      })}
                      {unavailableRooms.length > 5 && (
                        <li>...and {unavailableRooms.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              Please adjust your date range or contact the front desk for assistance.
            </p>
          </div>
        ) : null}
      </div>

      <Separator />

      <div className="space-y-3 bg-muted/50 rounded-lg p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Group:</span>
          <span className="font-medium">{bookingData.groupName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Rooms Selected:</span>
          <span className="font-medium">{selectedRoomIds.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Nights:</span>
          <span className="font-medium">{nights}</span>
        </div>
        <Separator />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Selected Rooms:</span>
            <span>{selectedRoomIds.length} × {nights} nights</span>
          </div>
          {bookingData.selectedAddons && bookingData.selectedAddons.length > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Add-ons Selected:</span>
              <span>{bookingData.selectedAddons.length} items</span>
            </div>
          )}
        </div>
        <Separator />
        <div className="flex justify-between text-base font-semibold">
          <span>Total Amount:</span>
          <span className="text-primary">₦{totalAmount.toLocaleString()}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Includes all rooms, add-ons, taxes, and service charges
        </p>
      </div>
    </div>
  );
}
