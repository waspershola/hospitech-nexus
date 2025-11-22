import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MessageSquare, Clock, CheckCircle2, XCircle, ChefHat, UtensilsCrossed, Loader2 } from 'lucide-react';
import { useFinanceLocations } from '@/hooks/useFinanceLocations';
import { useFinanceProviders } from '@/hooks/useFinanceProviders';
import { usePlatformFee } from '@/hooks/usePlatformFee';
import { calculateQRPlatformFee } from '@/lib/finance/platformFee';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

interface OrderDetailsDrawerProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (status: string) => void;
  onOpenChat: () => void;
}

export function OrderDetailsDrawer({
  order,
  open,
  onOpenChange,
  onUpdateStatus,
  onOpenChat,
}: OrderDetailsDrawerProps) {
  const queryClient = useQueryClient();
  const { locations } = useFinanceLocations();
  const { providers } = useFinanceProviders();
  const { data: platformFeeConfig } = usePlatformFee(order?.tenant_id);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [isCollectingPayment, setIsCollectingPayment] = useState(false);

  // Auto-select default location
  useEffect(() => {
    if (locations.length > 0 && !selectedLocationId) {
      const restaurantLocation = locations.find(l => 
        l.department?.toLowerCase().includes('restaurant') || 
        l.name.toLowerCase().includes('restaurant')
      );
      setSelectedLocationId(restaurantLocation?.id || locations[0].id);
    }
  }, [locations, selectedLocationId]);

  // Auto-select default provider
  useEffect(() => {
    if (providers.length > 0 && !selectedProviderId) {
      const defaultProvider = providers.find(p => p.status === 'active');
      setSelectedProviderId(defaultProvider?.id || providers[0].id);
    }
  }, [providers, selectedProviderId]);

  if (!order) return null;

  // Use server-calculated platform fee from request metadata
  const paymentInfo = order.metadata?.payment_info || {};
  const subtotal = paymentInfo.subtotal || order.subtotal || 0;
  const platformFee = paymentInfo.platform_fee || 0;
  const totalAmount = paymentInfo.amount || order.total || subtotal;

  const handleCollectPayment = async () => {
    if (!selectedLocationId || !selectedProviderId) {
      toast.error('Please select payment location and method');
      return;
    }

    setIsCollectingPayment(true);
    try {
      const selectedLocation = locations.find(l => l.id === selectedLocationId);
      const selectedProvider = providers.find(p => p.id === selectedProviderId);

      const { error: requestError } = await supabase
        .from('requests')
        .update({
          metadata: {
            ...order.metadata,
            payment_info: {
              ...order.metadata?.payment_info,
              status: 'paid',
              location_id: selectedLocationId,
              location_name: selectedLocation?.name,
              provider_id: selectedProviderId,
              provider_name: selectedProvider?.name,
              collected_at: new Date().toISOString(),
            },
          },
        })
        .eq('id', order.request_id);

      if (requestError) throw requestError;

      // Record platform fee in ledger (non-blocking)
      try {
        await supabase.functions.invoke('record-platform-fee', {
          body: {
            request_id: order.request_id,
            tenant_id: order.tenant_id,
            service_category: order.metadata?.type || 'digital_menu',
            amount: totalAmount,
            payment_location: selectedLocation?.name,
            payment_method: selectedProvider?.name,
          },
        });
      } catch (feeError) {
        console.error('Platform fee recording error (non-blocking):', feeError);
        // Don't fail payment collection if fee recording fails
      }

      toast.success('Payment collected successfully');
      queryClient.invalidateQueries({ queryKey: ['order-details'] });
      queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
      queryClient.invalidateQueries({ queryKey: ['platform-fee-config'] });
      queryClient.invalidateQueries({ queryKey: ['platform-fee-ledger'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Payment collection error:', error);
      toast.error('Failed to collect payment');
    } finally {
      setIsCollectingPayment(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { label: string; icon: any; variant: any; next?: string }> = {
      pending: { label: 'Pending', icon: Clock, variant: 'secondary', next: 'preparing' },
      preparing: { label: 'Preparing', icon: ChefHat, variant: 'default', next: 'ready' },
      ready: { label: 'Ready', icon: CheckCircle2, variant: 'default', next: 'delivered' },
      delivered: { label: 'Delivered', icon: CheckCircle2, variant: 'default' },
      cancelled: { label: 'Cancelled', icon: XCircle, variant: 'destructive' },
    };
    return config[status] || config.pending;
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            Order #{order.id?.slice(0, 8)}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status */}
          <div>
            <Badge variant={statusConfig.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Customer Details */}
          <div className="space-y-2">
            <h3 className="font-semibold">Customer Details</h3>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Name:</span> {order.metadata?.guest_name || order.guest_name || 'Guest'}</p>
              {order.metadata?.guest_contact && (
                <p><span className="text-muted-foreground">Contact:</span> {order.metadata.guest_contact}</p>
              )}
              {order.room?.number && (
                <p><span className="text-muted-foreground">Room:</span> {order.room.number}</p>
              )}
              <p className="text-muted-foreground">
                Ordered: {format(new Date(order.created_at), 'MMM d, h:mm a')}
              </p>
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          <div className="space-y-3">
            <h3 className="font-semibold">Order Items</h3>
            {order.items?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start py-2 border-b border-border">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold">
                  {order.currency || 'NGN'} {(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Total */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{order.currency || 'NGN'} {order.subtotal?.toFixed(2)}</span>
            </div>
            
            {platformFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Platform Fee {platformFeeConfig?.fee_type === 'flat' ? '(Flat)' : `(${platformFeeConfig?.qr_fee || 0}%)`}
                  {platformFeeConfig?.payer === 'guest' ? ' (charged to guest)' : ' (charged to property)'}
                </span>
                <span className="text-muted-foreground">
                  +{order.currency || 'NGN'} {platformFee.toFixed(2)}
                </span>
              </div>
            )}
            
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span className="text-accent">
                {order.currency || 'NGN'} {order.total?.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Special Instructions */}
          {order.special_instructions && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">Special Instructions</h3>
                <p className="text-sm bg-muted p-3 rounded-lg">
                  {order.special_instructions}
                </p>
              </div>
            </>
          )}

          {/* Payment Collection (if linked request has payment info) */}
          {order.request_id && order.metadata?.payment_info?.billable && order.metadata?.payment_info?.status !== 'paid' && (
            <>
              <Separator />
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <h3 className="font-semibold">Payment Collection</h3>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-muted-foreground">Amount Due:</span>
                  <span className="text-lg font-bold text-primary">
                    {order.currency || 'NGN'} {order.total?.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="payment-location">Payment Location</Label>
                    <Select value={selectedLocationId || ''} onValueChange={setSelectedLocationId}>
                      <SelectTrigger id="payment-location">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map(location => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                            {location.department && ` (${location.department})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Payment Method</Label>
                    <Select value={selectedProviderId || ''} onValueChange={setSelectedProviderId}>
                      <SelectTrigger id="payment-method">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.filter(p => p.status === 'active').map(provider => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name} ({provider.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleCollectPayment}
                    disabled={isCollectingPayment || !selectedLocationId || !selectedProviderId}
                  >
                    {isCollectingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Collect Payment (${order.currency || 'NGN'} ${order.total?.toFixed(2)})`
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {order.metadata?.payment_info?.status === 'paid' && (
            <>
              <Separator />
              <div className="space-y-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Payment Collected</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Amount: {order.currency || 'NGN'} {order.metadata.payment_info.amount?.toFixed(2)}</div>
                  {order.metadata.payment_info.location_name && (
                    <div>Location: {order.metadata.payment_info.location_name}</div>
                  )}
                  {order.metadata.payment_info.collected_at && (
                    <div>Collected: {format(new Date(order.metadata.payment_info.collected_at), 'MMM d, h:mm a')}</div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-4">
            {statusConfig.next && order.status !== 'delivered' && order.status !== 'cancelled' && (
              <Button
                className="w-full"
                onClick={() => onUpdateStatus(statusConfig.next!)}
              >
                Mark as {getStatusConfig(statusConfig.next).label}
              </Button>
            )}
            
            <Button
              variant="outline"
              className="w-full"
              onClick={onOpenChat}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat with Guest
            </Button>

            {order.status === 'pending' && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => onUpdateStatus('cancelled')}
              >
                Cancel Order
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
