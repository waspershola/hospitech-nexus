import { Shirt, Package, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface LaundryOrderDetailsProps {
  metadata: Record<string, any>;
}

export function LaundryOrderDetails({ metadata }: LaundryOrderDetailsProps) {
  const laundryItems = metadata.items || [];
  const totalItems = laundryItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

  const getServiceTypeColor = (serviceType: string) => {
    switch (serviceType) {
      case 'wash_only': return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'wash_iron': return 'bg-purple-500/20 text-purple-700 dark:text-purple-300';
      case 'dry_clean': return 'bg-amber-500/20 text-amber-700 dark:text-amber-300';
      default: return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  const formatServiceType = (serviceType: string) => {
    return serviceType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-2 border-primary/20">
        <div className="bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-primary/10 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Shirt className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-display font-bold text-foreground">Laundry Service</h3>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <Package className="h-4 w-4" />
                {totalItems} items • {laundryItems.length} item types
              </p>
            </div>
          </div>

          <Separator className="bg-primary/20" />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-3">Items for Cleaning</p>
            {laundryItems.map((item: any, idx: number) => (
              <div 
                key={idx} 
                className="flex items-center justify-between bg-background/50 backdrop-blur-sm p-3 rounded-lg hover:bg-background/70 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm">
                    {item.quantity}×
                  </div>
                  <div>
                    <p className="font-medium">{item.item_name}</p>
                    <Badge 
                      variant="outline" 
                      className={`mt-1 ${getServiceTypeColor(item.service_type)}`}
                    >
                      {formatServiceType(item.service_type)}
                    </Badge>
                  </div>
                </div>
                {item.price && (
                  <p className="font-semibold text-primary">
                    {metadata.currency || 'NGN'} {(item.price * item.quantity).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>

          <Separator className="bg-primary/20" />

          {(() => {
            const paymentInfo = metadata.payment_info;
            const hasPlatformFee = paymentInfo?.platform_fee && paymentInfo.platform_fee > 0;

            return hasPlatformFee ? (
              <div className="space-y-2 bg-background/50 backdrop-blur-sm p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{paymentInfo.currency} {paymentInfo.base_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                  <span>Platform Fee {paymentInfo.fee_type === 'percentage' ? `(${paymentInfo.rate}%)` : '(Flat)'}:</span>
                  <span className="font-medium">+{paymentInfo.currency} {paymentInfo.platform_fee.toLocaleString()}</span>
                </div>
                <Separator className="bg-primary/20" />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Total Amount:</span>
                  <span className="text-2xl font-bold text-primary">
                    {paymentInfo.currency} {paymentInfo.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center bg-background/50 backdrop-blur-sm p-4 rounded-lg">
                <span className="text-lg font-bold">Total Amount:</span>
                <span className="text-2xl font-bold text-primary">
                  {metadata.currency || 'NGN'} {metadata.total?.toLocaleString() || 0}
                </span>
              </div>
            );
          })()}

          {metadata.turnaround_time && (
            <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm p-3 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Expected Completion</p>
                <p className="font-semibold">{metadata.turnaround_time}</p>
              </div>
            </div>
          )}

          {metadata.special_instructions && (
            <>
              <Separator className="bg-primary/20" />
              <div className="bg-background/50 backdrop-blur-sm p-4 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2">Special Instructions</p>
                <p className="text-sm text-foreground">{metadata.special_instructions}</p>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
