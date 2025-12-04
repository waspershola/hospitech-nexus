/**
 * Void Transaction Hook - Phase 9
 * Handles voiding folio transactions with offline support
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  isElectronContext,
  offlineVoidTransaction,
  saveFolioEvent,
} from '@/lib/offline/electronFolioBridge';

interface VoidTransactionParams {
  transactionId: string;
  folioId: string;
  bookingId?: string;
  reason: string;
}

export function useVoidTransaction() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation({
    mutationFn: async (params: VoidTransactionParams) => {
      // Phase 9: Electron offline path first
      if (isElectronContext() && tenantId) {
        console.log('[useVoidTransaction] Attempting offline void...');
        const offlineResult = await offlineVoidTransaction(
          tenantId,
          params.transactionId,
          params.reason
        );

        if (offlineResult.data?.success) {
          console.log('[useVoidTransaction] Offline void successful');
          
          // Save event to journal
          await saveFolioEvent(tenantId, {
            type: 'transaction_voided',
            folioId: params.folioId,
            bookingId: params.bookingId || '',
            timestamp: new Date().toISOString(),
            payload: {
              transactionId: params.transactionId,
              reason: params.reason,
              voidedBy: user?.id,
            },
          });

          return { success: true, offline: true };
        }

        // If offline failed with error, log but continue to online
        if (offlineResult.error) {
          console.warn('[useVoidTransaction] Offline void failed, trying online:', offlineResult.error);
        }
      }

      // Online path - Update the transaction to mark as voided
      // Note: This uses a direct update since void_folio_transaction RPC may not exist
      const { data, error } = await supabase
        .from('folio_transactions')
        .update({
          metadata: {
            voided: true,
            voided_at: new Date().toISOString(),
            voided_by: user?.id,
            void_reason: params.reason,
          }
        })
        .eq('id', params.transactionId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    },
    onSuccess: (result, variables) => {
      // Invalidate folio queries
      queryClient.invalidateQueries({ queryKey: ['folio-transactions', variables.folioId] });
      queryClient.invalidateQueries({ queryKey: ['folio', variables.folioId] });
      queryClient.invalidateQueries({ queryKey: ['booking-folio'] });

      if (result.offline) {
        toast.success('Transaction voided (offline - will sync)');
      } else {
        toast.success('Transaction voided');
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to void transaction: ${error.message}`);
    },
  });
}
