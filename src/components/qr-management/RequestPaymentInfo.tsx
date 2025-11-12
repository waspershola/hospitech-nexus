import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RequestPaymentInfoProps {
  request: any;
}

export function RequestPaymentInfo({ request }: RequestPaymentInfoProps) {
  const paymentInfo = request.metadata?.payment_info;
  
  if (!paymentInfo || !paymentInfo.billable) return null;
  
  // PHASE 7 FIX 4: Display amount from metadata
  const amount = paymentInfo.amount;
  const currency = paymentInfo.currency || 'NGN';
  
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm">Payment Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Amount:</span>
          {amount ? (
            <span className="font-semibold text-lg">
              {currency === 'NGN' ? '₦' : currency} {amount.toFixed(2)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground italic">
              To be determined after service
            </span>
          )}
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Status:</span>
          <Badge variant={paymentInfo.status === 'paid' ? 'default' : 'secondary'}>
            {paymentInfo.status}
          </Badge>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Location:</span>
          <span>{paymentInfo.location}</span>
        </div>
      </CardContent>
    </Card>
  );
}
