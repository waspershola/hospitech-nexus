import { useEffect } from 'react';
import { applyQRTheme, hexToHsl } from '@/lib/themeInjector';

interface Branding {
  qr_theme?: string;
  qr_primary_color?: string;
  qr_accent_color?: string;
}

/**
 * Hook to apply QR portal theme dynamically
 * Supports predefined themes and custom colors
 * Automatically cleans up on unmount
 */
export function useQRTheme(branding: Branding | null | undefined, elementId?: string) {
  useEffect(() => {
    if (!branding) return;

    const targetElement = elementId ? document.getElementById(elementId) : document.body;
    if (!targetElement) return;

    const theme = branding.qr_theme || 'classic_luxury_gold';
    
    // Apply predefined theme
    if (theme !== 'custom') {
      applyQRTheme(theme, targetElement);
    } 
    // Apply custom colors
    else if (branding.qr_primary_color && branding.qr_accent_color) {
      applyQRTheme('custom', targetElement, {
        primary: branding.qr_primary_color,
        accent: branding.qr_accent_color,
      });
    }
    // Fallback to default theme
    else {
      applyQRTheme('classic_luxury_gold', targetElement);
    }

    // Cleanup function
    return () => {
      // Remove theme classes from target element
      const themeClasses = Array.from(targetElement.classList).filter(cls => 
        cls.startsWith('qr-theme-')
      );
      themeClasses.forEach(cls => targetElement.classList.remove(cls));
      
      // Remove inline custom styles if they exist
      if (theme === 'custom') {
        const customProps = [
          '--qr-primary',
          '--qr-accent',
          '--qr-gradient-primary',
          '--qr-shadow-glow',
        ];
        customProps.forEach(prop => {
          targetElement.style.removeProperty(prop);
        });
      }
    };
  }, [branding, elementId]);
}

/**
 * Hook to get theme colors for inline styling
 * Useful for dynamic SVG colors, charts, etc.
 */
export function useQRThemeColors(branding: Branding | null | undefined) {
  if (!branding) {
    return {
      primary: 'hsl(45 93% 47%)',
      accent: 'hsl(38 92% 50%)',
      gradient: 'linear-gradient(135deg, hsl(45 93% 47%), hsl(38 92% 50%))',
    };
  }

  const theme = branding.qr_theme || 'classic_luxury_gold';

  // Predefined theme colors
  const THEME_COLORS: Record<string, { primary: string; accent: string }> = {
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

  let primary: string;
  let accent: string;

  if (theme === 'custom' && branding.qr_primary_color && branding.qr_accent_color) {
    // Convert hex to HSL if needed
    primary = branding.qr_primary_color.startsWith('#') 
      ? hexToHsl(branding.qr_primary_color)
      : branding.qr_primary_color;
    accent = branding.qr_accent_color.startsWith('#')
      ? hexToHsl(branding.qr_accent_color)
      : branding.qr_accent_color;
  } else {
    const colors = THEME_COLORS[theme] || THEME_COLORS.classic_luxury_gold;
    primary = colors.primary;
    accent = colors.accent;
  }

  return {
    primary,
    accent,
    gradient: `linear-gradient(135deg, ${primary}, ${accent})`,
  };
}
