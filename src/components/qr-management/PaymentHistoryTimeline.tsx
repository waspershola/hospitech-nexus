import { Clock, CheckCircle2, DollarSign, User, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface PaymentHistoryTimelineProps {
  request: any;
  paymentInfo: any;
}

export function PaymentHistoryTimeline({ request, paymentInfo }: PaymentHistoryTimelineProps) {
  // Fetch staff member details for collected_by
  const { data: collectedByUser } = useQuery({
    queryKey: ['user-profile', paymentInfo?.collected_by],
    queryFn: async () => {
      if (!paymentInfo?.collected_by) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', paymentInfo.collected_by)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!paymentInfo?.collected_by,
  });

  // Build timeline events
  const events = [];

  // Event 1: Request created (payment pending)
  if (request.created_at) {
    events.push({
      type: 'created',
      timestamp: request.created_at,
      title: 'Payment Pending',
      description: `Order placed - Amount: ₦${paymentInfo?.amount?.toLocaleString() || '0'}`,
      icon: Clock,
      iconColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    });
  }

  // Event 2: Payment collected
  if (paymentInfo?.status === 'paid' && paymentInfo?.collected_at) {
    events.push({
      type: 'collected',
      timestamp: paymentInfo.collected_at,
      title: 'Payment Collected',
      description: `₦${paymentInfo.amount?.toLocaleString()} received`,
      staffMember: collectedByUser?.full_name || collectedByUser?.email || 'Staff',
      icon: CheckCircle2,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
    });
  }

  // Event 3: Refunds (if metadata has refund info)
  if (paymentInfo?.refunds && Array.isArray(paymentInfo.refunds)) {
    paymentInfo.refunds.forEach((refund: any) => {
      events.push({
        type: 'refund',
        timestamp: refund.refunded_at,
        title: 'Payment Refunded',
        description: `₦${refund.amount?.toLocaleString()} refunded - ${refund.reason || 'No reason provided'}`,
        staffMember: refund.refunded_by_name || 'Staff',
        icon: AlertCircle,
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50',
      });
    });
  }

  // Event 4: Adjustments (if metadata has adjustment info)
  if (paymentInfo?.adjustments && Array.isArray(paymentInfo.adjustments)) {
    paymentInfo.adjustments.forEach((adjustment: any) => {
      events.push({
        type: 'adjustment',
        timestamp: adjustment.adjusted_at,
        title: 'Amount Adjusted',
        description: `${adjustment.type === 'increase' ? '+' : '-'}₦${adjustment.amount?.toLocaleString()} - ${adjustment.reason || 'No reason provided'}`,
        staffMember: adjustment.adjusted_by_name || 'Staff',
        icon: DollarSign,
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
      });
    });
  }

  // Sort events by timestamp (newest first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.map((event, index) => {
          const Icon = event.icon;
          const isLast = index === events.length - 1;
          
          return (
            <div key={index} className="relative">
              <div className="flex gap-3">
                {/* Icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full ${event.bgColor} flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${event.iconColor}`} />
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                      {event.staffMember && (
                        <div className="flex items-center gap-1 mt-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{event.staffMember}</span>
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {format(new Date(event.timestamp), 'MMM d, h:mm a')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
              )}
            </div>
          );
        })}

        {paymentInfo?.status === 'paid' && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Status</span>
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Paid
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
