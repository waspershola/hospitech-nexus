import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RequestPaymentInfoProps {
  request: any;
}

export function RequestPaymentInfo({ request }: RequestPaymentInfoProps) {
  const paymentInfo = request.metadata?.payment_info;
  
  if (!paymentInfo || !paymentInfo.billable) return null;
  
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm">Payment Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Status:</span>
          <Badge variant={paymentInfo.status === 'paid' ? 'default' : 'secondary'}>
            {paymentInfo.status}
          </Badge>
        </div>
        {paymentInfo.amount && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-semibold">
              {paymentInfo.currency} {paymentInfo.amount}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Location:</span>
          <span>{paymentInfo.location}</span>
        </div>
      </CardContent>
    </Card>
  );
}
