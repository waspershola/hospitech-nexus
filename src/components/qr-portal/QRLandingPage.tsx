import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQRToken } from '@/hooks/useQRToken';
import { useQRTheme } from '@/hooks/useQRTheme';
import { useMyRequests } from '@/hooks/useMyRequests';
import { useGuestInfo } from '@/hooks/useGuestInfo';
import { useGuestNotifications } from '@/hooks/useGuestNotifications';
import { useChatVisibility } from '@/contexts/ChatVisibilityContext';
import { GuestInfoModal } from '@/components/qr-portal/GuestInfoModal';
import { UtensilsCrossed, Wifi, Wrench, Bell, MessageCircle, Phone, Clock, Sparkles, Crown, Utensils, Shirt as ShirtIcon, Headphones, Receipt, LucideIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LuxuryHeader } from '@/components/qr-portal/LuxuryHeader';
import { ServiceCard } from '@/components/qr-portal/ServiceCard';
import { LoadingState } from '@/components/qr-portal/LoadingState';
import { OfflineIndicator } from '@/components/qr-portal/OfflineIndicator';
import { MyRequestsButton } from '@/components/qr-portal/MyRequestsButton';

const SERVICE_ICONS: Record<string, LucideIcon> = {
  digital_menu: UtensilsCrossed,
  wifi: Wifi,
  room_service: Utensils,
  housekeeping: Sparkles,
  maintenance: Wrench,
  concierge: Headphones,
  feedback: MessageCircle,
  spa: Sparkles,
  laundry: ShirtIcon,
  dining: UtensilsCrossed,
};

const SERVICE_CONFIG: Record<string, { title: string; description: string }> = {
  digital_menu: { 
    title: 'Digital Menu', 
    description: 'Browse our menu and place orders' 
  },
  wifi: { 
    title: 'WiFi Access', 
    description: 'Connect to our network' 
  },
  room_service: { 
    title: 'Room Service', 
    description: 'Order food and beverages to your room' 
  },
  housekeeping: { 
    title: 'Housekeeping', 
    description: 'Request housekeeping services' 
  },
  maintenance: { 
    title: 'Maintenance', 
    description: 'Report maintenance issues' 
  },
  concierge: { 
    title: 'Concierge', 
    description: 'Get assistance from concierge' 
  },
  feedback: { 
    title: 'Share Feedback', 
    description: 'Help us improve your experience' 
  },
  spa: { 
    title: 'Spa Services', 
    description: 'Book spa treatments' 
  },
  laundry: { 
    title: 'Laundry Service', 
    description: 'Request laundry services' 
  },
  dining: { 
    title: 'Dining Reservations', 
    description: 'Reserve a table at our restaurant' 
  },
};

export function QRLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  // Auto-validate token with 24h caching
  const { qrData, isValidating, error } = useQRToken(token);

  // Phase 3: Dynamic My Requests
  const { requests, pendingCount } = useMyRequests(token || null);

  // PHASE-1C: Guest Info Persistence
  const { guestInfo, isLoading: guestInfoLoading, hasGuestInfo, saveGuestInfo } = useGuestInfo(token);
  const [showGuestInfoModal, setShowGuestInfoModal] = useState(false);

  // Apply QR theme dynamically
  useQRTheme(qrData?.branding, 'qr-portal-root');

  // NOTE: Global guest notifications are now handled by QRPortalWrapper
  // Removed duplicate useGuestNotifications call to prevent duplicate sound notifications

  // PHASE-1C: Show guest info modal on first visit
  useEffect(() => {
    if (!guestInfoLoading && !hasGuestInfo && qrData) {
      // Delay modal slightly to let landing page render first
      const timer = setTimeout(() => {
        setShowGuestInfoModal(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [guestInfoLoading, hasGuestInfo, qrData]);

  if (isValidating) {
    return (
      <>
        <OfflineIndicator />
        <LoadingState
          branding={qrData?.branding}
          hotelName={qrData?.tenant?.hotel_name || 'Guest Portal'}
          message="Validating QR code..."
          variant="luxury"
        />
      </>
    );
  }

  if (error || !qrData) {
    return (
      <>
        <OfflineIndicator />
        <LoadingState
          branding={null}
          hotelName="Connection Failed"
          message={error || 'This QR code is invalid or has expired.'}
          variant="simple"
        />
      </>
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

  const handleGuestInfoSubmit = (name: string, phone: string) => {
    saveGuestInfo(name, phone);
    setShowGuestInfoModal(false);
  };

  const handleGuestInfoSkip = () => {
    setShowGuestInfoModal(false);
  };

  return (
    <>
      {/* PHASE-1C: Guest Info Modal */}
      <GuestInfoModal 
        open={showGuestInfoModal}
        onSubmit={handleGuestInfoSubmit}
        onSkip={handleGuestInfoSkip}
      />

      {/* Offline Indicator */}
      <OfflineIndicator />

      <div 
        id="qr-portal-root"
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

        {/* PHASE-2-SIMPLIFICATION: Room Status Banner */}
        {qrData.room_status && (
          <Card className="shadow-xl bg-card/90 border-2 border-primary/20">
            <CardContent className="p-4">
              {qrData.room_status === 'occupied' && !qrData.session_expired && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <p className="font-medium">Room is occupied - All services available</p>
                </div>
              )}
              
              {['available', 'cleaning', 'out_of_order'].includes(qrData.room_status) && (
                <div className="flex items-center gap-2 text-amber-600">
                  <Bell className="h-5 w-5" />
                  <p className="font-medium">Browse services & pay directly</p>
                </div>
              )}
              
              {qrData.session_expired && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <Bell className="h-5 w-5" />
                    <p className="font-bold">Session Expired</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your stay has ended. Room billing is no longer available.
                    Please rescan the QR code for current access.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Services Section */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-serif text-foreground">Available Services</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-accent mx-auto rounded-full" />
          </div>

          <div className="grid gap-4">
            {/* Dynamically render all services from qrData.services */}
            {services.map((service) => {
              const IconComponent = SERVICE_ICONS[service];
              const config = SERVICE_CONFIG[service];
              
              // Skip if service not configured
              if (!IconComponent || !config) return null;
              
              // Skip if conditionally disabled by feature flags
              if (service === 'digital_menu' && !showMenu) return null;
              if (service === 'wifi' && !showWifi) return null;
              if (service === 'feedback' && !showFeedback) return null;

              // Determine route based on service type
              let route = `/qr/${token}/service/${service}`;
              if (service === 'digital_menu') route = `/qr/${token}/menu`;
              if (service === 'wifi') route = `/qr/${token}/wifi`;
              if (service === 'feedback') route = `/qr/${token}/feedback`;
              if (service === 'room_service') route = `/qr/${token}/room-service`;
              if (service === 'laundry') route = `/qr/${token}/laundry`;
              if (service === 'spa') route = `/qr/${token}/spa`;
              if (service === 'dining') route = `/qr/${token}/dining`;
              if (service === 'housekeeping') route = `/qr/${token}/housekeeping`;

              return (
                <ServiceCard
                  key={service}
                  icon={IconComponent}
                  title={config.title}
                  description={config.description}
                  onClick={() => navigate(route)}
                />
              );
            })}
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
            <Card className="shadow-xl border-2 border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10">
              <CardContent className="p-4">
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => navigate(`/qr/${token}/payments`)}
                  className="w-full gap-2 text-base font-semibold"
                >
                  <Receipt className="h-5 w-5" />
                  View Payment History
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Track all your payments and receipts
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Floating My Requests Button */}
      <MyRequestsButton
        pendingCount={pendingCount}
        requests={requests}
        branding={branding}
        onViewRequest={(requestId) => navigate(`/qr/${token}/chat/${requestId}`)}
      />
    </>
  );
}
