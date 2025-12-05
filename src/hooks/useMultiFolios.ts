import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isOfflineMode } from '@/lib/offline/requestInterceptor';

export interface MultiFolio {
  id: string;
  tenant_id: string;
  booking_id: string;
  guest_id: string;
  room_id: string;
  folio_type: string;
  folio_number: string;
  parent_folio_id?: string;
  is_primary: boolean;
  status: string;
  total_charges: number;
  total_payments: number;
  balance: number;
  created_at: string;
  updated_at: string;
}

/**
 * Hook for managing multiple folios for a single booking
 * Supports room, incidentals, corporate, group, mini_bar, spa, and restaurant folios
 * Version: MULTI-FOLIO-V1
 */
export function useMultiFolios(bookingId: string | null) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const { data: folios = [], isLoading } = useQuery({
    queryKey: ['multi-folios', bookingId, tenantId],
    queryFn: async () => {
      if (!bookingId || !tenantId) return [];

      // Phase 14B: Return empty when offline in Electron
      if (isOfflineMode()) {
        console.log('[useMultiFolios] Offline: Returning empty array');
        return [];
      }

      const { data, error } = await supabase
        .from('stay_folios')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('tenant_id', tenantId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as MultiFolio[];
    },
    enabled: !!bookingId && !!tenantId,
    staleTime: 30 * 1000, // QUERY-KEY-FIX-V1: Cache for 30 seconds
  });

  const primaryFolio = folios.find((f) => f.is_primary);

  const createFolio = useMutation({
    mutationFn: async ({
      folioType,
      parentFolioId,
    }: {
      folioType: string;
      parentFolioId?: string;
    }) => {
      if (!bookingId || !tenantId) throw new Error('Missing booking or tenant ID');

      // Get booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('guest_id, room_id')
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)
        .single();

      if (bookingError) throw bookingError;

      // Generate folio number
      const { data: folioNumber, error: numberError } = await supabase.rpc(
        'generate_folio_number',
        {
          p_tenant_id: tenantId,
          p_booking_id: bookingId,
          p_folio_type: folioType,
        }
      );

      if (numberError) throw numberError;

      // Create folio
      const { data, error } = await supabase
        .from('stay_folios')
        .insert({
          tenant_id: tenantId,
          booking_id: bookingId,
          guest_id: booking.guest_id,
          room_id: booking.room_id,
          folio_type: folioType,
          folio_number: folioNumber,
          parent_folio_id: parentFolioId,
          is_primary: false,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // QUERY-KEY-FIX-V1: Specific cache invalidation with IDs
      queryClient.invalidateQueries({ queryKey: ['multi-folios', bookingId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['folio', data.id, tenantId] });
      toast.success(`${data.folio_type} folio created`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create folio: ${error.message}`);
    },
  });

  // Transfer charge using folio_transfer_charge RPC (BILLING-CENTER-V2.1-MULTI-FOLIO-RPCS)
  const transferCharge = useMutation({
    mutationFn: async ({
      sourceFolioId,
      targetFolioId,
      transactionId,
      amount,
    }: {
      sourceFolioId: string;
      targetFolioId: string;
      transactionId: string;
      amount: number;
    }) => {
      const { data, error } = await supabase.rpc('folio_transfer_charge', {
        p_source_folio_id: sourceFolioId,
        p_target_folio_id: targetFolioId,
        p_transaction_id: transactionId,
        p_amount: amount,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; transaction_id?: string };
      if (!result?.success) throw new Error(result?.error || 'Transfer failed');
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multi-folios', bookingId, tenantId] });
      toast.success('Charge transferred successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to transfer charge: ${error.message}`);
    },
  });

  // Split charge using folio_split_charge RPC (BILLING-CENTER-V2.1-MULTI-FOLIO-RPCS)
  const splitCharge = useMutation({
    mutationFn: async ({
      transactionId,
      splits,
    }: {
      transactionId: string;
      splits: Array<{ targetFolioId: string; amount: number }>;
    }) => {
      const { data, error } = await supabase.rpc('folio_split_charge', {
        p_transaction_id: transactionId,
        p_splits: splits,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; transaction_ids?: string[] };
      if (!result?.success) throw new Error(result?.error || 'Split failed');
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multi-folios', bookingId, tenantId] });
      toast.success('Charge split successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to split charge: ${error.message}`);
    },
  });

  // Merge folios using folio_merge RPC (BILLING-CENTER-V2.1-MULTI-FOLIO-RPCS)
  const mergeFolios = useMutation({
    mutationFn: async ({
      sourceFolioId,
      targetFolioId,
    }: {
      sourceFolioId: string;
      targetFolioId: string;
    }) => {
      const { data, error } = await supabase.rpc('folio_merge', {
        p_source_folio_id: sourceFolioId,
        p_target_folio_id: targetFolioId,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; source_folio_id?: string; target_folio_id?: string };
      if (!result?.success) throw new Error(result?.error || 'Merge failed');
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multi-folios', bookingId, tenantId] });
      toast.success('Folios merged successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to merge folios: ${error.message}`);
    },
  });

  const getFolioByType = (folioType: string): MultiFolio | undefined => {
    return folios.find((f) => f.folio_type === folioType);
  };

  const getTotalBalance = (): number => {
    return folios.reduce((sum, folio) => sum + folio.balance, 0);
  };

  return {
    folios,
    primaryFolio,
    isLoading,
    createFolio: createFolio.mutate,
    isCreatingFolio: createFolio.isPending,
    transferCharge: transferCharge.mutate,
    isTransferring: transferCharge.isPending,
    splitCharge: splitCharge.mutate,
    isSplitting: splitCharge.isPending,
    mergeFolios: mergeFolios.mutate,
    isMerging: mergeFolios.isPending,
    getFolioByType,
    getTotalBalance,
  };
}
