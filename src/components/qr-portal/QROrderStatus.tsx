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
        .select('*, request:requests(id, status, created_at)')
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

        {/* Order Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              Placed {format(new Date(order.created_at), 'PPp')}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Items */}
            <div>
              <h3 className="font-semibold mb-3">Order Items</h3>
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {(order.items as any[]).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start py-2 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">₦{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Special Instructions */}
            {order.special_instructions && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Special Instructions</h3>
                  <p className="text-sm text-muted-foreground">{order.special_instructions}</p>
                </div>
              </>
            )}

            {/* Total */}
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₦{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₦{order.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Chat Button */}
            {order.request_id && (
              <>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => navigate(`/qr/${token}/chat/${order.request_id}`)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat with Kitchen
                </Button>
              </>
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
