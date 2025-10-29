import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAvailability } from '@/hooks/useAvailability';
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

  useEffect(() => {
    if (checkIn && checkOut && financials) {
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const room = rooms?.find(r => r.id === bookingData.roomId);
      const rate = room?.category?.base_rate || room?.rate || 0;
      
      // Calculate total with taxes
      const taxBreakdown = calculateBookingTotal(rate, nights, financials);
      
      onChange({
        ...bookingData,
        checkIn,
        checkOut,
        totalAmount: taxBreakdown.totalAmount,
      });
    }
  }, [checkIn, checkOut, bookingData.roomId, rooms, financials]);

  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const selectedRoom = rooms?.find(r => r.id === bookingData.roomId);
  const selectedRate = selectedRoom?.category?.base_rate || selectedRoom?.rate || 0;
  
  // Calculate tax breakdown for display
  const taxBreakdown = financials 
    ? calculateBookingTotal(selectedRate, nights, financials)
    : { baseAmount: selectedRate * nights, vatAmount: 0, serviceChargeAmount: 0, totalAmount: selectedRate * nights };

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
              
              {taxBreakdown.serviceChargeAmount > 0 && financials && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Service Charge ({financials.service_charge}%)
                    {financials.service_charge_inclusive && <span className="text-xs ml-1">(inclusive)</span>}
                  </span>
                  <span className="font-medium">₦{taxBreakdown.serviceChargeAmount.toFixed(2)}</span>
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
            } ${room.status !== 'available' ? 'opacity-50' : ''}`}
            onClick={() => {
              if (room.status === 'available') {
                onChange({ ...bookingData, roomId: room.id });
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Room {room.number}</p>
                  <Badge variant={room.status === 'available' ? 'default' : 'secondary'}>
                    {room.status}
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
