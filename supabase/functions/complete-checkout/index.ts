import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Create admin client for role verification
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[complete-checkout] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user role and tenant
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole) {
      console.error('[complete-checkout] Role fetch failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'No role assigned to user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check role permissions - only frontdesk, managers, and owners can checkout
    const allowedRoles = ['owner', 'manager', 'frontdesk'];
    if (!allowedRoles.includes(userRole.role)) {
      console.error('[complete-checkout] Insufficient permissions:', userRole.role);
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient permissions to complete checkout',
          required_roles: allowedRoles,
          user_role: userRole.role
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[complete-checkout] User authorized:', user.id, 'Role:', userRole.role);

    // Create client with user's auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { bookingId, staffId, autoChargeToWallet = false } = await req.json();

    console.log('[complete-checkout] Starting checkout for booking:', bookingId);

    // 1. Get booking details with room and guest
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        room:rooms!bookings_room_id_fkey(*),
        guest:guests(*)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('[complete-checkout] Booking fetch error:', bookingError);
      throw bookingError;
    }
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    console.log('[complete-checkout] Booking status:', booking.status);

    // Check if already checked out (idempotency)
    if (booking.status === 'completed' || booking.status === 'checked_out') {
      console.log('[complete-checkout] Already checked out');
      return new Response(
        JSON.stringify({ 
          success: true, 
          note: 'already-checked-out', 
          booking 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Calculate outstanding balance
    const { data: payments } = await supabaseClient
      .from('payments')
      .select('amount, status, charged_to_organization')
      .eq('booking_id', bookingId);

    const successfulPayments = payments?.filter(p => p.status === 'completed' || p.status === 'success') || [];
    const totalPaid = successfulPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balanceDue = Number(booking.total_amount || 0) - totalPaid;
    const hasOrgPayment = successfulPayments.some(p => p.charged_to_organization);

    console.log('[complete-checkout] Balance calculation:', {
      total: booking.total_amount,
      paid: totalPaid,
      due: balanceDue,
      has_org_payment: hasOrgPayment,
      payments_count: successfulPayments.length
    });

    // 3. Get payment preferences
    const { data: preferences } = await supabaseClient
      .from('hotel_payment_preferences')
      .select('*')
      .eq('tenant_id', booking.tenant_id)
      .maybeSingle();

    const allowCheckoutWithDebt = preferences?.allow_checkout_with_debt ?? false;

    // 4. Handle outstanding balance
    // CRITICAL: Organization bookings with successful org payments should be allowed to checkout
    if (balanceDue > 0.01) { // Use 0.01 threshold for floating point precision
      if (hasOrgPayment && booking.organization_id) {
        // Organization booking with existing payment - allow checkout
        console.log('[complete-checkout] Organization booking with payment - proceeding with checkout');
      } else if (autoChargeToWallet && booking.organization_id) {
        // Auto-charge remaining balance to organization wallet
        console.log('[complete-checkout] Auto-charging balance to organization wallet');
        
        const { data: wallet } = await supabaseClient
          .from('wallets')
          .select('id')
          .eq('owner_id', booking.organization_id)
          .eq('wallet_type', 'organization')
          .single();
        
        if (!wallet) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'WALLET_NOT_FOUND', 
              balanceDue,
              message: 'Organization wallet not found'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
              status: 400 
            }
          );
        }
        
        // Create payment for remaining balance
        const { data: balancePayment, error: paymentError } = await supabaseClient
          .from('payments')
          .insert({
            tenant_id: booking.tenant_id,
            booking_id: bookingId,
            guest_id: booking.guest_id,
            organization_id: booking.organization_id,
            wallet_id: wallet.id,
            amount: balanceDue,
            expected_amount: balanceDue,
            payment_type: 'full',
            method: 'organization_wallet',
            status: 'completed',
            charged_to_organization: true,
            department: 'front_desk',
            transaction_ref: `CHK-${Date.now()}-${bookingId.substring(0, 8)}`,
            recorded_by: staffId,
            metadata: {
              booking_id: bookingId,
              auto_checkout_charge: true,
              created_at: new Date().toISOString()
            }
          })
          .select()
          .single();
        
        if (paymentError) {
          console.error('[complete-checkout] Failed to create balance payment:', paymentError);
          throw paymentError;
        }
        
        // Create wallet transaction
        const { error: txnError } = await supabaseClient
          .from('wallet_transactions')
          .insert({
            tenant_id: booking.tenant_id,
            wallet_id: wallet.id,
            type: 'debit',
            amount: balanceDue,
            payment_id: balancePayment.id,
            description: `Checkout balance charge - Booking ${bookingId.substring(0, 8)}`,
            created_by: staffId,
            department: 'front_desk',
            metadata: {
              booking_id: bookingId,
              auto_checkout_charge: true,
            }
          });
        
        if (txnError) {
          console.error('[complete-checkout] Failed to create wallet transaction:', txnError);
          throw txnError;
        }
        
        console.log('[complete-checkout] Balance charged to organization wallet');
      } else if (allowCheckoutWithDebt) {
        // Create receivable for outstanding balance
        console.log('[complete-checkout] Creating receivable for outstanding balance');
        
        const { error: receivableError } = await supabaseClient
          .from('receivables')
          .insert({
            tenant_id: booking.tenant_id,
            guest_id: booking.guest_id,
            organization_id: booking.organization_id,
            booking_id: bookingId,
            amount: balanceDue,
            status: 'open',
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            created_by: staffId,
            metadata: {
              booking_id: bookingId,
              checkout_balance: true,
              original_total: booking.total_amount,
              total_paid: totalPaid,
            }
          });
        
        if (receivableError) {
          console.error('[complete-checkout] Failed to create receivable:', receivableError);
          throw receivableError;
        }
        
        console.log('[complete-checkout] Receivable created, allowing checkout with debt');
      } else {
        // Regular guest booking with outstanding balance - block checkout
        console.log('[complete-checkout] Outstanding balance detected - blocking checkout');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'BALANCE_DUE', 
            balanceDue,
            message: 'Outstanding balance must be settled before checkout'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
          }
        );
      }
    }

    // 5. Update booking status to completed
    const { error: updateBookingError } = await supabaseClient
      .from('bookings')
      .update({
        status: 'completed',
        metadata: {
          ...(booking.metadata || {}),
          actual_checkout: new Date().toISOString(),
          checked_out_by: staffId,
        }
      })
      .eq('id', bookingId);

    if (updateBookingError) {
      console.error('[complete-checkout] Booking update error:', updateBookingError);
      throw updateBookingError;
    }

    console.log('[complete-checkout] Booking marked as completed');

    // 6. Update room - set to cleaning and clear guest references
    const { error: updateRoomError } = await supabaseClient
      .from('rooms')
      .update({
        status: 'cleaning',
        housekeeping_status: 'needs_cleaning',
        current_reservation_id: null,
        current_guest_id: null,
      })
      .eq('id', booking.room_id);

    if (updateRoomError) {
      console.error('[complete-checkout] Room update error:', updateRoomError);
      throw updateRoomError;
    }

    console.log('[complete-checkout] Room status updated to cleaning');

    // 7. Create audit log
    await supabaseClient.from('hotel_audit_logs').insert({
      tenant_id: booking.tenant_id,
      user_id: staffId,
      action: 'CHECKOUT_COMPLETED',
      table_name: 'bookings',
      record_id: bookingId,
      after_data: { 
        booking_id: bookingId, 
        room_id: booking.room_id, 
        status: 'completed',
        balance_due: balanceDue 
      }
    });

    console.log('[complete-checkout] Checkout completed successfully');

    // Declare guest and room variables for use across notification blocks
    let guest: any = null;
    let room: any = null;

    // PHASE 1: Send checkout SMS notification
    try {
      // Fetch SMS settings
      const { data: smsSettings } = await supabaseClient
        .from('tenant_sms_settings')
        .select('enabled, auto_send_checkout_confirmation')
        .eq('tenant_id', booking.tenant_id)
        .maybeSingle();

      console.log('[complete-checkout] SMS settings:', smsSettings);

      if (smsSettings?.enabled && smsSettings?.auto_send_checkout_confirmation) {
        // Fetch booking details with guest and room (using PostgREST hints)
        const { data: fullBooking } = await supabaseClient
          .from('bookings')
          .select(`
            id,
            guest:guests!guest_id(id, name, phone, email),
            room:rooms!room_id(number)
          `)
          .eq('id', bookingId)
          .eq('tenant_id', booking.tenant_id)
          .maybeSingle();

        console.log('[complete-checkout] Full booking for notifications:', fullBooking);

        guest = Array.isArray(fullBooking?.guest) ? fullBooking?.guest[0] : fullBooking?.guest;
        room = Array.isArray(fullBooking?.room) ? fullBooking?.room[0] : fullBooking?.room;
        
        const roomNumber = room?.number || 'N/A';

        if (guest?.phone) {
          // Fetch hotel name
          const { data: tenant } = await supabaseClient
            .from('tenants')
            .select('name')
            .eq('id', booking.tenant_id)
            .single();

          const hotelName = tenant?.name || 'Hotel';

          const message = `Thank you for staying at ${hotelName}! We hope you enjoyed your stay in Room ${roomNumber}. Safe travels!`;

          console.log('[complete-checkout] Sending checkout SMS:', message);

          // Invoke send-sms edge function
          const { data: smsResult, error: smsError } = await supabaseClient.functions.invoke('send-sms', {
            body: {
              tenant_id: booking.tenant_id,
              to: guest.phone,
              message,
              event_key: 'checkout_confirmation',
              booking_id: bookingId,
              guest_id: guest.id,
            },
          });

          if (smsError) {
            console.error('[complete-checkout] SMS send failed:', smsError);
          } else {
            console.log('[complete-checkout] SMS sent successfully:', smsResult);
          }
        } else {
          console.log('[complete-checkout] No guest phone number, skipping SMS');
        }

        // Send email notification (fire-and-forget)
        if (guest?.email) {
          console.log('[complete-checkout] Sending checkout email...');
          
          await supabaseClient.functions.invoke('send-email-notification', {
            body: {
              tenant_id: booking.tenant_id,
              to: guest.email,
              event_key: 'checkout_confirmation',
              variables: {
                guest_name: guest.name,
                room_number: roomNumber,
              },
              booking_id: bookingId,
              guest_id: guest.id,
            },
          }).catch((error) => {
            console.error('[complete-checkout] Email send exception:', error);
          });
        }
      } else {
        console.log('[complete-checkout] SMS notifications disabled or auto-send off');
      }
    } catch (notificationError) {
      // Don't block checkout if notifications fail
      console.error('[complete-checkout] Notification error (non-blocking):', notificationError);
    }

    // PHASE 5: Auto-generate folio PDF on checkout (non-blocking)
    try {
      console.log('[complete-checkout] Generating folio PDF...');
      
      // Get folio ID from booking metadata
      const folioId = booking.metadata?.folio_id;
      
      if (folioId) {
        const { data: pdfData, error: pdfError } = await supabaseAdmin.functions.invoke('generate-folio-pdf', {
          body: {
            folio_id: folioId,
            tenant_id: booking.tenant_id,
            format: 'A4',
            include_qr: true,
          },
        });

        if (pdfError) {
          console.error('[complete-checkout] PDF generation error:', pdfError);
        } else if (pdfData?.success) {
          console.log('[complete-checkout] Folio PDF generated:', pdfData.pdf_url);
          
          // Optionally auto-email PDF to guest
          if (guest?.email) {
            console.log('[complete-checkout] Emailing folio PDF to guest...');
            
            await supabaseAdmin.functions.invoke('send-email-notification', {
              body: {
                to: guest.email,
                subject: 'Your Stay Folio',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Thank You for Your Stay</h2>
                    <p>Dear ${guest.name},</p>
                    <p>Please find your stay folio attached below:</p>
                    <p style="margin: 2rem 0;">
                      <a href="${pdfData.pdf_url}" 
                         style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        View Folio
                      </a>
                    </p>
                    <p>We appreciate your patronage and look forward to serving you again.</p>
                    <p>Best regards,<br>Hotel Management</p>
                  </div>
                `,
                tenant_id: booking.tenant_id,
              },
            }).catch((emailError) => {
              console.error('[complete-checkout] Folio email error (non-blocking):', emailError);
            });
          }
        }
      } else {
        console.warn('[complete-checkout] No folio_id in booking metadata, skipping PDF generation');
      }
    } catch (pdfError) {
      // Don't block checkout if PDF generation fails
      console.error('[complete-checkout] PDF generation error (non-blocking):', pdfError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking,
        balanceDue,
        message: 'Checkout completed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[complete-checkout] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
