# QR Portal Theme System Documentation

## Overview

The QR Portal Theme System provides a flexible, dynamic theming solution for the guest QR portal. It supports predefined color schemes, custom colors, dark mode variants, and automatic CSS variable injection.

## Architecture

### Files

- **`src/styles/qr-themes.css`** - CSS theme definitions with predefined color schemes
- **`src/hooks/useQRTheme.ts`** - React hook for applying themes dynamically
- **`src/hooks/useQRThemeColors.ts`** - Hook for getting theme colors for inline styling
- **`src/lib/themeInjector.ts`** - Utility functions for theme manipulation

## Predefined Themes

### 1. Classic Luxury Gold (default)
- Primary: `hsl(45 93% 47%)` - Rich gold
- Accent: `hsl(38 92% 50%)` - Warm amber
- Best for: Traditional luxury hotels

### 2. Modern Elegant Blue
- Primary: `hsl(217 91% 60%)` - Modern blue
- Accent: `hsl(199 89% 48%)` - Bright cyan
- Best for: Contemporary hotels, business hotels

### 3. Tropical Resort Green
- Primary: `hsl(142 71% 45%)` - Fresh green
- Accent: `hsl(160 84% 39%)` - Teal
- Best for: Beach resorts, eco-hotels

### 4. Sunset Coral
- Primary: `hsl(14 91% 60%)` - Warm coral
- Accent: `hsl(340 82% 52%)` - Pink rose
- Best for: Romantic getaways, boutique hotels

### 5. Royal Purple
- Primary: `hsl(271 91% 65%)` - Royal purple
- Accent: `hsl(291 64% 42%)` - Deep magenta
- Best for: Premium hotels, spa resorts

## Usage

### Basic Theme Application

```typescript
import { useQRTheme } from '@/hooks/useQRTheme';

function QRPortalPage() {
  const branding = {
    qr_theme: 'classic_luxury_gold'
  };

  // Apply theme to entire portal
  useQRTheme(branding);

  return <div>Your portal content</div>;
}
```

### Apply Theme to Specific Element

```typescript
import { useQRTheme } from '@/hooks/useQRTheme';

function QRSection() {
  const branding = {
    qr_theme: 'modern_elegant_blue'
  };

  // Apply theme to specific container
  useQRTheme(branding, 'qr-section-container');

  return (
    <div id="qr-section-container">
      Section content with themed styling
    </div>
  );
}
```

### Custom Colors

```typescript
import { useQRTheme } from '@/hooks/useQRTheme';

function CustomThemedPortal() {
  const branding = {
    qr_theme: 'custom',
    qr_primary_color: '#ff6b6b',
    qr_accent_color: '#4ecdc4'
  };

  useQRTheme(branding);

  return <div>Portal with custom brand colors</div>;
}
```

### Get Theme Colors for Inline Styling

```typescript
import { useQRThemeColors } from '@/hooks/useQRTheme';

function DynamicComponent() {
  const branding = { qr_theme: 'sunset_coral' };
  const colors = useQRThemeColors(branding);

  return (
    <div>
      <div style={{ color: colors.primary }}>
        Primary colored text
      </div>
      <div style={{ background: colors.gradient }}>
        Gradient background
      </div>
    </div>
  );
}
```

## CSS Utility Classes

### Card Styling

```html
<div class="qr-card">
  <!-- Automatically styled with theme colors -->
</div>
```

### Service Cards

```html
<div class="qr-service-card">
  <!-- Hover effects with theme colors -->
</div>
```

### Buttons

```html
<button class="qr-button-primary">
  <!-- Gradient background with theme colors -->
</button>
```

### Text Colors

```html
<p class="qr-muted">Muted text color</p>
```

### Accent Background

```html
<div class="qr-accent">
  <!-- Gradient accent background -->
</div>
```

## CSS Custom Properties

All themes expose the following CSS variables:

```css
--qr-primary           /* Primary theme color */
--qr-primary-light     /* Lighter variant */
--qr-primary-dark      /* Darker variant */
--qr-accent            /* Accent theme color */
--qr-accent-light      /* Lighter accent */
--qr-background        /* Background color */
--qr-foreground        /* Text color */
--qr-muted             /* Muted background */
--qr-muted-foreground  /* Muted text */
--qr-border            /* Border color */
--qr-card-bg           /* Card background */
--qr-gradient-primary  /* Primary gradient */
--qr-gradient-bg       /* Background gradient */
--qr-shadow-glow       /* Glowing shadow effect */
```

### Using CSS Variables Directly

```css
.custom-element {
  background: var(--qr-gradient-primary);
  color: hsl(var(--qr-foreground));
  border: 2px solid hsl(var(--qr-primary) / 0.3);
  box-shadow: var(--qr-shadow-glow);
}
```

## Dark Mode Support

All themes automatically adapt to dark mode:

```typescript
// Theme classes automatically adjust in dark mode
<div className="qr-theme-classic-luxury-gold dark">
  <!-- Dark mode styles applied -->
</div>
```

## Animations

### Fade In Animation

```html
<div class="qr-animate-in">
  <!-- Fades in with slide up effect -->
</div>
```

### Pulse Glow

```html
<div class="qr-pulse-glow">
  <!-- Pulsing glow effect with theme color -->
</div>
```

## Advanced: Programmatic Theme Manipulation

### Change Theme Dynamically

```typescript
import { applyQRTheme } from '@/lib/themeInjector';

// Apply predefined theme
applyQRTheme('tropical_resort_green', document.body);

// Apply custom theme
applyQRTheme('custom', document.body, {
  primary: '#ff6b6b',
  accent: '#4ecdc4'
});
```

### Generate Gradients

```typescript
import { generateGradient } from '@/lib/themeInjector';

const gradient = generateGradient('#ff6b6b', '#4ecdc4', 135);
// Returns: 'linear-gradient(135deg, hsl(...), hsl(...))'
```

### Convert Colors

```typescript
import { hexToHsl, adjustColorLightness, getContrastColor } from '@/lib/themeInjector';

// Convert hex to HSL
const hslColor = hexToHsl('#ff6b6b');
// Returns: 'hsl(0 85% 70%)'

// Lighten/darken color
const lighter = adjustColorLightness('hsl(0 85% 70%)', 10);
// Returns: 'hsl(0 85% 80%)'

// Get contrasting text color
const textColor = getContrastColor('#ff6b6b');
// Returns: 'hsl(0 0% 13%)' or 'hsl(0 0% 95%)'
```

## Best Practices

1. **Always use semantic tokens**: Prefer CSS variables over hardcoded colors
2. **Theme at container level**: Apply themes to parent containers, not individual elements
3. **Test in dark mode**: Always verify themes work in both light and dark modes
4. **Clean up on unmount**: The `useQRTheme` hook automatically cleans up
5. **Batch theme changes**: Avoid applying themes in rapid succession

## Database Schema

Themes are stored in the `hotel_branding` table:

```sql
{
  qr_theme: 'classic_luxury_gold' | 'modern_elegant_blue' | 'tropical_resort_green' | 'sunset_coral' | 'royal_purple' | 'custom',
  qr_primary_color: '#ff6b6b', -- Only for custom theme
  qr_accent_color: '#4ecdc4'   -- Only for custom theme
}
```

## Troubleshooting

### Theme not applying
- Ensure the container element exists when the hook runs
- Check that the element ID matches if using targeted application
- Verify branding data structure is correct

### Colors look wrong
- Ensure all colors are in HSL format, not RGB or hex
- Check for conflicting inline styles
- Verify custom properties are defined correctly

### Dark mode not working
- Add `dark` class to parent container or use system dark mode
- Check that dark mode variants are defined in `qr-themes.css`

## Performance Considerations

- Theme application is optimized for minimal re-renders
- CSS variables enable instant theme switching without re-renders
- Cleanup automatically prevents memory leaks
- Use memoization for computed theme values

## Examples

See `src/components/qr-portal/ThemeDemo.tsx` for a complete working example of the theme system in action.
