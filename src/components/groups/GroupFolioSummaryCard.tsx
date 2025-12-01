import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/finance/tax";
import { formatFolioMoney, getBalanceColor, getCreditLabel, isCredit } from "@/lib/folio/formatters";
import { Building2, Users, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import type { AggregatedBalances, ExpectedTotals } from "@/hooks/useGroupMasterFolio";

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
  expectedTotals: ExpectedTotals;
}

export function GroupFolioSummaryCard({
  masterFolio,
  aggregatedBalances,
  childFoliosCount,
  expectedTotals,
}: GroupFolioSummaryCardProps) {
  const pendingCheckins = expectedTotals.room_count - childFoliosCount;
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
        {/* Expected Total from Bookings */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">Expected Total</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total charges from {expectedTotals.room_count} room reservation{expectedTotals.room_count !== 1 ? 's' : ''}
              </p>
              <p className="text-3xl font-bold mt-2 text-primary">
                {formatCurrency(expectedTotals.expected_total, 'NGN')}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-primary/20" />
          </div>
        </div>

        {/* Pending Check-ins Warning */}
        {pendingCheckins > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                {pendingCheckins} room{pendingCheckins !== 1 ? 's' : ''} pending check-in
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Charges will be posted to folios when guests check in
              </p>
            </div>
          </div>
        )}

        {/* Posted Charges (from folios) */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Outstanding Balance</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                From checked-in guests only
              </p>
              <p className={`text-3xl font-bold mt-2 ${getBalanceColor(aggregatedBalances.outstanding_balance)}`}>
                {isCredit(aggregatedBalances.outstanding_balance) 
                  ? getCreditLabel(aggregatedBalances.outstanding_balance, 'NGN')
                  : formatFolioMoney(aggregatedBalances.outstanding_balance, 'NGN')
                }
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
              <span className="text-sm">Posted Charges</span>
            </div>
            <p className="text-2xl font-semibold">
              {formatCurrency(aggregatedBalances.total_charges, 'NGN')}
            </p>
            <p className="text-xs text-muted-foreground">From checked-in guests</p>
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
              <span className="text-sm">Checked In</span>
            </div>
            <p className="text-2xl font-semibold">{childFoliosCount} / {expectedTotals.room_count}</p>
            <p className="text-xs text-muted-foreground">Room folios created</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="text-sm">Total Rooms</span>
            </div>
            <p className="text-2xl font-semibold">{expectedTotals.room_count}</p>
            <p className="text-xs text-muted-foreground">Reserved rooms</p>
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
                      <p className="font-medium text-sm flex items-center gap-2">
                        Room {child.room_number}
                        {isCredit(child.balance) && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            Credit
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{child.guest_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${getBalanceColor(child.balance)}`}>
                      {isCredit(child.balance) 
                        ? getCreditLabel(child.balance, 'NGN')
                        : formatFolioMoney(child.balance, 'NGN')
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFolioMoney(child.charges, 'NGN')} - {formatFolioMoney(child.payments, 'NGN')}
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
