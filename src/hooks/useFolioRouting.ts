import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FolioRoutingRule {
  id: string;
  tenant_id: string;
  charge_category: string;
  target_folio_type: string;
  organization_id?: string;
  department?: string;
  priority: number;
  auto_create_folio: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/**
 * Hook for managing folio routing rules
 * Determines which folio type should receive specific charge categories
 * Version: MULTI-FOLIO-V1
 */
export function useFolioRouting() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const { data: routingRules = [], isLoading } = useQuery({
    queryKey: ['folio-routing-rules', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('folio_routing_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (error) throw error;
      return data as FolioRoutingRule[];
    },
    enabled: !!tenantId,
  });

  const createRule = useMutation({
    mutationFn: async (rule: Omit<FolioRoutingRule, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase
        .from('folio_routing_rules')
        .insert({
          ...rule,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folio-routing-rules', tenantId] });
      toast.success('Routing rule created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create rule: ${error.message}`);
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FolioRoutingRule> }) => {
      const { data, error } = await supabase
        .from('folio_routing_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folio-routing-rules', tenantId] });
      toast.success('Routing rule updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update rule: ${error.message}`);
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('folio_routing_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folio-routing-rules', tenantId] });
      toast.success('Routing rule deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete rule: ${error.message}`);
    },
  });

  /**
   * Determine target folio type for a charge category
   */
  const getTargetFolioType = (
    chargeCategory: string,
    options?: {
      organizationId?: string;
      department?: string;
    }
  ): string => {
    const matchingRules = routingRules.filter((rule) => {
      if (rule.charge_category !== chargeCategory) return false;
      if (options?.organizationId && rule.organization_id !== options.organizationId) return false;
      if (options?.department && rule.department !== options.department) return false;
      return true;
    });

    if (matchingRules.length === 0) return 'room'; // Default to room folio
    
    // Return highest priority (lowest number) rule
    return matchingRules[0].target_folio_type;
  };

  return {
    routingRules,
    isLoading,
    createRule: createRule.mutate,
    updateRule: updateRule.mutate,
    deleteRule: deleteRule.mutate,
    getTargetFolioType,
    isCreating: createRule.isPending,
    isUpdating: updateRule.isPending,
    isDeleting: deleteRule.isPending,
  };
}
