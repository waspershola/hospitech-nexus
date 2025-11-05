import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
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
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
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

    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate input
    const body = await req.json();
    const { tenant_id, to, message, event_key, booking_id, guest_id } = body;

    if (!tenant_id || !to || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields: tenant_id, to, message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`SMS send request for tenant ${tenant_id} to ${to}`);

    // Check quota
    const { data: quota, error: quotaError } = await supabase
      .from('tenant_sms_quota')
      .select('quota_total, quota_used')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (quotaError) {
      console.error('Quota check error:', quotaError);
      return new Response(JSON.stringify({ error: 'Failed to check quota' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!quota || quota.quota_used >= quota.quota_total) {
      console.log('SMS quota exceeded:', quota);
      return new Response(JSON.stringify({
        error: 'SMS quota exceeded',
        quota: quota || { quota_total: 0, quota_used: 0 },
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get SMS settings
    const { data: settings, error: settingsError } = await supabase
      .from('tenant_sms_settings')
      .select('provider, sender_id, api_key_encrypted, api_secret_encrypted, enabled')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (settingsError) {
      console.error('Settings fetch error:', settingsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch SMS settings' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!settings?.enabled) {
      return new Response(JSON.stringify({ error: 'SMS not enabled for tenant' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // TODO: Decrypt API keys from Supabase vault
    // For now, assuming plaintext storage (INSECURE - fix in production)
    const apiKey = settings.api_key_encrypted;
    const apiSecret = settings.api_secret_encrypted;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'SMS provider credentials not configured' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize provider and send SMS
    let result: SMSResult;
    
    if (settings.provider === 'twilio') {
      const provider = new TwilioProvider(apiKey, apiSecret);
      result = await provider.send(to, settings.sender_id, message);
    } else if (settings.provider === 'termii') {
      const provider = new TermiiProvider(apiKey);
      result = await provider.send(to, settings.sender_id, message);
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported SMS provider' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('SMS send result:', result);

    // Calculate segments for cost
    const segments = result.cost || Math.ceil(message.length / 160);

    // Log to analytics table
    await supabase.from('tenant_sms_usage_logs').insert({
      tenant_id,
      event_key: event_key || 'manual',
      recipient: to,
      message_preview: message.substring(0, 100),
      status: result.success ? 'sent' : 'failed',
      provider: settings.provider,
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
      },
    });

    // Legacy log for backwards compatibility
    supabase.from('sms_logs').insert({
      tenant_id,
      to_number: to,
      message_body: message,
      status: result.success ? 'sent' : 'failed',
      provider: settings.provider,
      provider_message_id: result.messageId,
      cost_credits: segments,
      event_key,
      booking_id,
      guest_id,
      sent_at: result.success ? new Date().toISOString() : null,
      error_message: result.error,
    }).then(() => {
      console.log('Legacy SMS log created');
    }, (err: any) => {
      console.error('Legacy log error (non-critical):', err);
    });

    // Deduct quota if successful
    if (result.success) {
      const newQuotaUsed = quota.quota_used + segments;
      await supabase
        .from('tenant_sms_quota')
        .update({ 
          quota_used: newQuotaUsed,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenant_id);

      console.log(`Quota updated: ${newQuotaUsed}/${quota.quota_total}`);
      
      // Check if quota is low and trigger alert check
      const remainingPercent = ((quota.quota_total - newQuotaUsed) / quota.quota_total) * 100;
      if (remainingPercent <= 25) {
        // Trigger quota alert check asynchronously (don't wait for it)
        supabase.functions.invoke('check-sms-quota-alerts', {
          body: { tenant_id }
        }).then(() => {
          console.log('Quota alert check triggered');
        }, (err: any) => {
          console.error('Quota alert check failed (non-critical):', err);
        });
      }
    }

    const creditsUsed = result.success ? segments : 0;
    
    return new Response(JSON.stringify({
      success: result.success,
      messageId: result.messageId,
      creditsUsed: creditsUsed,
      remainingQuota: quota.quota_total - quota.quota_used - creditsUsed,
      error: result.error,
    }), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('SMS send error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
