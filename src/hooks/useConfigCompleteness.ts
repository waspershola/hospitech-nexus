import { useConfigStore } from '@/stores/configStore';

export interface CompletenessChecks {
  financials: boolean;
  branding: boolean;
  email: boolean;
  meta: boolean;
}

export function useConfigCompleteness() {
  const { financials, branding, emailSettings, hotelMeta } = useConfigStore();

  const checks: CompletenessChecks = {
    financials: !!(financials.currency && financials.vat_rate !== undefined),
    branding: !!(branding.primary_color && (branding.logo_url || branding.headline)),
    email: !!(emailSettings.from_email && emailSettings.from_name),
    meta: !!(hotelMeta.hotel_name && hotelMeta.contact_email),
  };

  const completedCount = Object.values(checks).filter(Boolean).length;
  const totalCount = Object.keys(checks).length;

  return {
    percentage: Math.round((completedCount / totalCount) * 100),
    checks,
    isComplete: completedCount === totalCount,
    completedCount,
    totalCount,
  };
}
