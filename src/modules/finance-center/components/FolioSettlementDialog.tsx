import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Receipt, CreditCard, TrendingUp, Wallet, CheckCircle2 } from 'lucide-react';

interface FolioSettlementDialogProps {
  folioId: string | null;
  open: boolean;
  onClose: () => void;
}

const formatNGN = (amount: number) => {
  return amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export function FolioSettlementDialog({ folioId, open, onClose }: FolioSettlementDialogProps) {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastPayment, setLastPayment] = useState<any>(null);

  // Fetch available payment methods
  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('hotel_configurations')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('key', 'payment_methods')
        .maybeSingle();
      
      const methods = data?.value as string[] | null;
      return methods || ['cash', 'card', 'transfer', 'mobile_money', 'wallet'];
    },
    enabled: !!tenantId && open,
  });

  const { data: folio, isLoading } = useQuery({
    queryKey: ['folio', folioId],
    queryFn: async () => {
      if (!folioId) return null;

      const { data, error } = await supabase
        .from('stay_folios')
        .select(`
          *,
          booking:bookings(*),
          guest:guests(*),
          room:rooms(*)
        `)
        .eq('id', folioId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!folioId && open,
  });

  // Enhanced transaction summary with grouping
  const { data: transactionSummary } = useQuery({
    queryKey: ['folio-transactions-summary', folioId],
    queryFn: async () => {
      if (!folioId) return null;

      const { data: transactions, error } = await supabase
        .from('folio_transactions')
        .select('*')
        .eq('folio_id', folioId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group charges by department
      const charges = transactions
        ?.filter(t => t.transaction_type === 'charge')
        .reduce((acc, t) => {
          const dept = t.department || 'Other';
          if (!acc[dept]) acc[dept] = [];
          acc[dept].push(t);
          return acc;
        }, {} as Record<string, any[]>) || {};

      // Group payments by method with metadata
      const payments = transactions
        ?.filter(t => t.transaction_type === 'payment')
        .map(t => ({
          ...t,
          method: (t.metadata as any)?.payment_method || 'Cash',
        })) || [];

      // Calculate subtotal (before tax)
      const subtotal = transactions
        ?.filter(t => t.transaction_type === 'charge')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Calculate tax (7.5% VAT)
      const taxRate = 0.075;
      const taxAmount = subtotal * taxRate;
      const totalCharges = subtotal + taxAmount;

      return {
        charges,
        payments,
        subtotal,
        taxAmount,
        totalCharges,
      };
    },
    enabled: !!folioId && open,
  });

  const settleMutation = useMutation({
    mutationFn: async () => {
      // DEFENSIVE TYPE CHECKING - Capture folioId immediately to avoid closure issues
      const currentFolioId = folioId;
      
      console.log('[Settlement Debug] Start mutation', {
        folioIdType: typeof currentFolioId,
        folioIdValue: currentFolioId,
        folioIdLength: currentFolioId?.length,
        folioObjectKeys: folio ? Object.keys(folio) : null,
        folioObjectId: folio?.id,
        amountValue: amount,
        paymentMethodValue: paymentMethod,
      });

      if (!currentFolioId || !folio) {
        console.error('[Settlement] Missing required data:', { currentFolioId, folio });
        throw new Error('No folio selected');
      }

      // Validate that folioId is actually a string UUID
      if (typeof currentFolioId !== 'string') {
        console.error('[Settlement] Invalid folioId type:', typeof currentFolioId, currentFolioId);
        throw new Error(`Invalid folio ID type: expected string, got ${typeof currentFolioId}`);
      }

      // Additional UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(currentFolioId)) {
        console.error('[Settlement] Invalid folioId format:', currentFolioId);
        throw new Error(`Invalid folio ID format: ${currentFolioId}`);
      }

      console.log('[Settlement] Validation passed, proceeding with payment amount:', parseFloat(amount) || folio.balance);

      const paymentAmount = parseFloat(amount) || folio.balance;

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          tenant_id: folio.tenant_id,
          booking_id: folio.booking_id,
          guest_id: folio.guest_id,
          amount: paymentAmount,
          expected_amount: folio.balance,
          currency: 'NGN',
          method: paymentMethod,
          status: 'completed',
          transaction_ref: `SETTLE-${Date.now()}`,
          metadata: {
            settlement_type: 'folio_settlement',
            folio_id: currentFolioId,
          }
        })
        .select()
        .single();

      if (paymentError) {
        console.error('[Settlement] Payment creation failed:', paymentError);
        throw paymentError;
      }

      console.log('[Settlement] Payment created successfully:', payment.id, 'Now posting to folio...');
      console.log('[Settlement] RPC parameters:', {
        p_folio_id: currentFolioId,
        p_folio_id_type: typeof currentFolioId,
        p_payment_id: payment.id,
        p_amount: paymentAmount
      });

      // Post payment to folio using the captured folioId variable
      const { error: folioError } = await supabase.rpc('folio_post_payment', {
        p_folio_id: currentFolioId,
        p_payment_id: payment.id,
        p_amount: paymentAmount
      });

      if (folioError) {
        console.error('[Settlement] Folio post payment failed:', folioError);
        throw folioError;
      }

      console.log('[Settlement] Folio updated successfully');

      return payment;
    },
    onSuccess: (payment) => {
      // QUERY-KEY-FIX-V1: Specific cache invalidation with tenantId
      setLastPayment(payment);
      setShowReceipt(true);
      toast.success('Payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['outstanding-folios'] });
      queryClient.invalidateQueries({ queryKey: ['folio', folioId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['folio-transactions-summary', folioId] });
      // Also invalidate booking-folio if we have booking context
      if (folio?.booking_id) {
        queryClient.invalidateQueries({ queryKey: ['booking-folio', folio.booking_id, tenantId] });
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to settle folio: ${error.message}`);
    },
  });

  const handleSettle = () => {
    settleMutation.mutate();
  };

  const handleCloseAll = () => {
    setShowReceipt(false);
    setLastPayment(null);
    setAmount('');
    setPaymentMethod('cash');
    onClose();
  };

  const paymentAmount = parseFloat(amount) || folio?.balance || 0;
  const remainingBalance = folio ? folio.balance - paymentAmount : 0;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleCloseAll()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Folio Settlement - Invoice
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : folio ? (
          <>
            {!showReceipt ? (
              <ScrollArea className="max-h-[65vh] pr-4">
                <div className="space-y-6 py-4">
                  {/* Guest Info Header */}
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Guest</p>
                      <p className="font-semibold text-lg">{folio.guest?.name}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-sm text-muted-foreground">Room {folio.room?.number}</p>
                      <p className="text-sm font-medium">{folio.booking?.booking_reference}</p>
                    </div>
                  </div>

                  {/* CHARGES SECTION */}
                  <Card className="border-2">
                    <CardHeader className="bg-slate-50 border-b pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-slate-600" />
                        CHARGES
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {/* Room Charges */}
                        {transactionSummary?.charges['Room'] && (
                          <div className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">Room {folio.room?.number}</p>
                                <p className="text-sm text-muted-foreground">
                                  {folio.booking?.check_in && folio.booking?.check_out && (
                                    <>
                                      {format(new Date(folio.booking.check_in), 'MMM d')} - 
                                      {format(new Date(folio.booking.check_out), 'MMM d')}
                                    </>
                                  )}
                                </p>
                              </div>
                              <span className="font-semibold">
                                ₦{formatNGN(transactionSummary.charges['Room'].reduce((sum, t) => sum + t.amount, 0))}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Other Services */}
                        {Object.entries(transactionSummary?.charges || {})
                          .filter(([dept]) => dept !== 'Room')
                          .map(([dept, items]) => (
                            <div key={dept} className="p-4 flex justify-between">
                              <span>{dept}</span>
                              <span className="font-medium">
                                ₦{formatNGN(items.reduce((sum: number, t: any) => sum + t.amount, 0))}
                              </span>
                            </div>
                          ))}

                        {/* Subtotal & Tax */}
                        <div className="p-4 bg-slate-50 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span className="font-semibold">
                              ₦{formatNGN(transactionSummary?.subtotal || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>VAT (7.5%)</span>
                            <span className="font-semibold">
                              ₦{formatNGN(transactionSummary?.taxAmount || 0)}
                            </span>
                          </div>
                        </div>

                        {/* Total Charges */}
                        <div className="p-4 bg-slate-100 border-t-2 border-slate-300">
                          <div className="flex justify-between">
                            <span className="font-bold text-base">Total Charges</span>
                            <span className="font-bold text-lg">
                              ₦{formatNGN(folio.total_charges || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* PAYMENT HISTORY SECTION */}
                  <Card className="border-2">
                    <CardHeader className="bg-emerald-50 border-b pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-emerald-600" />
                        PAYMENT HISTORY
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {transactionSummary?.payments && transactionSummary.payments.length > 0 ? (
                        <div className="divide-y">
                          {transactionSummary.payments.map((payment: any) => (
                            <div key={payment.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {payment.method}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(payment.created_at), 'MMM d, h:mm a')}
                                  </span>
                                </div>
                                {payment.reference_id && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Ref: {payment.reference_id}
                                  </p>
                                )}
                              </div>
                              <span className="font-semibold text-emerald-600 text-base">
                                -₦{formatNGN(payment.amount)}
                              </span>
                            </div>
                          ))}
                          
                          {/* Total Paid */}
                          <div className="p-4 bg-emerald-50 border-t-2">
                            <div className="flex justify-between">
                              <span className="font-bold text-base">Total Paid</span>
                              <span className="font-bold text-emerald-600 text-lg">
                                ₦{formatNGN(folio.total_payments || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-muted-foreground text-sm">
                          No payments recorded yet
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* OUTSTANDING BALANCE - PROMINENT */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-red-400/20 rounded-lg blur-xl"></div>
                    <Card className="relative border-4 border-amber-500 bg-gradient-to-br from-amber-50 to-red-50">
                      <CardContent className="p-6">
                        <div className="text-center space-y-2">
                          <p className="text-sm font-medium text-amber-700 uppercase tracking-wider">
                            Outstanding Balance
                          </p>
                          <div className="flex items-center justify-center gap-3">
                            <TrendingUp className="h-8 w-8 text-amber-600" />
                            <p className="text-5xl font-bold text-amber-700">
                              ₦{formatNGN(folio.balance || 0)}
                            </p>
                          </div>
                          <p className="text-xs text-amber-600">
                            Folio #{folioId?.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* PAYMENT SECTION */}
                  <Card className="border-2 border-blue-200">
                    <CardHeader className="bg-blue-50 border-b pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        Record Payment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {/* Amount Input */}
                      <div className="space-y-2">
                        <Label htmlFor="amount" className="text-base font-semibold">
                          Payment Amount
                        </Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">
                            ₦
                          </span>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            placeholder={folio.balance.toFixed(2)}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="pl-10 h-14 text-2xl font-bold"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Leave empty to settle full balance (₦{formatNGN(folio.balance)})
                        </p>
                      </div>

                      {/* Payment Method */}
                      <div className="space-y-2">
                        <Label htmlFor="method" className="text-base font-semibold">
                          Payment Method
                        </Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger id="method" className="h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods?.map((method) => (
                              <SelectItem key={method} value={method} className="text-base">
                                {method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Balance Preview */}
                      {paymentAmount > 0 && (
                        <div className="space-y-2">
                          <Separator />
                          <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Balance Preview
                            </p>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Current Balance:</span>
                              <span className="font-bold">
                                ₦{formatNGN(folio.balance)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Payment:</span>
                              <span className="font-bold text-blue-600">
                                -₦{formatNGN(paymentAmount)}
                              </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">Balance After Payment:</span>
                              <span className={`text-xl font-bold ${
                                remainingBalance === 0 
                                  ? 'text-green-600' 
                                  : remainingBalance > 0 
                                    ? 'text-amber-600' 
                                    : 'text-red-600'
                              }`}>
                                ₦{formatNGN(Math.abs(remainingBalance))}
                              </span>
                            </div>
                            
                            {/* Status Alerts */}
                            {remainingBalance === 0 && (
                              <Alert className="border-green-200 bg-green-50 mt-2">
                                <AlertDescription className="text-green-700 font-semibold text-center">
                                  ✓ Folio will be fully settled
                                </AlertDescription>
                              </Alert>
                            )}
                            {remainingBalance > 0 && (
                              <Alert className="border-amber-200 bg-amber-50 mt-2">
                                <AlertDescription className="text-amber-700 text-center">
                                  Partial payment - ₦{formatNGN(remainingBalance)} remaining
                                </AlertDescription>
                              </Alert>
                            )}
                            {remainingBalance < 0 && (
                              <Alert className="border-blue-200 bg-blue-50 mt-2">
                                <AlertDescription className="text-blue-700 text-center">
                                  Overpayment - ₦{formatNGN(Math.abs(remainingBalance))} will be credited
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            ) : (
              /* RECEIPT PREVIEW */
              <div className="py-6 px-4">
                <div className="max-w-md mx-auto">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-3xl font-bold text-green-700">Payment Successful</h3>
                      <p className="text-muted-foreground mt-1">Folio #{folioId?.slice(0, 8).toUpperCase()}</p>
                    </div>

                    <Separator />

                    <div className="space-y-3 text-left bg-slate-50 p-6 rounded-lg border-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Transaction Ref:</span>
                        <span className="font-mono font-bold text-sm">{lastPayment?.transaction_ref}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Amount Paid:</span>
                        <span className="font-bold text-green-600 text-xl">
                          ₦{formatNGN(lastPayment?.amount || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Payment Method:</span>
                        <Badge variant="secondary">{paymentMethod.toUpperCase()}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Date/Time:</span>
                        <span className="font-medium">{format(new Date(), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Guest:</span>
                        <span className="font-semibold">{folio.guest?.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Room:</span>
                        <span className="font-semibold">{folio.room?.number}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => window.print()}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Print Receipt
                      </Button>
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={handleCloseAll}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Folio not found
          </div>
        )}

        {!showReceipt && (
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseAll} disabled={settleMutation.isPending}>
              Cancel
            </Button>
            <Button 
              onClick={handleSettle} 
              disabled={settleMutation.isPending || !folio || paymentAmount <= 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {settleMutation.isPending ? 'Processing...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          #receipt-preview, #receipt-preview * { visibility: visible; }
        }
      `}</style>
    </Dialog>
  );
}
