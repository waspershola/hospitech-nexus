import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ValidationResult {
  canSuspend: boolean;
  warnings: string[];
  errors: string[];
}

export function useValidatedSuspension(tenantId: string) {
  const { user, tenantId: currentTenantId } = useAuth();
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    canSuspend: true,
    warnings: [],
    errors: []
  });

  // Check if tenant has active bookings
  const { data: activeBookings } = useQuery({
    queryKey: ['tenant-active-bookings', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('tenant_id', tenantId)
        .in('status', ['reserved', 'checked_in'])
        .limit(1);

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId
  });

  // Validate suspension
  const validateSuspension = async (): Promise<ValidationResult> => {
    const warnings: string[] = [];
    const errors: string[] = [];
    let canSuspend = true;

    // Check 1: Prevent self-suspension
    if (tenantId === currentTenantId) {
      errors.push('You cannot suspend your own tenant account');
      canSuspend = false;
    }

    // Check 2: Warn about active bookings
    if (activeBookings && activeBookings.length > 0) {
      warnings.push(
        `This tenant has active bookings. Suspending will block staff access but won't affect existing bookings.`
      );
    }

    // Check 3: Check if user is platform admin
    const { data: platformUser } = await supabase
      .from('platform_users')
      .select('role')
      .eq('id', user?.id)
      .maybeSingle();

    if (!platformUser || !['super_admin', 'support_admin'].includes(platformUser.role)) {
      errors.push('Insufficient permissions to suspend tenants');
      canSuspend = false;
    }

    const result = { canSuspend, warnings, errors };
    setValidationResult(result);
    return result;
  };

  return {
    validationResult,
    validateSuspension,
    hasActiveBookings: activeBookings && activeBookings.length > 0
  };
}
