// LEDGER-PHASE-2D-V1: POS Settlement Upload & Parse
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  fileName: string;
  fileContent: string; // Base64 or CSV text
  providerName: string;
  settlementDate: string;
  columnMapping: {
    amount?: string;
    date?: string;
    stan?: string;
    rrn?: string;
    terminal_id?: string;
    approval_code?: string;
    card_type?: string;
    card_last4?: string;
    merchant_name?: string;
  };
  tenantId: string;
  uploadedBy: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: UploadRequest = await req.json();
    console.log('[UPLOAD-POS-SETTLEMENT-V1] Processing upload:', {
      fileName: payload.fileName,
      provider: payload.providerName,
      settlementDate: payload.settlementDate,
      tenantId: payload.tenantId
    });

    // Parse CSV content
    const lines = payload.fileContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'File must contain at least header and one data row' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const dataRows = lines.slice(1);

    console.log('[UPLOAD-POS-SETTLEMENT-V1] Parsed headers:', headers);
    console.log('[UPLOAD-POS-SETTLEMENT-V1] Data rows count:', dataRows.length);

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from('pos_settlement_imports')
      .insert({
        tenant_id: payload.tenantId,
        file_name: payload.fileName,
        file_size: payload.fileContent.length,
        provider_name: payload.providerName,
        settlement_date: payload.settlementDate,
        uploaded_by: payload.uploadedBy,
        total_records: dataRows.length,
        status: 'processing'
      })
      .select()
      .single();

    if (importError) {
      console.error('[UPLOAD-POS-SETTLEMENT-V1] Import record creation failed:', importError);
      throw importError;
    }

    console.log('[UPLOAD-POS-SETTLEMENT-V1] Import record created:', importRecord.id);

    // Save column mapping configuration
    await supabase
      .from('pos_column_mappings')
      .upsert({
        tenant_id: payload.tenantId,
        provider_name: payload.providerName,
        mapping_config: payload.columnMapping,
        created_by: payload.uploadedBy
      }, {
        onConflict: 'tenant_id,provider_name'
      });

    // Parse and insert settlement records
    const settlementRecords = [];
    let successCount = 0;
    let failCount = 0;

    for (const row of dataRows) {
      try {
        const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
        const rowData: any = {};
        
        headers.forEach((header, index) => {
          rowData[header] = values[index] || null;
        });

        // Map columns using provided mapping
        const amount = parseFloat(rowData[payload.columnMapping.amount || 'amount'] || '0');
        const transactionDate = rowData[payload.columnMapping.date || 'date'];
        const stan = rowData[payload.columnMapping.stan || 'stan'];
        const rrn = rowData[payload.columnMapping.rrn || 'rrn'];
        const terminal_id = rowData[payload.columnMapping.terminal_id || 'terminal_id'];
        const approval_code = rowData[payload.columnMapping.approval_code || 'approval_code'];
        const card_type = rowData[payload.columnMapping.card_type || 'card_type'];
        const card_last4 = rowData[payload.columnMapping.card_last4 || 'card_last4'];
        const merchant_name = rowData[payload.columnMapping.merchant_name || 'merchant_name'];

        if (isNaN(amount) || amount <= 0) {
          console.warn('[UPLOAD-POS-SETTLEMENT-V1] Invalid amount, skipping row:', rowData);
          failCount++;
          continue;
        }

        settlementRecords.push({
          tenant_id: payload.tenantId,
          import_id: importRecord.id,
          transaction_date: transactionDate || null,
          amount,
          stan: stan || null,
          rrn: rrn || null,
          terminal_id: terminal_id || null,
          approval_code: approval_code || null,
          card_type: card_type || null,
          card_last4: card_last4 || null,
          merchant_name: merchant_name || null,
          raw_data: rowData
        });

        successCount++;
      } catch (err) {
        console.error('[UPLOAD-POS-SETTLEMENT-V1] Row parse error:', err);
        failCount++;
      }
    }

    // Batch insert settlement records
    if (settlementRecords.length > 0) {
      const { error: recordsError } = await supabase
        .from('pos_settlement_records')
        .insert(settlementRecords);

      if (recordsError) {
        console.error('[UPLOAD-POS-SETTLEMENT-V1] Records insert failed:', recordsError);
        throw recordsError;
      }
    }

    // Update import record with counts
    await supabase
      .from('pos_settlement_imports')
      .update({
        total_records: dataRows.length,
        matched_records: 0, // Will be updated by matching algorithm
        unmatched_records: successCount,
        status: 'completed'
      })
      .eq('id', importRecord.id);

    console.log('[UPLOAD-POS-SETTLEMENT-V1] Upload complete:', {
      importId: importRecord.id,
      totalRows: dataRows.length,
      successCount,
      failCount
    });

    return new Response(
      JSON.stringify({
        success: true,
        importId: importRecord.id,
        totalRecords: dataRows.length,
        processedRecords: successCount,
        failedRecords: failCount,
        message: `Successfully processed ${successCount} of ${dataRows.length} records`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[UPLOAD-POS-SETTLEMENT-V1] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: 'Failed to process POS settlement file'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
