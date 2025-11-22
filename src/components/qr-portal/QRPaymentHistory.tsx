import { useParams } from 'react-router-dom';
import { useQRToken } from '@/hooks/useQRToken';
import { useQRTheme } from '@/hooks/useQRTheme';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LuxuryHeader } from '@/components/qr-portal/LuxuryHeader';
import { LoadingState } from '@/components/qr-portal/LoadingState';
import { OfflineIndicator } from '@/components/qr-portal/OfflineIndicator';
import { QRFolioBalance } from '@/components/qr-portal/QRFolioBalance';
import { ArrowLeft, Receipt, CheckCircle2, Clock, MapPin, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

export default function QRPaymentHistory() {
  const { token } = useParams<{ token: string }>();
  const { qrData, isValidating, error } = useQRToken(token);

  useQRTheme(qrData?.branding, 'qr-portal-root');

  const { data: paymentHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['qr-payment-history', token],
    queryFn: async () => {
      if (!token) return [];
      
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('qr_token', token)
        .not('metadata->payment_info', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter only requests with payment info
      return (data || []).filter(r => {
        const metadata = r.metadata as any;
        return metadata?.payment_info?.billable;
      });
    },
    enabled: !!token,
  });

  // Fetch folio data if available
  const { data: folioData } = useQuery({
    queryKey: ['qr-folio-balance', token],
    queryFn: async () => {
      if (!token || !qrData?.room_id) return null;
      
      const { data, error } = await supabase
        .from('stay_folios')
        .select('*')
        .eq('room_id', qrData.room_id)
        .eq('status', 'open')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!token && !!qrData?.room_id,
  });

  if (isValidating || historyLoading) {
    return (
      <>
        <OfflineIndicator />
        <LoadingState
          branding={qrData?.branding}
          hotelName={qrData?.tenant?.hotel_name || 'Guest Portal'}
          message="Loading payment history..."
          variant="luxury"
        />
      </>
    );
  }

  if (error || !qrData) {
    return (
      <>
        <OfflineIndicator />
        <LoadingState
          branding={null}
          hotelName="Connection Failed"
          message={error || 'Unable to load payment history'}
          variant="simple"
        />
      </>
    );
  }

  const { tenant, branding } = qrData;

  return (
    <>
      <OfflineIndicator />
      
      <div 
        id="qr-portal-root"
        className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/10 animate-fade-in"
      >
        <LuxuryHeader 
          logoUrl={branding?.logo_url}
          hotelName={tenant?.hotel_name || 'Guest Portal'}
          displayName="Payment History"
          themeGradient={`linear-gradient(135deg, hsl(45 93% 47%), hsl(38 92% 50%))`}
        />

        <div className="max-w-2xl mx-auto px-4 space-y-6 pb-12">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          {folioData && (
            <QRFolioBalance
              folioBalance={folioData.balance}
              totalCharges={folioData.total_charges}
              totalPayments={folioData.total_payments}
            />
          )}

          <Card className="shadow-xl backdrop-blur-sm bg-card/80 border-2 border-primary/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Your Payments</CardTitle>
                  <p className="text-sm text-muted-foreground">Transaction history during your stay</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {paymentHistory && paymentHistory.length > 0 ? (
            <div className="space-y-4">
              {paymentHistory.map((request: any) => {
                const metadata = request.metadata as any;
                const paymentInfo = metadata?.payment_info;
                const isPaid = paymentInfo?.status === 'paid';
                
                return (
                  <Card key={request.id} className="shadow-lg backdrop-blur-sm bg-card/90 border-2 border-border hover:border-primary/20 transition-all">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold capitalize">
                              {request.type?.replace('_', ' ')}
                            </h3>
                            <Badge variant={isPaid ? 'default' : 'secondary'} className="gap-1">
                              {isPaid ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" />
                                  Paid
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </>
                              )}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(request.created_at), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {paymentInfo?.currency === 'NGN' ? '₦' : paymentInfo?.currency}
                            {paymentInfo?.amount?.toLocaleString() || '0.00'}
                          </p>
                        </div>
                      </div>

                      {request.note && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-sm text-muted-foreground">{request.note}</p>
                        </div>
                      )}

                      <Separator />

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {paymentInfo?.location_name && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Location</p>
                              <p className="font-medium">{paymentInfo.location_name}</p>
                            </div>
                          </div>
                        )}
                        
                        {paymentInfo?.provider_name && (
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Method</p>
                              <p className="font-medium">
                                {paymentInfo.provider_name}
                                {paymentInfo.provider_type && ` (${paymentInfo.provider_type.toUpperCase()})`}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {isPaid && paymentInfo?.collected_at && (
                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          Collected on {format(new Date(paymentInfo.collected_at), 'MMM d, yyyy • h:mm a')}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="shadow-lg backdrop-blur-sm bg-card/90">
              <CardContent className="py-12 text-center">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No payment history yet</p>
                <p className="text-sm text-muted-foreground">
                  Your billable service payments will appear here
                </p>
              </CardContent>
            </Card>
          )}

          <div className="text-center py-4">
            <p className="text-muted-foreground text-xs">
              All payments are securely processed and recorded
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
