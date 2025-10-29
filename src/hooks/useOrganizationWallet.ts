import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OrganizationWallet {
  id: string;
  name: string;
  balance: number;
  credit_limit: number;
  allow_negative_balance: boolean;
  currency: string;
  percentUsed: number;
  nearLimit: boolean;
  overLimit: boolean;
}

/**
 * Hook to fetch organization wallet information
 */
export function useOrganizationWallet(organizationId: string | null | undefined) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['organization-wallet', organizationId, tenantId],
    queryFn: async (): Promise<OrganizationWallet | null> => {
      if (!organizationId || !tenantId) return null;

      // Fetch organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, credit_limit, allow_negative_balance, wallet_id')
        .eq('id', organizationId)
        .eq('tenant_id', tenantId)
        .single();

      if (orgError) throw orgError;
      if (!org) return null;

      // If organization has a wallet, fetch wallet balance
      let walletBalance = 0;
      let currency = 'NGN';

      if (org.wallet_id) {
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('balance, currency')
          .eq('id', org.wallet_id)
          .eq('tenant_id', tenantId)
          .single();

        if (walletError) throw walletError;
        
        walletBalance = Number(wallet?.balance || 0);
        currency = wallet?.currency || 'NGN';
      }

      const creditLimit = Number(org.credit_limit || 0);
      const percentUsed = creditLimit > 0 ? (walletBalance / creditLimit) * 100 : 0;
      const nearLimit = percentUsed >= 80 && percentUsed < 100;
      const overLimit = percentUsed >= 100 && !org.allow_negative_balance;

      return {
        id: org.id,
        name: org.name,
        balance: walletBalance,
        credit_limit: creditLimit,
        allow_negative_balance: org.allow_negative_balance,
        currency,
        percentUsed,
        nearLimit,
        overLimit,
      };
    },
    enabled: !!organizationId && !!tenantId,
  });
}
