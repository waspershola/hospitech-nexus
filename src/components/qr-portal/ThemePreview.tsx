import { Card } from '@/components/ui/card';
import { UtensilsCrossed, Wifi, MessageCircle, Crown, Home, Sparkles, Phone, Clock, ChevronRight } from 'lucide-react';

interface ThemePreviewProps {
  theme: string;
  primaryColor?: string;
  accentColor?: string;
  hotelName?: string;
  logoUrl?: string;
}

const THEME_PRESETS: Record<string, { primary: string; accent: string }> = {
  classic_luxury_gold: {
    primary: 'hsl(45 93% 47%)',
    accent: 'hsl(38 92% 50%)',
  },
  modern_elegant_blue: {
    primary: 'hsl(217 91% 60%)',
    accent: 'hsl(199 89% 48%)',
  },
  tropical_resort_green: {
    primary: 'hsl(142 71% 45%)',
    accent: 'hsl(160 84% 39%)',
  },
  sunset_coral: {
    primary: 'hsl(14 91% 60%)',
    accent: 'hsl(340 82% 52%)',
  },
  royal_purple: {
    primary: 'hsl(271 91% 65%)',
    accent: 'hsl(291 64% 42%)',
  },
};

export function ThemePreview({ theme, primaryColor, accentColor, hotelName = 'Your Hotel', logoUrl }: ThemePreviewProps) {
  const themeColors = theme === 'custom' 
    ? { primary: primaryColor || 'hsl(45 93% 47%)', accent: accentColor || 'hsl(38 92% 50%)' }
    : THEME_PRESETS[theme] || THEME_PRESETS.classic_luxury_gold;

  const gradient = `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.accent})`;

  return (
    <div className="w-full rounded-lg border-2 shadow-xl overflow-hidden bg-gradient-to-br from-background via-muted/30 to-muted/50">
      <div className="p-8 space-y-6">
        {/* Luxury Header Preview */}
        <div className="text-center space-y-4">
          {/* Logo */}
          <div 
            className="w-16 h-16 mx-auto rounded-full backdrop-blur-sm border-2 shadow-xl overflow-hidden flex items-center justify-center"
            style={{ 
              borderColor: `${themeColors.primary}40`,
              background: `linear-gradient(135deg, ${themeColors.primary}10, ${themeColors.accent}20)`
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-14 h-14 object-cover rounded-full" />
            ) : (
              <Crown className="h-8 w-8" style={{ color: themeColors.primary }} />
            )}
          </div>

          {/* Hotel Name */}
          <h2 
            className="text-3xl font-serif font-bold bg-clip-text text-transparent"
            style={{ backgroundImage: gradient }}
          >
            {hotelName}
          </h2>

          {/* Room Info */}
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Sparkles className="h-4 w-4 animate-pulse" style={{ color: themeColors.primary }} />
            <div className="flex items-center gap-1.5">
              <Home className="h-4 w-4" style={{ color: themeColors.primary }} />
              <span 
                className="text-lg font-bold font-serif bg-clip-text text-transparent"
                style={{ backgroundImage: gradient }}
              >
                Room 101
              </span>
            </div>
            <Sparkles className="h-4 w-4 animate-pulse" style={{ color: themeColors.accent }} />
          </div>

          <p className="text-sm text-muted-foreground opacity-80">Luxury Guest Services</p>
        </div>

        {/* Welcome Card */}
        <Card className="shadow-lg border-2 bg-card/80 backdrop-blur-sm">
          <div className="p-6 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown className="h-5 w-5" style={{ color: themeColors.primary }} />
              <h3 className="text-lg font-serif text-foreground">Welcome</h3>
              <Crown className="h-5 w-5" style={{ color: themeColors.accent }} />
            </div>
            <p className="text-sm text-muted-foreground">
              Experience seamless service at your fingertips
            </p>
          </div>
        </Card>

        {/* Service Cards Preview */}
        <div className="space-y-3">
          <div className="text-center space-y-1">
            <h3 className="text-base font-serif font-semibold text-foreground">Available Services</h3>
            <div 
              className="w-16 h-0.5 mx-auto rounded-full"
              style={{ background: gradient }}
            />
          </div>

          {/* Service Card Examples */}
          <div className="space-y-2">
            {[
              { icon: UtensilsCrossed, title: 'Digital Menu', desc: 'Browse menu & place orders' },
              { icon: Wifi, title: 'WiFi Access', desc: 'Connect to our network' },
              { icon: MessageCircle, title: 'Share Feedback', desc: 'Help us improve' },
            ].map((service, idx) => (
              <Card 
                key={idx}
                className="shadow-md hover:shadow-lg transition-all duration-300 border-2 bg-card/80 backdrop-blur-sm group cursor-pointer"
              >
                <div className="p-4 flex items-center gap-3">
                  {/* Icon */}
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primary}15, ${themeColors.accent}25)`
                    }}
                  >
                    <service.icon className="h-6 w-6" style={{ color: themeColors.primary }} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-serif font-semibold text-foreground mb-0.5">
                      {service.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">{service.desc}</p>
                  </div>

                  {/* Arrow */}
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shrink-0"
                    style={{ background: gradient }}
                  >
                    <ChevronRight className="h-4 w-4 text-white" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Card Preview */}
        <Card className="shadow-lg border-2 bg-card/80 backdrop-blur-sm">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.primary}15, ${themeColors.accent}25)`
                }}
              >
                <Phone className="h-5 w-5" style={{ color: themeColors.primary }} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-serif font-semibold text-foreground">Need Assistance?</h4>
                <p className="text-xs text-muted-foreground">Connect with front desk</p>
              </div>
            </div>
            <div 
              className="py-2 px-4 rounded-full text-xs text-white text-center font-medium"
              style={{ background: gradient }}
            >
              Call Now
            </div>
          </div>
        </Card>

        {/* Footer Preview */}
        <div className="text-center space-y-2 pt-2">
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="text-xs">Available 24/7</span>
          </div>
          <p className="text-xs text-muted-foreground/70">Powered by luxuryhotelpro.com</p>
        </div>
      </div>
    </div>
  );
}
