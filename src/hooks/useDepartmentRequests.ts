import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface DepartmentRequest {
  id: string;
  tenant_id: string;
  request_number: string;
  department: string;
  requested_by: string;
  approved_by?: string;
  issued_by?: string;
  status: 'pending' | 'approved' | 'issued' | 'rejected' | 'cancelled';
  items: RequestItem[];
  purpose?: string;
  priority: string;
  requested_at: string;
  approved_at?: string;
  issued_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RequestItem {
  item_id: string;
  requested_qty: number;
  issued_qty?: number;
}

interface RequestPayload {
  action: 'create' | 'approve' | 'issue' | 'reject' | 'cancel';
  request_id?: string;
  department?: string;
  items?: RequestItem[];
  purpose?: string;
  priority?: 'urgent' | 'normal' | 'low';
  notes?: string;
}

export function useDepartmentRequests() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['department-requests', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_requests')
        .select(`
          *,
          staff:requested_by (
            id,
            full_name,
            department
          ),
          approver:approved_by (
            id,
            full_name
          ),
          issuer:issued_by (
            id,
            full_name
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!tenantId,
  });

  const processRequest = useMutation({
    mutationFn: async (payload: RequestPayload) => {
      const { data, error } = await supabase.functions.invoke('process-department-request', {
        body: payload,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['department-requests', tenantId] });
      
      if (variables.action === 'issue') {
        queryClient.invalidateQueries({ queryKey: ['stock-movements', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['store-stock', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['department-stock', tenantId] });
      }
      
      const actionMessages: Record<string, string> = {
        create: 'Request created successfully',
        approve: 'Request approved successfully',
        issue: 'Items issued successfully',
        reject: 'Request rejected',
        cancel: 'Request cancelled',
      };
      
      toast({
        title: 'Success',
        description: actionMessages[variables.action] || 'Request processed',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process request',
        variant: 'destructive',
      });
    },
  });

  return {
    requests,
    isLoading,
    processRequest,
  };
}