import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ServiceRequest {
  id: string;
  service_category: string;
  status: string;
  priority: string;
  note: string;
  created_at: string;
  metadata: any;
}

export function useMyRequests(qrToken: string | null) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!qrToken) return;
    
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('requests')
        .select('id, service_category, status, priority, note, created_at, metadata')
        .eq('qr_token', qrToken)
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
  }, [qrToken]);

  return { 
    requests, 
    isLoading, 
    error,
    pendingCount: requests.filter(r => r.status === 'pending').length,
    refresh: fetchRequests,
  };
}
