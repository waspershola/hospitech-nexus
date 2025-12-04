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
import { isElectronContext } from '@/lib/environment/isElectron';
import { offlineExtendStay, saveFrontDeskEvent } from '@/lib/offline/electronFrontDeskBridge';

interface ExtendStayModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  currentCheckOut: string;
  roomNumber: string;
}

// Helper to format date for HTML date input (requires yyyy-MM-dd format)
const formatDateForInput = (dateStr: string): string => {
  if (!dateStr) return '';
  // Handle both ISO timestamps "2025-11-25T00:00:00+00:00" and date-only "2025-11-25"
  return dateStr.split('T')[0];
};

export function ExtendStayModal({ 
  open, 
  onClose, 
  bookingId, 
  currentCheckOut,
  roomNumber 
}: ExtendStayModalProps) {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  const [newCheckOut, setNewCheckOut] = useState(formatDateForInput(currentCheckOut));

  const extendMutation = useMutation({
    mutationFn: async () => {
      try {
        if (new Date(newCheckOut) <= new Date(currentCheckOut)) {
          throw new Error('New check-out date must be after current check-out');
        }

        // PHASE-11: Try Electron offline path first
        if (isElectronContext() && tenantId) {
          console.log('[extend-stay-modal] PHASE-11: Attempting offline extend stay');
          
          const offlineResult = await offlineExtendStay(tenantId, bookingId, newCheckOut);
          
          if (offlineResult.source === 'offline' && offlineResult.data?.success) {
            // Save event to journal
            await saveFrontDeskEvent(tenantId, {
              type: 'extend_stay',
              bookingId,
              timestamp: new Date().toISOString(),
              payload: { 
                newCheckOut, 
                previousCheckOut: currentCheckOut,
                additionalNights: offlineResult.data.additionalNights 
              }
            });
            
            console.log('[extend-stay-modal] PHASE-11: Offline extend stay successful');
            return { 
              success: true, 
              offline: true,
              data: { additional_nights: offlineResult.data.additionalNights || 1 }
            };
          }
          
          if (offlineResult.source === 'offline-error') {
            console.warn('[extend-stay-modal] PHASE-11: Offline failed, falling back to online');
          }
        }

        // Online path - existing implementation
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[extend-stay-modal] SESSION_ERROR:', sessionError);
          throw new Error(`SESSION_ERROR: ${sessionError.message}`);
        }
        
        if (!session?.access_token) {
          throw new Error('NO_SESSION: Please login to continue');
        }

        console.log('[extend-stay-modal] EXTEND-STAY-V2: Calling extend-stay edge function');

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
          
          if (error.message?.includes('404') || error.context?.status === 404) {
            throw new Error('FUNCTION_NOT_DEPLOYED: The extend-stay operation is not available. Please contact your system administrator.');
          }
          
          if (error.message?.includes('JWT') || error.message?.includes('jwt')) {
            throw new Error('SESSION_EXPIRED: Your session has expired. Please refresh the page and try again.');
          }
          
          if (error.message?.includes('tenant')) {
            throw new Error('TENANT_MISMATCH: You do not have access to this booking.');
          }

          if (error.message?.includes('401') || error.context?.status === 401) {
            throw new Error('UNAUTHORIZED: Authentication failed. Please login again.');
          }
          
          throw new Error(`Error: ${error.message}`);
        }

        if (!data?.success) {
          console.error('[extend-stay-modal] EXTEND-STAY-V2: Extension failed:', data);
          throw new Error(data?.error || 'Failed to extend stay');
        }

        return { ...data, offline: false };
      } catch (err) {
        console.error('[extend-stay-modal] Error:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      const folioId = data?.data?.folio_id;
      
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking-folio', bookingId, tenantId] });
      if (folioId) {
        queryClient.invalidateQueries({ queryKey: ['folio', folioId, tenantId] });
      }
      
      const offlineIndicator = data?.offline ? ' (offline)' : '';
      toast.success(
        `Stay extended for Room ${roomNumber}. ${data?.data?.additional_nights || 1} additional night(s) charged${offlineIndicator}.`
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
              value={formatDateForInput(currentCheckOut)}
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
