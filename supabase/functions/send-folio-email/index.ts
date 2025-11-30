import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendFolioEmailRequest {
  tenant_id: string;
  folio_id: string;
  guest_email: string;
  guest_name: string;
  pdf_url: string;
}

/**
 * PDF-V2.1: Send folio email directly using Resend
 * Bypasses template system for custom folio HTML
 */
Deno.serve(async (req) => {
  // PDF-V2.1-EMAIL: Email workflow handler
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('PDF-V2.1-EMAIL: Email request received');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    
    if (!resendApiKey) {
      console.error('PDF-V2.1-EMAIL: Missing RESEND_API_KEY');
      throw new Error('Email service not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { tenant_id, folio_id, guest_email, guest_name, pdf_url } = await req.json() as SendFolioEmailRequest;

    console.log('PDF-V2.1-EMAIL: Sending folio email', {
      tenant_id,
      folio_id,
      guest_email,
      pdf_url_exists: !!pdf_url
    });

    // Validate parameters
    if (!guest_email || !guest_email.includes('@')) {
      console.error('PDF-V2.1-EMAIL: Invalid email', { guest_email });
      throw new Error('Invalid email address');
    }

    // Fetch hotel details for branding
    console.log('PDF-V2.1-EMAIL: Fetching hotel details...');
    const { data: hotelMeta } = await supabase
      .from('hotel_meta')
      .select('hotel_name, contact_phone, contact_email')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    const { data: branding } = await supabase
      .from('hotel_branding')
      .select('primary_color, logo_url')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    const hotelName = hotelMeta?.hotel_name || 'Hotel';
    const primaryColor = branding?.primary_color || '#dc2626';
    const logoUrl = branding?.logo_url || '';
    
    console.log('PDF-V2.1-EMAIL: Hotel branding loaded', { hotelName });

    // Compose folio email using the SAME luxury HTML template as print/download
    if (!pdf_url) {
      throw new Error('No folio URL provided for email');
    }

    console.log('PDF-V2.2-EMAIL: Fetching folio HTML from URL for email body...', { pdf_url });

    let folioHtml: string | null = null;
    try {
      const folioResponse = await fetch(pdf_url);
      if (!folioResponse.ok) {
        throw new Error(`Failed to fetch folio HTML: ${folioResponse.status} ${folioResponse.statusText}`);
      }
      folioHtml = await folioResponse.text();
    } catch (fetchError) {
      console.error('PDF-V2.2-EMAIL: Error fetching folio HTML, falling back to simple template', fetchError);
    }

    const subject = `Your Stay Folio - ${hotelName}`;

    const htmlBody = folioHtml || `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}ee 100%);">
        ${logoUrl ? `<img src="${logoUrl}" alt="${hotelName}" style="max-width: 180px; height: auto; margin-bottom: 20px;">` : ''}
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Thank You for Your Stay</h1>
      </td>
    </tr>
    
    <!-- Body -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
          Dear <strong>${guest_name}</strong>,
        </p>
        
        <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
          Thank you for choosing ${hotelName}. We appreciate your patronage and hope you enjoyed your stay with us.
        </p>
        
        <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">
          Your stay folio is available at the link below. Please review the charges and payments for your records.
        </p>
        
        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${pdf_url}" 
                 target="_blank"
                 style="display: inline-block; padding: 16px 40px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                View Your Folio
              </a>
            </td>
          </tr>
        </table>
        
        <p style="margin: 30px 0 0; color: #374151; font-size: 16px; line-height: 1.6;">
          If you have any questions about your folio, please don't hesitate to contact us${hotelMeta?.contact_phone ? ` at ${hotelMeta.contact_phone}` : ''}.
        </p>
        
        <p style="margin: 20px 0 0; color: #374151; font-size: 16px; line-height: 1.6;">
          We look forward to serving you again soon.
        </p>
        
        <p style="margin: 30px 0 0; color: #374151; font-size: 16px; line-height: 1.6;">
          <strong>Best regards,</strong><br>
          ${hotelName} Team
        </p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          ${hotelName}
          ${hotelMeta?.contact_phone ? `<br>${hotelMeta.contact_phone}` : ''}
          ${hotelMeta?.contact_email ? `<br>${hotelMeta.contact_email}` : ''}
        </p>
        <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send via Resend
    console.log('PDF-V2.1-EMAIL: Sending email via Resend...');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${hotelName} <noreply@luxuryhotelpro.com>`,
        to: [guest_email],
        subject: subject,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('PDF-V2.1-EMAIL: Resend API error', errorData);
      throw new Error(errorData.message || 'Failed to send email');
    }

    const data = await response.json();
    console.log('PDF-V2.1-EMAIL: Email sent successfully', { 
      message_id: data.id,
      to: guest_email 
    });

    // Log success in audit trail
    await supabase.from('finance_audit_events').insert({
      tenant_id,
      event_type: 'folio_emailed',
      user_id: null, // System action
      target_id: folio_id,
      payload: {
        guest_email,
        guest_name,
        pdf_url,
        message_id: data.id,
        method: 'PDF-V2.1-EMAIL'
      }
    });

    const duration = Date.now() - startTime;
    console.log('PDF-V2.1-EMAIL: Complete', { 
      success: true,
      duration_ms: duration 
    });

    // Return success with 200 status
    const responseData = {
      success: true,
      message: 'Folio email sent successfully',
      message_id: data.id,
      duration_ms: duration
    };

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('PDF-V2.1-EMAIL: Error caught', {
      error: error.message,
      stack: error.stack,
      duration_ms: duration
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        version: 'PDF-V2.1-EMAIL'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
