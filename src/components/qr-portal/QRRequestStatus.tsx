import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useQRToken } from '@/hooks/useQRToken';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, MessageSquare, Clock, Calendar, Users, Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export function QRRequestStatus() {
  const { token, requestId } = useParams<{ token: string; requestId: string }>();
  const navigate = useNavigate();
  const { qrData } = useQRToken(token);

  const { data: request, isLoading } = useQuery({
    queryKey: ['request-status', requestId],
    queryFn: async () => {
      if (!requestId || !token) return null;

      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .eq('qr_token', token)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!requestId && !!token,
  });

  if (isLoading || !qrData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Request not found</p>
            <Button className="mt-4" onClick={() => navigate(`/qr/${token}`)}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in-progress': return 'secondary';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getDepartmentName = (dept: string) => {
    const names: Record<string, string> = {
      restaurant: 'Restaurant',
      housekeeping: 'Housekeeping',
      maintenance: 'Maintenance',
      spa: 'Spa',
      laundry: 'Laundry',
      front_office: 'Front Desk',
    };
    return names[dept] || dept;
  };

  const renderServiceDetails = () => {
    const meta = request.metadata as Record<string, any> || {};

    switch (request.service_category) {
      case 'spa':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg space-y-2">
              <h3 className="text-2xl font-display font-bold">{meta.service_name || 'Spa Service'}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {meta.duration || 'N/A'}
                </span>
                <span className="text-xl font-bold text-primary">
                  {meta.currency || 'NGN'} {meta.price || 0}
                </span>
              </div>
            </div>
            {meta.preferred_datetime && (
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Preferred Time</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(meta.preferred_datetime as string), 'PPpp')}
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'laundry':
        const laundryItems = meta.items || [];
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg">
              <h3 className="text-xl font-display font-bold mb-3">Laundry Items</h3>
              <p className="text-sm text-muted-foreground mb-3">{laundryItems.length} items selected</p>
              <div className="space-y-2">
                {laundryItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm bg-background/50 p-2 rounded">
                    <span>{item.quantity}× {item.item_name}</span>
                    <span className="text-muted-foreground">({item.service_type.replace('_', ' ')})</span>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="text-primary">{meta.currency} {meta.total}</span>
              </div>
            </div>
          </div>
        );

      case 'dining_reservation':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg space-y-3">
              <h3 className="text-2xl font-display font-bold">Table Reservation</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-semibold">{meta.reservation_date}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-semibold">{meta.reservation_time}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">{meta.number_of_guests} guests</span>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm">{request.note}</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/qr/${token}`)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-display font-bold">Request Status</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="shadow-xl bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-3xl font-display font-bold">
              Request Submitted!
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Your {request.service_category.replace('_', ' ')} request has been received
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderServiceDetails()}

            <Separator />

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Request Status
              </h4>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Current Status</span>
                <Badge variant={getStatusVariant(request.status)} className="text-sm capitalize">
                  {request.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Our {getDepartmentName(request.assigned_department)} team will contact you shortly with updates.
              </p>

              <Button 
                className="w-full mt-4" 
                size="lg"
                onClick={() => navigate(`/qr/${token}/chat/${request.id}`)}
              >
                <MessageSquare className="mr-2 h-5 w-5" />
                Chat with {getDepartmentName(request.assigned_department)}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-2">
                We're here to ensure your experience is perfect!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
