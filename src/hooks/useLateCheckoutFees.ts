import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInHours, differenceInDays } from 'date-fns';

interface LateCheckoutFeeConfig {
  hourlyRate: number;
  dailyRate: number;
  gracePeriodHours: number;
}

interface LateCheckoutFee {
  hoursLate: number;
  daysLate: number;
  feeAmount: number;
  gracePeriodApplied: boolean;
}

export function useLateCheckoutFees() {
  const { tenantId } = useAuth();

  const { data: config } = useQuery({
    queryKey: ['late-checkout-config', tenantId],
    queryFn: async (): Promise<LateCheckoutFeeConfig> => {
      if (!tenantId) {
        return {
          hourlyRate: 1000, // ₦1,000 per hour default
          dailyRate: 10000, // ₦10,000 per day default
          gracePeriodHours: 2, // 2 hour grace period
        };
      }

      const { data } = await supabase
        .from('hotel_configurations')
        .select('key, value')
        .eq('tenant_id', tenantId)
        .in('key', ['hourlyRate', 'dailyRate', 'gracePeriodHours']);

      const hourlyConfig = data?.find(c => c.key === 'hourlyRate');
      const dailyConfig = data?.find(c => c.key === 'dailyRate');
      const graceConfig = data?.find(c => c.key === 'gracePeriodHours');

      return {
        hourlyRate: hourlyConfig?.value ? Number(hourlyConfig.value) : 1000,
        dailyRate: dailyConfig?.value ? Number(dailyConfig.value) : 10000,
        gracePeriodHours: graceConfig?.value ? Number(graceConfig.value) : 2,
      };
    },
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const calculateLateFee = (checkoutDate: string, actualCheckoutTime?: Date): LateCheckoutFee => {
    const scheduledCheckout = new Date(checkoutDate);
    const now = actualCheckoutTime || new Date();

    const hoursLate = Math.max(0, differenceInHours(now, scheduledCheckout));
    const daysLate = Math.floor(hoursLate / 24);
    
    const gracePeriod = config?.gracePeriodHours || 2;
    const effectiveHoursLate = Math.max(0, hoursLate - gracePeriod);

    let feeAmount = 0;
    
    if (effectiveHoursLate > 0) {
      if (daysLate >= 1) {
        // Charge daily rate for full days + hourly for remaining hours
        feeAmount = (daysLate * (config?.dailyRate || 10000)) + 
                   ((effectiveHoursLate % 24) * (config?.hourlyRate || 1000));
      } else {
        // Charge hourly rate
        feeAmount = effectiveHoursLate * (config?.hourlyRate || 1000);
      }
    }

    return {
      hoursLate,
      daysLate,
      feeAmount,
      gracePeriodApplied: hoursLate > 0 && hoursLate <= gracePeriod,
    };
  };

  return {
    config: config || {
      hourlyRate: 1000,
      dailyRate: 10000,
      gracePeriodHours: 2,
    },
    calculateLateFee,
  };
}
