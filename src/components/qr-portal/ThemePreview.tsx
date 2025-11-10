import { Card, CardContent } from '@/components/ui/card';
import { UtensilsCrossed, Wifi, MessageCircle } from 'lucide-react';

interface ThemePreviewProps {
  theme: string;
  primaryColor?: string;
  accentColor?: string;
  hotelName?: string;
}

const THEME_PRESETS: Record<string, { primary: string; accent: string; gradient: string }> = {
  classic_luxury_gold: {
    primary: 'hsl(45 93% 47%)',
    accent: 'hsl(38 92% 50%)',
    gradient: 'from-amber-400/10 to-amber-600/10',
  },
  modern_elegant_blue: {
    primary: 'hsl(217 91% 60%)',
    accent: 'hsl(199 89% 48%)',
    gradient: 'from-blue-400/10 to-cyan-600/10',
  },
  tropical_resort_green: {
    primary: 'hsl(142 71% 45%)',
    accent: 'hsl(160 84% 39%)',
    gradient: 'from-green-400/10 to-emerald-600/10',
  },
  sunset_coral: {
    primary: 'hsl(14 91% 60%)',
    accent: 'hsl(340 82% 52%)',
    gradient: 'from-orange-400/10 to-pink-600/10',
  },
  royal_purple: {
    primary: 'hsl(271 91% 65%)',
    accent: 'hsl(291 64% 42%)',
    gradient: 'from-purple-400/10 to-violet-600/10',
  },
};

export function ThemePreview({ theme, primaryColor, accentColor, hotelName = 'Your Hotel' }: ThemePreviewProps) {
  const themeColors = theme === 'custom' 
    ? { primary: primaryColor || 'hsl(45 93% 47%)', accent: accentColor || 'hsl(38 92% 50%)', gradient: 'from-primary/10 to-accent/10' }
    : THEME_PRESETS[theme] || THEME_PRESETS.classic_luxury_gold;

  return (
    <div className="w-full h-[400px] overflow-hidden rounded-lg border-2 shadow-lg bg-gradient-to-br from-background via-muted/30 to-muted/50">
      <div className="p-6 space-y-4 scale-75 origin-top">
        {/* Preview Header */}
        <div className="text-center space-y-2">
          <h3 
            className="text-3xl font-display font-bold bg-clip-text text-transparent"
            style={{ 
              backgroundImage: `linear-gradient(to right, ${themeColors.primary}, ${themeColors.accent})` 
            }}
          >
            {hotelName}
          </h3>
          <p className="text-sm text-muted-foreground">Guest Portal Preview</p>
        </div>

        {/* Preview Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="group cursor-pointer border-2 hover:shadow-lg transition-all">
            <CardContent className="p-4 space-y-2">
              <div 
                className={`p-2 rounded-full bg-gradient-to-br ${themeColors.gradient} w-fit`}
              >
                <UtensilsCrossed className="h-5 w-5" style={{ color: themeColors.primary }} />
              </div>
              <p className="text-xs font-semibold">Menu</p>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer border-2 hover:shadow-lg transition-all">
            <CardContent className="p-4 space-y-2">
              <div 
                className={`p-2 rounded-full bg-gradient-to-br ${themeColors.gradient} w-fit`}
              >
                <Wifi className="h-5 w-5" style={{ color: themeColors.accent }} />
              </div>
              <p className="text-xs font-semibold">WiFi</p>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer border-2 hover:shadow-lg transition-all">
            <CardContent className="p-4 space-y-2">
              <div 
                className={`p-2 rounded-full bg-gradient-to-br ${themeColors.gradient} w-fit`}
              >
                <MessageCircle className="h-5 w-5" style={{ color: themeColors.primary }} />
              </div>
              <p className="text-xs font-semibold">Feedback</p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-xs text-muted-foreground mt-4">
          This is how your QR portal will appear to guests
        </div>
      </div>
    </div>
  );
}
