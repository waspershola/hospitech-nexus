import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/finance/tax';

interface QRFolioBalanceProps {
  folioBalance: number;
  totalCharges: number;
  totalPayments: number;
  currency?: string;
}

export function QRFolioBalance({ 
  folioBalance, 
  totalCharges, 
  totalPayments,
  currency = 'NGN' 
}: QRFolioBalanceProps) {
  const isBalanced = folioBalance === 0;
  const hasCredit = folioBalance < 0;
  const hasDebt = folioBalance > 0;

  return (
    <Card className="shadow-lg backdrop-blur-sm bg-card/80 border-2 border-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Your Folio</CardTitle>
          </div>
          {isBalanced && (
            <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3" />
              Settled
            </Badge>
          )}
          {hasDebt && (
            <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
              <AlertCircle className="h-3 w-3" />
              Balance Due
            </Badge>
          )}
          {hasCredit && (
            <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
              <CheckCircle2 className="h-3 w-3" />
              Credit
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total Charges:</span>
            <span className="font-medium">{formatCurrency(totalCharges, currency)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Payments Received:</span>
            <span className="font-medium text-green-600">
              -{formatCurrency(totalPayments, currency)}
            </span>
          </div>
          <div className="h-px bg-border my-2" />
          <div className="flex justify-between items-center text-base font-semibold">
            <span>Outstanding Balance:</span>
            <span className={
              isBalanced ? 'text-green-600' : 
              hasCredit ? 'text-blue-600' : 
              'text-amber-600'
            }>
              {formatCurrency(Math.abs(folioBalance), currency)}
              {hasCredit && ' (Credit)'}
            </span>
          </div>
        </div>

        {isBalanced && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700 text-center">
              ✓ Your folio is fully settled. Thank you!
            </p>
          </div>
        )}

        {hasDebt && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 text-center">
              Please settle your balance before check-out.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
