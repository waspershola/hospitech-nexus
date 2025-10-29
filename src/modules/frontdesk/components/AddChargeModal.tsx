import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AddChargeModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  roomNumber: string;
}

export function AddChargeModal({ open, onClose, bookingId, roomNumber }: AddChargeModalProps) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  const addChargeMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !amount) throw new Error('Missing required data');

      const { error } = await supabase.from('payments').insert({
        tenant_id: tenantId,
        booking_id: bookingId,
        amount: parseFloat(amount),
        method,
        status: 'completed',
        metadata: { notes, room_number: roomNumber },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      toast.success(`Charge added for Room ${roomNumber}`);
      onClose();
      setAmount('');
      setNotes('');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add charge: ${error.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Charge - Room {roomNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="pos">POS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Laundry, minibar, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => addChargeMutation.mutate()}
              disabled={!amount || addChargeMutation.isPending}
            >
              {addChargeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Charge
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
