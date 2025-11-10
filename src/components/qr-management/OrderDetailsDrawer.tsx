import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Clock, CheckCircle2, XCircle, ChefHat, UtensilsCrossed } from 'lucide-react';

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
  if (!order) return null;

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
