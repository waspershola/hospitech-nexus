interface BrandingTheme {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font_heading?: string;
  font_body?: string;
}

export function applyBrandingTheme(branding: BrandingTheme) {
  const root = document.documentElement;

  // Apply colors
  if (branding.primary_color) {
    root.style.setProperty('--primary', branding.primary_color);
  }
  
  if (branding.secondary_color) {
    root.style.setProperty('--secondary', branding.secondary_color);
  }
  
  if (branding.accent_color) {
    root.style.setProperty('--accent', branding.accent_color);
  }

  // Apply fonts
  if (branding.font_heading) {
    root.style.setProperty('--font-heading', `"${branding.font_heading}", serif`);
  }
  
  if (branding.font_body) {
    root.style.setProperty('--font-body', `"${branding.font_body}", sans-serif`);
  }
}

export function updateFavicon(faviconUrl: string | null) {
  if (!faviconUrl) return;

  const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
  (link as HTMLLinkElement).type = 'image/x-icon';
  (link as HTMLLinkElement).rel = 'icon';
  (link as HTMLLinkElement).href = faviconUrl;
  document.getElementsByTagName('head')[0].appendChild(link);
}
