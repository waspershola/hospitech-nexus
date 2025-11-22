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
      try {
        if (new Date(newCheckOut) <= new Date(currentCheckOut)) {
          throw new Error('New check-out date must be after current check-out');
        }

        // Get current session for authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[extend-stay-modal] SESSION_ERROR:', sessionError);
          throw new Error(`SESSION_ERROR: ${sessionError.message}`);
        }
        
        if (!session?.access_token) {
          throw new Error('NO_SESSION: Please login to continue');
        }

        console.log('[extend-stay-modal] EXTEND-STAY-V2: Calling extend-stay edge function');

        // EXTEND-STAY-V2: Call edge function with explicit auth and error handling
        const { data, error } = await supabase.functions.invoke('extend-stay', {
          body: {
            booking_id: bookingId,
            new_checkout: newCheckOut,
            staff_id: null,
            reason: 'Staff extended stay via front desk'
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        console.log('[extend-stay-modal] EXTEND-STAY-V2: Edge function response:', { data, error });

        if (error) {
          console.error('[extend-stay-modal] EXTEND-STAY-V2: Edge function error:', error);
          
          if (error.message?.includes('JWT') || error.message?.includes('jwt')) {
            throw new Error('SESSION_EXPIRED: Your session has expired. Please refresh the page and try again.');
          }
          
          if (error.message?.includes('tenant')) {
            throw new Error('TENANT_MISMATCH: You do not have access to this booking.');
          }

          if (error.message?.includes('401')) {
            throw new Error('UNAUTHORIZED: Authentication failed. Please login again.');
          }
          
          throw new Error(`Error: ${error.message}`);
        }

        if (!data?.success) {
          console.error('[extend-stay-modal] EXTEND-STAY-V2: Extension failed:', data);
          throw new Error(data?.error || 'Failed to extend stay');
        }

        return data;
      } catch (err) {
        console.error('[extend-stay-modal] Error:', err);
        throw err;
      }
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
      toast.error(error.message || 'Failed to extend stay');
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
