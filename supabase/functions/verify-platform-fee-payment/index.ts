import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as crypto from 'https://deno.land/std@0.177.0/crypto/mod.ts';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Helper function to verify Paystack transaction via API
async function verifyPaystackTransaction(secretKey: string, reference: string) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: {
      'Authorization': `Bearer ${secretKey}`,
    },
  });
  
  const result = await response.json();
  
  if (!result.status) {
    throw new Error(result.message || 'Verification failed');
  }
  
  return {
    status: result.data.status, // 'success', 'failed', 'abandoned'
    amount: result.data.amount,
    reference: result.data.reference,
  };
}

// Helper function to send payment notifications
async function sendPaymentNotification({
  tenant_id,
  payment_reference,
  amount,
  status,
  receipt_url,
  provider,
  retry_available = false,
}: {
  tenant_id: string;
  payment_reference: string;
  amount: number;
  status: 'successful' | 'failed';
  receipt_url?: string;
  provider: string;
  retry_available?: boolean;
}) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Fetch tenant details
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('name, contact_email, contact_phone')
    .eq('id', tenant_id)
    .single();

  if (tenantError || !tenant) {
    console.error('Failed to fetch tenant details:', tenantError);
    return;
  }

  const formattedAmount = `₦${amount.toLocaleString()}`;
  
  // Send email notification
  if (tenant.contact_email) {
    try {
      const emailContent = status === 'successful'
        ? {
            subject: `✅ Platform Fee Payment Successful - ${payment_reference}`,
            html: `
              <h2>Payment Successful</h2>
              <p>Dear ${tenant.name},</p>
              <p>Your platform fee payment has been successfully processed.</p>
              <ul>
                <li><strong>Payment Reference:</strong> ${payment_reference}</li>
                <li><strong>Amount Paid:</strong> ${formattedAmount}</li>
                <li><strong>Payment Provider:</strong> ${provider}</li>
                <li><strong>Status:</strong> Settled</li>
              </ul>
              ${receipt_url ? `<p><a href="${receipt_url}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Receipt</a></p>` : ''}
              <p>Your fees have been settled and recorded in your Finance Center.</p>
              <p>Thank you for your payment!</p>
              <hr>
              <p style="color: #666; font-size: 12px;">This is an automated notification from your platform fee management system.</p>
            `,
          }
        : {
            subject: `❌ Platform Fee Payment Failed - ${payment_reference}`,
            html: `
              <h2>Payment Failed</h2>
              <p>Dear ${tenant.name},</p>
              <p>Unfortunately, your platform fee payment could not be completed.</p>
              <ul>
                <li><strong>Payment Reference:</strong> ${payment_reference}</li>
                <li><strong>Amount:</strong> ${formattedAmount}</li>
                <li><strong>Payment Provider:</strong> ${provider}</li>
                <li><strong>Status:</strong> Failed</li>
              </ul>
              ${retry_available ? `<p><strong>What to do next:</strong> Please visit your Finance Center to retry the payment with a different method or contact support if you need assistance.</p>` : ''}
              <p><a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '')}/dashboard/finance-center" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Finance Center</a></p>
              <hr>
              <p style="color: #666; font-size: 12px;">This is an automated notification from your platform fee management system.</p>
            `,
          };

      await resend.emails.send({
        from: 'Platform Fees <noreply@notifications.lovable.app>',
        to: [tenant.contact_email],
        ...emailContent,
      });

      console.log(`Email notification sent to ${tenant.contact_email}`);
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }
  }

  // Send SMS notification if phone number available
  if (tenant.contact_phone) {
    try {
      const smsMessage = status === 'successful'
        ? `Platform Fee Payment SUCCESS: ${formattedAmount} paid via ${provider}. Ref: ${payment_reference}. Receipt available in Finance Center.`
        : `Platform Fee Payment FAILED: ${formattedAmount} via ${provider}. Ref: ${payment_reference}. Please retry payment in Finance Center.`;

      // Use existing SMS infrastructure if available
      const { data: smsSettings } = await supabase
        .from('tenant_sms_settings')
        .select('*')
        .eq('tenant_id', tenant_id)
        .single();

      if (smsSettings?.enabled && smsSettings?.provider) {
        await supabase.functions.invoke('send-sms', {
          body: {
            tenant_id,
            to: tenant.contact_phone,
            message: smsMessage,
            metadata: {
              type: 'platform_fee_payment',
              payment_reference,
              status,
            },
          },
        });

        console.log(`SMS notification sent to ${tenant.contact_phone}`);
      }
    } catch (smsError) {
      console.error('Failed to send SMS notification:', smsError);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Determine provider from URL or webhook payload
    const url = new URL(req.url);
    const payloadText = await req.text();
    const payload = payloadText ? JSON.parse(payloadText) : {};

    console.log('[verify-platform-fee-payment] Webhook received:', { 
      method: req.method,
      url: url.toString(),
      hasPayload: !!payloadText 
    });

    let paymentReference: string | null = null;
    let paymentStatus: 'successful' | 'failed' = 'failed';
    let providerResponse: any = payload;
    let providerType: string = 'unknown';

    // Get webhook signature headers
    const flutterwaveSignature = req.headers.get('verif-hash');
    const paystackSignature = req.headers.get('x-paystack-signature');
    const stripeSignature = req.headers.get('stripe-signature');

    // Determine provider and extract payment details
    if (payload.event === 'charge.completed' || payload.status === 'successful') {
      // Flutterwave webhook
      providerType = 'flutterwave';
      paymentReference = payload.data?.tx_ref || payload.txRef;
      paymentStatus = payload.data?.status === 'successful' || payload.status === 'successful' 
        ? 'successful' 
        : 'failed';
      
      console.log('[verify-platform-fee-payment] Flutterwave webhook:', { 
        txRef: paymentReference, 
        status: paymentStatus,
        hasSignature: !!flutterwaveSignature
      });

    } else if (payload.event === 'charge.success' || payload.data?.status === 'success') {
      // Paystack webhook
      providerType = 'paystack';
      paymentReference = payload.data?.reference;
      paymentStatus = payload.data?.status === 'success' ? 'successful' : 'failed';
      
      console.log('[verify-platform-fee-payment] Paystack webhook:', { 
        reference: paymentReference, 
        status: paymentStatus,
        hasSignature: !!paystackSignature
      });

    } else if (payload.type?.startsWith('checkout.session')) {
      // Stripe webhook
      providerType = 'stripe';
      paymentReference = payload.data?.object?.client_reference_id || 
                        payload.data?.object?.metadata?.reference;
      paymentStatus = payload.data?.object?.payment_status === 'paid' ? 'successful' : 'failed';
      
      console.log('[verify-platform-fee-payment] Stripe webhook:', { 
        reference: paymentReference, 
        status: paymentStatus,
        hasSignature: !!stripeSignature
      });

    } else {
      // Fallback for manual verification or redirect callbacks
      paymentReference = url.searchParams.get('reference') || 
                        url.searchParams.get('trxref') ||
                        url.searchParams.get('tx_ref') ||
                        payload.payment_reference;
      
      if (!paymentReference) {
        console.error('[verify-platform-fee-payment] No payment reference in fallback');
        paymentStatus = 'failed';
      } else {
        // Fetch payment record to get provider details for verification
        const { data: paymentRecord } = await supabaseAdmin
          .from('platform_fee_payments')
          .select('payment_method_id, provider')
          .eq('payment_reference', paymentReference)
          .single();
          
        if (paymentRecord?.provider === 'paystack' && paymentRecord.payment_method_id) {
          // Get Paystack secret key
          const { data: provider } = await supabaseAdmin
            .from('platform_payment_providers')
            .select('api_secret_encrypted')
            .eq('id', paymentRecord.payment_method_id)
            .single();
            
          if (provider?.api_secret_encrypted) {
            try {
              // Verify with Paystack API
              const verification = await verifyPaystackTransaction(
                provider.api_secret_encrypted,
                paymentReference
              );
              
              paymentStatus = verification.status === 'success' ? 'successful' : 'failed';
              providerType = 'paystack';
              
              console.log('[verify-platform-fee-payment] Paystack API verification:', {
                reference: paymentReference,
                status: paymentStatus,
                apiResponse: verification.status,
              });
            } catch (verifyError) {
              console.error('[verify-platform-fee-payment] Paystack verification failed:', verifyError);
              paymentStatus = 'failed';
            }
          } else {
            console.error('[verify-platform-fee-payment] Missing Paystack secret key');
            paymentStatus = 'failed';
          }
        } else {
          // Fallback to URL parameter checking for other providers
          const statusParam = url.searchParams.get('status') || payload.status;
          paymentStatus = statusParam === 'successful' || 
                         statusParam === 'success' || 
                         statusParam === 'completed'
            ? 'successful' 
            : 'failed';
          
          console.log('[verify-platform-fee-payment] Manual verification:', { 
            reference: paymentReference, 
            status: paymentStatus,
            provider: paymentRecord?.provider || 'unknown'
          });
        }
      }
    }

    if (!paymentReference) {
      console.error('[verify-platform-fee-payment] No payment reference found in webhook');
      return new Response(
        JSON.stringify({ error: 'Payment reference not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch payment record to get provider details
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('platform_fee_payments')
      .select(`
        *,
        payment_method:platform_payment_providers!platform_fee_payments_payment_method_id_fkey(
          webhook_secret
        )
      `)
      .eq('payment_reference', paymentReference)
      .single();

    if (paymentError || !payment) {
      console.error('[verify-platform-fee-payment] Payment not found:', paymentReference);
      return new Response(
        JSON.stringify({ error: 'Payment record not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('[verify-platform-fee-payment] Processing payment:', payment.id);

    // Verify webhook signature if webhook secret is configured
    const webhookSecret = payment.payment_method?.webhook_secret;
    
    if (webhookSecret && (flutterwaveSignature || paystackSignature || stripeSignature)) {
      let isValid = false;

      try {
        if (providerType === 'flutterwave' && flutterwaveSignature) {
          // Verify Flutterwave signature
          const expectedHash = flutterwaveSignature;
          const actualHash = webhookSecret;
          isValid = expectedHash === actualHash;
          
          console.log('[verify-platform-fee-payment] Flutterwave signature verification:', isValid);
        } else if (providerType === 'paystack' && paystackSignature) {
          // Verify Paystack signature using HMAC
          const crypto = await import('https://deno.land/std@0.177.0/node/crypto.ts');
          const hash = crypto.createHmac('sha512', webhookSecret)
            .update(payloadText)
            .digest('hex');
          
          isValid = hash === paystackSignature;
          console.log('[verify-platform-fee-payment] Paystack signature verification:', isValid);
        } else if (providerType === 'stripe' && stripeSignature) {
          // Verify Stripe signature
          const crypto = await import('https://deno.land/std@0.177.0/node/crypto.ts');
          const elements = stripeSignature.split(',');
          const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1];
          const v1 = elements.find(e => e.startsWith('v1='))?.split('=')[1];

          if (timestamp && v1) {
            const signedPayload = `${timestamp}.${payloadText}`;
            const expectedSignature = crypto.createHmac('sha256', webhookSecret)
              .update(signedPayload)
              .digest('hex');
            
            isValid = expectedSignature === v1;
            console.log('[verify-platform-fee-payment] Stripe signature verification:', isValid);
          }
        }

        if (!isValid) {
          console.error('[verify-platform-fee-payment] Invalid webhook signature');
          return new Response(
            JSON.stringify({ error: 'Invalid webhook signature' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
          );
        }

        console.log('[verify-platform-fee-payment] Webhook signature verified successfully');
      } catch (error) {
        console.error('[verify-platform-fee-payment] Signature verification error:', error);
        // Continue processing but log the error
        console.warn('[verify-platform-fee-payment] Proceeding without signature verification due to error');
      }
    } else if (webhookSecret && !flutterwaveSignature && !paystackSignature && !stripeSignature) {
      console.warn('[verify-platform-fee-payment] Webhook secret configured but no signature provided');
    } else {
      console.warn('[verify-platform-fee-payment] No webhook secret configured, skipping signature verification');
    }

    // Update payment record
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('platform_fee_payments')
      .update({
        status: paymentStatus,
        provider_response: providerResponse,
        updated_at: now,
        ...(paymentStatus === 'successful' 
          ? { settled_at: now }
          : { failed_at: now }
        ),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('[verify-platform-fee-payment] Payment update error:', updateError);
      throw updateError;
    }

    console.log('[verify-platform-fee-payment] Payment updated:', payment.id);

    // Update ledger entries
    if (paymentStatus === 'successful') {
      const { error: ledgerError } = await supabaseAdmin
        .from('platform_fee_ledger')
        .update({
          status: 'settled',
          payment_id: payment.id,
          settled_at: now,
          updated_at: now,
        })
        .in('id', payment.ledger_ids);

      if (ledgerError) {
        console.error('[verify-platform-fee-payment] Ledger update error:', ledgerError);
        throw ledgerError;
      }

      console.log('[verify-platform-fee-payment] Updated', payment.ledger_ids.length, 'ledger entries to settled');

      // Create audit event
      await supabaseAdmin
        .from('finance_audit_events')
        .insert({
          tenant_id: payment.tenant_id,
          event_type: 'platform_fee_payment_successful',
          target_id: payment.id,
          payload: {
            payment_reference: paymentReference,
            total_amount: payment.total_amount,
            provider: payment.provider,
            ledger_count: payment.ledger_ids.length,
          },
        });

      // Generate payment receipt
      try {
        const { data: receiptData, error: receiptError } = await supabaseAdmin.functions.invoke('generate-payment-receipt', {
          body: { payment_id: payment.id },
        });
        
        if (receiptError) throw receiptError;
        
        console.log('[verify-platform-fee-payment] Receipt generated for payment:', payment.id);
        
        // Send success notification with receipt
        await sendPaymentNotification({
          tenant_id: payment.tenant_id,
          payment_reference: paymentReference,
          amount: payment.total_amount,
          status: 'successful',
          receipt_url: receiptData?.receipt_url,
          provider: payment.provider,
        });
        
      } catch (receiptError) {
        console.error('[verify-platform-fee-payment] Receipt error (non-critical):', receiptError);
      }
    } else {
      // Update failed ledger entries
      const { error: ledgerError } = await supabaseAdmin
        .from('platform_fee_ledger')
        .update({
          status: 'failed',
          payment_id: payment.id,
          failed_at: now,
          updated_at: now,
        })
        .in('id', payment.ledger_ids);

      if (ledgerError) {
        console.error('[verify-platform-fee-payment] Ledger update error:', ledgerError);
      }

      // Create audit event for failed payment
      await supabaseAdmin
        .from('finance_audit_events')
        .insert({
          tenant_id: payment.tenant_id,
          event_type: 'platform_fee_payment_failed',
          target_id: payment.id,
          payload: {
            payment_reference: paymentReference,
            total_amount: payment.total_amount,
            provider: payment.provider,
            ledger_count: payment.ledger_ids.length,
          },
        });
      
      // Send failure notification with retry instructions
      try {
        await sendPaymentNotification({
          tenant_id: payment.tenant_id,
          payment_reference: paymentReference,
          amount: payment.total_amount,
          status: 'failed',
          provider: payment.provider,
          retry_available: true,
        });
      } catch (notificationError) {
        console.error('[verify-platform-fee-payment] Failed to send failure notification:', notificationError);
      }
    }

    // For webhook responses, return 200 OK
    // For redirect URLs, redirect to success/failure page
    if (req.headers.get('content-type')?.includes('application/json') || 
        req.headers.get('x-paystack-signature') ||
        req.headers.get('verif-hash') ||
        req.headers.get('stripe-signature')) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          payment_id: payment.id, 
          status: paymentStatus 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Redirect to tenant dashboard with status
      const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://app.') || '';
      const redirectUrl = `${baseUrl}/dashboard/finance-center?payment=${paymentStatus}&ref=${paymentReference}`;
      
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl },
      });
    }
  } catch (error) {
    console.error('[verify-platform-fee-payment] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
