import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useBookingFolio } from '@/hooks/useBookingFolio';
import { formatCurrency } from '@/lib/finance/tax';
import { Calendar, CreditCard, Info } from 'lucide-react';
import { FolioPDFButtons } from '@/components/folio/FolioPDFButtons';
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
  folioId?: string | null;
  guestEmail?: string | null;
  guestName?: string;
}

export function BookingFolioCard({ bookingId, currency = 'NGN', folioId: propFolioId, guestEmail: propGuestEmail, guestName: propGuestName }: BookingFolioCardProps) {
  const { data: folio, isLoading } = useBookingFolio(bookingId);

  // Use folio data for PDF actions
  const actualFolioId = propFolioId || folio?.folioId;
  const actualGuestEmail = propGuestEmail || folio?.guestEmail;
  const actualGuestName = propGuestName || folio?.guestName;

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

  if (!folio) {
    return null;
  }

  const balanceStatus = folio.balance === 0 ? 'paid' : folio.balance > 0 ? 'due' : 'credit';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Booking Folio</span>
          <div className="flex items-center gap-2">
            <Badge variant={balanceStatus === 'paid' ? 'default' : balanceStatus === 'due' ? 'destructive' : 'secondary'}>
              {balanceStatus === 'paid' && 'Paid in Full'}
              {balanceStatus === 'due' && `Balance Due: ${formatCurrency(folio.balance, currency)}`}
              {balanceStatus === 'credit' && `Credit: ${formatCurrency(Math.abs(folio.balance), currency)}`}
            </Badge>
            {actualFolioId && (
              <FolioPDFButtons 
                folioId={actualFolioId}
                guestEmail={actualGuestEmail}
                guestName={actualGuestName}
                size="sm"
                showLabels={false}
              />
            )}
          </div>
        </CardTitle>
        <CardDescription>Complete payment breakdown for this booking</CardDescription>
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
