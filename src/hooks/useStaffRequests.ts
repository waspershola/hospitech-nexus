import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { updateRequestStatus as broadcastStatusUpdate } from '@/lib/qr/statusBroadcast';
import { toast } from 'sonner';
import { useNetworkStore } from '@/state/networkStore';
import { isNetworkOffline, getCachedQRRequests, updateCache } from '@/lib/offline/offlineDataService';

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
  responded_at?: string;
  guest_name?: string;
  guest_contact?: string;
  transferred_to_frontdesk?: boolean;
  transferred_at?: string;
  transferred_by?: string;
  room?: { number: string };
  guest?: { name: string };
  guest_order?: { guest_name: string | null }[];
  _offline?: boolean;
}

export function useStaffRequests() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { hardOffline } = useNetworkStore();

  const fetchRequests = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    
    // OFFLINE-QR-V1: Load from IndexedDB when offline
    if (isNetworkOffline()) {
      console.log('[useStaffRequests] OFFLINE-V1: Loading from cache');
      try {
        const cached = await getCachedQRRequests(tenantId);
        setRequests(cached.map(r => ({
          id: r.id,
          tenant_id: r.tenant_id,
          guest_id: null,
          room_id: r.room_id,
          type: r.service_type,
          note: '',
          status: r.status,
          priority: r.priority,
          qr_token: r.qr_token,
          metadata: r.metadata,
          created_at: r.created_at,
          guest_name: r.guest_name || undefined,
          guest_contact: r.guest_phone || undefined,
          _offline: true,
        } as StaffRequest)));
        toast.info('Offline Mode - Showing cached requests');
      } catch (err) {
        console.error('[useStaffRequests] Cache read error:', err);
        setRequests([]);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
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
      
      // Update cache in background
      if (data?.length) {
        updateCache(tenantId, 'qr_requests', data.map(d => ({
          id: d.id,
          qr_token: d.qr_token,
          room_id: d.room_id,
          guest_name: (d as any).guest_name || null,
          guest_phone: (d as any).guest_contact || null,
          service_type: d.type,
          items: typeof d.metadata === 'object' && d.metadata ? (d.metadata as any).items || [] : [],
          status: d.status,
          priority: d.priority,
          metadata: d.metadata,
          created_at: d.created_at,
        }))).catch(() => {});
      }
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

    // OFFLINE-QR-V1: Skip realtime subscription when offline
    if (!tenantId || isNetworkOffline()) {
      console.log('[useStaffRequests] OFFLINE-V1: Skipping realtime subscription');
      return;
    }

    let isSubscribed = true;
    const channel = supabase
      .channel(`staff-requests-${tenantId}`)
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
  }, [tenantId, hardOffline]);

  return {
    requests,
    isLoading,
    fetchRequests,
    updateRequestStatus,
  };
}
