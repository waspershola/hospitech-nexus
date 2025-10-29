import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRecordPayment } from '@/hooks/useRecordPayment';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuickPaymentFormProps {
  bookingId: string;
  guestId: string;
  expectedAmount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function QuickPaymentForm({ 
  bookingId, 
  guestId, 
  expectedAmount, 
  onSuccess, 
  onCancel 
}: QuickPaymentFormProps) {
  const [amount, setAmount] = useState(expectedAmount.toString());
  const [method, setMethod] = useState<string>('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const { mutateAsync: recordPayment, isPending: isRecording } = useRecordPayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!method) {
      toast.error('Please select a payment method');
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      await recordPayment({
        booking_id: bookingId,
        guest_id: guestId,
        amount: paymentAmount,
        method,
        transaction_ref: reference || `PMT-${Date.now()}`,
        metadata: notes ? { notes } : undefined,
      });

      onSuccess();
    } catch (error) {
      console.error('Payment recording error:', error);
      // Error toast handled by the hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Amount (₦)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="method">Payment Method</Label>
        <Select value={method} onValueChange={setMethod} required>
          <SelectTrigger id="method">
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="wallet">Wallet</SelectItem>
            <SelectItem value="pos">POS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference">Reference / Transaction ID (Optional)</Label>
        <Input
          id="reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Enter transaction reference"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any additional notes"
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isRecording}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isRecording}
          className="flex-1"
        >
          {isRecording ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Recording...
            </>
          ) : (
            'Record Payment'
          )}
        </Button>
      </div>
    </form>
  );
}
