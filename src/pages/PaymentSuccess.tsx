import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

type PaymentStatus = 'loading' | 'success' | 'error';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [billingData, setBillingData] = useState<Record<string, any> | null>(null);

  const sessionId = searchParams.get('session_id');
  const reference = searchParams.get('reference');
  const txRef = searchParams.get('tx_ref');
  const transactionRef = searchParams.get('transactionReference');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const transactionId = sessionId || reference || txRef || transactionRef;

        if (!transactionId) {
          setStatus('error');
          return;
        }

        // Use fetch directly to avoid TypeScript issues
        const url = `https://akchmpmzcupzjaeewdui.supabase.co/rest/v1/platform_billing?transaction_id=eq.${transactionId}`;
        const response = await fetch(url, {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4`,
          },
        });

        const results = await response.json();
        const data = results[0];

        if (!data) {
          console.error('Billing not found');
          setStatus('error');
          return;
        }

        setBillingData(data);

        if (data.status === 'completed') {
          setStatus('success');
        } else if (data.status === 'failed') {
          setStatus('error');
        } else {
          let attempts = 0;
          const pollInterval = setInterval(async () => {
            attempts++;
            
            const pollResponse = await fetch(`${url.split('?')[0]}?id=eq.${data.id}`, {
              headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4',
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4`,
              },
            });
            const pollResults = await pollResponse.json();
            const updated = pollResults[0];

            if (updated?.status === 'completed') {
              setStatus('success');
              setBillingData(updated);
              clearInterval(pollInterval);
            } else if (updated?.status === 'failed' || attempts > 10) {
              setStatus('error');
              clearInterval(pollInterval);
            }
          }, 2000);

          return () => clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
      }
    };

    verifyPayment();
  }, [sessionId, reference, txRef, transactionRef]);

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-primary" />
              <CardTitle>Processing Payment</CardTitle>
              <CardDescription>
                Please wait while we confirm your payment...
              </CardDescription>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <CardTitle>Payment Successful!</CardTitle>
              <CardDescription>
                Your purchase has been completed successfully
              </CardDescription>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
              <CardTitle>Payment Failed</CardTitle>
              <CardDescription>
                We couldn't confirm your payment. Please try again or contact support.
              </CardDescription>
            </>
          )}
        </CardHeader>

        {billingData && status === 'success' && (
          <CardContent className="space-y-4">
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-semibold">
                  {formatCurrency(billingData.amount_paid || billingData.amount_due || 0, billingData.currency)}
                </span>
              </div>
              {billingData.transaction_id && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono text-xs">{billingData.transaction_id}</span>
                </div>
              )}
              {billingData.paid_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{new Date(billingData.paid_at).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1"
                onClick={() => navigate('/dashboard/platform-marketplace')}
              >
                View Marketplace
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        )}

        {status === 'error' && (
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => navigate('/dashboard/platform-marketplace')}
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
