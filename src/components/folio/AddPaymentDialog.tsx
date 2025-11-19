import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRecordPayment } from '@/hooks/useRecordPayment';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folioId: string;
  bookingId: string;
}

export function AddPaymentDialog({ open, onOpenChange, folioId, bookingId }: AddPaymentDialogProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [reference, setReference] = useState('');
  const { paymentMethods, isLoading: loadingMethods } = usePaymentMethods();
  const mutation = useRecordPayment();
  
  const selectedMethod = paymentMethods.find(m => m.id === paymentMethod);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !paymentMethod) {
      toast.error('Please fill in all required fields');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    mutation.mutate({
      booking_id: bookingId,
      amount: numericAmount,
      method: paymentMethod,
      transaction_ref: reference || `PAY-${Date.now()}`,
    }, {
      onSuccess: () => {
        console.log('[AddPaymentDialog] ADD-PAYMENT-DIALOG-V1: Payment recorded');
        onOpenChange(false);
        setAmount('');
        setPaymentMethod('');
        setReference('');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>
            Record a payment received for this folio
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method *</Label>
            {loadingMethods ? (
              <Skeleton className="h-10 w-full" />
            ) : paymentMethods.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment methods configured. Contact administrator.</p>
            ) : (
              <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.method_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {selectedMethod?.requires_reference && (
            <div className="space-y-2">
              <Label htmlFor="reference">Reference {selectedMethod.requires_reference ? '*' : ''}</Label>
              <Input
                id="reference"
                type="text"
                placeholder={selectedMethod.requires_reference ? "Transaction reference (required)" : "Transaction reference (optional)"}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required={selectedMethod.requires_reference}
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
