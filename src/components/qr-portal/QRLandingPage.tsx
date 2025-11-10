import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQRToken } from '@/hooks/useQRToken';
import { Loader2, UtensilsCrossed, Wifi, Coffee, Sparkles, Phone, Mail, Wrench, Bell, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SERVICE_ICONS: Record<string, any> = {
  housekeeping: Sparkles,
  room_service: UtensilsCrossed,
  maintenance: Wrench,
  concierge: Bell,
  digital_menu: UtensilsCrossed,
  wifi: Wifi,
  feedback: MessageCircle,
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

  // Get theme settings
  const qrTheme = branding?.qr_theme || 'classic_luxury_gold';
  const customPrimary = branding?.qr_primary_color;
  const customAccent = branding?.qr_accent_color;

  // Theme color presets
  const THEME_COLORS: Record<string, { primary: string; accent: string; gradient: string }> = {
    classic_luxury_gold: {
      primary: 'hsl(45 93% 47%)',
      accent: 'hsl(38 92% 50%)',
      gradient: 'linear-gradient(135deg, hsl(45 93% 47%), hsl(38 92% 50%))',
    },
    modern_elegant_blue: {
      primary: 'hsl(217 91% 60%)',
      accent: 'hsl(199 89% 48%)',
      gradient: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(199 89% 48%))',
    },
    tropical_resort_green: {
      primary: 'hsl(142 71% 45%)',
      accent: 'hsl(160 84% 39%)',
      gradient: 'linear-gradient(135deg, hsl(142 71% 45%), hsl(160 84% 39%))',
    },
    sunset_coral: {
      primary: 'hsl(14 91% 60%)',
      accent: 'hsl(340 82% 52%)',
      gradient: 'linear-gradient(135deg, hsl(14 91% 60%), hsl(340 82% 52%))',
    },
    royal_purple: {
      primary: 'hsl(271 91% 65%)',
      accent: 'hsl(291 64% 42%)',
      gradient: 'linear-gradient(135deg, hsl(271 91% 65%), hsl(291 64% 42%))',
    },
  };

  const themeColors = qrTheme === 'custom' && customPrimary && customAccent
    ? { primary: customPrimary, accent: customAccent, gradient: `linear-gradient(135deg, ${customPrimary}, ${customAccent})` }
    : THEME_COLORS[qrTheme] || THEME_COLORS.classic_luxury_gold;

  // Feature toggles
  const showMenu = tenant?.qr_menu_enabled ?? true;
  const showWifi = tenant?.qr_wifi_enabled ?? true;
  const showFeedback = tenant?.qr_feedback_enabled ?? true;
  const showCalling = tenant?.qr_calling_enabled ?? true;

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/10 p-4 animate-fade-in"
    >
      <div className="max-w-4xl mx-auto space-y-8 py-8">
        {/* Header with Logo */}
        <div className="text-center space-y-6">
          {branding?.logo_url && (
            <img 
              src={branding.logo_url} 
              alt="Hotel Logo" 
              className="h-20 mx-auto object-contain animate-fade-in drop-shadow-lg"
            />
          )}
          <div className="space-y-3">
            <h1 
              className="text-4xl md:text-5xl font-display font-bold bg-clip-text text-transparent animate-fade-in"
              style={{ backgroundImage: themeColors.gradient }}
            >
              {tenant?.hotel_name || 'Guest Portal'}
            </h1>
            <p className="text-xl text-muted-foreground font-medium">{display_name}</p>
          </div>
        </div>

        {/* Welcome Message Card */}
        <Card className="backdrop-blur-sm bg-card/80 border-2 shadow-luxury hover:shadow-glow transition-all duration-500">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground text-lg leading-relaxed">{welcome_message}</p>
          </CardContent>
        </Card>

        {/* Enhanced Services Grid */}
        <div className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-foreground">Available Services</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Digital Menu */}
            {showMenu && (
              <Card
              className="group cursor-pointer bg-card/80 backdrop-blur-sm border-2 border-transparent 
                         hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/20 
                         transition-all duration-500 hover:scale-[1.03] animate-fade-in"
              onClick={() => navigate(`/qr/${token}/menu`)}
            >
              <CardHeader className="space-y-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-amber-400/10 to-amber-600/10 
                                w-fit group-hover:from-amber-400/20 group-hover:to-amber-600/20 
                                group-hover:scale-110 transition-all duration-300">
                  <UtensilsCrossed className="h-8 w-8 text-amber-500" />
                </div>
                <CardTitle className="text-xl font-display">Digital Menu</CardTitle>
                <CardDescription className="font-body">Browse our menu and place orders</CardDescription>
              </CardHeader>
            </Card>
            )}

            {/* WiFi Credentials */}
            {showWifi && (
              <Card
              className="group cursor-pointer bg-card/80 backdrop-blur-sm border-2 border-transparent 
                         hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/20 
                         transition-all duration-500 hover:scale-[1.03] animate-fade-in"
              onClick={() => navigate(`/qr/${token}/wifi`)}
            >
              <CardHeader className="space-y-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-blue-400/10 to-cyan-600/10 
                                w-fit group-hover:from-blue-400/20 group-hover:to-cyan-600/20 
                                group-hover:scale-110 transition-all duration-300">
                  <Wifi className="h-8 w-8 text-blue-500" />
                </div>
                <CardTitle className="text-xl font-display">WiFi Access</CardTitle>
                <CardDescription className="font-body">Connect to our network</CardDescription>
              </CardHeader>
            </Card>
            )}

            {/* Dynamic Services from QR Config */}
            {services.map((service) => {
              const Icon = SERVICE_ICONS[service] || Bell;
              const colorMap: Record<string, string> = {
                housekeeping: 'purple',
                room_service: 'orange',
                maintenance: 'red',
                concierge: 'indigo',
              };
              const color = colorMap[service] || 'primary';
              
              return (
                <Card 
                  key={service}
                  className={`group cursor-pointer bg-card/80 backdrop-blur-sm border-2 border-transparent 
                             hover:border-${color}-500/50 hover:shadow-2xl hover:shadow-${color}-500/20 
                             transition-all duration-500 hover:scale-[1.03] animate-fade-in`}
                  onClick={() => navigate(`/qr/${token}/request/${service}`)}
                >
                  <CardHeader className="space-y-4">
                    <div className={`p-4 rounded-full bg-gradient-to-br from-${color}-400/10 to-${color}-600/10 
                                    w-fit group-hover:from-${color}-400/20 group-hover:to-${color}-600/20 
                                    group-hover:scale-110 transition-all duration-300`}>
                      <Icon className={`h-8 w-8 text-${color}-500`} />
                    </div>
                    <CardTitle className="text-xl font-display capitalize">
                      {service.replace('_', ' ')}
                    </CardTitle>
                    <CardDescription className="font-body">Request assistance</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}

            {/* Feedback */}
            {showFeedback && (
              <Card
              className="group cursor-pointer bg-card/80 backdrop-blur-sm border-2 border-transparent 
                         hover:border-green-500/50 hover:shadow-2xl hover:shadow-green-500/20 
                         transition-all duration-500 hover:scale-[1.03] animate-fade-in"
              onClick={() => navigate(`/qr/${token}/feedback`)}
            >
              <CardHeader className="space-y-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-green-400/10 to-emerald-600/10 
                                w-fit group-hover:from-green-400/20 group-hover:to-emerald-600/20 
                                group-hover:scale-110 transition-all duration-300">
                  <MessageCircle className="h-8 w-8 text-green-500" />
                </div>
                <CardTitle className="text-xl font-display">Share Feedback</CardTitle>
                <CardDescription className="font-body">Help us improve</CardDescription>
              </CardHeader>
            </Card>
            )}
          </div>
        </div>

        {/* Contact Info */}
        {showCalling && (tenant?.contact_phone || tenant?.contact_email) && (
          <Card className="backdrop-blur-sm bg-card/80 border-2 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-display">Need Immediate Assistance?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tenant.contact_phone && (
                <a 
                  href={`tel:${tenant.contact_phone}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <Phone className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="font-medium">{tenant.contact_phone}</span>
                </a>
              )}
              {tenant.contact_email && (
                <a 
                  href={`mailto:${tenant.contact_email}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <Mail className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="font-medium">{tenant.contact_email}</span>
                </a>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
