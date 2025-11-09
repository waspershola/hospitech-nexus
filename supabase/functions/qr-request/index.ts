import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServiceRequest {
  qr_token: string;
  type: string;
  service_category: string;
  note?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  guest_name?: string;
  guest_contact?: string;
}

interface ChatMessage {
  request_id: string;
  qr_token: string;
  message: string;
  direction: 'inbound' | 'outbound';
  guest_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { action } = body;

    if (action === 'create_request') {
      const requestData: ServiceRequest = body;

      // Validate QR token
      if (!requestData.qr_token || typeof requestData.qr_token !== 'string') {
        console.error('[qr-request] Invalid QR token');
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid QR token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[qr-request] Creating request for token:', requestData.qr_token.substring(0, 8) + '...');

      // Validate token exists and get tenant context
      const { data: qrData, error: qrError } = await supabase.rpc('validate_qr_token', {
        _token: requestData.qr_token
      });

      if (qrError || !qrData || qrData.length === 0) {
        console.error('[qr-request] Invalid or expired QR token:', qrError);
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or expired QR code' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const qr = qrData[0];

      // Validate service is allowed for this QR code
      const allowedServices = qr.services || [];
      if (allowedServices.length > 0 && !allowedServices.includes(requestData.service_category)) {
        console.error('[qr-request] Service not allowed:', requestData.service_category);
        return new Response(
          JSON.stringify({ success: false, error: 'Service not available for this location' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create the request
      const { data: newRequest, error: insertError } = await supabase
        .from('requests')
        .insert({
          tenant_id: qr.tenant_id,
          room_id: qr.room_id,
          type: requestData.type || requestData.service_category,
          service_category: requestData.service_category,
          note: requestData.note || '',
          status: 'pending',
          priority: requestData.priority || 'normal',
          qr_token: requestData.qr_token,
          metadata: {
            guest_name: requestData.guest_name || 'Guest',
            guest_contact: requestData.guest_contact || '',
            qr_location: qr.assigned_to,
            qr_scope: qr.scope,
          },
        })
        .select()
        .single();

      if (insertError) {
        console.error('[qr-request] Insert error:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[qr-request] Request created successfully:', newRequest.id);

      // Create initial chat message if note exists
      if (requestData.note && requestData.note.trim() !== '') {
        await supabase
          .from('guest_communications')
          .insert({
            tenant_id: qr.tenant_id,
            guest_id: newRequest.guest_id || '00000000-0000-0000-0000-000000000000',
            type: 'note',
            direction: 'inbound',
            message: requestData.note,
            status: 'sent',
            metadata: {
              request_id: newRequest.id,
              qr_token: requestData.qr_token,
              guest_name: requestData.guest_name || 'Guest',
            },
          });
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: newRequest,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'send_message') {
      const messageData: ChatMessage = body;

      if (!messageData.request_id || !messageData.qr_token) {
        return new Response(
          JSON.stringify({ success: false, error: 'Request ID and QR token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[qr-request] Sending message for request:', messageData.request_id);

      // Verify request exists and token matches
      const { data: request, error: requestError } = await supabase
        .from('requests')
        .select('tenant_id, guest_id, qr_token')
        .eq('id', messageData.request_id)
        .single();

      if (requestError || !request || request.qr_token !== messageData.qr_token) {
        console.error('[qr-request] Invalid request or token mismatch');
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid request or QR token' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create message
      const { data: newMessage, error: messageError } = await supabase
        .from('guest_communications')
        .insert({
          tenant_id: request.tenant_id,
          guest_id: request.guest_id || '00000000-0000-0000-0000-000000000000',
          type: 'note',
          direction: messageData.direction,
          message: messageData.message,
          status: 'sent',
          metadata: {
            request_id: messageData.request_id,
            qr_token: messageData.qr_token,
            guest_name: messageData.guest_name || 'Guest',
          },
        })
        .select()
        .single();

      if (messageError) {
        console.error('[qr-request] Message insert error:', messageError);
        return new Response(
          JSON.stringify({ success: false, error: messageError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[qr-request] Message sent successfully');

      return new Response(
        JSON.stringify({
          success: true,
          data: newMessage,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'get_messages') {
      const { request_id, qr_token } = body;

      if (!request_id || !qr_token) {
        return new Response(
          JSON.stringify({ success: false, error: 'Request ID and QR token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[qr-request] Fetching messages for request:', request_id);

      // Use the database function to get messages
      const { data: messages, error: messagesError } = await supabase.rpc('get_request_messages', {
        _request_id: request_id,
        _qr_token: qr_token
      });

      if (messagesError) {
        console.error('[qr-request] Messages fetch error:', messagesError);
        return new Response(
          JSON.stringify({ success: false, error: messagesError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: messages || [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[qr-request] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
