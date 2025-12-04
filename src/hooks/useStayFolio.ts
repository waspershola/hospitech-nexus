/**
 * Stay Folio Hook - Phase 9 Offline Support
 * Attempts Electron offline path first, falls back to online Supabase with realtime
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import {
  isElectronContext,
  offlineGetFolioSnapshot,
} from '@/lib/offline/electronFolioBridge';

export interface StayFolio {
  id: string;
  tenant_id: string;
  booking_id: string | null;
  room_id: string | null;
  guest_id: string | null;
  status: 'open' | 'closed' | 'cancelled';
  balance: number;
  total_charges: number;
  total_payments: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  offline?: boolean; // Phase 9: Flag for offline folio
}

export interface FolioTransaction {
  id: string;
  transaction_type: 'charge' | 'payment' | 'adjustment' | 'refund';
  amount: number;
  description: string;
  department: string | null;
  created_at: string;
}

export function useStayFolio(folioId: string | null) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  // Subscribe to real-time folio updates (only in browser/online mode)
  useEffect(() => {
    if (!folioId || !tenantId) return;
    
    // Skip realtime subscription in Electron offline mode
    if (isElectronContext()) {
      console.log('[useStayFolio] Skipping realtime in Electron mode');
      return;
    }

    const channel = supabase
      .channel(`folio-${folioId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stay_folios',
          filter: `id=eq.${folioId}`,
        },
        (payload) => {
          console.log('[folio] Real-time update:', payload.new);
          queryClient.setQueryData(['folio', folioId], payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [folioId, tenantId, queryClient]);

  return useQuery({
    queryKey: ['folio', folioId],
    queryFn: async () => {
      if (!folioId) return null;

      // Phase 9: Electron offline path first
      if (isElectronContext() && tenantId) {
        console.log('[useStayFolio] Attempting offline fetch...');
        const offlineResult = await offlineGetFolioSnapshot(tenantId, folioId);
        
        if (offlineResult.data) {
          console.log('[useStayFolio] Using offline folio data');
          return {
            ...offlineResult.data,
            offline: true,
          } as StayFolio & {
            booking: any;
            guest: any;
            room: any;
            transactions: FolioTransaction[];
          };
        }
        
        // If no offline data or error, fall through to online
        if (offlineResult.source === 'electron-no-api') {
          console.log('[useStayFolio] No offline API, falling back to online');
        }
      }

      // Online path
      const { data, error } = await supabase
        .from('stay_folios')
        .select(`
          *,
          booking:bookings(*),
          guest:guests(*),
          room:rooms(*),
          transactions:folio_transactions(*)
        `)
        .eq('id', folioId)
        .single();

      if (error) throw error;
      return data as StayFolio & {
        booking: any;
        guest: any;
        room: any;
        transactions: FolioTransaction[];
      };
    },
    enabled: !!folioId && !!tenantId,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });
}
