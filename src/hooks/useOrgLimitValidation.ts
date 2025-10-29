import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  allowed: boolean;
  code?: string;
  detail?: string;
  isLoading: boolean;
}

interface UseOrgLimitValidationParams {
  organizationId?: string | null;
  guestId?: string | null;
  department?: string | null;
  amount?: number | null;
  enabled?: boolean;
}

/**
 * Hook to validate organization spending limits in real-time
 * Checks per-guest, per-department, and total wallet caps
 */
export function useOrgLimitValidation({
  organizationId,
  guestId,
  department,
  amount,
  enabled = true,
}: UseOrgLimitValidationParams): ValidationResult {
  const [result, setResult] = useState<ValidationResult>({
    allowed: true,
    isLoading: false,
  });

  useEffect(() => {
    if (!enabled || !organizationId || !amount || amount <= 0) {
      setResult({ allowed: true, isLoading: false });
      return;
    }

    const validateLimits = async () => {
      setResult(prev => ({ ...prev, isLoading: true }));

      try {
        const { data, error } = await supabase.rpc('validate_org_limits', {
          _org_id: organizationId,
          _guest_id: guestId || '',
          _department: department || 'general',
          _amount: amount,
        });

        if (error) {
          console.error('Organization limit validation error:', error);
          setResult({
            allowed: false,
            code: 'VALIDATION_ERROR',
            detail: 'Failed to validate spending limits. Please try again.',
            isLoading: false,
          });
          return;
        }

        const validation = data as { allowed: boolean; code?: string; detail?: string };
        setResult({
          allowed: validation.allowed,
          code: validation.code,
          detail: validation.detail,
          isLoading: false,
        });
      } catch (err) {
        console.error('Unexpected validation error:', err);
        setResult({
          allowed: false,
          code: 'UNEXPECTED_ERROR',
          detail: 'An unexpected error occurred during validation.',
          isLoading: false,
        });
      }
    };

    const debounceTimer = setTimeout(validateLimits, 300);
    return () => clearTimeout(debounceTimer);
  }, [organizationId, guestId, department, amount, enabled]);

  return result;
}
