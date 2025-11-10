import { Crown, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useQRThemeColors } from '@/hooks/useQRTheme';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  /** Branding configuration for theme colors */
  branding?: {
    qr_theme?: string;
    qr_primary_color?: string;
    qr_accent_color?: string;
  };
  /** Hotel name to display */
  hotelName?: string;
  /** Loading message */
  message?: string;
  /** Show full screen loading */
  fullScreen?: boolean;
  /** Custom className */
  className?: string;
  /** Variant: luxury (with Crown) or simple (with Loader) */
  variant?: 'luxury' | 'simple';
}

/**
 * LoadingState - Luxury loading component with theme colors
 * Supports both luxury (Crown animation) and simple (Loader) variants
 */
export function LoadingState({
  branding,
  hotelName = 'Guest Portal',
  message = 'Loading your portal...',
  fullScreen = true,
  className,
  variant = 'luxury',
}: LoadingStateProps) {
  const colors = useQRThemeColors(branding);

  const content = (
    <Card 
      className={cn(
        "max-w-md shadow-2xl backdrop-blur-sm bg-card/90",
        className
      )}
      style={{ borderColor: `${colors.primary}20` }}
    >
      <CardContent className="pt-6 text-center space-y-6">
        {variant === 'luxury' ? (
          // Luxury Crown Animation
          <>
            <div 
              className="w-20 h-20 mx-auto rounded-full shadow-lg flex items-center justify-center relative"
              style={{ background: colors.gradient }}
            >
              <Crown className="h-10 w-10 text-white animate-pulse" />
              
              {/* Decorative sparkles */}
              <Sparkles 
                className="absolute -top-2 -right-2 h-5 w-5 animate-pulse"
                style={{ color: colors.primary }}
              />
              <Sparkles 
                className="absolute -bottom-2 -left-2 h-5 w-5 animate-pulse"
                style={{ 
                  color: colors.accent,
                  animationDelay: '0.5s' 
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Sparkles 
                  className="h-5 w-5 animate-pulse" 
                  style={{ color: colors.primary }}
                />
                <h2 className="text-lg font-serif text-foreground">
                  {hotelName}
                </h2>
                <Sparkles 
                  className="h-5 w-5 animate-pulse" 
                  style={{ 
                    color: colors.accent,
                    animationDelay: '0.5s' 
                  }}
                />
              </div>
              <p className="text-muted-foreground">{message}</p>
            </div>

            {/* Loading dots animation */}
            <div className="flex items-center justify-center gap-2">
              <div 
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ 
                  background: colors.primary,
                  animationDelay: '0s'
                }}
              />
              <div 
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ 
                  background: colors.primary,
                  animationDelay: '0.2s'
                }}
              />
              <div 
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ 
                  background: colors.accent,
                  animationDelay: '0.4s'
                }}
              />
            </div>
          </>
        ) : (
          // Simple Loader Animation
          <>
            <div 
              className="w-20 h-20 mx-auto rounded-full shadow-lg flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}25)`
              }}
            >
              <Loader2 
                className="h-10 w-10 animate-spin" 
                style={{ color: colors.primary }}
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-serif text-foreground">
                {hotelName}
              </h2>
              <p className="text-muted-foreground">{message}</p>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full animate-[loading_1.5s_ease-in-out_infinite]"
                style={{ background: colors.gradient }}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  if (fullScreen) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center animate-fade-in"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}05 0%, ${colors.accent}05 100%), 
                       linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%)`
        }}
      >
        {content}
      </div>
    );
  }

  return content;
}

// Add loading animation keyframes to CSS if not already present
const style = document.createElement('style');
style.textContent = `
  @keyframes loading {
    0% {
      transform: translateX(-100%);
    }
    50% {
      transform: translateX(100%);
    }
    100% {
      transform: translateX(-100%);
    }
  }
`;
if (!document.querySelector('style[data-loading-animation]')) {
  style.setAttribute('data-loading-animation', 'true');
  document.head.appendChild(style);
}
