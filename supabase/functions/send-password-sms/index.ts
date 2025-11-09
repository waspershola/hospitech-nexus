import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

interface SendPasswordSMSRequest {
  phone: string;
  password: string;
  user_name: string;
  user_type?: 'platform_user' | 'tenant_user';
  user_id?: string;
  delivered_by?: string;
  tenant_id?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Format phone number to international format
function formatPhoneNumber(phoneNumber: string): string {
  let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '+234' + cleaned.substring(1);
  } else if (cleaned.startsWith('234') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+234' + cleaned;
  }
  
  return cleaned;
}

// SMS Provider classes
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
        return { success: false, error: data.message || 'Twilio API error' };
      }

      return {
        success: true,
        messageId: data.sid,
        cost: data.num_segments || 1,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
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

      return { success: false, error: data.message || 'Termii API error' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { phone, password, user_name, user_type = 'tenant_user', user_id, delivered_by, tenant_id }: SendPasswordSMSRequest = await req.json();

    if (!phone || !password || !user_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: phone, password, user_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📱 Sending password SMS:', { phone, user_name, user_type, tenant_id });

    const formattedPhone = formatPhoneNumber(phone);
    const message = `Hi ${user_name}, your temporary password is: ${password}. Please log in and change it immediately. - Hotel Management System`;

    // PHASE 1: Load provider from database (dynamically)
    let providerConfig: any = null;
    let senderId = 'HotelMgmt';

    // Try tenant-specific provider assignment first
    if (tenant_id) {
      const { data: assignment } = await supabase
        .from('tenant_provider_assignments')
        .select(`
          sender_id,
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

      if (assignment?.provider) {
        providerConfig = assignment.provider;
        senderId = assignment.sender_id || 'HotelMgmt';
        console.log('Using tenant-specific SMS provider:', providerConfig.provider_type);
      }
    }

    // Fallback to default platform provider
    if (!providerConfig) {
      const { data: defaultProvider } = await supabase
        .from('platform_sms_providers')
        .select('id, provider_type, api_key_encrypted, api_secret_encrypted, default_sender_id, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (defaultProvider) {
        providerConfig = defaultProvider;
        senderId = defaultProvider.default_sender_id || 'HotelMgmt';
        console.log('Using default platform SMS provider:', providerConfig.provider_type, 'Sender ID:', senderId);
      }
    }

    // Check if provider is configured
    if (!providerConfig) {
      console.error('❌ No SMS provider configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SMS provider not configured. Please contact platform administrator.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!providerConfig.is_active) {
      console.error('❌ SMS provider is inactive');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SMS provider is currently inactive. Please contact platform administrator.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PHASE 2: Send SMS using database-driven provider
    let result: SMSResult;
    
    if (providerConfig.provider_type === 'twilio') {
      const provider = new TwilioProvider(
        providerConfig.api_key_encrypted,
        providerConfig.api_secret_encrypted
      );
      result = await provider.send(formattedPhone, senderId, message);
    } else if (providerConfig.provider_type === 'termii') {
      const provider = new TermiiProvider(providerConfig.api_key_encrypted);
      result = await provider.send(formattedPhone, senderId, message);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Unsupported SMS provider type' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📤 SMS send result:', { 
      success: result.success, 
      messageId: result.messageId,
      provider: providerConfig.provider_type,
      error: result.error 
    });

    // Log delivery attempt to password_delivery_log (ALWAYS LOG)
    if (user_id) {
      try {
        const { error: logError } = await supabase.from('password_delivery_log').insert({
          user_id,
          delivery_method: 'sms',
          delivered_by: delivered_by || null,
          delivery_status: result.success ? 'sent' : 'failed',
          error_message: result.success ? null : result.error,
          metadata: {
            phone: formattedPhone,
            user_type,
            provider: providerConfig.provider_type,
            message_id: result.messageId || null,
            platform_provider_id: providerConfig.id,
            sender_id: senderId,
          },
        });

        if (logError) {
          console.error('❌ Failed to log password delivery:', logError);
        } else {
          console.log('✅ Password delivery logged successfully');
        }
      } catch (logErr) {
        console.error('❌ Exception while logging password delivery:', logErr);
      }
    }

    // Log to platform audit stream
    if (tenant_id) {
      try {
        await supabase.from('platform_audit_stream').insert({
          actor_id: '00000000-0000-0000-0000-000000000000',
          action: 'password_sms_sent',
          resource_type: 'sms',
          resource_id: user_id || null,
          payload: {
            tenant_id,
            recipient: formattedPhone,
            user_type,
            status: result.success ? 'sent' : 'failed',
            provider: providerConfig.provider_type,
            source: 'password_reset',
            sender_id: senderId,
            error: result.error,
          },
        });
      } catch (auditErr) {
        console.error('❌ Failed to log to audit stream:', auditErr);
      }
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error || 'SMS delivery failed' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: result.messageId,
        provider: providerConfig.provider_type
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Password SMS error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
