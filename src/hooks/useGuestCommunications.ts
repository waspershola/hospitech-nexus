import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface GuestCommunication {
  id: string;
  tenant_id: string;
  guest_id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'call' | 'note';
  direction: 'inbound' | 'outbound';
  subject?: string;
  message?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sent_by?: string;
  created_at: string;
}

export function useGuestCommunications(guestId?: string) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['guest-communications', tenantId, guestId],
    queryFn: async () => {
      if (!tenantId || !guestId) return [];

      const { data, error } = await supabase
        .from('guest_communications')
        .select(`
          *,
          sent_by_profile:profiles!guest_communications_sent_by_fkey(full_name)
        `)
        .eq('tenant_id', tenantId)
        .eq('guest_id', guestId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!guestId,
  });

  const addCommunication = useMutation({
    mutationFn: async (communication: Omit<GuestCommunication, 'id' | 'tenant_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('guest_communications')
        .insert({
          ...communication,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-communications', tenantId, guestId] });
      toast.success('Communication logged successfully');
    },
    onError: (error) => {
      console.error('Error adding communication:', error);
      toast.error('Failed to log communication');
    },
  });

  return {
    communications: query.data || [],
    isLoading: query.isLoading,
    addCommunication: addCommunication.mutate,
  };
}
