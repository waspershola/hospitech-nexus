/**
 * Folio Transactions Hook - Phase 9 Offline Support
 * Attempts Electron offline path first, falls back to online Supabase
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  isElectronContext,
  offlineGetFolioTransactions,
} from "@/lib/offline/electronFolioBridge";

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
  offline?: boolean; // Phase 9: Flag for offline transactions
}

export function useFolioTransactions(folioId: string | null) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['folio-transactions', folioId, tenantId],
    queryFn: async () => {
      if (!folioId || !tenantId) {
        return [];
      }

      // Phase 9: Electron offline path first
      if (isElectronContext()) {
        console.log('[useFolioTransactions] Attempting offline fetch...');
        const offlineResult = await offlineGetFolioTransactions(tenantId, folioId);
        
        if (offlineResult.data && offlineResult.data.length > 0) {
          console.log('[useFolioTransactions] Using offline data:', offlineResult.data.length, 'transactions');
          return offlineResult.data as FolioTransaction[];
        }
        
        // If no offline data or error, fall through to online
        if (offlineResult.source === 'electron-no-api') {
          console.log('[useFolioTransactions] No offline API, falling back to online');
        }
      }

      // Online path
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
