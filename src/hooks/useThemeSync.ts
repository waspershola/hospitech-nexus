import { useEffect } from 'react';
import { applyBrandingTheme } from '@/lib/themeInjector';

interface Branding {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font_heading?: string;
  font_body?: string;
}

export function useThemeSync(branding: Branding | null) {
  useEffect(() => {
    if (branding) {
      applyBrandingTheme(branding);
    }
  }, [branding]);
}
