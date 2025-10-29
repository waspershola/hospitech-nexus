import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinancials } from '@/hooks/useFinancials';
import { calculateBookingTotal } from '@/lib/finance/tax';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Check, AlertCircle, Bed } from 'lucide-react';
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
        .eq('status', 'available')
        .order('number', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate total for all selected rooms
  const calculateTotal = () => {
    if (!financials || selectedRoomIds.length === 0) return 0;
    
    let total = 0;
    selectedRoomIds.forEach(roomId => {
      const room = rooms?.find(r => r.id === roomId);
      const rate = room?.category?.base_rate || room?.rate || 0;
      const roomTotal = calculateBookingTotal(rate, nights, financials);
      total += roomTotal.totalAmount;
    });
    
    return total;
  };

  useEffect(() => {
    const totalAmount = calculateTotal();
    onChange({
      ...bookingData,
      checkIn,
      checkOut,
      selectedRoomIds,
      totalAmount,
    });
  }, [checkIn, checkOut, selectedRoomIds, rooms, financials]);

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
            const roomTotal = financials 
              ? calculateBookingTotal(rate, nights, financials)
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
                        <p className="font-semibold">₦{roomTotal.totalAmount.toFixed(2)}</p>
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

        {rooms?.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No available rooms found. Please try different dates.
            </AlertDescription>
          </Alert>
        )}
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
        <div className="flex justify-between text-base font-semibold">
          <span>Total Amount:</span>
          <span className="text-primary">₦{totalAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
