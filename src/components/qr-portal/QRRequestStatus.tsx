import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useQRToken } from '@/hooks/useQRToken';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, MessageSquare, Loader2, ArrowLeft } from 'lucide-react';
import { SpaBookingDetails } from './service-details/SpaBookingDetails';
import { LaundryOrderDetails } from './service-details/LaundryOrderDetails';
import { DiningReservationDetails } from './service-details/DiningReservationDetails';

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

    switch (request.type) {
      case 'spa':
        return <SpaBookingDetails metadata={meta} />;

      case 'laundry':
        return <LaundryOrderDetails metadata={meta} />;

      case 'dining_reservation':
        return <DiningReservationDetails metadata={meta} />;

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
              Your {request.type.replace('_', ' ')} request has been received
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
