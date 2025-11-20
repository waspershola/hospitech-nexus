import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ExtendStayModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  currentCheckOut: string;
  roomNumber: string;
}

export function ExtendStayModal({ 
  open, 
  onClose, 
  bookingId, 
  currentCheckOut,
  roomNumber 
}: ExtendStayModalProps) {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  const [newCheckOut, setNewCheckOut] = useState(currentCheckOut);

  const extendMutation = useMutation({
    mutationFn: async () => {
      if (new Date(newCheckOut) <= new Date(currentCheckOut)) {
        throw new Error('New check-out date must be after current check-out');
      }

      // TENANT-ISOLATION-FIX-V1: Update booking with tenant isolation
      const { error } = await supabase
        .from('bookings')
        .update({ check_out: newCheckOut })
        .eq('id', bookingId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      toast.success(`Stay extended for Room ${roomNumber}`);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to extend stay: ${error.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Extend Stay - Room {roomNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="currentCheckOut">Current Check-Out</Label>
            <Input
              id="currentCheckOut"
              type="date"
              value={currentCheckOut}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newCheckOut">New Check-Out Date</Label>
            <Input
              id="newCheckOut"
              type="date"
              value={newCheckOut}
              onChange={(e) => setNewCheckOut(e.target.value)}
              min={currentCheckOut}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => extendMutation.mutate()}
              disabled={extendMutation.isPending}
            >
              {extendMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Extend Stay
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
