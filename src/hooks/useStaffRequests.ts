import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface StaffRequest {
  id: string;
  tenant_id: string;
  guest_id: string | null;
  room_id: string | null;
  type: string;
  service_category: string;
  note: string;
  status: string;
  priority: string;
  qr_token: string;
  metadata: any;
  created_at: string;
  assigned_to?: string;
  assigned_department?: string;
  completed_at?: string;
  room?: { number: string };
  guest?: { name: string };
}

export function useStaffRequests() {
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { tenantId } = useAuth();

  const fetchRequests = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          room:rooms(number),
          guest:guests(name)
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
    // Phase 4: Optimistic update
    setRequests(prev => prev.map(r => 
      r.id === requestId ? { ...r, status } : r
    ));

    try {
      const { error } = await supabase
        .from('requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request status updated');
      return true;
    } catch (err) {
      console.error('[useStaffRequests] Error updating status:', err);
      toast.error('Failed to update request status');
      // Revert optimistic update on error
      await fetchRequests();
      return false;
    }
  };

  useEffect(() => {
    fetchRequests();

    // Set up real-time subscription for new requests
    if (!tenantId) return;

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
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    // Phase 4: Add broadcast channel for instant updates
    const bc = new BroadcastChannel('qr-requests');
    bc.onmessage = (event) => {
      if (event.data.type === 'new_request' && event.data.tenant_id === tenantId) {
        console.log('[useStaffRequests] Broadcast: New request detected');
        fetchRequests();
      }
    };

    return () => {
      supabase.removeChannel(channel);
      bc.close();
    };
  }, [tenantId]);

  return {
    requests,
    isLoading,
    fetchRequests,
    updateRequestStatus,
  };
}
