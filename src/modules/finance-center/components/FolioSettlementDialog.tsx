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
import { Receipt, CreditCard, TrendingUp, TrendingDown, Wallet, Calendar, User, Home } from 'lucide-react';

interface FolioSettlementDialogProps {
  folioId: string | null;
  open: boolean;
  onClose: () => void;
}

export function FolioSettlementDialog({ folioId, open, onClose }: FolioSettlementDialogProps) {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

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

  // Fetch folio transactions for history
  const { data: transactions } = useQuery({
    queryKey: ['folio-transactions', folioId],
    queryFn: async () => {
      if (!folioId) return [];
      
      const { data, error } = await supabase
        .from('folio_transactions')
        .select('*')
        .eq('folio_id', folioId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!folioId && open,
  });

  const settleMutation = useMutation({
    mutationFn: async () => {
      if (!folioId || !folio) throw new Error('No folio selected');

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
            folio_id: folioId,
          }
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Post payment to folio
      const { error: folioError } = await supabase.rpc('folio_post_payment', {
        p_folio_id: folioId,
        p_payment_id: payment.id,
        p_amount: paymentAmount
      });

      if (folioError) throw folioError;

      return payment;
    },
    onSuccess: () => {
      toast.success('Payment recorded and folio updated successfully');
      queryClient.invalidateQueries({ queryKey: ['outstanding-folios'] });
      queryClient.invalidateQueries({ queryKey: ['folio', folioId] });
      queryClient.invalidateQueries({ queryKey: ['booking-folio'] });
      onClose();
      setAmount('');
      setPaymentMethod('cash');
    },
    onError: (error: Error) => {
      toast.error(`Failed to settle folio: ${error.message}`);
    },
  });

  const handleSettle = () => {
    settleMutation.mutate();
  };

  const paymentAmount = parseFloat(amount) || folio?.balance || 0;
  const remainingBalance = folio ? folio.balance - paymentAmount : 0;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Settle Folio Balance</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : folio ? (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              {/* Folio Summary */}
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Guest:</span>
                  <span className="font-medium">{folio.guest?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Room:</span>
                  <span className="font-medium">{folio.room?.number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Booking:</span>
                  <span className="font-medium">{folio.booking?.booking_reference}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Charges:</span>
                  <span>{formatCurrency(folio.total_charges, 'NGN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Payments:</span>
                  <span>{formatCurrency(folio.total_payments, 'NGN')}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Outstanding Balance:</span>
                  <span className="font-bold text-lg text-amber-600">
                    {formatCurrency(folio.balance, 'NGN')}
                  </span>
                </div>
              </div>

              {/* Transaction History */}
              {transactions && transactions.length > 0 && (
                <div className="rounded-lg border">
                  <div className="p-3 border-b bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      <span className="text-sm font-medium">Transaction History</span>
                    </div>
                  </div>
                  <ScrollArea className="max-h-[140px]">
                    <div className="p-3 space-y-2">
                      {transactions.map((txn) => (
                        <div key={txn.id} className="flex justify-between text-xs py-1 border-b last:border-0">
                          <div className="flex-1 pr-2">
                            <p className="font-medium">{txn.description}</p>
                            <p className="text-muted-foreground">
                              {format(new Date(txn.created_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                          <span className={`font-semibold whitespace-nowrap ${
                            txn.transaction_type === 'charge' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {txn.transaction_type === 'charge' ? '+' : '-'}{formatCurrency(txn.amount, 'NGN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

            {/* Payment Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder={folio.balance.toString()}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to settle the full balance
              </p>
            </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods?.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Balance Preview */}
              {remainingBalance !== 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {remainingBalance > 0 ? (
                    <>Remaining balance after payment: <strong>{formatCurrency(remainingBalance, 'NGN')}</strong></>
                  ) : (
                    <>Overpayment: <strong>{formatCurrency(Math.abs(remainingBalance), 'NGN')}</strong> will be added as credit</>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {remainingBalance === 0 && paymentAmount > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Folio will be fully settled with this payment
                </AlertDescription>
              </Alert>
            )}
            </div>
          </ScrollArea>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Folio not found
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={settleMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSettle} 
            disabled={settleMutation.isPending || !folio}
          >
            {settleMutation.isPending ? 'Processing...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
