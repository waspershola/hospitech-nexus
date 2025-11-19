import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export interface GroupChildFolio {
  id: string;
  folio_number: string;
  folio_type: string;
  booking_id: string;
  guest_id: string;
  room_id: string;
  total_charges: number;
  total_payments: number;
  balance: number;
  status: string;
  created_at: string;
  booking?: {
    booking_reference: string;
    check_in: string;
    check_out: string;
  };
  guest?: {
    name: string;
    email: string;
    phone: string;
  };
  room?: {
    number: string;
  };
}

export interface AggregatedBalances {
  total_charges: number;
  total_payments: number;
  outstanding_balance: number;
  children_breakdown: Array<{
    folio_id: string;
    folio_number: string;
    folio_type: string;
    room_number: string;
    guest_name: string;
    charges: number;
    payments: number;
    balance: number;
  }>;
}

export interface GroupMasterFolioData {
  master_folio: {
    id: string;
    folio_number: string;
    folio_type: string;
    booking_id: string;
    guest_id: string;
    room_id: string | null;
    total_charges: number;
    total_payments: number;
    balance: number;
    status: string;
    created_at: string;
  } | null;
  child_folios: GroupChildFolio[];
  aggregated_balances: AggregatedBalances;
}

/**
 * Hook to fetch group master folio with all child folios and aggregated balances
 * Used by Group Billing Center for comprehensive group financial management
 */
export function useGroupMasterFolio(groupBookingId: string | null) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  // Real-time subscription for folio updates
  useEffect(() => {
    if (!groupBookingId || !tenantId) return;

    console.log('[useGroupMasterFolio] Setting up real-time subscription for group:', groupBookingId);

    const channel = supabase
      .channel(`group-master-folio-${groupBookingId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stay_folios',
        filter: `tenant_id=eq.${tenantId}`,
      }, (payload) => {
        console.log('[useGroupMasterFolio] Folio change detected:', payload);
        queryClient.invalidateQueries({ queryKey: ['group-master-folio', groupBookingId, tenantId] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'folio_transactions',
        filter: `tenant_id=eq.${tenantId}`,
      }, (payload) => {
        console.log('[useGroupMasterFolio] Transaction change detected:', payload);
        queryClient.invalidateQueries({ queryKey: ['group-master-folio', groupBookingId, tenantId] });
      })
      .subscribe();

    return () => {
      console.log('[useGroupMasterFolio] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [groupBookingId, tenantId, queryClient]);

  return useQuery<GroupMasterFolioData>({
    queryKey: ['group-master-folio', groupBookingId, tenantId],
    queryFn: async () => {
      if (!groupBookingId || !tenantId) {
        return {
          master_folio: null,
          child_folios: [],
          aggregated_balances: {
            total_charges: 0,
            total_payments: 0,
            outstanding_balance: 0,
            children_breakdown: [],
          },
        };
      }

      console.log('[useGroupMasterFolio] Fetching group master folio for group_id:', groupBookingId);

      const { data, error } = await supabase.rpc('get_group_master_folio', {
        p_tenant_id: tenantId,
        p_group_id: groupBookingId,
      });

      if (error) {
        console.error('[useGroupMasterFolio] Error fetching group master folio:', error);
        throw error;
      }

      console.log('[useGroupMasterFolio] Group master folio data fetched:', data);

      return data as unknown as GroupMasterFolioData;
    },
    enabled: !!groupBookingId && !!tenantId,
  });
}
