import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePOSSettlementImports() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['pos-settlement-imports', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('pos_settlement_imports')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId
  });
}

export function usePOSSettlementRecords(importId?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['pos-settlement-records', tenantId, importId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('pos_settlement_records')
        .select('*')
        .eq('tenant_id', tenantId);

      if (importId) {
        query = query.eq('import_id', importId);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId
  });
}
