import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useBookingFolio } from '@/hooks/useBookingFolio';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/finance/tax';
import { format } from 'date-fns';
import { Loader2, Receipt, Printer, Mail, CreditCard, Calendar, User, DollarSign } from 'lucide-react';
import { usePrintReceipt } from '@/hooks/usePrintReceipt';

interface FolioDetailDrawerProps {
  bookingId: string | null;
  open: boolean;
  onClose: () => void;
}

export function FolioDetailDrawer({ bookingId, open, onClose }: FolioDetailDrawerProps) {
  const { tenantId } = useAuth();
  const { data: folio, isLoading } = useBookingFolio(bookingId);
  const { print, isPrinting } = usePrintReceipt();

  const { data: booking } = useQuery({
    queryKey: ['booking-detail', bookingId, tenantId],
    queryFn: async () => {
      if (!bookingId || !tenantId) return null;
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          guests(name, email, phone),
          rooms(number, type)
        `)
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId && !!tenantId && open,
  });

  if (!bookingId) return null;

  const handlePrint = () => {
    if (bookingId) {
      print({ 
        receiptType: 'reservation',
        bookingId 
      });
    }
  };

  const getBalanceStatus = (balance: number) => {
    if (balance === 0) return { label: 'Paid', variant: 'default' as const, color: 'text-green-600' };
    if (balance > 0) return { label: 'Due', variant: 'destructive' as const, color: 'text-red-600' };
    return { label: 'Credit', variant: 'secondary' as const, color: 'text-blue-600' };
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Stay Folio Details
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : folio && booking ? (
          <div className="space-y-6 mt-6">
            {/* Guest & Room Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Guest Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Guest Name</p>
                    <p className="font-medium">{booking.guests?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Room</p>
                    <p className="font-medium">{booking.rooms?.number} ({booking.rooms?.type})</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Check-in</p>
                    <p className="font-medium">{format(new Date(booking.check_in), 'PPP')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Check-out</p>
                    <p className="font-medium">{format(new Date(booking.check_out), 'PPP')}</p>
                  </div>
                </div>
                {folio.isGroupBooking && (
                  <Badge variant="outline" className="mt-2">
                    Group Booking ({folio.numberOfBookings} rooms)
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Balance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Charges</p>
                    <p className="text-2xl font-bold">{formatCurrency(folio.totalCharges, folio.currency)}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Paid</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(folio.totalPayments, folio.currency)}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Balance</p>
                    <p className={`text-2xl font-bold ${getBalanceStatus(folio.balance).color}`}>
                      {formatCurrency(folio.balance, folio.currency)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm font-medium">Payment Status:</span>
                  <Badge variant={getBalanceStatus(folio.balance).variant}>
                    {getBalanceStatus(folio.balance).label}
                  </Badge>
                </div>

                {/* Tax Breakdown */}
                {folio.bookingTaxBreakdown && (
                  <Accordion type="single" collapsible className="border rounded-lg">
                    <AccordionItem value="tax-breakdown" className="border-0">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <span className="text-sm font-medium">Charge Breakdown</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Base Amount</span>
                            <span className="font-medium">{formatCurrency(folio.bookingTaxBreakdown.baseAmount, folio.currency)}</span>
                          </div>
                          {folio.bookingTaxBreakdown.serviceChargeAmount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Service Charge</span>
                              <span className="font-medium">{formatCurrency(folio.bookingTaxBreakdown.serviceChargeAmount, folio.currency)}</span>
                            </div>
                          )}
                          {folio.bookingTaxBreakdown.vatAmount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">VAT</span>
                              <span className="font-medium">{formatCurrency(folio.bookingTaxBreakdown.vatAmount, folio.currency)}</span>
                            </div>
                          )}
                          <Separator />
                          <div className="flex justify-between font-semibold">
                            <span>Total</span>
                            <span>{formatCurrency(folio.bookingTaxBreakdown.totalAmount, folio.currency)}</span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment History
                  <Badge variant="outline" className="ml-auto">{folio.payments.length} transaction{folio.payments.length !== 1 ? 's' : ''}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {folio.payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No payments recorded yet</p>
                ) : (
                  <div className="space-y-3">
                    {folio.payments.map((payment) => (
                      <div key={payment.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {format(new Date(payment.created_at), 'PPP p')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CreditCard className="h-3 w-3" />
                            <span>
                              {payment.method}
                              {payment.method_provider && ` (${payment.method_provider})`}
                            </span>
                          </div>
                          {payment.transaction_ref && (
                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                              Ref: {payment.transaction_ref}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(payment.amount, folio.currency)}
                          </p>
                          {payment.tax_breakdown && (
                            <p className="text-xs text-muted-foreground">
                              (inc. taxes)
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handlePrint} disabled={isPrinting} className="flex-1" variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                {isPrinting ? 'Printing...' : 'Print Folio'}
              </Button>
              <Button variant="outline" className="flex-1" disabled>
                <Mail className="h-4 w-4 mr-2" />
                Email Folio
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No folio data available</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
