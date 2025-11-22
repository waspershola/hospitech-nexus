import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

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

      // Phase 3: Folio Linkage - Find open folio for billing
      let attachedFolioId: string | null = null;
      let folioMatchMethod: string | null = null;

      // Try to find folio by room first
      if (resolvedRoomId) {
        const { data: roomFolio, error: roomFolioError } = await supabase
          .rpc('find_open_folio_by_room', {
            p_tenant_id: qr.tenant_id,
            p_room_id: resolvedRoomId
          });
        
        if (roomFolio && roomFolio.length > 0) {
          attachedFolioId = roomFolio[0].id;
          folioMatchMethod = 'room';
          console.log('[QR-FOLIO-FIX-V1] Matched to folio by room:', attachedFolioId);
        }
      }

      // If no room match and phone provided, try phone matching
      if (!attachedFolioId && requestData.guest_contact) {
        const { data: phoneFolio, error: phoneFolioError } = await supabase
          .rpc('find_open_folio_by_guest_phone', {
            p_tenant_id: qr.tenant_id,
            p_phone: requestData.guest_contact
          });
        
        if (phoneFolio && phoneFolio.length > 0) {
          attachedFolioId = phoneFolio[0].folio_id;
          folioMatchMethod = 'phone';
          console.log('[folio] Matched to folio by phone:', attachedFolioId);
        }
      }

      // Determine payment choice (default: bill_to_room if folio exists)
      const paymentChoice = requestData.payment_choice || (attachedFolioId ? 'bill_to_room' : 'pay_now');
      console.log('[folio] Payment choice:', paymentChoice, '| Folio:', attachedFolioId);

      // QR-FOLIO-AUDIT-V1: BLOCKING VALIDATION - Validate folio BEFORE request creation
      if (paymentChoice === 'bill_to_room') {
        console.log('[folio-validation] Validating folio for bill_to_room payment...');
        
        // Check 1: Folio must exist
        if (!attachedFolioId) {
          console.error('[folio-validation] BLOCKING: No active folio found - guest not checked in');
          
          // Log matching failure
          await supabase.from('qr_folio_matching_log').insert({
            tenant_id: qr.tenant_id,
            qr_token: requestData.qr_token,
            room_id: resolvedRoomId,
            guest_contact: requestData.guest_contact,
            matched_folio_id: null,
            match_method: 'none',
            match_success: false,
            failure_reason: 'No active folio found for room or phone - guest not checked in',
          });
          
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Guest not checked in. Cannot charge to room.',
              code: 'NO_ACTIVE_FOLIO',
              hint: 'Please select "Pay Now" option or check in the guest first.',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check 2: Folio must be open and accessible
        const { data: folioCheck, error: folioCheckError } = await supabase
          .from('stay_folios')
          .select('id, status, balance, booking_id')
          .eq('id', attachedFolioId)
          .eq('tenant_id', qr.tenant_id)
          .single();
        
        if (folioCheckError || !folioCheck) {
          console.error('[folio-validation] BLOCKING: Folio query failed:', folioCheckError);
          
          await supabase.from('qr_folio_matching_log').insert({
            tenant_id: qr.tenant_id,
            qr_token: requestData.qr_token,
            room_id: resolvedRoomId,
            matched_folio_id: attachedFolioId,
            match_method: folioMatchMethod,
            match_success: false,
            failure_reason: `Folio query failed: ${folioCheckError?.message || 'Unknown error'}`,
          });
          
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to access folio. Please try again.',
              code: 'FOLIO_QUERY_ERROR',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check 3: Folio must be open status
        if (folioCheck.status !== 'open') {
          console.error('[folio-validation] BLOCKING: Folio not open - status:', folioCheck.status);
          
          await supabase.from('qr_folio_matching_log').insert({
            tenant_id: qr.tenant_id,
            qr_token: requestData.qr_token,
            room_id: resolvedRoomId,
            matched_folio_id: attachedFolioId,
            match_method: folioMatchMethod,
            match_success: false,
            failure_reason: `Folio status is '${folioCheck.status}' - must be 'open' to accept charges`,
          });
          
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Folio is not available for billing. Guest may have checked out.',
              code: 'FOLIO_NOT_OPEN',
              details: `Folio status: ${folioCheck.status}`,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('[folio-validation] ✅ Folio validated:', {
          folio_id: folioCheck.id,
          status: folioCheck.status,
          balance: folioCheck.balance,
          booking_id: folioCheck.booking_id,
        });
      }

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
        location: PAYMENT_LOCATION_MAP[requestData.service_category.toLowerCase()] || 'Front Desk',
        status: 'pending',
        currency: 'NGN',
        billable: billableServices.includes(requestData.service_category.toLowerCase()),
        transaction_ref: requestTransactionRef, // Store for future payment collection
      };
      
      // Get subtotal from frontend payment_info
      if ((requestData as any).metadata?.payment_info?.subtotal) {
        paymentInfo.subtotal = (requestData as any).metadata.payment_info?.subtotal;
      }
      
      console.log('[qr-request] Using payment subtotal from frontend:', {
        service_category: requestData.service_category,
        subtotal: paymentInfo.subtotal,
        billable: paymentInfo.billable
      });

      // Phase 5: Log request payload before insert
      const requestPayload = {
        tenant_id: qr.tenant_id,
        room_id: resolvedRoomId,
        type: requestData.type || requestData.service_category,
        service_category: requestData.service_category,
        note: requestData.note || '',
        status: 'pending',
        priority: requestData.priority,
        qr_token: requestData.qr_token,
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
        service_category: requestPayload.service_category,
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

      // QR-FOLIO-AUDIT-V1: BLOCKING CHARGE POSTING - Post charge to folio if bill_to_room
      if (attachedFolioId && paymentChoice === 'bill_to_room' && paymentInfo.subtotal && paymentInfo.subtotal > 0) {
        console.log(`[folio-charge] BLOCKING: Posting charge of ${paymentInfo.subtotal} to folio ${attachedFolioId}`);
        
        try {
          // Get booking to check organization limits
          const { data: folioData } = await supabase
            .from('stay_folios')
            .select('booking_id, guest_id')
            .eq('id', attachedFolioId)
            .single();

          if (folioData) {
            const { data: bookingData } = await supabase
              .from('bookings')
              .select('organization_id')
              .eq('id', folioData.booking_id)
              .eq('tenant_id', qr.tenant_id)
              .single();

            // Validate organization limits if applicable
            if (bookingData?.organization_id) {
              console.log('[folio-charge] Validating org limits for:', bookingData.organization_id);
              
              const { data: validation, error: validationError } = await supabase.rpc(
                'validate_org_limits',
                {
                  _org_id: bookingData.organization_id,
                  _guest_id: folioData.guest_id,
                  _department: finalDepartment || 'general',
                  _amount: paymentInfo.subtotal,
                }
              );

              if (validationError) {
                console.error('[folio-charge] BLOCKING: Validation RPC error:', validationError);
                
                // Log failure
                await supabase.from('qr_folio_matching_log').insert({
                  tenant_id: qr.tenant_id,
                  request_id: newRequest.id,
                  matched_folio_id: attachedFolioId,
                  match_method: folioMatchMethod,
                  match_success: false,
                  failure_reason: `Org limit validation RPC failed: ${validationError.message}`,
                });
                
                // ROLLBACK: Delete the request
                await supabase.from('requests').delete().eq('id', newRequest.id);
                
                return new Response(
                  JSON.stringify({
                    success: false,
                    error: 'Failed to validate organization limits',
                    code: 'ORG_LIMIT_VALIDATION_ERROR',
                    details: validationError.message,
                  }),
                  { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              if (validation && !validation.allowed) {
                console.log('[folio-charge] BLOCKING: Organization limit exceeded:', validation.detail);
                
                // Log limit exceeded
                await supabase.from('qr_folio_matching_log').insert({
                  tenant_id: qr.tenant_id,
                  request_id: newRequest.id,
                  matched_folio_id: attachedFolioId,
                  match_method: folioMatchMethod,
                  match_success: false,
                  failure_reason: `Org limit exceeded: ${validation.detail}`,
                });
                
                // ROLLBACK: Delete the request
                await supabase.from('requests').delete().eq('id', newRequest.id);
                
                return new Response(
                  JSON.stringify({
                    success: false,
                    error: 'Organization credit limit exceeded',
                    code: validation.code,
                    detail: validation.detail,
                  }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                );
              }
            }
          }

          // Post charge to folio using RPC (BLOCKING - must succeed)
          const { data: chargeResult, error: chargeError } = await supabase.rpc('folio_post_charge', {
            p_folio_id: attachedFolioId,
            p_amount: paymentInfo.subtotal,
            p_description: `${requestData.service_category}: ${requestData.note || 'Service Request'}`,
            p_reference_type: 'request',
            p_reference_id: newRequest.id,
            p_department: finalDepartment
          });
          
          if (chargeError) {
            console.error('[folio-charge] BLOCKING ERROR: folio_post_charge RPC failed:', chargeError);
            
            // Log failure
            await supabase.from('qr_folio_matching_log').insert({
              tenant_id: qr.tenant_id,
              request_id: newRequest.id,
              matched_folio_id: attachedFolioId,
              match_method: folioMatchMethod,
              match_success: false,
              failure_reason: `folio_post_charge RPC failed: ${chargeError.message}`,
            });
            
            // ROLLBACK: Delete the request to prevent orphan
            console.log('[folio-charge] ROLLBACK: Deleting request', newRequest.id);
            await supabase.from('requests').delete().eq('id', newRequest.id);
            
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Failed to charge to room. Please try again or select "Pay Now".',
                code: 'FOLIO_CHARGE_FAILED',
                details: chargeError.message,
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          console.log('[folio-charge] ✅ Charge posted successfully:', chargeResult);
          
          // Log success
          await supabase.from('qr_folio_matching_log').insert({
            tenant_id: qr.tenant_id,
            request_id: newRequest.id,
            matched_folio_id: attachedFolioId,
            match_method: folioMatchMethod,
            match_success: true,
            failure_reason: null,
          });
          
          // Broadcast real-time update to folio subscribers
          await supabase
            .channel(`folio-${attachedFolioId}`)
            .send({
              type: 'broadcast',
              event: 'charge_posted',
              payload: {
                folio_id: attachedFolioId,
                request_id: newRequest.id,
                amount: paymentInfo.subtotal,
                description: `${requestData.service_category}: ${requestData.note || 'Service Request'}`
              }
            });
            
        } catch (chargeErr) {
          console.error('[folio-charge] BLOCKING: Unexpected error during charge posting:', chargeErr);
          
          // Log unexpected error
          await supabase.from('qr_folio_matching_log').insert({
            tenant_id: qr.tenant_id,
            request_id: newRequest.id,
            matched_folio_id: attachedFolioId,
            match_method: folioMatchMethod,
            match_success: false,
            failure_reason: `Unexpected error: ${chargeErr instanceof Error ? chargeErr.message : String(chargeErr)}`,
          });
          
          // ROLLBACK: Delete the request
          console.log('[folio-charge] ROLLBACK: Deleting request due to unexpected error');
          await supabase.from('requests').delete().eq('id', newRequest.id);
          
          return new Response(
            JSON.stringify({
              success: false,
              error: 'An unexpected error occurred while charging to room',
              code: 'UNEXPECTED_CHARGE_ERROR',
              details: chargeErr instanceof Error ? chargeErr.message : String(chargeErr),
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else if (attachedFolioId && paymentChoice === 'bill_to_room') {
        // Log successful folio match even when no charge (e.g., zero-cost services)
        await supabase.from('qr_folio_matching_log').insert({
          tenant_id: qr.tenant_id,
          request_id: newRequest.id,
          matched_folio_id: attachedFolioId,
          match_method: folioMatchMethod,
          match_success: true,
          failure_reason: null,
        });
      }

      // Calculate platform fee server-side (ensures consistency)
      // This happens AFTER request creation so we have the real request_id
      let calculatedTotalAmount = paymentInfo.subtotal || 0;
      
      if (paymentInfo.billable && paymentInfo.subtotal) {
        try {
          const feeResult = await calculateQRPlatformFee(
            supabase,
            qr.tenant_id,
            newRequest.id,
            requestData.service_category,
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
