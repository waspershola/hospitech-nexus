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

      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session - please login again');
      }

      console.log('[extend-stay-modal] EXTEND-STAY-V1: Calling extend-stay edge function');

      // EXTEND-STAY-V1: Call edge function for proper folio integration with explicit auth
      const { data, error } = await supabase.functions.invoke('extend-stay', {
        body: {
          booking_id: bookingId,
          new_checkout: newCheckOut,
          staff_id: null, // Will use authenticated user in edge function
          reason: 'Staff extended stay via front desk'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('[extend-stay-modal] EXTEND-STAY-V1: Edge function response:', { data, error });

      if (error) {
        console.error('[extend-stay-modal] EXTEND-STAY-V1: Edge function error:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('[extend-stay-modal] EXTEND-STAY-V1: Extension failed:', data);
        throw new Error(data?.error || 'Failed to extend stay');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking-folio', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['folio-by-id'] });
      
      toast.success(
        `Stay extended for Room ${roomNumber}. ${data?.data?.additional_nights} additional night(s) charged.`
      );
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
