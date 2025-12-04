import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { updateRequestStatus as broadcastStatusUpdate } from '@/lib/qr/statusBroadcast';
import { toast } from 'sonner';

interface StaffRequest {
  id: string;
  tenant_id: string;
  guest_id: string | null;
  room_id: string | null;
  type: string;
  note: string;
  status: string;
  priority: string;
  qr_token: string;
  metadata: any;
  created_at: string;
  assigned_to?: string;
  assigned_department?: string;
  completed_at?: string;
  responded_at?: string; // PHASE-3: SLA tracking timestamp
  guest_name?: string; // PHASE-1C: Guest name from QR portal
  guest_contact?: string; // PHASE-1C: Guest contact from QR portal
  transferred_to_frontdesk?: boolean; // PHASE-3-TRANSFER-V1
  transferred_at?: string; // PHASE-3-TRANSFER-V1
  transferred_by?: string; // PHASE-3-TRANSFER-V1
  room?: { number: string };
  guest?: { name: string };
  guest_order?: { guest_name: string | null }[];
}

export function useStaffRequests() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          room:rooms(number),
          guest:guests(name),
          guest_order:guest_orders(guest_name)
        `)
        .eq('tenant_id', tenantId)
        .not('qr_token', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('[useStaffRequests] Error fetching requests:', err);
      toast.error('Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: string): Promise<boolean> => {
    try {
      console.log('[useStaffRequests] PHASE-2A-V1: Using unified status broadcast');
      
      // Use unified status broadcast system (PHASE-2A)
      const result = await broadcastStatusUpdate(requestId, status, tenantId!, queryClient);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update status');
      }

      // Optimistically update local state
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? { ...req, status, responded_at: req.responded_at || new Date().toISOString() }
            : req
        )
      );

      console.log('[useStaffRequests] PHASE-2A-V1: Status broadcast successful');
      return true;
    } catch (error: any) {
      console.error('[useStaffRequests] Update error:', error);
      toast.error('Failed to update request status');
      return false;
    }
  };

  useEffect(() => {
    fetchRequests();

    // Set up real-time subscription for new requests
    if (!tenantId) return;

    let isSubscribed = true;
    const channel = supabase
      .channel(`staff-requests-${tenantId}`) // REALTIME-STABILITY-FIX: Stable channel name
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (isSubscribed) {
            console.log('[useStaffRequests] REALTIME-FIX-V1: INSERT/UPDATE received:', payload.eventType);
            fetchRequests();
          }
        }
      )
      .subscribe((status) => {
        console.log('[useStaffRequests] REALTIME-FIX-V1: Subscription status:', status);
      });

    // PHASE-2A-COMPLETE: Listen to status broadcast channel from Phase 2A
    const statusBc = new BroadcastChannel('qr-request-status-updates');
    const handleBroadcast = (event: MessageEvent) => {
      if (isSubscribed) {
        console.log('[useStaffRequests] REALTIME-FIX-V1: Status update broadcast received:', event.data);
        fetchRequests();
      }
    };
    statusBc.addEventListener('message', handleBroadcast);

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
      statusBc.removeEventListener('message', handleBroadcast);
      statusBc.close();
    };
  }, [tenantId]);

  return {
    requests,
    isLoading,
    fetchRequests,
    updateRequestStatus,
  };
}
