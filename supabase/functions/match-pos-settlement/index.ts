// LEDGER-PHASE-2E-V1: POS Settlement Matching Algorithm
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchRequest {
  importId: string;
  tenantId: string;
  autoMatch?: boolean; // If true, automatically match high-confidence pairs
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: MatchRequest = await req.json();
    console.log('[MATCH-POS-SETTLEMENT-V1] Starting matching:', {
      importId: payload.importId,
      tenantId: payload.tenantId,
      autoMatch: payload.autoMatch
    });

    // Get unmatched settlement records
    const { data: settlementRecords, error: settlementError } = await supabase
      .from('pos_settlement_records')
      .select('*')
      .eq('import_id', payload.importId)
      .eq('tenant_id', payload.tenantId)
      .is('ledger_entry_id', null);

    if (settlementError) throw settlementError;

    console.log('[MATCH-POS-SETTLEMENT-V1] Found unmatched settlement records:', settlementRecords?.length || 0);

    // Get ledger entries with POS metadata (same date range)
    const { data: ledgerEntries, error: ledgerError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('tenant_id', payload.tenantId)
      .eq('payment_method', 'Card') // Only match card/POS transactions
      .is('metadata->>stan', null) // Has POS metadata
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    if (ledgerError) throw ledgerError;

    console.log('[MATCH-POS-SETTLEMENT-V1] Found potential ledger entries:', ledgerEntries?.length || 0);

    const matches: Array<{
      settlementRecordId: string;
      ledgerEntryId: string;
      confidence: 'exact' | 'probable';
      matchScore: number;
      matchReasons: string[];
    }> = [];

    // Matching algorithm
    for (const settlement of settlementRecords || []) {
      let bestMatch: any = null;
      let bestScore = 0;
      let bestConfidence: 'exact' | 'probable' = 'probable';
      let matchReasons: string[] = [];

      for (const ledger of ledgerEntries || []) {
        const metadata = ledger.metadata as any;
        let score = 0;
        const reasons: string[] = [];

        // Exact match criteria
        if (settlement.stan && metadata?.stan === settlement.stan) {
          score += 50;
          reasons.push('STAN exact match');
        }

        if (settlement.rrn && metadata?.rrn === settlement.rrn) {
          score += 50;
          reasons.push('RRN exact match');
        }

        // Amount match (within 0.01)
        if (Math.abs(settlement.amount - ledger.amount) < 0.01) {
          score += 30;
          reasons.push('Amount exact match');
        } else if (Math.abs(settlement.amount - ledger.amount) < 1) {
          score += 10;
          reasons.push('Amount close match');
        }

        // Terminal ID match
        if (settlement.terminal_id && metadata?.terminal_id === settlement.terminal_id) {
          score += 15;
          reasons.push('Terminal ID match');
        }

        // Approval code match
        if (settlement.approval_code && metadata?.approval_code === settlement.approval_code) {
          score += 20;
          reasons.push('Approval code match');
        }

        // Date proximity (same day)
        if (settlement.transaction_date && ledger.created_at) {
          const settlementDate = new Date(settlement.transaction_date).toDateString();
          const ledgerDate = new Date(ledger.created_at).toDateString();
          if (settlementDate === ledgerDate) {
            score += 10;
            reasons.push('Same day transaction');
          }
        }

        // Determine confidence
        let confidence: 'exact' | 'probable' = 'probable';
        if ((settlement.stan && metadata?.stan === settlement.stan) || 
            (settlement.rrn && metadata?.rrn === settlement.rrn)) {
          confidence = 'exact';
        }

        // Update best match if this score is higher
        if (score > bestScore && score >= 40) { // Minimum threshold: 40 points
          bestScore = score;
          bestMatch = ledger;
          bestConfidence = confidence;
          matchReasons = reasons;
        }
      }

      if (bestMatch) {
        matches.push({
          settlementRecordId: settlement.id,
          ledgerEntryId: bestMatch.id,
          confidence: bestConfidence,
          matchScore: bestScore,
          matchReasons
        });

        console.log('[MATCH-POS-SETTLEMENT-V1] Match found:', {
          settlementId: settlement.id,
          ledgerId: bestMatch.id,
          confidence: bestConfidence,
          score: bestScore,
          reasons: matchReasons
        });

        // Auto-match if enabled and high confidence
        if (payload.autoMatch && bestConfidence === 'exact') {
          await supabase
            .from('pos_settlement_records')
            .update({
              ledger_entry_id: bestMatch.id,
              matched_at: new Date().toISOString(),
              match_confidence: bestConfidence
            })
            .eq('id', settlement.id);

          console.log('[MATCH-POS-SETTLEMENT-V1] Auto-matched:', settlement.id);
        }
      }
    }

    // Update import record with match counts
    const matchedCount = matches.filter(m => m.confidence === 'exact').length;
    const unmatchedCount = (settlementRecords?.length || 0) - (payload.autoMatch ? matchedCount : 0);

    await supabase
      .from('pos_settlement_imports')
      .update({
        matched_records: matchedCount,
        unmatched_records: unmatchedCount
      })
      .eq('id', payload.importId);

    console.log('[MATCH-POS-SETTLEMENT-V1] Matching complete:', {
      totalMatches: matches.length,
      exactMatches: matches.filter(m => m.confidence === 'exact').length,
      probableMatches: matches.filter(m => m.confidence === 'probable').length,
      autoMatched: payload.autoMatch ? matchedCount : 0
    });

    return new Response(
      JSON.stringify({
        success: true,
        matches,
        summary: {
          totalSettlementRecords: settlementRecords?.length || 0,
          totalMatches: matches.length,
          exactMatches: matches.filter(m => m.confidence === 'exact').length,
          probableMatches: matches.filter(m => m.confidence === 'probable').length,
          autoMatched: payload.autoMatch ? matchedCount : 0,
          unmatched: (settlementRecords?.length || 0) - matches.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[MATCH-POS-SETTLEMENT-V1] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: 'Failed to match POS settlement records'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
