import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Format phone number to international format (specifically for Nigeria)
function formatPhoneNumber(phoneNumber: string): string {
  // Remove all spaces and special characters except +
  let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // If starts with 0 (Nigerian local format), replace with +234
  if (cleaned.startsWith('0')) {
    cleaned = '+234' + cleaned.substring(1);
  }
  // If starts with 234 but no +, add the +
  else if (cleaned.startsWith('234') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  // If doesn't start with +, assume it needs +234 prefix
  else if (!cleaned.startsWith('+')) {
    cleaned = '+234' + cleaned;
  }
  
  return cleaned;
}

// SMS Provider interfaces
interface SMSResult {
  success: boolean;
  messageId?: string;
  cost?: number;
  error?: string;
}

class TwilioProvider {
  constructor(private accountSid: string, private authToken: string) {}
  
  async send(to: string, from: string, message: string): Promise<SMSResult> {
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ From: from, To: to, Body: message }),
        }
      );
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Twilio API error',
        };
      }

      return {
        success: true,
        messageId: data.sid,
        cost: data.num_segments || 1,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

class TermiiProvider {
  constructor(private apiKey: string) {}
  
  async send(to: string, from: string, message: string): Promise<SMSResult> {
    try {
      const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          to,
          from,
          sms: message,
          type: 'plain',
          channel: 'generic',
        }),
      });
      const data = await response.json();
      
      if (data.message_id) {
        const segmentCount = Math.ceil(message.length / 160);
        return {
          success: true,
          messageId: data.message_id,
          cost: segmentCount,
        };
      }

      return {
        success: false,
        error: data.message || 'Termii API error',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Validate JWT or SERVICE_ROLE_KEY
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Check if it's a service role call (from another edge function)
    const isServiceRole = token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    let user = null;
    if (!isServiceRole) {
      // User JWT authentication (frontend calls)
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authUser) {
        console.log('Auth error:', authError);
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      user = authUser;
    }
    
    console.log(`SMS request authenticated: ${isServiceRole ? 'service-role' : 'user: ' + user?.id}`)

    // Parse and validate input
    const body = await req.json();
    const { tenant_id, to, message, event_key, booking_id, guest_id } = body;

    if (!tenant_id || !to || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields: tenant_id, to, message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format phone number to international format
    const formattedPhone = formatPhoneNumber(to);
    console.log(`SMS send request for tenant ${tenant_id} to ${to} (formatted: ${formattedPhone})`);

    // PHASE 2: Fetch platform provider via tenant assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('tenant_provider_assignments')
      .select(`
        id,
        sender_id,
        is_default,
        provider:platform_sms_providers(
          id,
          provider_type,
          api_key_encrypted,
          api_secret_encrypted,
          is_active
        )
      `)
      .eq('tenant_id', tenant_id)
      .eq('is_default', true)
      .single();

    if (assignmentError || !assignment) {
      console.error('Provider assignment error:', assignmentError);
      
      // Fallback to legacy tenant_sms_settings for backwards compatibility
      const { data: legacySettings } = await supabase
        .from('tenant_sms_settings')
        .select('provider, sender_id, api_key_encrypted, api_secret_encrypted, enabled')
        .eq('tenant_id', tenant_id)
        .maybeSingle();

      if (legacySettings?.enabled) {
        console.log('Using legacy SMS settings (not yet migrated)');
        // Use legacy flow (original code path)
        const apiKey = legacySettings.api_key_encrypted;
        const apiSecret = legacySettings.api_secret_encrypted;

        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'SMS provider credentials not configured' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Legacy quota check
        const { data: quota } = await supabase
          .from('tenant_sms_quota')
          .select('quota_total, quota_used')
          .eq('tenant_id', tenant_id)
          .maybeSingle();

        if (!quota || quota.quota_used >= quota.quota_total) {
          return new Response(JSON.stringify({
            error: 'SMS quota exceeded',
            quota: quota || { quota_total: 0, quota_used: 0 },
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Send via legacy provider
        let result: SMSResult;
        if (legacySettings.provider === 'twilio') {
          const provider = new TwilioProvider(apiKey, apiSecret);
          result = await provider.send(formattedPhone, legacySettings.sender_id, message);
        } else if (legacySettings.provider === 'termii') {
          const provider = new TermiiProvider(apiKey);
          result = await provider.send(formattedPhone, legacySettings.sender_id, message);
        } else {
          return new Response(JSON.stringify({ error: 'Unsupported SMS provider' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const segments = result.cost || Math.ceil(message.length / 160);

        // Deduct legacy quota if successful
        if (result.success) {
          await supabase
            .from('tenant_sms_quota')
            .update({ 
              quota_used: quota.quota_used + segments,
              updated_at: new Date().toISOString()
            })
            .eq('tenant_id', tenant_id);
        }

        return new Response(JSON.stringify({
          success: result.success,
          messageId: result.messageId,
          creditsUsed: result.success ? segments : 0,
          remainingQuota: quota.quota_total - quota.quota_used - segments,
          error: result.error,
          legacy: true,
        }), {
          status: result.success ? 200 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'No SMS provider configured for tenant' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const provider = assignment.provider as any;

    if (!provider?.is_active) {
      return new Response(JSON.stringify({ error: 'SMS provider is inactive' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PHASE 2: Check platform credit pool
    const { data: creditPool, error: poolError } = await supabase
      .from('platform_sms_credit_pool')
      .select('id, total_credits, consumed_credits')
      .eq('tenant_id', tenant_id)
      .single();

    if (poolError || !creditPool) {
      console.error('Credit pool error:', poolError);
      return new Response(JSON.stringify({ error: 'SMS credit pool not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const availableCredits = creditPool.total_credits - creditPool.consumed_credits;
    const estimatedCost = Math.ceil(message.length / 160);

    if (availableCredits < estimatedCost) {
      console.log(`Insufficient credits: ${availableCredits} available, ${estimatedCost} required`);
      return new Response(JSON.stringify({
        error: 'INSUFFICIENT_SMS_CREDITS',
        available: availableCredits,
        required: estimatedCost,
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // TODO: Decrypt API keys from Supabase vault in production
    const apiKey = provider.api_key_encrypted;
    const apiSecret = provider.api_secret_encrypted;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'SMS provider credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize provider and send SMS
    let result: SMSResult;
    const senderId = assignment.sender_id || provider.default_sender_id || 'SMS';
    
    if (provider.provider_type === 'twilio') {
      const twilioProvider = new TwilioProvider(apiKey, apiSecret);
      result = await twilioProvider.send(formattedPhone, senderId, message);
    } else if (provider.provider_type === 'termii') {
      const termiiProvider = new TermiiProvider(apiKey);
      result = await termiiProvider.send(formattedPhone, senderId, message);
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported SMS provider' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('SMS send result:', result);

    const segments = result.cost || estimatedCost;

    // PHASE 2: Deduct from platform credit pool if successful
    if (result.success) {
      const { error: deductError } = await supabase
        .from('platform_sms_credit_pool')
        .update({ 
          consumed_credits: creditPool.consumed_credits + segments,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenant_id);

      if (deductError) {
        console.error('Credit deduction error:', deductError);
      } else {
        console.log(`Credits deducted: ${segments}, remaining: ${availableCredits - segments}`);
      }

      // Update platform usage tracking
      await supabase
        .from('platform_usage')
        .upsert({
          tenant_id,
          sms_sent: segments,
          last_sync: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id',
          ignoreDuplicates: false,
        });
    }

    // Log to platform audit stream
    await supabase.from('platform_audit_stream').insert({
      actor_id: user?.id || '00000000-0000-0000-0000-000000000000', // Use null UUID for service calls
      action: 'sms_sent',
      resource_type: 'sms',
      resource_id: creditPool.id,
      payload: {
        tenant_id,
        recipient: to,
        status: result.success ? 'sent' : 'failed',
        provider: provider.provider_type,
        credits_used: result.success ? segments : 0,
        event_key,
        booking_id,
        guest_id,
        source: user ? 'user' : 'system',
      },
    });

    // Log to analytics table
    await supabase.from('tenant_sms_usage_logs').insert({
      tenant_id,
      event_key: event_key || 'manual',
      recipient: formattedPhone,
      message_preview: message.substring(0, 100),
      status: result.success ? 'sent' : 'failed',
      provider: provider.provider_type,
      cost: segments,
      segments: segments,
      sent_at: new Date().toISOString(),
      failed_at: result.success ? null : new Date().toISOString(),
      error_message: result.error,
      booking_id,
      guest_id,
      metadata: {
        provider_message_id: result.messageId,
        message_length: message.length,
        platform_provider_id: provider.id,
      },
    });

    const creditsUsed = result.success ? segments : 0;
    const remainingCredits = availableCredits - creditsUsed;
    
    return new Response(JSON.stringify({
      success: result.success,
      messageId: result.messageId,
      creditsUsed: creditsUsed,
      remainingCredits: remainingCredits,
      error: result.error,
      platform: true, // Indicates using platform providers
    }), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('SMS send error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
