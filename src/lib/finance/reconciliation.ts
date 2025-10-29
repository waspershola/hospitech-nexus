/**
 * Reconciliation utilities for matching external transactions with internal payments
 */

export interface MatchScore {
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

export interface TransactionMatch {
  paymentId: string;
  score: MatchScore;
  payment: any;
}

/**
 * Calculate match score between external transaction and internal payment
 * Uses multiple factors: reference match, amount match, date proximity, provider match
 */
export function calculateMatchScore(
  externalTxn: {
    reference: string;
    amount: number;
    date?: string;
    provider?: string;
  },
  payment: {
    id: string;
    transaction_ref?: string;
    provider_reference?: string;
    amount: number;
    created_at: string;
    method_provider?: string;
  }
): MatchScore {
  let score = 0;
  const reasons: string[] = [];

  // Reference matching (40 points max)
  const refMatch = matchReference(
    externalTxn.reference,
    payment.transaction_ref,
    payment.provider_reference
  );
  score += refMatch.score;
  if (refMatch.matched) reasons.push(refMatch.reason);

  // Amount matching (30 points max)
  const amountMatch = matchAmount(externalTxn.amount, payment.amount);
  score += amountMatch.score;
  if (amountMatch.matched) reasons.push(amountMatch.reason);

  // Date proximity (20 points max)
  if (externalTxn.date) {
    const dateMatch = matchDate(externalTxn.date, payment.created_at);
    score += dateMatch.score;
    if (dateMatch.matched) reasons.push(dateMatch.reason);
  }

  // Provider matching (10 points max)
  if (externalTxn.provider && payment.method_provider) {
    const providerMatch = matchProvider(externalTxn.provider, payment.method_provider);
    score += providerMatch.score;
    if (providerMatch.matched) reasons.push(providerMatch.reason);
  }

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low';
  if (score >= 80) confidence = 'high';
  else if (score >= 60) confidence = 'medium';
  else confidence = 'low';

  return { score, confidence, reasons };
}

function matchReference(
  extRef: string,
  txnRef?: string,
  provRef?: string
): { score: number; matched: boolean; reason: string } {
  const normalizedExt = normalizeReference(extRef);
  const normalizedTxn = txnRef ? normalizeReference(txnRef) : '';
  const normalizedProv = provRef ? normalizeReference(provRef) : '';

  // Exact match
  if (normalizedExt === normalizedTxn || normalizedExt === normalizedProv) {
    return { score: 40, matched: true, reason: 'Exact reference match' };
  }

  // Partial match (contains)
  if (normalizedTxn && normalizedExt.includes(normalizedTxn)) {
    return { score: 30, matched: true, reason: 'Partial reference match' };
  }

  if (normalizedProv && normalizedExt.includes(normalizedProv)) {
    return { score: 30, matched: true, reason: 'Provider reference match' };
  }

  // Fuzzy match (Levenshtein distance)
  const txnDistance = txnRef ? levenshteinDistance(normalizedExt, normalizedTxn) : Infinity;
  const provDistance = provRef ? levenshteinDistance(normalizedExt, normalizedProv) : Infinity;
  const minDistance = Math.min(txnDistance, provDistance);

  if (minDistance <= 3) {
    return { score: 20, matched: true, reason: 'Similar reference (fuzzy match)' };
  }

  return { score: 0, matched: false, reason: 'No reference match' };
}

function matchAmount(extAmount: number, payAmount: number): { score: number; matched: boolean; reason: string } {
  const difference = Math.abs(extAmount - payAmount);
  const percentDiff = (difference / extAmount) * 100;

  if (difference < 0.01) {
    return { score: 30, matched: true, reason: 'Exact amount match' };
  }

  if (percentDiff < 1) {
    return { score: 25, matched: true, reason: 'Amount match within 1%' };
  }

  if (percentDiff < 5) {
    return { score: 15, matched: true, reason: 'Amount match within 5%' };
  }

  return { score: 0, matched: false, reason: 'Amount mismatch' };
}

function matchDate(extDate: string, payDate: string): { score: number; matched: boolean; reason: string } {
  const ext = new Date(extDate);
  const pay = new Date(payDate);
  const diffMs = Math.abs(ext.getTime() - pay.getTime());
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    return { score: 20, matched: true, reason: 'Same hour' };
  }

  if (diffHours < 24) {
    return { score: 15, matched: true, reason: 'Same day' };
  }

  if (diffHours < 72) {
    return { score: 10, matched: true, reason: 'Within 3 days' };
  }

  if (diffHours < 168) {
    return { score: 5, matched: true, reason: 'Within 7 days' };
  }

  return { score: 0, matched: false, reason: 'Date too far apart' };
}

function matchProvider(extProvider: string, payProvider: string): { score: number; matched: boolean; reason: string } {
  const normalizedExt = extProvider.toLowerCase().trim();
  const normalizedPay = payProvider.toLowerCase().trim();

  if (normalizedExt === normalizedPay) {
    return { score: 10, matched: true, reason: 'Same provider' };
  }

  if (normalizedExt.includes(normalizedPay) || normalizedPay.includes(normalizedExt)) {
    return { score: 7, matched: true, reason: 'Similar provider' };
  }

  return { score: 0, matched: false, reason: 'Different provider' };
}

function normalizeReference(ref: string): string {
  return ref.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Find best matching payment for external transaction
 */
export function findBestMatch(
  externalTxn: { reference: string; amount: number; date?: string; provider?: string },
  payments: any[]
): TransactionMatch | null {
  if (payments.length === 0) return null;

  const matches = payments
    .map((payment) => ({
      paymentId: payment.id,
      score: calculateMatchScore(externalTxn, payment),
      payment,
    }))
    .filter((match) => match.score.score >= 50) // Minimum threshold
    .sort((a, b) => b.score.score - a.score.score);

  return matches.length > 0 ? matches[0] : null;
}

/**
 * Bulk match multiple transactions
 */
export function bulkMatch(
  externalTxns: Array<{ id: string; reference: string; amount: number; date?: string; provider?: string }>,
  payments: any[]
): Array<{ externalId: string; match: TransactionMatch | null }> {
  return externalTxns.map((txn) => ({
    externalId: txn.id,
    match: findBestMatch(txn, payments),
  }));
}

/**
 * Generate reconciliation summary
 */
export function generateReconciliationSummary(records: any[]) {
  const total = records.length;
  const matched = records.filter((r) => r.status === 'matched').length;
  const unmatched = records.filter((r) => r.status === 'unmatched').length;
  const partial = records.filter((r) => r.status === 'partial').length;
  const overpaid = records.filter((r) => r.status === 'overpaid').length;

  const totalAmount = records.reduce((sum, r) => sum + Number(r.amount), 0);
  const matchedAmount = records
    .filter((r) => r.status === 'matched')
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const unmatchedAmount = records
    .filter((r) => r.status === 'unmatched')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const matchRate = total > 0 ? (matched / total) * 100 : 0;

  return {
    total,
    matched,
    unmatched,
    partial,
    overpaid,
    totalAmount,
    matchedAmount,
    unmatchedAmount,
    matchRate: Math.round(matchRate * 100) / 100,
  };
}
