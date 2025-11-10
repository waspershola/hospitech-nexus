import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQRToken } from '@/hooks/useQRToken';
import { Loader2, UtensilsCrossed, Wifi, Coffee, Sparkles, Phone, Mail, Wrench, Bell, MessageCircle, Crown, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LuxuryHeader } from '@/components/qr-portal/LuxuryHeader';
import { ServiceCard } from '@/components/qr-portal/ServiceCard';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <Card className="max-w-md shadow-2xl border-primary/20 bg-card/90 backdrop-blur-sm">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-accent rounded-full shadow-lg flex items-center justify-center">
              <Crown className="h-10 w-10 text-primary-foreground animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <h2 className="text-lg font-serif text-foreground">Loading Your Portal</h2>
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <p className="text-muted-foreground">Please wait...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !qrData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background p-4">
        <Card className="max-w-md w-full shadow-2xl border-destructive/20 bg-card/90 backdrop-blur-sm">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-destructive to-destructive/80 rounded-full shadow-lg flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-destructive-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-serif text-foreground mb-4">Connection Failed</h2>
              <p className="text-muted-foreground text-sm">
                {error || 'This QR code is invalid or has expired.'}
              </p>
            </div>
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-medium px-8 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
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
      className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/10 animate-fade-in"
    >
      {/* Luxury Header */}
      <LuxuryHeader 
        logoUrl={branding?.logo_url}
        hotelName={tenant?.hotel_name || 'Guest Portal'}
        displayName={display_name}
        themeGradient={themeColors.gradient}
      />

      {/* Main Content Container */}
      <div className="max-w-2xl mx-auto px-4 space-y-8 pb-12">
        {/* Welcome Message Card */}
        <Card className="shadow-2xl backdrop-blur-sm bg-card/80 border-2 border-primary/10 hover:border-primary/20 transition-all duration-500">
          <CardContent className="p-8 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-serif text-foreground">Welcome</h2>
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <p className="text-muted-foreground text-lg leading-relaxed">{welcome_message}</p>
          </CardContent>
        </Card>

        {/* Services Section */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-serif text-foreground">Available Services</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-accent mx-auto rounded-full" />
          </div>

          <div className="grid gap-4">
            {/* Digital Menu */}
            {showMenu && (
              <ServiceCard
                icon={UtensilsCrossed}
                title="Digital Menu"
                description="Browse our menu and place orders"
                onClick={() => navigate(`/qr/${token}/menu`)}
              />
            )}

            {/* WiFi Credentials */}
            {showWifi && (
              <ServiceCard
                icon={Wifi}
                title="WiFi Access"
                description="Connect to our network"
                onClick={() => navigate(`/qr/${token}/wifi`)}
              />
            )}

            {/* Dynamic Services from QR Config */}
            {services.map((service) => {
              const Icon = SERVICE_ICONS[service] || Bell;
              const titleMap: Record<string, string> = {
                housekeeping: 'Housekeeping',
                room_service: 'Room Service',
                maintenance: 'Maintenance',
                concierge: 'Concierge',
              };
              const descriptionMap: Record<string, string> = {
                housekeeping: 'Request housekeeping services',
                room_service: 'Order food and beverages',
                maintenance: 'Report maintenance issues',
                concierge: 'Get assistance from concierge',
              };
              
              return (
                <ServiceCard
                  key={service}
                  icon={Icon}
                  title={titleMap[service] || service.replace('_', ' ')}
                  description={descriptionMap[service] || 'Request assistance'}
                  onClick={() => navigate(`/qr/${token}/request/${service}`)}
                />
              );
            })}

            {/* Feedback */}
            {showFeedback && (
              <ServiceCard
                icon={MessageCircle}
                title="Share Feedback"
                description="Help us improve your experience"
                onClick={() => navigate(`/qr/${token}/feedback`)}
              />
            )}
          </div>
        </div>

        {/* Direct Contact Card */}
        {showCalling && tenant?.contact_phone && (
          <Card className="shadow-xl border-2 border-primary/10 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-accent/20 rounded-full backdrop-blur-sm border border-primary/30 flex items-center justify-center shrink-0">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-serif mb-1 text-foreground">Need Immediate Assistance?</h3>
                  <p className="text-muted-foreground text-sm">Connect directly with our front desk</p>
                </div>
              </div>
              <Button
                onClick={() => window.location.href = `tel:${tenant.contact_phone}`}
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-full px-6 py-6 text-lg font-medium"
              >
                <Phone className="h-5 w-5 mr-2" />
                Call Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-6 space-y-3">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Available 24/7</span>
          </div>
          <p className="text-muted-foreground text-xs">Powered by luxuryhotelpro.com</p>
        </div>
      </div>
    </div>
  );
}
