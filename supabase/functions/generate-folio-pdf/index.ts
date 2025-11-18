import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FolioPDFRequest {
  folio_id: string;
  tenant_id: string;
  format?: 'A4' | 'letter';
  include_qr?: boolean;
}

Deno.serve(async (req) => {
  // PDF-V2.1: Enhanced logging and error handling
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('PDF-V2.1: Request received');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('PDF-V2.1: Missing Supabase environment variables');
      throw new Error('Server configuration error');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { folio_id, tenant_id, format = 'A4', include_qr = true } = await req.json() as FolioPDFRequest;

    console.log('PDF-V2.1: Generating PDF', {
      folio_id,
      tenant_id,
      format,
      include_qr,
      timestamp: new Date().toISOString()
    });
    
    // Validate required parameters
    if (!folio_id) {
      console.error('PDF-V2.1: Missing folio_id parameter');
      throw new Error('folio_id is required');
    }
    
    if (!tenant_id) {
      console.error('PDF-V2.1: Missing tenant_id parameter');
      throw new Error('tenant_id is required');
    }

    // 1. Fetch complete folio data with relationships
    console.log('PDF-V2.1: Fetching folio data...');
    const { data: folio, error: folioError } = await supabase
      .from('stay_folios')
      .select(`
        *,
        booking:bookings(
          booking_reference,
          check_in,
          check_out,
          total_amount,
          metadata
        ),
        guest:guests(name, email, phone),
        room:rooms(number, room_type),
        transactions:folio_transactions(
          id,
          transaction_type,
          amount,
          description,
          created_at,
          department,
          reference_type
        )
      `)
      .eq('id', folio_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (folioError) {
      console.error('PDF-V2.1: Folio fetch error', {
        error: folioError.message,
        code: folioError.code,
        folio_id,
        tenant_id
      });
      throw new Error(`Failed to fetch folio: ${folioError.message}`);
    }
    
    if (!folio) {
      console.error('PDF-V2.1: Folio not found', { folio_id, tenant_id });
      throw new Error('Folio not found');
    }
    
    console.log('PDF-V2.1: Folio data fetched', {
      folio_id: folio.id,
      status: folio.status,
      total_charges: folio.total_charges,
      total_payments: folio.total_payments,
      balance: folio.balance,
      transaction_count: folio.transactions?.length || 0
    });
    
    // Validate required folio relationships
    if (!folio.booking) {
      console.error('PDF-V2.1: Missing booking data', { folio_id });
      throw new Error('Folio has no associated booking');
    }
    
    if (!folio.guest) {
      console.error('PDF-V2.1: Missing guest data', { folio_id });
      throw new Error('Folio has no associated guest');
    }
    
    if (!folio.room) {
      console.error('PDF-V2.1: Missing room data', { folio_id });
      throw new Error('Folio has no associated room');
    }

    // 2. Fetch hotel branding
    console.log('PDF-V2.1: Fetching hotel branding...');
    const { data: branding, error: brandingError } = await supabase
      .from('hotel_branding')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single();
    
    if (brandingError) {
      console.warn('PDF-V2.1: Branding fetch warning', brandingError.message);
    }

    // 3. Fetch receipt settings for styling
    console.log('PDF-V2.1: Fetching receipt settings...');
    const { data: receiptSettings, error: receiptError } = await supabase
      .from('receipt_settings')
      .select('*')
      .eq('tenant_id', tenant_id)
      .limit(1)
      .single();
    
    if (receiptError) {
      console.warn('PDF-V2.1: Receipt settings warning', receiptError.message);
    }

    // 4. Fetch tenant details
    console.log('PDF-V2.1: Fetching tenant details...');
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenant_id)
      .single();
    
    if (tenantError) {
      console.error('PDF-V2.1: Tenant fetch error', tenantError.message);
      throw new Error('Failed to fetch tenant details');
    }

    // 5. Calculate nights and format dates
    console.log('PDF-V2.1: Calculating stay duration...');
    const checkIn = new Date(folio.booking.check_in);
    const checkOut = new Date(folio.booking.check_out);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log('PDF-V2.1: Stay details', {
      check_in: checkIn.toISOString(),
      check_out: checkOut.toISOString(),
      nights
    });

    // 6. Calculate running balance for transactions
    console.log('PDF-V2.1: Processing transactions...');
    let runningBalance = 0;
    const transactionsWithBalance = (folio.transactions || [])
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((txn: any) => {
        if (txn.transaction_type === 'charge') {
          runningBalance += Number(txn.amount);
        } else if (txn.transaction_type === 'payment') {
          runningBalance -= Number(txn.amount);
        }
        return { ...txn, running_balance: runningBalance };
      });
    
    console.log('PDF-V2.1: Transactions processed', {
      count: transactionsWithBalance.length,
      final_balance: runningBalance
    });

    // 7. Generate luxury modern HTML
    console.log('PDF-V2.1: Generating HTML folio...');
    const folioHtml = generateLuxuryFolioHTML({
      folio,
      tenant,
      branding,
      receiptSettings,
      transactionsWithBalance,
      nights,
      format,
      include_qr,
    });
    
    console.log('PDF-V2.1: HTML generated', {
      html_length: folioHtml.length,
      has_content: folioHtml.length > 1000
    });

    // 8. Store PDF metadata in folio
    const version = (folio.metadata?.pdf_version || 0) + 1;
    const fileName = `${folio_id}_${version}_${Date.now()}.html`;
    const storagePath = `${tenant_id}/folios/${fileName}`;

    console.log('PDF-V2.1: Uploading to storage', {
      fileName,
      storagePath,
      version
    });

    // Note: For now storing HTML. Phase 5 can be extended with actual PDF generation
    // using libraries like jsPDF or puppeteer when needed
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('receipts')
      .upload(storagePath, new Blob([folioHtml], { type: 'text/html' }), {
        contentType: 'text/html',
        upsert: false
      });

    if (uploadError) {
      console.error('PDF-V2.1: Upload failed', {
        error: uploadError.message,
        storagePath
      });
      throw new Error(`Failed to upload folio: ${uploadError.message}`);
    }
    
    console.log('PDF-V2.1: Upload successful', {
      path: uploadData.path
    });

    // 9. Get public URL
    console.log('PDF-V2.1: Getting public URL...');
    const { data: urlData } = supabase
      .storage
      .from('receipts')
      .getPublicUrl(storagePath);

    console.log('PDF-V2.1: Public URL generated', { publicUrl: urlData.publicUrl });

    // 10. Update folio metadata
    console.log('PDF-V2.1: Updating folio metadata...');
    const { error: updateError } = await supabase
      .from('stay_folios')
      .update({
        metadata: {
          ...folio.metadata,
          latest_pdf_url: urlData.publicUrl,
          pdf_generated_at: new Date().toISOString(),
          pdf_version: version
        }
      })
      .eq('id', folio_id)
      .eq('tenant_id', tenant_id);

    if (updateError) {
      console.warn('PDF-V2.1: Metadata update warning', updateError.message);
    }

    const duration = Date.now() - startTime;
    console.log('PDF-V2.1: PDF generation complete', {
      success: true,
      publicUrl: urlData.publicUrl,
      version,
      duration_ms: duration
    });

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: urlData.publicUrl,
        version,
        duration_ms: duration,
        message: 'Folio PDF generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('PDF-V2.1: Error caught', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate folio PDF',
        version: 'PDF-V2.1'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateLuxuryFolioHTML(params: {
  folio: any;
  tenant: any;
  branding: any;
  receiptSettings: any;
  transactionsWithBalance: any[];
  nights: number;
  format: string;
  include_qr: boolean;
}): string {
  const { folio, tenant, branding, receiptSettings, transactionsWithBalance, nights } = params;

  const formatCurrency = (amount: number) => {
    return `₦${Number(amount).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Guest Folio - ${folio.booking.booking_reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: ${branding?.font_body || 'Inter, system-ui, -apple-system, sans-serif'};
      font-size: 10pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: #ffffff;
      max-width: 21cm;
      margin: 0 auto;
      padding: 2cm;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 2rem;
      border-bottom: 2px solid #e5e5e5;
      margin-bottom: 2rem;
    }
    
    .header-left {
      flex: 1;
    }
    
    .logo {
      max-width: 200px;
      height: auto;
      margin-bottom: 1rem;
    }
    
    .hotel-name {
      font-family: ${branding?.font_heading || 'Playfair Display, Georgia, serif'};
      font-size: 20pt;
      font-weight: 700;
      color: ${branding?.primary_color?.replace('hsl(', '').replace(')', '') || '0, 65%, 51%'};
      margin-bottom: 0.5rem;
    }
    
    .hotel-info {
      font-size: 9pt;
      color: #666;
      line-height: 1.5;
    }
    
    .folio-title {
      text-align: right;
      flex: 0 0 auto;
    }
    
    .folio-title h1 {
      font-family: ${branding?.font_heading || 'Playfair Display, Georgia, serif'};
      font-size: 28pt;
      font-weight: 300;
      letter-spacing: 1px;
      color: #1a1a1a;
      margin-bottom: 0.5rem;
    }
    
    .folio-subtitle {
      font-size: 10pt;
      color: #666;
    }
    
    .guest-info {
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      border-left: 4px solid ${branding?.primary_color?.replace('hsl(', '').replace(')', '') || '0, 65%, 51%'};
      padding: 1.5rem;
      margin: 2rem 0;
      border-radius: 8px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
    }
    
    .info-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888;
      margin-bottom: 0.25rem;
    }
    
    .info-value {
      font-size: 11pt;
      font-weight: 600;
      color: #1a1a1a;
    }
    
    .summary-section {
      margin: 2rem 0;
    }
    
    .summary-title {
      font-family: ${branding?.font_heading || 'Playfair Display, Georgia, serif'};
      font-size: 14pt;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e5e5e5;
    }
    
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .summary-card {
      background: #ffffff;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
    }
    
    .summary-card-label {
      font-size: 9pt;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }
    
    .summary-card-value {
      font-size: 18pt;
      font-weight: 700;
      color: #1a1a1a;
    }
    
    .summary-card-value.balance {
      color: ${folio.balance > 0 ? '#dc2626' : folio.balance < 0 ? '#059669' : '#1a1a1a'};
    }
    
    .transactions-section {
      margin: 2rem 0;
    }
    
    .transactions-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    
    .transactions-table thead {
      background: #f8f9fa;
    }
    
    .transactions-table th {
      padding: 0.75rem;
      text-align: left;
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
      border-bottom: 2px solid #e5e5e5;
    }
    
    .transactions-table td {
      padding: 0.75rem;
      font-size: 10pt;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .transactions-table tbody tr:hover {
      background: #fafafa;
    }
    
    .transaction-type {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .transaction-type.charge {
      background: #fef3c7;
      color: #92400e;
    }
    
    .transaction-type.payment {
      background: #d1fae5;
      color: #065f46;
    }
    
    .amount-positive {
      color: #dc2626;
    }
    
    .amount-negative {
      color: #059669;
    }
    
    .footer {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid #e5e5e5;
      text-align: center;
    }
    
    .footer-text {
      font-size: 9pt;
      color: #666;
      line-height: 1.8;
    }
    
    .thank-you {
      font-family: ${branding?.font_heading || 'Playfair Display, Georgia, serif'};
      font-size: 14pt;
      color: #1a1a1a;
      margin-top: 1rem;
    }
    
    @media print {
      body { padding: 0; }
      .summary-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      ${branding?.logo_url ? `<img src="${branding.logo_url}" alt="${tenant?.name}" class="logo">` : ''}
      <div class="hotel-name">${tenant?.name || 'Hotel'}</div>
      <div class="hotel-info">
        ${receiptSettings?.header_text || ''}
      </div>
    </div>
    <div class="folio-title">
      <h1>GUEST FOLIO</h1>
      <div class="folio-subtitle">Folio ${folio.booking.booking_reference}</div>
    </div>
  </div>

  <!-- Guest Information -->
  <div class="guest-info">
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Guest Name</div>
        <div class="info-value">${folio.guest.name}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Room Number</div>
        <div class="info-value">${folio.room.number}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Check-In Date</div>
        <div class="info-value">${formatDate(folio.booking.check_in)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Check-Out Date</div>
        <div class="info-value">${formatDate(folio.booking.check_out)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Booking Reference</div>
        <div class="info-value">${folio.booking.booking_reference}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Number of Nights</div>
        <div class="info-value">${nights}</div>
      </div>
    </div>
  </div>

  <!-- Financial Summary -->
  <div class="summary-section">
    <div class="summary-title">Financial Summary</div>
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-card-label">Total Charges</div>
        <div class="summary-card-value">${formatCurrency(folio.total_charges)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Total Payments</div>
        <div class="summary-card-value">${formatCurrency(folio.total_payments)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">${folio.balance > 0 ? 'Balance Due' : folio.balance < 0 ? 'Credit Balance' : 'Balance'}</div>
        <div class="summary-card-value balance">${formatCurrency(Math.abs(folio.balance))}</div>
      </div>
    </div>
  </div>

  <!-- Transaction History -->
  <div class="transactions-section">
    <div class="summary-title">Transaction History</div>
    <table class="transactions-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Type</th>
          <th style="text-align: right;">Charge</th>
          <th style="text-align: right;">Payment</th>
          <th style="text-align: right;">Balance</th>
        </tr>
      </thead>
      <tbody>
        ${transactionsWithBalance.map(txn => `
          <tr>
            <td>${formatDate(txn.created_at)}</td>
            <td>${txn.description}</td>
            <td>
              <span class="transaction-type ${txn.transaction_type}">
                ${txn.transaction_type}
              </span>
            </td>
            <td style="text-align: right;">
              ${txn.transaction_type === 'charge' ? `<span class="amount-positive">${formatCurrency(txn.amount)}</span>` : '—'}
            </td>
            <td style="text-align: right;">
              ${txn.transaction_type === 'payment' ? `<span class="amount-negative">${formatCurrency(txn.amount)}</span>` : '—'}
            </td>
            <td style="text-align: right;">${formatCurrency(txn.running_balance)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-text">
      ${receiptSettings?.footer_text || 'Thank you for choosing us'}
    </div>
    <div class="thank-you">
      We appreciate your patronage
    </div>
  </div>
</body>
</html>
  `.trim();
}
