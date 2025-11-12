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

      // Phase 1: Enhanced validation with detailed logging
      console.log('[qr-request] Received request data:', {
        has_qr_token: !!requestData.qr_token,
        service_category: requestData.service_category,
        priority: requestData.priority,
        has_note: !!requestData.note,
      });

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
      
      // Phase 1: Log tenant_id for debugging
      console.log('[qr-request] Validated QR token - tenant_id:', qr.tenant_id, 'room_id:', qr.room_id);

      // Validate service is allowed for this QR code
      const allowedServices = qr.services || [];
      if (allowedServices.length > 0 && !allowedServices.includes(requestData.service_category)) {
        console.error('[qr-request] Service not allowed:', requestData.service_category);
        return new Response(
          JSON.stringify({ success: false, error: 'Service not available for this location' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Phase 1: Validate and normalize priority enum
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      if (!requestData.priority || !validPriorities.includes(requestData.priority)) {
        console.warn('[qr-request] Invalid priority value:', requestData.priority, '- defaulting to "normal"');
        requestData.priority = 'normal';
      }

      // Phase 2 & 4: Complete service to department routing
      const SERVICE_DEPARTMENT_MAP: Record<string, string> = {
        'digital_menu': 'restaurant',
        'room_service': 'restaurant',
        'menu_order': 'restaurant',
        'dining': 'restaurant',
        'housekeeping': 'housekeeping',
        'maintenance': 'maintenance',
        'wifi': 'front_office',
        'concierge': 'concierge',
        'feedback': 'front_office',
        'front_desk': 'front_office',
        'spa': 'spa',
        'laundry': 'laundry',
      };

      const assignedDepartment = SERVICE_DEPARTMENT_MAP[requestData.service_category.toLowerCase()];
      
      // Phase 1: Validate service_category mapping
      if (!assignedDepartment) {
        console.warn('[qr-request] Unknown service category:', requestData.service_category, '- defaulting to front_office');
      }
      
      const finalDepartment = assignedDepartment || 'front_office';
      console.log(`[qr-request] Phase 4: Routing ${requestData.service_category} → ${finalDepartment}`);

      // Phase 2: Resolve room_id from QR code assignment
      let resolvedRoomId = qr.room_id;
      let roomNumber = null;
      let roomName = null;
      
      if (!resolvedRoomId && qr.assigned_to) {
        console.log('[qr-request] Looking up room from QR assigned_to:', qr.assigned_to);
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('id, number, name')
          .eq('id', qr.assigned_to)
          .single();
        
        if (room && !roomError) {
          resolvedRoomId = room.id;
          roomNumber = room.number;
          roomName = room.name;
          console.log('[qr-request] Resolved room:', { id: room.id, number: room.number, name: room.name });
        }
      }

      // Phase 3: Payment integration metadata
      const PAYMENT_LOCATION_MAP: Record<string, string> = {
        'restaurant': 'Restaurant POS',
        'room_service': 'Restaurant POS',
        'digital_menu': 'Restaurant POS',
        'menu_order': 'Restaurant POS',
        'laundry': 'Laundry Service',
        'spa': 'Spa Center',
        'housekeeping': 'Housekeeping',
        'maintenance': 'Maintenance',
      };

      const billableServices = ['restaurant', 'room_service', 'digital_menu', 'menu_order', 'laundry', 'spa'];
      const paymentInfo = {
        location: PAYMENT_LOCATION_MAP[requestData.service_category.toLowerCase()] || 'Front Desk',
        status: 'pending',
        currency: 'NGN',
        billable: billableServices.includes(requestData.service_category.toLowerCase()),
      };

      // Phase 1: Log request payload before insert
      const requestPayload = {
        tenant_id: qr.tenant_id,
        room_id: resolvedRoomId,
        type: requestData.type || requestData.service_category,
        service_category: requestData.service_category,
        note: requestData.note || '',
        status: 'pending',
        priority: requestData.priority,
        qr_token: requestData.qr_token,
        assigned_department: finalDepartment,
        assigned_to: null, // NULL = pool assignment
        metadata: {
          guest_name: requestData.guest_name || 'Guest',
          guest_contact: requestData.guest_contact || '',
          qr_location: qr.assigned_to,
          qr_scope: qr.scope,
          routed_department: finalDepartment,
          room_number: roomNumber || qr.assigned_to,
          room_name: roomName,
          payment_info: paymentInfo,
        },
      };
      
      console.log('[qr-request] Inserting request with payload:', {
        tenant_id: requestPayload.tenant_id,
        service_category: requestPayload.service_category,
        priority: requestPayload.priority,
        assigned_department: requestPayload.assigned_department,
      });

      // Create the request
      const { data: newRequest, error: insertError } = await supabase
        .from('requests')
        .insert(requestPayload)
        .select()
        .single();

      if (insertError) {
        console.error('[qr-request] Insert error:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        });
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: insertError.message,
            details: insertError.details || 'Check edge function logs for details',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[qr-request] Request created successfully:', newRequest.id);

      // Phase 6: Send Supabase Realtime broadcast notification
      try {
        const notificationChannel = supabase.channel(`qr-notifications-${qr.tenant_id}`);
        await notificationChannel.send({
          type: 'broadcast',
          event: 'new_qr_request',
          payload: {
            type: 'new_qr_request',
            request: newRequest,
            tenant_id: qr.tenant_id,
            departments: ['front_office', finalDepartment],
          }
        });
        console.log(`[qr-request] Phase 6: Realtime broadcast sent to tenant ${qr.tenant_id}`);
      } catch (broadcastError) {
        console.error('[qr-request] Broadcast notification error:', broadcastError);
      }

      // Phase 1: Create initial chat message if note exists (with null guest_id for anonymous)
      if (requestData.note && requestData.note.trim() !== '') {
        console.log('[qr-request] Creating initial message with null guest_id for anonymous guest');
        await supabase
          .from('guest_communications')
          .insert({
            tenant_id: qr.tenant_id,
            guest_id: null, // Phase 1: Allow null for anonymous QR guests
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

      // Phase 1: Create message with null guest_id for anonymous guests
      console.log('[qr-request] Creating message with null guest_id for anonymous guest');
      const { data: newMessage, error: messageError } = await supabase
        .from('guest_communications')
        .insert({
          tenant_id: request.tenant_id,
          guest_id: null, // Phase 1: Allow null for anonymous QR guests
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
