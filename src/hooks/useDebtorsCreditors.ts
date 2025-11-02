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
          guest_id,
          organization_id,
          guest:guests(id, name, email),
          organization:organizations(id, name, contact_email)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'open');

      // Group receivables by entity (guest or organization)
      const debtorMap = new Map<string, {
        entity_id: string;
        entity_name: string;
        entity_type: string;
        total_amount: number;
        transaction_count: number;
        last_activity: string;
        email?: string;
      }>();

      (receivablesData || []).forEach(r => {
        const isGuest = !!r.guest_id;
        const entityId = isGuest ? r.guest_id! : r.organization_id!;
        const entityData = isGuest ? (r.guest as any) : (r.organization as any);
        const entityName = entityData?.name || 'Unknown';
        const entityEmail = isGuest ? entityData?.email : entityData?.contact_email;

        if (debtorMap.has(entityId)) {
          const existing = debtorMap.get(entityId)!;
          existing.total_amount += Number(r.amount);
          existing.transaction_count += 1;
          if (new Date(r.updated_at) > new Date(existing.last_activity)) {
            existing.last_activity = r.updated_at;
          }
        } else {
          debtorMap.set(entityId, {
            entity_id: entityId,
            entity_name: entityName,
            entity_type: isGuest ? 'guest' : 'organization',
            total_amount: Number(r.amount),
            transaction_count: 1,
            last_activity: r.updated_at,
            email: entityEmail
          });
        }
      });

      // Convert to array and sort by total amount
      const debtors: DebtorCreditor[] = Array.from(debtorMap.values())
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 10)
        .map(d => ({
          type: 'debtor' as const,
          entity_name: d.entity_name,
          entity_id: d.entity_id,
          entity_type: d.entity_type,
          total_amount: d.total_amount,
          last_activity: d.last_activity,
          transaction_count: d.transaction_count
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
