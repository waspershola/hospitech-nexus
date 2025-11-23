/**
 * QR Billing Tasks - Validation Utilities
 * Phase B: Billing Center Integration
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function validateBillingReference(
  supabaseClient: any,
  tenantId: string,
  billingReferenceCode: string
): Promise<{
  valid: boolean;
  error?: string;
  requestId?: string;
  status?: string;
  billingStatus?: string;
}> {
  const { data, error } = await supabaseClient
    .from('requests')
    .select('id, status, billing_status, billing_routed_to')
    .eq('tenant_id', tenantId)
    .eq('billing_reference_code', billingReferenceCode)
    .eq('billing_status', 'pending_frontdesk')
    .maybeSingle();

  if (error || !data) {
    return {
      valid: false,
      error: 'Invalid or already processed billing reference'
    };
  }

  return {
    valid: true,
    requestId: data.id,
    status: data.status,
    billingStatus: data.billing_status
  };
}
