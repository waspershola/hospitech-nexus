import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PHASE-5A-VALIDATION: Zod schemas for QR request actions
// GUEST-SESSION-SECURITY: Added guest_session_token for per-device isolation
const createRequestSchema = z.object({
  action: z.literal('create_request'),
  qr_token: z.string().min(10, 'QR token too short').max(500, 'QR token too long'),
  guest_session_token: z.string().min(1, 'Guest session token required'),
  type: z.string().min(1, 'Service type required').max(100),
  note: z.string().max(2000, 'Note too long (max 2000 characters)').optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  guest_name: z.string().max(200, 'Guest name too long').optional(),
  guest_contact: z.string().max(50, 'Contact too long').optional(),
  payment_choice: z.string().max(50).optional(),
  metadata: z.any().optional(),
});

const sendMessageSchema = z.object({
  action: z.literal('send_message'),
  request_id: z.string().uuid('Invalid request ID'),
  qr_token: z.string().min(10),
  message: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long (max 5000 characters)'),
  direction: z.enum(['inbound', 'outbound']),
  guest_name: z.string().max(200).optional(),
});

const getMessagesSchema = z.object({
  action: z.literal('get_messages'),
  request_id: z.string().uuid('Invalid request ID'),
  qr_token: z.string().min(10),
});

interface ServiceRequest {
  qr_token: string;
  guest_session_token: string;
  type: string;
  note?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  guest_name?: string;
  guest_contact?: string;
  payment_choice?: string;
  metadata?: any;
}

interface ChatMessage {
  request_id: string;
  qr_token: string;
  message: string;
  direction: 'inbound' | 'outbound';
  guest_name?: string;
}

/**
 * Server-Side Platform Fee Calculation for QR Payments
 * Calculates fees from subtotal to ensure 100% consistency
 */
async function calculateQRPlatformFee(
  supabase: any,
  tenant_id: string,
  request_id: string,
  service_category: string,
  subtotal: number | null
): Promise<{applied: boolean; fee_amount: number; base_amount: number; total_amount: number; payer?: any; fee_type?: any; qr_fee?: any}> {
  try {
    // Only apply fees to billable services with known amounts
    const billableServices = ['digital_menu', 'room_service', 'menu_order', 'laundry', 'spa'];
    if (!billableServices.includes(service_category.toLowerCase()) || !subtotal) {
      console.log('[platform-fee] Service not billable or no subtotal:', service_category);
      return { applied: false, fee_amount: 0, base_amount: subtotal || 0, total_amount: subtotal || 0 };
    }
    
    console.log('[platform-fee] Calculating QR fee for subtotal:', subtotal);
    
    // Get fee configuration
    const { data: feeConfig, error: configError } = await supabase
      .from('platform_fee_configurations')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('active', true)
      .single();
    
    if (configError || !feeConfig) {
      console.log('[platform-fee] No active QR fee config');
      return { applied: false, fee_amount: 0, base_amount: subtotal, total_amount: subtotal };
    }
    
    if (!feeConfig.applies_to.includes('qr_payments')) {
      console.log('[platform-fee] QR payments not in applies_to array');
      return { applied: false, fee_amount: 0, base_amount: subtotal, total_amount: subtotal };
    }
    
    // Check trial exemption
    if (feeConfig.trial_exemption_enabled) {
      const { data: tenant, error: tenantError } = await supabase
        .from('platform_tenants')
        .select('trial_end_date, created_at')
        .eq('id', tenant_id)
        .single();
      
      if (!tenantError && tenant) {
        const trialEndDate = tenant.trial_end_date 
          ? new Date(tenant.trial_end_date)
          : new Date(new Date(tenant.created_at).getTime() + feeConfig.trial_days * 86400000);
        
        if (trialEndDate > new Date()) {
          console.log('[platform-fee] Tenant in trial period, skipping QR fee');
          return { applied: false, fee_amount: 0, base_amount: subtotal, total_amount: subtotal };
        }
      }
    }
    
    // Calculate the fee from subtotal
    let feeAmount: number;
    
    if (feeConfig.fee_type === 'percentage') {
      feeAmount = subtotal * (feeConfig.qr_fee / 100);
    } else {
      // Flat fee
      feeAmount = feeConfig.qr_fee;
    }
    
    // Calculate total based on payer mode
    const totalAmount = feeConfig.payer === 'guest' ? subtotal + feeAmount : subtotal;
    
    console.log('[platform-fee] Fee calculated:', {
      subtotal,
      feeAmount,
      totalAmount,
      payer: feeConfig.payer,
      addedToGuest: feeConfig.payer === 'guest'
    });
    
    // Record in ledger with extracted amounts
    const ledgerStatus = feeConfig.billing_cycle === 'realtime' ? 'billed' : 'pending';
    
    const { error: ledgerError } = await supabase
      .from('platform_fee_ledger')
      .insert({
        tenant_id,
        reference_type: 'qr_payment',
        reference_id: request_id,
        base_amount: subtotal,
        fee_amount: feeAmount,
        rate: feeConfig.qr_fee,
        fee_type: feeConfig.fee_type,
        billing_cycle: feeConfig.billing_cycle,
        payer: feeConfig.payer,
        status: ledgerStatus,
        billed_at: feeConfig.billing_cycle === 'realtime' ? new Date().toISOString() : null,
        metadata: {
          service_category,
          subtotal: subtotal,
          total_amount: totalAmount,
          fee_amount: feeAmount,
          fee_config_id: feeConfig.id,
          mode: feeConfig.mode,
          payer: feeConfig.payer
        }
      });
    
    if (ledgerError) {
      console.error('[platform-fee] Error recording QR fee in ledger:', ledgerError);
      throw ledgerError;
    }
    
    console.log('[platform-fee] Recorded QR fee in ledger:', {
      tenant_id,
      request_id,
      service_category,
      subtotal: subtotal,
      fee_amount: feeAmount,
      total_amount: totalAmount,
      payer: feeConfig.payer,
      mode: feeConfig.mode,
      billing_cycle: feeConfig.billing_cycle
    });
    
  return { 
    applied: true, 
    fee_amount: feeAmount, 
    base_amount: subtotal,
    total_amount: totalAmount,
    payer: feeConfig.payer,
    fee_type: feeConfig.fee_type,
    qr_fee: feeConfig.qr_fee
  };
    
  } catch (error) {
    console.error('[platform-fee] Error extracting QR fee:', error);
  return { 
    applied: false, 
    fee_amount: 0, 
    base_amount: subtotal || 0,
    total_amount: subtotal || 0,
    payer: null,
    fee_type: null,
    qr_fee: 0
  };
  }
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

    // PHASE-5A-VALIDATION: Validate action type first
    if (!action || typeof action !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or missing action field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create_request') {
      // PHASE-5A-VALIDATION: Validate create_request payload
      const validationResult = createRequestSchema.safeParse(body);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error('[qr-request] Validation failed:', errors);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid request data',
            details: errors,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const requestData: ServiceRequest = validationResult.data;

      // Phase 1: Enhanced validation with detailed logging
      console.log('[qr-request] Received request data:', {
        has_qr_token: !!requestData.qr_token,
        type: requestData.type,
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
      if (allowedServices.length > 0 && !allowedServices.includes(requestData.type)) {
        console.error('[qr-request] Service not allowed:', requestData.type);
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

      const assignedDepartment = SERVICE_DEPARTMENT_MAP[requestData.type.toLowerCase()];
      
      // Phase 1: Validate type mapping
      if (!assignedDepartment) {
        console.warn('[qr-request] Unknown service type:', requestData.type, '- defaulting to front_office');
      }
      
      const finalDepartment = assignedDepartment || 'front_office';
      console.log(`[qr-request] Phase 4: Routing ${requestData.type} → ${finalDepartment}`);

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

      // PHASE-2-SIMPLIFICATION: No auto-folio detection for ANY QR type
      // Room-scoped and location-scoped QRs now behave identically
      // Staff will manually decide financial action: Add Charge | Collect Payment | Complimentary
      let attachedFolioId: string | null = null;
      let folioMatchMethod: string = 'staff_manual';
      const qrScope = qr.scope || 'room';
      
      console.log('[PHASE-2-SIMPLIFICATION] QR scope:', qrScope);
      console.log('[PHASE-2-SIMPLIFICATION] No auto-folio detection - staff decides financial action');

      // SESSION EXPIRY DETECTION: Check for closed folio (guest checked out)
      // If guest checked out (folio closed) but tries to bill-to-room, reject the request
      // This prevents charging closed folios and maintains data integrity
      if (resolvedRoomId && requestData.payment_choice === 'bill_to_room') {
        const { data: closedFolio } = await supabase
          .from('stay_folios')
          .select('status, updated_at')
          .eq('room_id', resolvedRoomId)
          .eq('tenant_id', qr.tenant_id)
          .eq('status', 'closed')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
        if (closedFolio) {
          console.log('[session-expiry] Guest checked out - rejecting bill-to-room');
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Your stay appears to have ended. Room charges are no longer available.',
              code: 'SESSION_EXPIRED',
              session_expired: true,
              hint: 'Please rescan the QR code or contact the front desk.',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // PAYMENT CHOICE STORAGE: Store guest preference in metadata only (not enforced)
      // 'bill_to_room' = guest wants charge added to room folio
      // 'pay_now' = guest wants to pay directly
      // Staff will manually process this preference in QRRequestActions drawer
      const paymentChoice = requestData.payment_choice || 'pay_now';
      console.log('[PHASE-2-SIMPLIFICATION] Payment choice (stored in metadata only):', paymentChoice);

      // Phase 4: Payment integration metadata
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
      
      // PHASE-4-IDEMPOTENCY-V1: Generate unique transaction_ref for this request
      // This ref is used for ALL payment attempts related to this request
      const requestTransactionRef = `QR-${requestData.qr_token.slice(0, 8)}-${Date.now()}`;
      console.log('[idempotency] Generated transaction_ref:', requestTransactionRef);
      
      let paymentInfo: any = {
        location: PAYMENT_LOCATION_MAP[requestData.type.toLowerCase()] || 'Front Desk',
        status: 'pending',
        currency: 'NGN',
        billable: billableServices.includes(requestData.type.toLowerCase()),
        transaction_ref: requestTransactionRef, // Store for future payment collection
      };
      
      // Get subtotal from frontend payment_info
      if ((requestData as any).metadata?.payment_info?.subtotal) {
        paymentInfo.subtotal = (requestData as any).metadata.payment_info?.subtotal;
      }
      
      console.log('[qr-request] Using payment subtotal from frontend:', {
        type: requestData.type,
        subtotal: paymentInfo.subtotal,
        billable: paymentInfo.billable
      });

      // Phase 5: Log request payload before insert
      // GUEST-SESSION-SECURITY: Include guest_session_token for per-device isolation
      const requestPayload = {
        tenant_id: qr.tenant_id,
        room_id: resolvedRoomId,
        type: requestData.type,
        note: requestData.note || '',
        status: 'pending',
        priority: requestData.priority,
        qr_token: requestData.qr_token,
        guest_session_token: requestData.guest_session_token, // 🔒 Per-device session isolation
        stay_folio_id: attachedFolioId, // 🔗 Link to folio
        assigned_department: finalDepartment,
        assigned_to: null, // NULL = pool assignment
        metadata: {
          // Preserve ALL frontend metadata first (service details, items, etc.)
          ...(requestData.metadata || {}),
          // Then override/add system fields
          guest_name: requestData.guest_name || 'Guest',
          guest_contact: requestData.guest_contact || '',
          qr_location: qr.assigned_to,
          qr_scope: qr.scope,
          folio_id: attachedFolioId, // Store folio_id for frontend to detect auto-attachment
          routed_department: finalDepartment,
          room_number: roomNumber || qr.assigned_to,
          room_name: roomName,
          payment_choice: paymentChoice, // 💳 Store payment choice
          folio_match_method: folioMatchMethod,
          payment_info: paymentInfo,
          // Normalize laundry fields for display components
          items: (requestData.metadata as any)?.laundry_items || (requestData.metadata as any)?.items,
          total: paymentInfo.subtotal,
          currency: paymentInfo.currency || 'NGN',
        },
      };
      
      console.log('[qr-request] Inserting request with payload:', {
        tenant_id: requestPayload.tenant_id,
        type: requestPayload.type,
        priority: requestPayload.priority,
        assigned_department: requestPayload.assigned_department,
        payment_amount: paymentInfo.amount,
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

      // PHASE-2A-COMPLETE: Broadcast new request to all connected staff
      console.log('[qr-request] PHASE-2A-COMPLETE: Broadcasting new request to staff');
      try {
        await supabase
          .channel(`qr-notifications-${qr.tenant_id}`)
          .send({
            type: 'broadcast',
            event: 'new_qr_request',
            payload: {
              type: 'new_request',
              tenant_id: qr.tenant_id,
              request_id: newRequest.id,
              timestamp: new Date().toISOString(),
            }
          });
        console.log('[qr-request] PHASE-2A-COMPLETE: Broadcast sent successfully');
      } catch (broadcastError) {
        console.error('[qr-request] PHASE-2A-COMPLETE: Broadcast failed (non-blocking):', broadcastError);
      }

      // PHASE-2-SIMPLIFICATION: No auto-charge posting
      // Guest payment preference stored in metadata only
      // Staff will manually decide: Add Charge | Collect Payment | Complimentary
      console.log('[PHASE-2-SIMPLIFICATION] Payment choice stored:', paymentChoice);
      console.log('[PHASE-2-SIMPLIFICATION] No auto-posting - staff decides financial action');

      // Calculate platform fee server-side (ensures consistency)
      // This happens AFTER request creation so we have the real request_id
      let calculatedTotalAmount = paymentInfo.subtotal || 0;
      
      if (paymentInfo.billable && paymentInfo.subtotal) {
        try {
          const feeResult = await calculateQRPlatformFee(
            supabase,
            qr.tenant_id,
            newRequest.id,
            requestData.type,
            paymentInfo.subtotal
          );
          console.log('[platform-fee] QR fee calculation result:', feeResult);
          
          // Store calculated total for guest_order creation
          calculatedTotalAmount = feeResult.total_amount || paymentInfo.subtotal;
          
          // Update request with calculated totals
    if (feeResult.applied) {
      await supabase
        .from('requests')
        .update({
          metadata: {
            ...requestPayload.metadata,
            payment_info: {
              ...paymentInfo,
              subtotal: feeResult.base_amount,
              amount: feeResult.total_amount,
              platform_fee: feeResult.fee_amount,
              platform_fee_applied: true,
              payer: feeResult.payer,
              fee_type: feeResult.fee_type,
              qr_fee: feeResult.qr_fee,
            },
          },
        })
        .eq('id', newRequest.id);
          }
        } catch (feeError) {
          console.error('[platform-fee] Error calculating QR fee (non-blocking):', feeError);
        }
      }

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

      // Create guest_order if items are provided
      let guestOrder = null;
      if ((requestData as any).metadata?.guest_order_items) {
        console.log('[qr-request] Creating guest_order with items');
        const items = (requestData as any).metadata.guest_order_items;
        const specialInstructions = (requestData as any).metadata.special_instructions || '';
        const subtotal = paymentInfo.subtotal || 0;
        
        const { data: order, error: orderError } = await supabase
          .from('guest_orders')
          .insert({
            tenant_id: qr.tenant_id,
            qr_token: requestData.qr_token,
            request_id: newRequest.id,
            guest_name: requestData.guest_name || 'Guest',
            items,
            special_instructions: specialInstructions,
            subtotal,
            total: calculatedTotalAmount,
            status: 'pending',
          })
          .select()
          .single();

        if (orderError) {
          console.error('[qr-request] Guest order creation error:', orderError);
        } else {
          guestOrder = order;
          console.log('[qr-request] Guest order created:', order.id);
        }
      }

      // LEDGER-PHASE-2B-V3: Post QR service charge to accounting ledger (if billable)
      if (paymentInfo.billable && paymentInfo.subtotal) {
        try {
          const { error: ledgerError } = await supabase.rpc('insert_ledger_entry', {
            p_tenant_id: qr.tenant_id,
            p_transaction_type: 'debit',
            p_amount: paymentInfo.subtotal,
            p_description: `QR service charge - ${requestData.type}`,
            p_reference_type: 'qr_request',
            p_reference_id: newRequest.id,
            p_category: 'qr_service_charge',
            p_payment_method: 'qr_service',
            p_department: finalDepartment,
            p_guest_id: null,
            p_room_id: resolvedRoomId || null,
            p_metadata: {
              request_id: newRequest.id,
              qr_token: requestData.qr_token,
              service_type: requestData.type,
              guest_name: requestData.guest_name || requestData.metadata?.guest_name || 'Guest',
              room_number: roomNumber || qr.assigned_to,
              payment_choice: paymentChoice,
              source: 'qr-request',
              version: 'LEDGER-PHASE-2B-V2'
            }
          });

          if (ledgerError) {
            console.error('[ledger-integration] LEDGER-PHASE-2B-V1: Failed to post QR charge to ledger (non-blocking):', ledgerError);
          } else {
            console.log('[ledger-integration] LEDGER-PHASE-2B-V1: QR charge posted to ledger successfully');
          }
        } catch (ledgerErr) {
          console.error('[ledger-integration] LEDGER-PHASE-2B-V1: Ledger posting exception (non-blocking):', ledgerErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          request: newRequest,
          order: guestOrder,
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
