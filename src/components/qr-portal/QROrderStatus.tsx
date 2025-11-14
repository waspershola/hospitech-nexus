import { useParams, useNavigate } from 'react-router-dom';
import { useQRToken } from '@/hooks/useQRToken';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Clock, CheckCircle2, Utensils, MessageSquare, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export function QROrderStatus() {
  const { token, orderId } = useParams();
  const navigate = useNavigate();
  const { qrData } = useQRToken(token);

  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['guest-order', orderId, token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guest_orders')
        .select('*, request:requests(id, status, created_at, metadata)')
        .eq('id', orderId!)
        .eq('qr_token', token!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!token,
  });

  // Real-time subscription for order status updates
  useEffect(() => {
    if (!orderId) return;

    console.log('[QROrderStatus] Setting up real-time subscription for order:', orderId);

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'guest_orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log('[QROrderStatus] Order updated:', payload.new);
          // Update the query cache with new data
          queryClient.setQueryData(['guest-order', orderId, token], (old: any) => {
            if (!old) return old;
            return { ...old, ...payload.new };
          });
        }
      )
      .subscribe();

    return () => {
      console.log('[QROrderStatus] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [orderId, token, queryClient]);

  if (isLoading || !qrData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Order not found</p>
            <Button onClick={() => navigate(`/qr/${token}`)} className="mt-4">
              Return to Menu
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      pending: { variant: 'secondary', label: 'Order Received', icon: Clock },
      preparing: { variant: 'default', label: 'Preparing', icon: Utensils },
      ready: { variant: 'default', label: 'Ready for Delivery', icon: CheckCircle2 },
      delivered: { variant: 'default', label: 'Delivered', icon: CheckCircle2 },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-2">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/qr/${token}`)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{qrData.display_name || 'Hotel'}</h1>
            <p className="text-sm text-muted-foreground">Order Status</p>
          </div>
        </div>

        {/* Order Confirmation Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardHeader className="text-center pb-4">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-3" />
            <CardTitle className="text-2xl font-bold">Order Placed Successfully!</CardTitle>
            <p className="text-muted-foreground">Your Order</p>
          </CardHeader>
        <CardContent className="space-y-4">
          {/* Order Summary Box */}
          <div className="bg-background rounded-lg p-4 space-y-3">
            <p className="font-semibold text-lg">
              {(order.items as any[]).length} {(order.items as any[]).length === 1 ? 'item' : 'items'} selected
            </p>
            <Separator />
            <div className="space-y-2">
              {(order.items as any[]).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">
                      {item.quantity}× {item.name}
                    </p>
                  </div>
                  <p className="font-semibold">₦{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <Separator />
            
            {/* Show subtotal and platform fee breakdown when payer is guest */}
            {(() => {
              const paymentInfo = order.request?.metadata ? (order.request.metadata as any)?.payment_info : null;
              return paymentInfo?.platform_fee_applied && paymentInfo?.payer === 'guest' ? (
                <>
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₦{paymentInfo.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      Platform Fee {paymentInfo.fee_type === 'flat' 
                        ? '(Flat)' 
                        : `(${paymentInfo.qr_fee}%)`}
                    </span>
                    <span>
                      +₦{paymentInfo.platform_fee.toLocaleString()}
                    </span>
                  </div>
                </>
              ) : null;
            })()}
            
            <div className="flex justify-between items-center">
              <span className="font-bold text-xl">Total</span>
              <span className="font-bold text-2xl text-primary">₦{order.total.toLocaleString()}</span>
            </div>
          </div>

            {/* Kitchen Communication Section */}
            {order.request_id && (
              <div className="bg-background rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-lg">Kitchen Communication</h3>
                <div className="flex items-center gap-2">
                  {getStatusBadge(order.status)}
                  <span className="text-sm text-muted-foreground">Live chat with our culinary team</span>
                </div>
                
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Order Received!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    Our executive chef will message you with updates and any suggestions.
                  </p>
                </div>

                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={() => navigate(`/qr/${token}/chat/${order.request_id}`)}
                >
                  <MessageSquare className="h-5 w-5" />
                  Chat with Kitchen
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  Our culinary team is standing by to assist with your order
                </p>
              </div>
            )}

            {/* Special Instructions */}
            {order.special_instructions && (
              <div className="bg-background rounded-lg p-4">
                <h3 className="font-semibold mb-2">Special Instructions</h3>
                <p className="text-sm text-muted-foreground">{order.special_instructions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium">Order Received</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(order.created_at), 'PPp')}
                  </p>
                </div>
              </div>

              {order.status !== 'pending' && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <Utensils className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Preparing Your Order</p>
                    <p className="text-xs text-muted-foreground">Kitchen is working on it</p>
                  </div>
                </div>
              )}

              {['ready', 'delivered'].includes(order.status) && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {order.status === 'delivered' ? 'Delivered' : 'Ready for Delivery'}
                    </p>
                    <p className="text-xs text-muted-foreground">Enjoy your meal!</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
