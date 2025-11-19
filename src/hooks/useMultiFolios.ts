import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
      queryClient.invalidateQueries({ queryKey: ['multi-folios', bookingId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['folio-by-id', data.id, tenantId] });
      toast.success(`${data.folio_type} folio created`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create folio: ${error.message}`);
    },
  });

  const transferCharge = useMutation({
    mutationFn: async ({
      transactionId,
      targetFolioId,
      amount,
    }: {
      transactionId: string;
      targetFolioId: string;
      amount: number;
    }) => {
      if (!tenantId) throw new Error('No tenant ID');

      // TODO: Implement transfer via edge function
      // For now, this is a placeholder for the transfer functionality
      throw new Error('Transfer functionality to be implemented via edge function');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multi-folios', bookingId, tenantId] });
      toast.success('Charge transferred');
    },
    onError: (error: Error) => {
      toast.error(`Failed to transfer charge: ${error.message}`);
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
    transferCharge: transferCharge.mutate,
    getFolioByType,
    getTotalBalance,
    isCreatingFolio: createFolio.isPending,
    isTransferring: transferCharge.isPending,
  };
}
