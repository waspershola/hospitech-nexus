import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AssignRoomModalProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  roomNumber: string;
}

export function AssignRoomModal({ open, onClose, roomId, roomNumber }: AssignRoomModalProps) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [guestId, setGuestId] = useState('');
  const [checkIn, setCheckIn] = useState(new Date().toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );

  const { data: guests } = useQuery({
    queryKey: ['guests', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && open,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !guestId) throw new Error('Missing required data');

      const { data: room } = await supabase
        .from('rooms')
        .select('*, category:room_categories(base_rate)')
        .eq('id', roomId)
        .single();

      const nights = Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
      );
      const rate = room?.category?.base_rate || room?.rate || 0;

      const { error } = await supabase.from('bookings').insert({
        tenant_id: tenantId,
        guest_id: guestId,
        room_id: roomId,
        check_in: checkIn,
        check_out: checkOut,
        total_amount: rate * nights,
        status: 'reserved',
      });

      if (error) throw error;

      await supabase.from('rooms').update({ status: 'reserved' }).eq('id', roomId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      toast.success(`Room ${roomNumber} assigned successfully`);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign room: ${error.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Room {roomNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="guest">Select Guest</Label>
            <Select value={guestId} onValueChange={setGuestId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a guest" />
              </SelectTrigger>
              <SelectContent>
                {guests?.map((guest) => (
                  <SelectItem key={guest.id} value={guest.id}>
                    {guest.name} - {guest.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkIn">Check-In</Label>
              <Input
                id="checkIn"
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkOut">Check-Out</Label>
              <Input
                id="checkOut"
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => assignMutation.mutate()}
              disabled={!guestId || assignMutation.isPending}
            >
              {assignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign Room
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
