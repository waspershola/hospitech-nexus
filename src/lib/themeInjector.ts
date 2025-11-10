interface BrandingTheme {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font_heading?: string;
  font_body?: string;
}

interface QRThemeColors {
  primary: string;
  accent: string;
}

/**
 * Apply general branding theme to root element
 */
export function applyBrandingTheme(branding: BrandingTheme) {
  const root = document.documentElement;

  // Apply colors
  if (branding.primary_color) {
    const hslColor = hexToHsl(branding.primary_color);
    root.style.setProperty('--primary', hslColor);
  }
  
  if (branding.secondary_color) {
    const hslColor = hexToHsl(branding.secondary_color);
    root.style.setProperty('--secondary', hslColor);
  }
  
  if (branding.accent_color) {
    const hslColor = hexToHsl(branding.accent_color);
    root.style.setProperty('--accent', hslColor);
  }

  // Apply fonts
  if (branding.font_heading) {
    root.style.setProperty('--font-heading', `"${branding.font_heading}", serif`);
  }
  
  if (branding.font_body) {
    root.style.setProperty('--font-body', `"${branding.font_body}", sans-serif`);
  }
}

/**
 * Apply QR portal specific theme
 * Supports predefined themes and custom colors
 */
export function applyQRTheme(
  themeName: string,
  targetElement: HTMLElement = document.body,
  customColors?: QRThemeColors
) {
  // Remove existing QR theme classes
  const existingThemes = Array.from(targetElement.classList).filter(cls => 
    cls.startsWith('qr-theme-')
  );
  existingThemes.forEach(cls => targetElement.classList.remove(cls));

  // Add new theme class
  const themeClass = `qr-theme-${themeName.replace(/_/g, '-')}`;
  targetElement.classList.add(themeClass);

  // Apply custom colors if provided
  if (themeName === 'custom' && customColors) {
    const primaryHsl = customColors.primary.startsWith('#') 
      ? hexToHsl(customColors.primary)
      : customColors.primary;
    const accentHsl = customColors.accent.startsWith('#')
      ? hexToHsl(customColors.accent)
      : customColors.accent;

    // Set CSS custom properties for custom theme
    targetElement.style.setProperty('--qr-primary', primaryHsl.replace('hsl(', '').replace(')', ''));
    targetElement.style.setProperty('--qr-accent', accentHsl.replace('hsl(', '').replace(')', ''));
    targetElement.style.setProperty(
      '--qr-gradient-primary', 
      `linear-gradient(135deg, ${primaryHsl}, ${accentHsl})`
    );
    targetElement.style.setProperty(
      '--qr-shadow-glow',
      `0 0 30px hsl(${primaryHsl.replace('hsl(', '').replace(')', '')} / 0.3)`
    );
  }
}

/**
 * Generate gradient from two colors
 */
export function generateGradient(
  color1: string,
  color2: string,
  angle: number = 135
): string {
  const hsl1 = color1.startsWith('#') ? hexToHsl(color1) : color1;
  const hsl2 = color2.startsWith('#') ? hexToHsl(color2) : color2;
  
  return `linear-gradient(${angle}deg, ${hsl1}, ${hsl2})`;
}

/**
 * Convert hex color to HSL format
 */
export function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lPercent = Math.round(l * 100);
  
  return `hsl(${h} ${s}% ${lPercent}%)`;
}

/**
 * Lighten or darken a color
 */
export function adjustColorLightness(
  color: string,
  amount: number
): string {
  const hslColor = color.startsWith('#') ? hexToHsl(color) : color;
  
  // Parse HSL values
  const match = hslColor.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
  if (!match) return hslColor;
  
  const h = parseInt(match[1]);
  const s = parseInt(match[2]);
  let l = parseInt(match[3]);
  
  // Adjust lightness
  l = Math.max(0, Math.min(100, l + amount));
  
  return `hsl(${h} ${s}% ${l}%)`;
}

/**
 * Get contrasting text color for a background
 */
export function getContrastColor(backgroundColor: string): string {
  const hslColor = backgroundColor.startsWith('#') 
    ? hexToHsl(backgroundColor) 
    : backgroundColor;
  
  const match = hslColor.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
  if (!match) return 'hsl(0 0% 13%)';
  
  const l = parseInt(match[3]);
  
  // If lightness is above 60%, use dark text, otherwise use light text
  return l > 60 ? 'hsl(0 0% 13%)' : 'hsl(0 0% 95%)';
}

/**
 * Update favicon
 */
export function updateFavicon(faviconUrl: string | null) {
  if (!faviconUrl) return;

  const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
  (link as HTMLLinkElement).type = 'image/x-icon';
  (link as HTMLLinkElement).rel = 'icon';
  (link as HTMLLinkElement).href = faviconUrl;
  document.getElementsByTagName('head')[0].appendChild(link);
}

/**
 * Remove all QR theme styling from element
 */
export function removeQRTheme(targetElement: HTMLElement = document.body) {
  const themeClasses = Array.from(targetElement.classList).filter(cls => 
    cls.startsWith('qr-theme-')
  );
  themeClasses.forEach(cls => targetElement.classList.remove(cls));
  
  // Remove custom properties
  const customProps = [
    '--qr-primary',
    '--qr-accent',
    '--qr-gradient-primary',
    '--qr-shadow-glow',
    '--qr-background',
    '--qr-foreground',
  ];
  customProps.forEach(prop => {
    targetElement.style.removeProperty(prop);
  });
}
