import { supabase } from '@/integrations/supabase/client';

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number;
}

/**
 * Plan Limits Enforcement Utilities
 * Used to validate operations against tenant plan limits
 */

// Check if tenant can add more rooms
export async function checkRoomLimit(tenantId: string): Promise<LimitCheckResult> {
  try {
    // Get tenant plan
    const { data: tenant, error: tenantError } = await supabase
      .from('platform_tenants')
      .select('plan_id, platform_plans!inner(feature_flags)')
      .eq('id', tenantId)
      .single();

    if (tenantError) throw tenantError;

    const featureFlags: any = (tenant?.platform_plans as any)?.feature_flags || {};
    const maxRooms = featureFlags.max_rooms;
    
    // No limit set means unlimited
    if (!maxRooms) {
      return { allowed: true };
    }

    // Count current rooms
    const { count, error: countError } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (countError) throw countError;

    const currentRooms = count || 0;

    if (currentRooms >= maxRooms) {
      return {
        allowed: false,
        reason: `Room limit reached. Your plan allows ${maxRooms} rooms, you currently have ${currentRooms}.`,
        current: currentRooms,
        limit: maxRooms,
      };
    }

    return { allowed: true, current: currentRooms, limit: maxRooms };
  } catch (error) {
    console.error('Room limit check error:', error);
    return { allowed: false, reason: 'Failed to check room limit' };
  }
}

// Check if tenant can add more staff
export async function checkStaffLimit(tenantId: string): Promise<LimitCheckResult> {
  try {
    // Get tenant plan
    const { data: tenant, error: tenantError } = await supabase
      .from('platform_tenants')
      .select('plan_id, platform_plans!inner(feature_flags)')
      .eq('id', tenantId)
      .single();

    if (tenantError) throw tenantError;

    const featureFlags: any = (tenant?.platform_plans as any)?.feature_flags || {};
    const maxStaff = featureFlags.max_staff;
    
    // No limit set means unlimited
    if (!maxStaff) {
      return { allowed: true };
    }

    // Count current active staff
    const { count, error: countError } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    if (countError) throw countError;

    const currentStaff = count || 0;

    if (currentStaff >= maxStaff) {
      return {
        allowed: false,
        reason: `Staff limit reached. Your plan allows ${maxStaff} staff members, you currently have ${currentStaff}.`,
        current: currentStaff,
        limit: maxStaff,
      };
    }

    return { allowed: true, current: currentStaff, limit: maxStaff };
  } catch (error) {
    console.error('Staff limit check error:', error);
    return { allowed: false, reason: 'Failed to check staff limit' };
  }
}

// Check if tenant has SMS credits remaining
export async function checkSMSLimit(tenantId: string): Promise<LimitCheckResult> {
  try {
    // Get current usage
    const { data: usage, error: usageError } = await supabase
      .from('platform_usage')
      .select('sms_sent')
      .eq('tenant_id', tenantId)
      .single();

    if (usageError && usageError.code !== 'PGRST116') throw usageError;

    const smsSent = usage?.sms_sent || 0;

    // Get plan included SMS
    const { data: tenant, error: tenantError } = await supabase
      .from('platform_tenants')
      .select('plan_id, platform_plans!inner(included_sms)')
      .eq('id', tenantId)
      .single();

    if (tenantError) throw tenantError;

    const includedSMS = (tenant?.platform_plans as any)?.included_sms || 0;

    // Allow sending if within included SMS (overage will be billed)
    return { 
      allowed: true, 
      current: smsSent, 
      limit: includedSMS 
    };
  } catch (error) {
    console.error('SMS limit check error:', error);
    return { allowed: false, reason: 'Failed to check SMS limit' };
  }
}

// Check if tenant can access a specific feature
export async function canAccessFeature(
  tenantId: string, 
  featureKey: string
): Promise<LimitCheckResult> {
  try {
    // Get tenant plan features
    const { data: tenant, error } = await supabase
      .from('platform_tenants')
      .select('plan_id, platform_plans!inner(feature_flags)')
      .eq('id', tenantId)
      .single();

    if (error) throw error;

    const featureFlags: any = (tenant?.platform_plans as any)?.feature_flags || {};
    const features = featureFlags.features || [];
    const hasAccess = features.includes(featureKey) || features.includes('all');

    if (!hasAccess) {
      return {
        allowed: false,
        reason: `Feature "${featureKey}" is not available in your current plan. Please upgrade to access this feature.`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Feature access check error:', error);
    return { allowed: false, reason: 'Failed to check feature access' };
  }
}

// Get tenant plan summary
export async function getTenantPlanSummary(tenantId: string) {
  try {
    const { data, error } = await supabase
      .from('platform_tenants')
      .select(`
        id,
        plan_id,
        platform_plans!inner (
          name,
          included_sms,
          feature_flags
        ),
        platform_usage (
          rooms_total,
          sms_sent
        )
      `)
      .eq('id', tenantId)
      .single();

    if (error) throw error;

    // Count current staff
    const { count: staffCount } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    const planData: any = data.platform_plans;
    const featureFlags: any = planData?.feature_flags || {};

    return {
      plan: planData,
      usage: {
        rooms: (data.platform_usage as any)?.rooms_total || 0,
        staff: staffCount || 0,
        sms: (data.platform_usage as any)?.sms_sent || 0,
      },
      limits: {
        rooms: featureFlags.max_rooms,
        staff: featureFlags.max_staff,
        sms: planData?.included_sms,
      },
    };
  } catch (error) {
    console.error('Get plan summary error:', error);
    return null;
  }
}
