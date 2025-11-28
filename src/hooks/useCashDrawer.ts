import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type CashDrawer = Database['public']['Tables']['ledger_batches']['Row'];

export function useCashDrawer() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: currentDrawer, isLoading } = useQuery({
    queryKey: ['cash-drawer-current', tenantId, user?.id],
    queryFn: async () => {
      if (!tenantId || !user?.id) return null;

      const { data, error } = await supabase
        .from('ledger_batches')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('batch_type', 'cash_drawer')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!user?.id,
  });

  const { data: history } = useQuery({
    queryKey: ['cash-drawer-history', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('ledger_batches')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('batch_type', 'cash_drawer')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const openDrawer = useMutation({
    mutationFn: async ({
      openingBalance,
      shift,
      locationId,
      notes,
    }: {
      openingBalance: number;
      shift?: string;
      locationId?: string;
      notes?: string;
    }) => {
      if (!tenantId || !user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase.from('ledger_batches').insert({
        tenant_id: tenantId,
        batch_type: 'cash_drawer',
        batch_date: new Date().toISOString().split('T')[0],
        status: 'open',
        metadata: {
          opening_balance: openingBalance,
          shift,
          location_id: locationId,
          notes,
          opened_at: new Date().toISOString(),
          opened_by: user.id,
        } as any,
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-drawer-current'] });
      queryClient.invalidateQueries({ queryKey: ['cash-drawer-history'] });
      toast.success('Cash drawer opened successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to open drawer: ${error.message}`);
    },
  });

  const calculateExpectedCash = useMutation({
    mutationFn: async ({
      staffId,
      shiftCode,
      openedAt,
      closedAt,
    }: {
      staffId: string;
      shiftCode: string;
      openedAt: string;
      closedAt: string;
    }) => {
      if (!tenantId) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('calculate_expected_cash_from_ledger', {
        p_tenant_id: tenantId,
        p_staff_id: staffId,
        p_shift_code: shiftCode,
        p_opened_at: openedAt,
        p_closed_at: closedAt,
      });

      if (error) throw error;
      return data as number;
    },
    onError: (error: Error) => {
      toast.error(`Failed to calculate expected cash: ${error.message}`);
    },
  });

  const closeDrawer = useMutation({
    mutationFn: async ({
      drawerId,
      closingBalance,
      notes,
    }: {
      drawerId: string;
      closingBalance: number;
      notes?: string;
    }) => {
      if (!tenantId || !user?.id) throw new Error('Not authenticated');

      const drawer = await supabase
        .from('ledger_batches')
        .select('*')
        .eq('id', drawerId)
        .single();

      if (drawer.error) throw drawer.error;

      const openingBalance = (drawer.data.metadata as any)?.opening_balance || 0;
      const expectedBalance = (drawer.data.metadata as any)?.expected_cash || openingBalance;
      const variance = closingBalance - expectedBalance;

      const { data, error } = await supabase
        .from('ledger_batches')
        .update({
          status: 'closed',
          metadata: {
            ...(drawer.data.metadata as any),
            closing_balance: closingBalance,
            expected_balance: expectedBalance,
            variance,
            closed_at: new Date().toISOString(),
            closed_by: user.id,
            closing_notes: notes,
          },
        })
        .eq('id', drawerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-drawer-current'] });
      queryClient.invalidateQueries({ queryKey: ['cash-drawer-history'] });
      toast.success('Cash drawer closed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to close drawer: ${error.message}`);
    },
  });

  return {
    currentDrawer,
    history,
    isLoading,
    openDrawer: openDrawer.mutate,
    closeDrawer: closeDrawer.mutate,
    isOpening: openDrawer.isPending,
    isClosing: closeDrawer.isPending,
    calculateExpectedCash: calculateExpectedCash.mutate,
    isCalculating: calculateExpectedCash.isPending,
  };
}
