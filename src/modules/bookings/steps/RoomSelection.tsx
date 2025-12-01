import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAvailability } from '@/hooks/useAvailability';
import { useRoomAvailability } from '@/hooks/useRoomAvailability';
import { useFinancials } from '@/hooks/useFinancials';
import { calculateBookingTotal } from '@/lib/finance/tax';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Check, AlertCircle } from 'lucide-react';
import type { BookingData } from '../BookingFlow';

interface RoomSelectionProps {
  bookingData: BookingData;
  onChange: (data: BookingData) => void;
  onNext: () => void;
}

export function RoomSelection({ bookingData, onChange, onNext }: RoomSelectionProps) {
  const { tenantId } = useAuth();
  const { data: financials } = useFinancials();
  const [checkIn, setCheckIn] = useState(bookingData.checkIn || new Date());
  const [checkOut, setCheckOut] = useState(
    bookingData.checkOut || new Date(Date.now() + 86400000)
  );

  const { data: rooms } = useQuery({
    queryKey: ['rooms-available', tenantId],
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

  const { data: availability } = useAvailability(
    bookingData.roomId || null,
    checkIn,
    checkOut
  );

  // BOOKING-AVAIL-V1: Check availability for ALL rooms for selected date range
  const roomIds = rooms?.map(r => r.id) || [];
  const { availabilityMap } = useRoomAvailability(
    roomIds.length > 0 ? roomIds : null,
    checkIn,
    checkOut
  );

  // Helper to check if a specific room is available for selected dates
  const isRoomAvailableForDates = (roomId: string): boolean => {
    // If no availability data yet, fall back to optimistic
    if (availabilityMap.size === 0) return true;
    const status = availabilityMap.get(roomId);
    return status?.isAvailable !== false;
  };

  useEffect(() => {
    if (checkIn && checkOut) {
      onChange({
        ...bookingData,
        checkIn,
        checkOut,
        // Don't set totalAmount here - it will be calculated in BookingConfirmation
        // after add-ons are selected in the next step
      });
    }
  }, [checkIn, checkOut, bookingData.roomId]);

  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const selectedRoom = rooms?.find(r => r.id === bookingData.roomId);
  const selectedRate = selectedRoom?.category?.base_rate || selectedRoom?.rate || 0;
  
  // Calculate tax breakdown for display - pass baseAmount = rate * nights
  const baseAmount = selectedRate * nights;
  const taxBreakdown = financials 
    ? calculateBookingTotal(baseAmount, financials)
    : { baseAmount, vatAmount: 0, serviceAmount: 0, totalAmount: baseAmount };

  return (
    <div className="space-y-6">
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

      {bookingData.roomId && (
        <Card className="p-4 bg-primary/5 border-primary">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Stay Duration & Cost</p>
            
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
            </div>
            
            <Separator />
            
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">₦{taxBreakdown.totalAmount.toLocaleString()}</span>
            </div>
            
            <p className="text-xs text-muted-foreground">
              ₦{selectedRate.toLocaleString()}/night × {nights} {nights === 1 ? 'night' : 'nights'}
            </p>
          </div>
        </Card>
      )}

      {bookingData.roomId && availability && !availability.available && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <p className="text-sm">This room is not available for the selected dates.</p>
        </div>
      )}

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {rooms?.map((room) => (
          <Card
            key={room.id}
            className={`p-4 cursor-pointer transition-all hover:shadow-md ${
              bookingData.roomId === room.id ? 'border-primary bg-primary/5' : ''
            } ${!isRoomAvailableForDates(room.id) ? 'opacity-50' : ''}`}
            onClick={() => {
              // BOOKING-AVAIL-V1: Use dynamic availability for selected dates
              if (isRoomAvailableForDates(room.id)) {
                onChange({ ...bookingData, roomId: room.id });
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Room {room.number}</p>
                  <Badge variant={isRoomAvailableForDates(room.id) ? 'default' : 'secondary'}>
                    {isRoomAvailableForDates(room.id) ? 'available' : room.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {room.category?.name || room.type || 'Standard'}
                </p>
                <p className="text-sm font-medium mt-1">
                  ₦{room.category?.base_rate || room.rate || 0}/night
                </p>
              </div>
              {bookingData.roomId === room.id && (
                <Check className="w-5 h-5 text-primary" />
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
