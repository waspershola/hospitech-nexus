import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/finance/tax";
import { Building2, Users, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import type { AggregatedBalances } from "@/hooks/useGroupMasterFolio";

interface GroupFolioSummaryCardProps {
  masterFolio: {
    id: string;
    folio_number: string;
    folio_type: string;
    total_charges: number;
    total_payments: number;
    balance: number;
    status: string;
    created_at: string;
  };
  aggregatedBalances: AggregatedBalances;
  childFoliosCount: number;
}

export function GroupFolioSummaryCard({
  masterFolio,
  aggregatedBalances,
  childFoliosCount,
}: GroupFolioSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Master Folio Summary
          </CardTitle>
          <Badge variant={masterFolio.status === 'open' ? 'default' : 'secondary'}>
            {masterFolio.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Grand Total */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Outstanding Balance</p>
              <p className={`text-3xl font-bold ${
              aggregatedBalances.outstanding_balance > 0 
                  ? 'text-destructive' 
                  : 'text-green-600'
              }`}>
                {formatCurrency(aggregatedBalances.outstanding_balance, 'NGN')}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-muted-foreground/20" />
          </div>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Total Charges</span>
            </div>
            <p className="text-2xl font-semibold">
              {formatCurrency(aggregatedBalances.total_charges, 'NGN')}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm">Total Payments</span>
            </div>
            <p className="text-2xl font-semibold text-green-600">
              {formatCurrency(aggregatedBalances.total_payments, 'NGN')}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Child Folios</span>
            </div>
            <p className="text-2xl font-semibold">{childFoliosCount}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="text-sm">Master Balance</span>
            </div>
            <p className="text-2xl font-semibold">
              {formatCurrency(masterFolio.balance, 'NGN')}
            </p>
          </div>
        </div>

        {/* Breakdown by Folio Type */}
        {aggregatedBalances.children_breakdown?.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Breakdown by Room</h4>
            <div className="space-y-2">
              {aggregatedBalances.children_breakdown.map((child) => (
                <div
                  key={child.folio_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div>
                      <p className="font-medium text-sm">Room {child.room_number}</p>
                      <p className="text-xs text-muted-foreground">{child.guest_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      child.balance > 0 ? 'text-destructive' : 'text-green-600'
                    }`}>
                      {formatCurrency(child.balance, 'NGN')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(child.charges, 'NGN')} - {formatCurrency(child.payments, 'NGN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
