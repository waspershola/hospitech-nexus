import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useInventoryDepartmentRequests() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['inventory-department-requests', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('department_requests')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const processRequest = useMutation({
    mutationFn: async ({ action, request_id, ...payload }: any) => {
      if (!tenantId) throw new Error('No tenant ID');

      let result;
      
      switch (action) {
        case 'create': {
          const user = await supabase.auth.getUser();
          
          // Generate request number
          const { data: lastRequest } = await supabase
            .from('department_requests')
            .select('request_number')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          const lastNumber = lastRequest?.request_number 
            ? parseInt(lastRequest.request_number.split('-')[1] || '0')
            : 0;
          const requestNumber = `REQ-${String(lastNumber + 1).padStart(6, '0')}`;
          
          result = await supabase
            .from('department_requests')
            .insert([{
              tenant_id: tenantId,
              department: payload.department as any,
              requested_by: user.data.user?.id!,
              request_number: requestNumber,
              items: payload.items as any,
              purpose: payload.purpose,
              priority: payload.priority,
            }]);
          break;
        }
          
        case 'approve':
          result = await supabase
            .from('department_requests')
            .update({
              status: 'approved',
              approved_by: (await supabase.auth.getUser()).data.user?.id,
              approved_at: new Date().toISOString(),
            })
            .eq('id', request_id);
          break;
          
        case 'reject':
          result = await supabase
            .from('department_requests')
            .update({
              status: 'rejected',
            })
            .eq('id', request_id);
          break;
          
        case 'issue':
          result = await supabase
            .from('department_requests')
            .update({
              status: 'issued',
              issued_by: (await supabase.auth.getUser()).data.user?.id,
              issued_at: new Date().toISOString(),
              items: payload.items,
            })
            .eq('id', request_id);
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-department-requests'] });
      toast.success('Request processed successfully');
    },
    onError: (error) => {
      console.error('Error processing request:', error);
      toast.error('Failed to process request');
    },
  });

  return {
    requests,
    isLoading,
    processRequest,
  };
}
