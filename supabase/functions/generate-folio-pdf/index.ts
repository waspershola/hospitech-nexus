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
  // PDF-TEMPLATE-V4: Enhanced logging, response schema with html and metadata, fixed spacing/typography
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('PDF-TEMPLATE-V4: Request received');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('PDF-TEMPLATE-V4: Missing Supabase environment variables');
      throw new Error('Server configuration error');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { folio_id, tenant_id, format = 'A4', include_qr = true } = await req.json() as FolioPDFRequest;

    console.log('PDF-TEMPLATE-V4: Generating PDF', {
      folio_id,
      tenant_id,
      format,
      include_qr,
      timestamp: new Date().toISOString()
    });
    
    // Validate required parameters
    if (!folio_id) {
      console.error('PDF-TEMPLATE-V4: Missing folio_id parameter');
      throw new Error('folio_id is required');
    }
    
    if (!tenant_id) {
      console.error('PDF-TEMPLATE-V4: Missing tenant_id parameter');
      throw new Error('tenant_id is required');
    }

    // 1. Fetch complete folio data with relationships
    console.log('PDF-TEMPLATE-V4: Fetching folio data...');
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
        room:rooms(number, type),
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
      console.error('PDF-TEMPLATE-V4: Folio fetch error', {
        error: folioError.message,
        code: folioError.code,
        folio_id,
        tenant_id
      });
      throw new Error(`Failed to fetch folio: ${folioError.message}`);
    }
    
    if (!folio) {
      console.error('PDF-TEMPLATE-V4: Folio not found', { folio_id, tenant_id });
      throw new Error('Folio not found');
    }
    
    console.log('PDF-TEMPLATE-V4: Folio data fetched', {
      folio_id: folio.id,
      status: folio.status,
      total_charges: folio.total_charges,
      total_payments: folio.total_payments,
      balance: folio.balance,
      transaction_count: folio.transactions?.length || 0
    });
    
    // Validate required folio relationships (skip for group master folios)
    const isGroupMaster = folio.folio_type === 'group_master';
    
    if (!isGroupMaster && !folio.booking) {
      console.error('PDF-TEMPLATE-V4: Missing booking data', { folio_id });
      throw new Error('Folio has no associated booking');
    }
    
    if (!folio.guest) {
      console.error('PDF-TEMPLATE-V4: Missing guest data', { folio_id });
      throw new Error('Folio has no associated guest');
    }
    
    if (!isGroupMaster && !folio.room) {
      console.error('PDF-TEMPLATE-V4: Missing room data', { folio_id });
      throw new Error('Folio has no associated room');
    }
    
    console.log('PDF-TEMPLATE-V4: Folio type check', {
      folio_type: folio.folio_type,
      is_group_master: isGroupMaster
    });

    // 2. Fetch hotel branding
    console.log('PDF-TEMPLATE-V4: Fetching hotel branding...');
    const { data: branding, error: brandingError } = await supabase
      .from('hotel_branding')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single();
    
    if (brandingError) {
      console.warn('PDF-TEMPLATE-V4: Branding fetch warning', brandingError.message);
    }

    // 3. Fetch receipt settings for styling
    console.log('PDF-TEMPLATE-V4: Fetching receipt settings...');
    const { data: receiptSettings, error: receiptError } = await supabase
      .from('receipt_settings')
      .select('*')
      .eq('tenant_id', tenant_id)
      .limit(1)
      .single();
    
    if (receiptError) {
      console.warn('PDF-TEMPLATE-V4: Receipt settings warning', receiptError.message);
    }

    // 4. Fetch tenant details
    console.log('PDF-TEMPLATE-V4: Fetching tenant details...');
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenant_id)
      .single();
    
    if (tenantError) {
      console.error('PDF-TEMPLATE-V4: Tenant fetch error', tenantError.message);
      throw new Error('Failed to fetch tenant details');
    }

    // 5. Calculate nights and format dates (use folio creation date for master folios)
    console.log('PDF-TEMPLATE-V4: Calculating stay duration...');
    let checkIn: Date, checkOut: Date, nights: number;
    
    if (isGroupMaster) {
      // For master folios, use folio created date and show as "N/A" for checkout
      checkIn = new Date(folio.created_at);
      checkOut = new Date(folio.created_at); // Same as check-in
      nights = 0; // Will display as "Multiple" in template
    } else {
      checkIn = new Date(folio.booking.check_in);
      checkOut = new Date(folio.booking.check_out);
      nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    console.log('PDF-TEMPLATE-V4: Stay details', {
      check_in: checkIn.toISOString(),
      check_out: checkOut.toISOString(),
      nights,
      is_group_master: isGroupMaster
    });

    // 6. Calculate running balance for transactions
    console.log('PDF-TEMPLATE-V4: Processing transactions...');
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
    
    console.log('PDF-TEMPLATE-V4: Transactions processed', {
      count: transactionsWithBalance.length,
      final_balance: runningBalance
    });

    // 7. Generate luxury modern HTML
    console.log('PDF-TEMPLATE-V4: Generating HTML folio...');
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
    
    console.log('PDF-TEMPLATE-V4: HTML generated', {
      html_length: folioHtml.length,
      has_content: folioHtml.length > 1000
    });

    // 8. Store PDF metadata in folio
    const version = (folio.metadata?.pdf_version || 0) + 1;
    const fileName = `${folio_id}_${version}_${Date.now()}.html`;
    const storagePath = `${tenant_id}/folios/${fileName}`;

    console.log('PDF-TEMPLATE-V4: Uploading to storage', {
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
      console.error('PDF-TEMPLATE-V4: Upload failed', {
        error: uploadError.message,
        storagePath
      });
      throw new Error(`Failed to upload folio: ${uploadError.message}`);
    }
    
    console.log('PDF-TEMPLATE-V4: Upload successful', {
      path: uploadData.path
    });

    // 9. Get public URL
    console.log('PDF-TEMPLATE-V4: Getting public URL...');
    const { data: urlData } = supabase
      .storage
      .from('receipts')
      .getPublicUrl(storagePath);

    console.log('PDF-TEMPLATE-V4: Public URL generated', { publicUrl: urlData.publicUrl });

    // 10. Update folio metadata
    console.log('PDF-TEMPLATE-V4: Updating folio metadata...');
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
      console.warn('PDF-TEMPLATE-V4: Metadata update warning', updateError.message);
    }

    const duration = Date.now() - startTime;
    console.log('PDF-TEMPLATE-V4: PDF generation complete', {
      success: true,
      publicUrl: urlData.publicUrl,
      version,
      duration_ms: duration,
      folio_id,
      tenant_id,
      storage_path: storagePath
    });

    // Return success with both html_url and pdf_url (same for now)
    const responseData = {
      success: true,
      html_url: urlData.publicUrl,
      pdf_url: urlData.publicUrl, // Client will convert to PDF
      version,
      metadata: {
        template_version: 'PDF-TEMPLATE-V4',
        storage_path: storagePath,
        generated_at: new Date().toISOString(),
        folio_id,
        tenant_id
      }
    };

    console.log('PDF-TEMPLATE-V4: Success response', {
      html_url: urlData.publicUrl,
      version,
      duration_ms: duration
    });

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('PDF-TEMPLATE-V4: Error caught', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate folio PDF',
        version: 'PDF-TEMPLATE-V4'
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

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate totals
  const totalCharges = transactionsWithBalance
    .filter(t => t.transaction_type === 'charge')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const totalPayments = transactionsWithBalance
    .filter(t => t.transaction_type === 'payment')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const outstandingBalance = folio.balance;

  // GROUP-BOOKING-COMPREHENSIVE-FIX-V1: Phase 2 - Handle null booking for group master folios
  const isGroupMaster = folio.folio_type === 'group_master';
  const documentTitle = isGroupMaster 
    ? `Group Master Folio - ${folio.folio_number}`
    : `Guest Folio - ${folio.booking?.booking_reference || 'Unknown'}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${documentTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: ${branding?.font_body || 'Inter, system-ui, -apple-system, sans-serif'};
      font-size: 10pt;
      line-height: 1.5;
      color: #111111;
      background: #ffffff;
      max-width: 21cm;
      margin: 0 auto;
      padding: 1.5cm;
    }
    
    /* PDF-TEMPLATE-V4: Header Section */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 1.5rem;
      border-bottom: 3px solid #C9A959;
      margin-bottom: 2rem;
    }
    
    .header-left {
      flex: 1;
    }
    
    .logo {
      max-width: 180px;
      height: auto;
      margin-bottom: 1rem;
    }
    
    .hotel-name {
      font-family: ${branding?.font_heading || 'Playfair Display, Georgia, serif'};
      font-size: 22pt;
      font-weight: 700;
      color: #111111;
      margin-bottom: 0.5rem;
      letter-spacing: -0.5px;
    }
    
    .hotel-info {
      font-size: 9pt;
      color: #555555;
      line-height: 1.6;
    }
    
    .folio-title {
      text-align: right;
    }
    
    .folio-title h1 {
      font-family: ${branding?.font_heading || 'Playfair Display, Georgia, serif'};
      font-size: 26pt;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: #111111;
      margin-bottom: 0.25rem;
    }
    
    .folio-number {
      font-size: 11pt;
      color: #555555;
      font-weight: 600;
    }
    
    .folio-status {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 0.5rem;
      background: ${folio.status === 'open' ? '#FEF3C7' : '#D1FAE5'};
      color: ${folio.status === 'open' ? '#92400E' : '#065F46'};
    }
    
    /* Guest Summary Section */
    .guest-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin: 2rem 0;
      padding: 1.5rem;
      background: #FAFAFA;
      border-left: 4px solid #C9A959;
    }
    
    .summary-block {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .summary-item {
      display: flex;
      flex-direction: column;
    }
    
    .summary-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.75px;
      color: #777777;
      margin-bottom: 0.15rem;
      font-weight: 600;
    }
    
    .summary-value {
      font-size: 11pt;
      font-weight: 600;
      color: #111111;
    }
    
    /* Itemized Ledger Section */
    .ledger-section {
      margin: 2.5rem 0;
    }
    
    .section-title {
      font-family: ${branding?.font_heading || 'Playfair Display, Georgia, serif'};
      font-size: 16pt;
      font-weight: 600;
      color: #111111;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #E5E5E5;
    }
    
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
      font-size: 9pt;
    }
    
    .ledger-table thead {
      background: #F8F9FA;
      border-bottom: 2px solid #E5E5E5;
    }
    
    .ledger-table th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #555555;
    }
    
    .ledger-table th.align-right {
      text-align: right;
    }
    
    .ledger-table tbody tr {
      border-bottom: 1px solid #F0F0F0;
    }
    
    .ledger-table tbody tr:nth-child(even) {
      background: #FAFAFA;
    }
    
    .ledger-table tbody tr:hover {
      background: #F5F5F5;
    }
    
    .ledger-table td {
      padding: 0.75rem 1rem;
      color: #111111;
      vertical-align: middle;
    }
    
    .ledger-table td.align-right {
      text-align: right;
    }
    
    .txn-date {
      font-size: 9pt;
      color: #555555;
    }
    
    .txn-description {
      font-weight: 500;
      word-spacing: normal;
      letter-spacing: normal;
    }
    
    .txn-reference {
      font-size: 8pt;
      color: #777777;
      font-family: monospace;
    }
    
    .txn-debit {
      color: #111111;
      font-weight: 600;
    }
    
    .txn-credit {
      color: #0B8F2F;
      font-weight: 600;
    }
    
    .txn-balance {
      font-weight: 700;
      color: #111111;
    }
    
    /* Totals Summary Box */
    .totals-box {
      margin: 2rem 0 2rem auto;
      max-width: 400px;
      border: 2px solid #E5E5E5;
      border-radius: 8px;
      padding: 1.5rem;
      background: #FAFAFA;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #E5E5E5;
    }
    
    .totals-row:last-child {
      border-bottom: none;
      margin-top: 0.5rem;
      padding-top: 1rem;
      border-top: 2px solid #C9A959;
    }
    
    .totals-label {
      font-size: 10pt;
      color: #555555;
      font-weight: 500;
    }
    
    .totals-value {
      font-size: 11pt;
      font-weight: 600;
      color: #111111;
    }
    
    .totals-row:last-child .totals-label {
      font-size: 12pt;
      font-weight: 700;
      color: #111111;
    }
    
    .totals-row:last-child .totals-value {
      font-size: 16pt;
      font-weight: 700;
      color: ${outstandingBalance > 0 ? '#D60000' : outstandingBalance < 0 ? '#0B8F2F' : '#111111'};
    }
    
    /* Footer */
    .footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 2px solid #E5E5E5;
      text-align: center;
    }
    
    .footer-message {
      font-size: 11pt;
      color: #555555;
      margin-bottom: 0.75rem;
      word-spacing: 0.15em;
      letter-spacing: 0.01em;
      line-height: 1.6;
    }
    
    .footer-branding {
      font-size: 8pt;
      color: #999999;
      margin-top: 1rem;
    }
    
    .generated-timestamp {
      font-size: 8pt;
      color: #AAAAAA;
      margin-top: 0.5rem;
      font-style: italic;
    }
    
    @media print {
      body { padding: 0.5cm; }
      .ledger-table { page-break-inside: auto; }
      .ledger-table tr { page-break-inside: avoid; page-break-after: auto; }
      .totals-box { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <!-- PDF-TEMPLATE-V4: Header with Hotel Branding -->
  <div class="header">
    <div class="header-left">
      ${branding?.logo_url ? `<img src="${branding.logo_url}" alt="${tenant?.name}" class="logo">` : ''}
      <div class="hotel-name">${tenant?.name || 'Hotel'}</div>
      <div class="hotel-info">
        ${receiptSettings?.header_text || ''}
      </div>
    </div>
    <div class="folio-title">
      <h1>${folio.folio_type === 'group_master' ? 'GROUP MASTER FOLIO' : 'GUEST FOLIO'}</h1>
      <div class="folio-number">#${folio.booking?.booking_reference || folio.folio_number}</div>
      <span class="folio-status">${folio.status || 'OPEN'}</span>
    </div>
  </div>

  <!-- Guest and Booking Summary -->
  <div class="guest-summary">
    <div class="summary-block">
      <div class="summary-item">
        <div class="summary-label">Guest Name</div>
        <div class="summary-value">${folio.guest.name}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Email</div>
        <div class="summary-value">${folio.guest.email || 'N/A'}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Phone</div>
        <div class="summary-value">${folio.guest.phone || 'N/A'}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">${folio.folio_type === 'group_master' ? 'Group Name' : 'Room Number'}</div>
        <div class="summary-value">${
          folio.folio_type === 'group_master' 
            ? (folio.metadata?.group_name || 'Group Booking')
            : `${folio.room.number} (${folio.room.type})`
        }</div>
      </div>
    </div>
    <div class="summary-block">
      <div class="summary-item">
        <div class="summary-label">${folio.folio_type === 'group_master' ? 'Created Date' : 'Check-In Date'}</div>
        <div class="summary-value">${formatDate(folio.booking?.check_in || folio.created_at)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">${folio.folio_type === 'group_master' ? 'Group Status' : 'Check-Out Date'}</div>
        <div class="summary-value">${
          folio.folio_type === 'group_master'
            ? (folio.status === 'open' ? 'Active' : 'Closed')
            : formatDate(folio.booking?.check_out || folio.created_at)
        }</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">${folio.folio_type === 'group_master' ? 'Total Rooms' : 'Number of Nights'}</div>
        <div class="summary-value">${
          folio.folio_type === 'group_master'
            ? (folio.metadata?.total_rooms || 'Multiple')
            : `${nights} ${nights === 1 ? 'Night' : 'Nights'}`
        }</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">${folio.folio_type === 'group_master' ? 'Master Folio Number' : 'Booking Reference'}</div>
        <div class="summary-value">${folio.booking?.booking_reference || folio.folio_number}</div>
      </div>
    </div>
  </div>

  <!-- Itemized Ledger -->
  <div class="ledger-section">
    <div class="section-title">Transaction Ledger</div>
    <table class="ledger-table">
      <thead>
        <tr>
          <th style="width: 12%;">Date</th>
          <th style="width: 30%;">Description</th>
          <th style="width: 15%;">Reference</th>
          <th class="align-right" style="width: 14%;">Debit</th>
          <th class="align-right" style="width: 14%;">Credit</th>
          <th class="align-right" style="width: 15%;">Balance</th>
        </tr>
      </thead>
      <tbody>
        ${transactionsWithBalance.map(txn => `
          <tr>
            <td class="txn-date">${formatDateTime(txn.created_at).split(',')[0]}</td>
            <td class="txn-description">${txn.description}</td>
            <td class="txn-reference">${txn.reference_type || '—'}</td>
            <td class="align-right txn-debit">
              ${txn.transaction_type === 'charge' ? formatCurrency(txn.amount) : '—'}
            </td>
            <td class="align-right txn-credit">
              ${txn.transaction_type === 'payment' ? formatCurrency(txn.amount) : '—'}
            </td>
            <td class="align-right txn-balance">${formatCurrency(txn.running_balance)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- Totals Summary -->
  <div class="totals-box">
    <div class="totals-row">
      <span class="totals-label">Total Charges</span>
      <span class="totals-value">${formatCurrency(totalCharges)}</span>
    </div>
    <div class="totals-row">
      <span class="totals-label">Total Payments</span>
      <span class="totals-value">${formatCurrency(totalPayments)}</span>
    </div>
    <div class="totals-row">
      <span class="totals-label">${outstandingBalance > 0 ? 'Outstanding Balance' : outstandingBalance < 0 ? 'Credit Balance' : 'Balance'}</span>
      <span class="totals-value">${formatCurrency(Math.abs(outstandingBalance))}</span>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-message">
      ${receiptSettings?.footer_text || 'Thank you for choosing us. We appreciate your patronage.'}
    </div>
    <div class="footer-branding">
      ${tenant?.name || 'Hotel'} • Powered by LuxuryHotelPro
    </div>
    <div class="generated-timestamp">
      Generated on ${new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
    </div>
    <div class="generated-timestamp">
      Powered by <strong style="color: #C9A959;">LuxuryHotelPro</strong> • Template V4
    </div>
  </div>
</body>
</html>
  `.trim();
}
