import { Clock, Calendar, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface SpaBookingDetailsProps {
  metadata: Record<string, any>;
}

export function SpaBookingDetails({ metadata }: SpaBookingDetailsProps) {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-2 border-primary/20">
        <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-primary/10 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-display font-bold text-foreground">
                {metadata.service_name || 'Spa Service'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Luxury spa treatment
              </p>
            </div>
          </div>

          <Separator className="bg-primary/20" />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm p-3 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-semibold">{metadata.duration || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm p-3 rounded-lg">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="font-bold text-primary">
                  {metadata.currency || 'NGN'} {metadata.price?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>

          {(() => {
            const paymentInfo = metadata.payment_info;
            const hasPlatformFee = paymentInfo?.platform_fee && paymentInfo.platform_fee > 0;

            return hasPlatformFee ? (
              <>
                <Separator className="bg-primary/20" />
                <div className="space-y-2 bg-background/50 backdrop-blur-sm p-4 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Price:</span>
                    <span className="font-medium">{paymentInfo.currency} {paymentInfo.base_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                    <span>Platform Fee {paymentInfo.fee_type === 'percentage' ? `(${paymentInfo.rate}%)` : '(Flat)'}:</span>
                    <span className="font-medium">+{paymentInfo.currency} {paymentInfo.platform_fee.toLocaleString()}</span>
                  </div>
                  <Separator className="bg-primary/20" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Total Amount:</span>
                    <span className="text-xl font-bold text-primary">
                      {paymentInfo.currency} {paymentInfo.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            ) : null;
          })()}

          {metadata.preferred_datetime && (
            <>
              <Separator className="bg-primary/20" />
              <div className="flex items-start gap-3 bg-background/50 backdrop-blur-sm p-4 rounded-lg">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Preferred Appointment Time</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(metadata.preferred_datetime as string), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(metadata.preferred_datetime as string), 'h:mm a')}
                  </p>
                </div>
              </div>
            </>
          )}

          {metadata.description && (
            <>
              <Separator className="bg-primary/20" />
              <div className="bg-background/50 backdrop-blur-sm p-4 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2">Service Description</p>
                <p className="text-sm text-foreground">{metadata.description}</p>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
