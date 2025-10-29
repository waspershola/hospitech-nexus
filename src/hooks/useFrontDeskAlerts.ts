import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UnpaidFolio {
  booking_id: string;
  room_number: string;
  guest_name: string;
  balance: number;
  check_in: string;
}

export interface Overpayment {
  wallet_id: string;
  guest_id: string;
  guest_name: string;
  balance: number;
}

export interface OrgLimitWarning {
  organization_id: string;
  organization_name: string;
  balance: number;
  credit_limit: number;
  percent_used: number;
}

export function useFrontDeskAlerts() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['frontdesk-alerts', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');

      // Fetch unpaid folios (occupied rooms with outstanding balance)
      const { data: unpaidFolios, error: unpaidError } = await supabase
        .from('bookings')
        .select(`
          id,
          total_amount,
          metadata,
          check_in,
          rooms(number),
          guests(name)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'checked_in')
        .not('metadata->balance', 'is', null);

      if (unpaidError) throw unpaidError;

      const unpaid: UnpaidFolio[] = (unpaidFolios || [])
        .filter((b: any) => {
          const balance = parseFloat(b.metadata?.balance || '0');
          return balance > 0;
        })
        .map((b: any) => ({
          booking_id: b.id,
          room_number: b.rooms?.number || 'N/A',
          guest_name: b.guests?.name || 'Unknown',
          balance: parseFloat(b.metadata?.balance || '0'),
          check_in: b.check_in,
        }));

      // Fetch overpayments (guest wallets with balance > 1000)
      const { data: overpayments, error: overpayError } = await supabase
        .from('wallets')
        .select(`
          id,
          owner_id,
          balance,
          guests(name)
        `)
        .eq('tenant_id', tenantId)
        .eq('wallet_type', 'guest')
        .gt('balance', 1000);

      if (overpayError) throw overpayError;

      const overpay: Overpayment[] = (overpayments || []).map((w: any) => ({
        wallet_id: w.id,
        guest_id: w.owner_id,
        guest_name: w.guests?.name || 'Unknown',
        balance: parseFloat(w.balance),
      }));

      // Fetch organization limit warnings (>80% of credit limit)
      const { data: orgLimits, error: orgError } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          credit_limit,
          wallets(balance)
        `)
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .not('credit_limit', 'is', null)
        .gt('credit_limit', 0);

      if (orgError) throw orgError;

      const orgWarnings: OrgLimitWarning[] = (orgLimits || [])
        .map((org: any) => {
          const balance = parseFloat(org.wallets?.[0]?.balance || '0');
          const creditLimit = parseFloat(org.credit_limit);
          const percentUsed = Math.abs((balance / creditLimit) * 100);
          
          return {
            organization_id: org.id,
            organization_name: org.name,
            balance,
            credit_limit: creditLimit,
            percent_used: percentUsed,
          };
        })
        .filter((org) => org.percent_used >= 80);

      return {
        unpaidFolios: unpaid,
        overpayments: overpay,
        orgLimitWarnings: orgWarnings,
        totalAlerts: unpaid.length + overpay.length + orgWarnings.length,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: !!tenantId,
  });
}
