import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OrgServiceRule {
  id: string;
  organization_id: string;
  allowed_services: string[];
  created_at: string;
  updated_at: string;
}

export function useOrgServiceRules(organizationId?: string) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['org-service-rules', tenantId, organizationId],
    queryFn: async () => {
      if (!tenantId || !organizationId) return null;

      const { data, error } = await supabase
        .from('organization_service_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) throw error;
      return data as OrgServiceRule | null;
    },
    enabled: !!tenantId && !!organizationId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (allowedServices: string[]) => {
      if (!tenantId || !organizationId) throw new Error('Missing tenant or organization ID');

      const existing = query.data;

      if (existing) {
        const { data, error } = await supabase
          .from('organization_service_rules')
          .update({ 
            allowed_services: allowedServices,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('organization_service_rules')
          .insert({
            tenant_id: tenantId,
            organization_id: organizationId,
            allowed_services: allowedServices,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-service-rules', tenantId, organizationId] });
      toast.success('Service restrictions updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update service restrictions: ${error.message}`);
    },
  });

  return {
    serviceRules: query.data,
    isLoading: query.isLoading,
    upsertServiceRules: upsertMutation.mutate,
    isPending: upsertMutation.isPending,
  };
}
