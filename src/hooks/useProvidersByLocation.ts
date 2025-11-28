import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProviderByLocation {
  id: string;
  name: string;
  type: string;
  is_default: boolean;
  fee_percent: number;
  fee_bearer: string | null;
  status: string | null;
}

/**
 * FINANCE-CONFIG-V1: Fetch providers available at a specific location
 * Uses the new finance_provider_locations junction table
 */
export function useProvidersByLocation(locationId: string | null | undefined) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['providers-by-location', tenantId, locationId],
    queryFn: async (): Promise<ProviderByLocation[]> => {
      if (!tenantId || !locationId) {
        return [];
      }

      // Query junction table to get enabled providers for this location
      const { data, error } = await supabase
        .from('finance_provider_locations')
        .select(`
          is_default,
          finance_providers!provider_id (
            id,
            name,
            type,
            fee_percent,
            fee_bearer,
            status
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('location_id', locationId)
        .eq('is_enabled', true)
        .order('is_default', { ascending: false }); // Default providers first

      if (error) {
        console.error('[useProvidersByLocation] Error fetching providers:', error);
        throw error;
      }

      // Flatten the nested structure
      return (data || [])
        .filter((row) => row.finance_providers)
        .map((row) => ({
          id: row.finance_providers.id,
          name: row.finance_providers.name,
          type: row.finance_providers.type,
          is_default: row.is_default,
          fee_percent: row.finance_providers.fee_percent || 0,
          fee_bearer: row.finance_providers.fee_bearer,
          status: row.finance_providers.status,
        }));
    },
    enabled: !!tenantId && !!locationId,
    staleTime: 60000, // Cache for 1 minute
  });
}

