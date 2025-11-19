import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OrgCreditCheckResult {
  success: boolean;
  total_credit_limit: number;
  total_credit_used: number;
  total_credit_remaining: number;
  wallet_balance: number;
  allow_negative_balance: boolean;
  guest_limit: number | null;
  guest_used: number;
  guest_remaining: number | null;
  guest_period: string | null;
  department_limit: number | null;
  department_used: number;
  department_remaining: number | null;
  department_period: string | null;
  proposed_amount: number;
  will_exceed: boolean;
}

interface UseOrgCreditCheckParams {
  organizationId: string | null | undefined;
  guestId: string | null | undefined;
  department: string | null | undefined;
  amount: number;
  enabled?: boolean;
}

/**
 * Hook to fetch real-time organization credit availability
 * Displays remaining credit across total, guest, and department limits
 */
export function useOrgCreditCheck({
  organizationId,
  guestId,
  department,
  amount,
  enabled = true,
}: UseOrgCreditCheckParams) {
  const { tenantId } = useAuth();

  return useQuery<OrgCreditCheckResult | null>({
    queryKey: ['org-credit-check', organizationId, guestId, department, amount, tenantId],
    queryFn: async () => {
      if (!organizationId || !tenantId || amount <= 0) return null;

      const { data, error } = await supabase.rpc('calculate_org_remaining_limit', {
        p_org_id: organizationId,
        p_guest_id: guestId || '',
        p_department: department || 'general',
        p_amount: amount,
      });

      if (error) {
        console.error('Organization credit check error:', error);
        return null;
      }

      if (!data) return null;

      return data as unknown as OrgCreditCheckResult;
    },
    enabled: !!organizationId && !!tenantId && enabled && amount > 0,
    refetchOnWindowFocus: false,
  });
}
