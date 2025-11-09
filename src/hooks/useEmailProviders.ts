import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmailProvider {
  id: string;
  provider_type: 'smtp' | 'sendgrid' | 'mailgun' | 'resend';
  name: string;
  config: any;
  is_default: boolean;
  enabled: boolean;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export function useEmailProviders() {
  const queryClient = useQueryClient();

  const { data: providers, isLoading, error } = useQuery({
    queryKey: ['email-providers'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('email-provider', {
        method: 'GET',
      });

      if (error) throw error;
      return data as EmailProvider[];
    },
  });

  const createProvider = useMutation({
    mutationFn: async (providerData: Partial<EmailProvider>) => {
      const { data, error } = await supabase.functions.invoke('email-provider', {
        method: 'POST',
        body: providerData,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-providers'] });
      toast.success('Email provider created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create email provider');
    },
  });

  const updateProvider = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailProvider> & { id: string }) => {
      const { data, error } = await supabase.functions.invoke('email-provider', {
        method: 'PATCH',
        body: { id, ...updates },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-providers'] });
      toast.success('Email provider updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update email provider');
    },
  });

  const deleteProvider = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke('email-provider', {
        method: 'DELETE',
        body: { id },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-providers'] });
      toast.success('Email provider deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete email provider');
    },
  });

  const testProvider = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke(`email-provider/${id}/test`, {
        method: 'POST',
      });

      if (error) throw error;
      
      // Check if the response indicates failure
      if (data && !data.success) {
        throw new Error(data.message || data.error || 'Test failed');
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success('Test email sent successfully');
    },
    onError: (error: Error) => {
      // Parse error message for better display
      const errorMessage = error.message || 'Failed to send test email';
      
      // Show more helpful toast for domain verification issues
      if (errorMessage.includes('verify a domain') || errorMessage.includes('Domain verification')) {
        toast.error('Resend domain verification required. Please verify your domain at resend.com/domains to send test emails.', {
          duration: 6000,
        });
      } else {
        toast.error(errorMessage);
      }
    },
  });

  return {
    providers,
    isLoading,
    error,
    createProvider,
    updateProvider,
    deleteProvider,
    testProvider,
  };
}
