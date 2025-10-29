import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { generateReconciliationSummary } from '@/lib/finance/reconciliation';
import { CheckCircle2, XCircle, AlertCircle, TrendingUp } from 'lucide-react';

interface ReconciliationSummaryProps {
  records: any[];
}

export function ReconciliationSummary({ records }: ReconciliationSummaryProps) {
  const summary = generateReconciliationSummary(records);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Reconciliation Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Match Rate</span>
            <span className="font-semibold">{summary.matchRate}%</span>
          </div>
          <Progress value={summary.matchRate} className="h-2" />
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Matched
            </div>
            <div className="text-2xl font-bold">{summary.matched}</div>
            <div className="text-xs text-muted-foreground">
              ₦{summary.matchedAmount.toLocaleString()}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircle className="h-4 w-4 text-destructive" />
              Unmatched
            </div>
            <div className="text-2xl font-bold">{summary.unmatched}</div>
            <div className="text-xs text-muted-foreground">
              ₦{summary.unmatchedAmount.toLocaleString()}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-warning" />
              Partial
            </div>
            <div className="text-2xl font-bold">{summary.partial}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-warning" />
              Overpaid
            </div>
            <div className="text-2xl font-bold">{summary.overpaid}</div>
          </div>
        </div>

        {/* Total Summary */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Transactions</span>
            <span className="font-semibold">{summary.total}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Amount</span>
            <span className="font-semibold">₦{summary.totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Insights */}
        {summary.matchRate < 80 && summary.unmatched > 0 && (
          <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning">Attention Needed</p>
                <p className="text-muted-foreground mt-1">
                  {summary.unmatched} unmatched {summary.unmatched === 1 ? 'transaction' : 'transactions'} totaling ₦
                  {summary.unmatchedAmount.toLocaleString()}. Use Smart Auto-Match or manual matching to reconcile.
                </p>
              </div>
            </div>
          </div>
        )}

        {summary.matchRate >= 95 && (
          <div className="rounded-lg bg-success/10 border border-success/20 p-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-success">Excellent!</p>
                <p className="text-muted-foreground mt-1">
                  Your reconciliation rate is excellent. Keep up the good work!
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
