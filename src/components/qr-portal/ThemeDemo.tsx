import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQRTheme, useQRThemeColors } from '@/hooks/useQRTheme';
import { Crown, Sparkles, UtensilsCrossed, Wifi, MessageCircle, Phone } from 'lucide-react';

const THEME_OPTIONS = [
  { value: 'classic_luxury_gold', label: 'Classic Luxury Gold' },
  { value: 'modern_elegant_blue', label: 'Modern Elegant Blue' },
  { value: 'tropical_resort_green', label: 'Tropical Resort Green' },
  { value: 'sunset_coral', label: 'Sunset Coral' },
  { value: 'royal_purple', label: 'Royal Purple' },
];

/**
 * Demo component to showcase QR theme system
 * Can be used in dashboard to preview themes
 */
export function ThemeDemo() {
  const [selectedTheme, setSelectedTheme] = useState('classic_luxury_gold');
  const [isDark, setIsDark] = useState(false);

  // Apply theme to demo container
  const branding = { qr_theme: selectedTheme };
  useQRTheme(branding, 'theme-demo-container');
  
  // Get theme colors for inline styling
  const colors = useQRThemeColors(branding);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold">QR Theme System Demo</h2>
          <p className="text-muted-foreground">Preview different QR portal themes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isDark ? 'outline' : 'default'}
            size="sm"
            onClick={() => setIsDark(false)}
          >
            Light
          </Button>
          <Button
            variant={isDark ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsDark(true)}
          >
            Dark
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Select Theme</Label>
        <Select value={selectedTheme} onValueChange={setSelectedTheme}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEME_OPTIONS.map((theme) => (
              <SelectItem key={theme.value} value={theme.value}>
                {theme.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Theme Preview */}
      <div
        id="theme-demo-container"
        className={`p-8 rounded-lg border-2 ${isDark ? 'dark' : ''}`}
        style={{
          background: `var(--qr-gradient-bg, linear-gradient(180deg, hsl(var(--qr-background)), hsl(var(--qr-muted))))`,
        }}
      >
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div
              className="w-20 h-20 mx-auto rounded-full backdrop-blur-sm border-2 shadow-xl flex items-center justify-center"
              style={{
                borderColor: `hsl(var(--qr-primary) / 0.4)`,
                background: colors.gradient,
              }}
            >
              <Crown className="h-10 w-10 text-white" />
            </div>
            <h1
              className="text-4xl font-serif font-bold bg-clip-text text-transparent"
              style={{ backgroundImage: colors.gradient }}
            >
              Luxury Hotel
            </h1>
            <div className="flex items-center justify-center gap-3">
              <Sparkles className="h-5 w-5" style={{ color: colors.primary }} />
              <span
                className="text-xl font-bold font-serif"
                style={{ color: colors.primary }}
              >
                Room 101
              </span>
              <Sparkles className="h-5 w-5" style={{ color: colors.accent }} />
            </div>
          </div>

          {/* Welcome Card */}
          <Card className="qr-card shadow-xl">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="h-5 w-5" style={{ color: colors.primary }} />
                <h3 className="text-lg font-serif">Welcome</h3>
                <Crown className="h-5 w-5" style={{ color: colors.accent }} />
              </div>
              <p className="qr-muted">Experience seamless service at your fingertips</p>
            </CardContent>
          </Card>

          {/* Service Cards */}
          <div className="space-y-3">
            <h3 className="text-center font-serif font-semibold">Available Services</h3>
            
            {[
              { icon: UtensilsCrossed, title: 'Digital Menu', desc: 'Browse & order' },
              { icon: Wifi, title: 'WiFi Access', desc: 'Connect to network' },
              { icon: MessageCircle, title: 'Share Feedback', desc: 'Help us improve' },
            ].map((service, idx) => (
              <Card key={idx} className="qr-service-card cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}25)`,
                    }}
                  >
                    <service.icon className="h-6 w-6" style={{ color: colors.primary }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-serif font-semibold">{service.title}</h4>
                    <p className="text-xs qr-muted">{service.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact Button */}
          <Button
            className="w-full qr-button-primary"
            style={{
              background: colors.gradient,
            }}
          >
            <Phone className="h-4 w-4 mr-2" />
            Call Front Desk
          </Button>

          {/* Color Info */}
          <div className="pt-4 border-t qr-card space-y-2">
            <p className="text-xs font-semibold text-center">Theme Colors</p>
            <div className="flex items-center justify-center gap-2">
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded-lg border mx-auto mb-1"
                  style={{ backgroundColor: colors.primary }}
                />
                <p className="text-xs qr-muted">Primary</p>
              </div>
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded-lg border mx-auto mb-1"
                  style={{ backgroundColor: colors.accent }}
                />
                <p className="text-xs qr-muted">Accent</p>
              </div>
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded-lg border mx-auto mb-1"
                  style={{ background: colors.gradient }}
                />
                <p className="text-xs qr-muted">Gradient</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
