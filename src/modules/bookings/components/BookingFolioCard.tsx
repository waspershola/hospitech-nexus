import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBookingFolio } from '@/hooks/useBookingFolio';
import { useManualCreateFolio } from '@/hooks/useManualCreateFolio';
import { formatCurrency } from '@/lib/finance/tax';
import { Calendar, CreditCard, Info, Plus, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BookingFolioCardProps {
  bookingId: string;
  currency?: string;
  bookingStatus?: string;
}

export function BookingFolioCard({ bookingId, currency = 'NGN', bookingStatus }: BookingFolioCardProps) {
  const { data: folio, isLoading } = useBookingFolio(bookingId);
  const { mutate: createFolio, isPending: isCreatingFolio } = useManualCreateFolio();

  // Debug logging
  console.log('[BookingFolioCard] Rendering with:', { bookingId, folio, isLoading, bookingStatus });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Fallback UI when folio doesn't exist
  if (!folio) {
    console.log('[BookingFolioCard] No folio data found for booking:', bookingId);
    
    const isCheckedIn = bookingStatus === 'checked_in';
    
    return (
      <Card className={isCheckedIn ? "border-destructive" : "border-dashed"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            {isCheckedIn ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Info className="h-5 w-5" />
            )}
            {isCheckedIn ? 'Stay Folio Missing' : 'Stay Folio Not Created Yet'}
          </CardTitle>
          <CardDescription>
            {isCheckedIn 
              ? 'The folio should have been created during check-in but is missing.'
              : 'The stay folio will be automatically created when the guest checks in.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCheckedIn ? (
            <>
              <div className="bg-destructive/10 rounded-lg p-4 text-sm">
                <p className="font-medium text-destructive mb-2">Action Required</p>
                <p className="text-muted-foreground mb-3">
                  This guest is checked in but has no folio. Create one now to track charges and payments.
                </p>
                <Button
                  onClick={() => createFolio(bookingId)}
                  disabled={isCreatingFolio}
                  size="sm"
                  className="w-full"
                >
                  {isCreatingFolio ? (
                    <>
                      <Plus className="h-4 w-4 mr-2 animate-spin" />
                      Creating Folio...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Folio Now
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="mb-2">Folio information will be available after check-in, including:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Room charges and extras</li>
                <li>Payment history</li>
                <li>Outstanding balance</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const balanceStatus = folio.balance === 0 ? 'paid' : folio.balance > 0 ? 'due' : 'credit';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Stay Folio</span>
          <Badge variant={balanceStatus === 'paid' ? 'default' : balanceStatus === 'due' ? 'destructive' : 'secondary'}>
            {balanceStatus === 'paid' && 'Paid in Full'}
            {balanceStatus === 'due' && `Balance Due: ${formatCurrency(folio.balance, currency)}`}
            {balanceStatus === 'credit' && `Credit: ${formatCurrency(Math.abs(folio.balance), currency)}`}
          </Badge>
        </CardTitle>
        <CardDescription>Complete payment breakdown for this stay</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Booking Charges with Tax Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold">Booking Charges</h3>
            {folio.bookingTaxBreakdown && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Includes VAT and service charges</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {folio.bookingTaxBreakdown ? (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Amount</span>
                <span className="font-medium">
                  {formatCurrency(folio.bookingTaxBreakdown.baseAmount, currency)}
                </span>
              </div>
              {folio.bookingTaxBreakdown.vatAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    VAT ({folio.bookingTaxBreakdown.vatRate}%)
                  </span>
                  <span className="font-medium">
                    {formatCurrency(folio.bookingTaxBreakdown.vatAmount, currency)}
                  </span>
                </div>
              )}
              {folio.bookingTaxBreakdown.serviceChargeAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Service Charge ({folio.bookingTaxBreakdown.serviceCharge}%)
                  </span>
                  <span className="font-medium">
                    {formatCurrency(folio.bookingTaxBreakdown.serviceChargeAmount, currency)}
                  </span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total Charges</span>
                <span>{formatCurrency(folio.totalCharges, currency)}</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-between font-semibold bg-muted/50 rounded-lg p-4">
              <span>Total Charges</span>
              <span>{formatCurrency(folio.totalCharges, currency)}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Payments */}
        <div className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payments Received
          </h3>

          {folio.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No payments recorded yet</p>
          ) : (
            <div className="space-y-3">
              {folio.payments.map((payment) => (
                <div key={payment.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {payment.method_provider || payment.method}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ref: {payment.transaction_ref}
                      </p>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(payment.amount, currency)}
                    </span>
                  </div>

                  {payment.tax_breakdown && (
                    <div className="border-t border-border pt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Base</span>
                        <span>{formatCurrency(payment.tax_breakdown.baseAmount, currency)}</span>
                      </div>
                      {payment.tax_breakdown.vatAmount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">VAT</span>
                          <span>{formatCurrency(payment.tax_breakdown.vatAmount, currency)}</span>
                        </div>
                      )}
                      {payment.tax_breakdown.serviceChargeAmount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Service</span>
                          <span>{formatCurrency(payment.tax_breakdown.serviceChargeAmount, currency)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="bg-primary/5 rounded-lg p-3 flex justify-between items-center font-semibold">
            <span>Total Paid</span>
            <span>{formatCurrency(folio.totalPayments, currency)}</span>
          </div>
        </div>

        <Separator />

        {/* Balance */}
        <div className={`rounded-lg p-4 flex justify-between items-center text-lg font-bold ${
          balanceStatus === 'paid' ? 'bg-success/10 text-success' : 
          balanceStatus === 'due' ? 'bg-destructive/10 text-destructive' : 
          'bg-primary/10 text-primary'
        }`}>
          <span>{balanceStatus === 'credit' ? 'Credit Balance' : 'Outstanding Balance'}</span>
          <span>{formatCurrency(Math.abs(folio.balance), currency)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
