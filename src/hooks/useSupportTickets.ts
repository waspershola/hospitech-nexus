import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SupportTicket {
  id: string;
  tenant_id: string;
  ticket_number: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to?: string;
  created_by: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
}

export function useSupportTickets(filters?: { status?: string; priority?: string }) {
  const queryClient = useQueryClient();

  // Fetch tickets
  const { data: tickets, isLoading, error } = useQuery({
    queryKey: ['support-tickets', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.priority) params.append('priority', filters.priority);

      const { data, error } = await supabase.functions.invoke('support-ticket', {
        method: 'GET',
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to fetch tickets');

      return data.data as SupportTicket[];
    },
  });

  // Fetch single ticket
  const fetchTicket = async (ticketId: string) => {
    const { data, error } = await supabase.functions.invoke(`support-ticket/${ticketId}`, {
      method: 'GET',
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Failed to fetch ticket');

    return data.data as SupportTicket;
  };

  // Create ticket
  const createTicket = useMutation({
    mutationFn: async (ticketData: {
      subject: string;
      description: string;
      priority?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('support-ticket', {
        method: 'POST',
        body: ticketData,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create ticket');

      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success(`Ticket ${data.ticket_number} created successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create ticket: ${error.message}`);
    },
  });

  // Update ticket
  const updateTicket = useMutation({
    mutationFn: async ({
      ticketId,
      updates,
    }: {
      ticketId: string;
      updates: Partial<SupportTicket>;
    }) => {
      const { data, error } = await supabase.functions.invoke(`support-ticket/${ticketId}`, {
        method: 'PATCH',
        body: updates,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to update ticket');

      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Ticket updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update ticket: ${error.message}`);
    },
  });

  // Delete ticket (platform admin only)
  const deleteTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      const { data, error } = await supabase.functions.invoke(`support-ticket/${ticketId}`, {
        method: 'DELETE',
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to delete ticket');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Ticket deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete ticket: ${error.message}`);
    },
  });

  return {
    tickets,
    isLoading,
    error,
    fetchTicket,
    createTicket,
    updateTicket,
    deleteTicket,
  };
}
