import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ServiceRequest {
  id: string;
  type: string;
  status: string;
  priority: string;
  note: string;
  created_at: string;
  metadata: any;
}

export function useMyRequests(qrToken: string | null, guestSessionToken: string | null) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!qrToken || !guestSessionToken) return;
    
    setIsLoading(true);
    try {
      // GUEST-SESSION-SECURITY: Filter by BOTH qr_token AND guest_session_token
      // This prevents Device B from seeing Device A's requests even if same QR
      let query = supabase
        .from('requests')
        .select('id, type, status, priority, note, created_at, metadata')
        .eq('qr_token', qrToken);
      
      // Filter by session token OR allow legacy NULL tokens (backward compatibility)
      query = query.or(`guest_session_token.eq.${guestSessionToken},guest_session_token.is.null`);
      
      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setRequests(data || []);
      setError(null);
    } catch (err: any) {
      console.error('[useMyRequests] Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    // Real-time subscription
    const channel = supabase
      .channel(`guest-requests-${qrToken}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `qr_token=eq.${qrToken}`,
        },
        () => {
          console.log('[useMyRequests] Request changed, refetching...');
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qrToken, guestSessionToken]);

  return { 
    requests, 
    isLoading, 
    error,
    pendingCount: requests.filter(r => r.status === 'pending').length,
    refresh: fetchRequests,
  };
}
