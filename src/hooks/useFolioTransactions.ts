import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FolioTransaction {
  id: string;
  folio_id: string;
  transaction_type: string;
  amount: number;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  department: string | null;
  created_at: string;
  created_by: string | null;
  metadata: Record<string, any>;
}

export function useFolioTransactions(folioId: string | null) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['folio-transactions', folioId, tenantId],
    queryFn: async () => {
      if (!folioId || !tenantId) {
        return [];
      }

      const { data, error } = await supabase
        .from('folio_transactions')
        .select('*')
        .eq('folio_id', folioId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useFolioTransactions] Error fetching transactions:', error);
        throw error;
      }

      return (data || []) as FolioTransaction[];
    },
    enabled: !!folioId && !!tenantId,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });
}
