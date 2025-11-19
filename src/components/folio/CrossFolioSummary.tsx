import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/finance/tax';
import { MultiFolio } from '@/hooks/useMultiFolios';
import { DollarSign, TrendingUp, Wallet } from 'lucide-react';

interface CrossFolioSummaryProps {
  folios: MultiFolio[];
}

const FOLIO_TYPE_LABELS: Record<string, string> = {
  room: 'Room',
  incidentals: 'Incidentals',
  corporate: 'Corporate',
  group: 'Group',
  mini_bar: 'Mini Bar',
  spa: 'Spa',
  restaurant: 'Restaurant',
};

export function CrossFolioSummary({ folios }: CrossFolioSummaryProps) {
  const totalCharges = folios.reduce((sum, f) => sum + f.total_charges, 0);
  const totalPayments = folios.reduce((sum, f) => sum + f.total_payments, 0);
  const grandBalance = folios.reduce((sum, f) => sum + f.balance, 0);

  // Group by folio type
  const byType = folios.reduce((acc, folio) => {
    const type = folio.folio_type;
    if (!acc[type]) {
      acc[type] = {
        charges: 0,
        payments: 0,
        balance: 0,
        count: 0,
      };
    }
    acc[type].charges += folio.total_charges;
    acc[type].payments += folio.total_payments;
    acc[type].balance += folio.balance;
    acc[type].count += 1;
    return acc;
  }, {} as Record<string, { charges: number; payments: number; balance: number; count: number }>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Cross-Folio Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grand Totals */}
        <div className="grid grid-cols-3 gap-4 pb-4 border-b">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Total Charges</div>
            <div className="text-lg font-bold text-destructive">
              {formatCurrency(totalCharges, 'NGN')}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Total Payments</div>
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(totalPayments, 'NGN')}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Grand Balance</div>
            <div className={`text-xl font-bold ${
              grandBalance > 0 ? 'text-destructive' : 'text-green-600'
            }`}>
              {formatCurrency(grandBalance, 'NGN')}
            </div>
          </div>
        </div>

        {/* Breakdown by Type */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            Breakdown by Folio Type
          </div>
          {Object.entries(byType).map(([type, data]) => (
            <div key={type} className="flex items-center justify-between p-2 rounded bg-muted/50">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {FOLIO_TYPE_LABELS[type] || type}
                </Badge>
                {data.count > 1 && (
                  <span className="text-xs text-muted-foreground">×{data.count}</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Charges</div>
                  <div className="font-medium text-destructive">
                    {formatCurrency(data.charges, 'NGN')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Payments</div>
                  <div className="font-medium text-green-600">
                    {formatCurrency(data.payments, 'NGN')}
                  </div>
                </div>
                <div className="text-right min-w-[100px]">
                  <div className="text-xs text-muted-foreground">Balance</div>
                  <div className={`font-bold ${
                    data.balance > 0 ? 'text-destructive' : 'text-green-600'
                  }`}>
                    {formatCurrency(data.balance, 'NGN')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="flex items-center justify-between pt-3 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span>{folios.length} Active Folios</span>
          </div>
          <div>
            Across {Object.keys(byType).length} Types
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
