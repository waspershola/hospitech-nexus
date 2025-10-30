import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DebtorCreditor {
  type: 'debtor' | 'creditor';
  entity_name: string;
  entity_id: string;
  entity_type: string;
  total_amount: number;
  last_activity: string;
  transaction_count: number;
}

export function useDebtorsCreditors() {
  const { tenantId } = useAuth();

  return useQuery<{ debtors: DebtorCreditor[]; creditors: DebtorCreditor[] }>({
    queryKey: ['debtors-creditors', tenantId],
    queryFn: async () => {
      if (!tenantId) return { debtors: [], creditors: [] };

      // Fetch debtors (open receivables)
      const { data: receivablesData } = await supabase
        .from('receivables')
        .select(`
          amount,
          updated_at,
          guest:guests(id, name),
          organization:organizations(id, name)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'open')
        .order('amount', { ascending: false })
        .limit(10);

      const debtors: DebtorCreditor[] = (receivablesData || []).map(r => ({
        type: 'debtor' as const,
        entity_name: (r.guest as any)?.name || (r.organization as any)?.name || 'Unknown',
        entity_id: (r.guest as any)?.id || (r.organization as any)?.id,
        entity_type: (r.guest as any) ? 'guest' : 'organization',
        total_amount: Number(r.amount),
        last_activity: r.updated_at,
        transaction_count: 1
      }));

      // Fetch creditors (positive wallet balances)
      const { data: walletsData } = await supabase
        .from('wallets')
        .select(`
          id,
          balance,
          wallet_type,
          owner_id,
          last_transaction_at
        `)
        .eq('tenant_id', tenantId)
        .gt('balance', 0)
        .order('balance', { ascending: false })
        .limit(10);

      // Fetch entity names
      const guestIds = walletsData?.filter(w => w.wallet_type === 'guest').map(w => w.owner_id) || [];
      const orgIds = walletsData?.filter(w => w.wallet_type === 'organization').map(w => w.owner_id) || [];

      const { data: guests } = await supabase
        .from('guests')
        .select('id, name')
        .in('id', guestIds);

      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', orgIds);

      const guestMap = new Map(guests?.map(g => [g.id, g.name]) || []);
      const orgMap = new Map(orgs?.map(o => [o.id, o.name]) || []);

      const creditors: DebtorCreditor[] = (walletsData || []).map(w => ({
        type: 'creditor' as const,
        entity_name: (w.wallet_type === 'guest' ? guestMap.get(w.owner_id!) : orgMap.get(w.owner_id!)) || 'Unknown',
        entity_id: w.owner_id!,
        entity_type: w.wallet_type,
        total_amount: Number(w.balance),
        last_activity: w.last_transaction_at || new Date().toISOString(),
        transaction_count: 0 // We don't have this easily accessible
      }));

      return { debtors, creditors };
    },
    enabled: !!tenantId,
    refetchInterval: 60000 // Refresh every 60s
  });
}
