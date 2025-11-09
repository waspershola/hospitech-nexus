import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQRToken } from '@/hooks/useQRToken';
import { Loader2, Hotel, Wifi, Coffee, Sparkles, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SERVICE_ICONS: Record<string, any> = {
  housekeeping: Sparkles,
  room_service: Coffee,
  maintenance: Wifi,
  concierge: Hotel,
};

export function QRLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { qrData, isValidating, error, validateToken } = useQRToken();
  const [hasValidated, setHasValidated] = useState(false);

  useEffect(() => {
    if (token && !hasValidated) {
      validateToken(token);
      setHasValidated(true);
    }
  }, [token, validateToken, hasValidated]);

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Validating QR code...</p>
        </div>
      </div>
    );
  }

  if (error || !qrData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid QR Code</CardTitle>
            <CardDescription>
              {error || 'This QR code is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { display_name, welcome_message, services, tenant, branding } = qrData;

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-background to-muted p-4"
      style={{
        '--primary': branding?.primary_color || 'hsl(var(--primary))',
      } as React.CSSProperties}
    >
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="text-center space-y-4">
          {branding?.logo_url && (
            <img 
              src={branding.logo_url} 
              alt="Hotel Logo" 
              className="h-16 mx-auto object-contain"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {tenant?.hotel_name || 'Guest Portal'}
            </h1>
            <p className="text-lg text-muted-foreground mt-2">{display_name}</p>
          </div>
        </div>

        {/* Welcome Message */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{welcome_message}</p>
          </CardContent>
        </Card>

        {/* Services Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Available Services</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {services.map((service) => {
              const Icon = SERVICE_ICONS[service] || Hotel;
              return (
                <Card 
                  key={service}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/qr/${token}/request/${service}`)}
                >
                  <CardHeader className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-base capitalize">
                        {service.replace('_', ' ')}
                      </CardTitle>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Contact Info */}
        {(tenant?.contact_phone || tenant?.contact_email) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Need Immediate Assistance?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tenant.contact_phone && (
                <a 
                  href={`tel:${tenant.contact_phone}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span>{tenant.contact_phone}</span>
                </a>
              )}
              {tenant.contact_email && (
                <a 
                  href={`mailto:${tenant.contact_email}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span>{tenant.contact_email}</span>
                </a>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
