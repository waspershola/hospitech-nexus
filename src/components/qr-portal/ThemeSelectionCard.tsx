import { Card, CardContent } from '@/components/ui/card';
import { Check, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeSelectionCardProps {
  themeName: string;
  themeKey: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  tertiaryColor?: string;
  isSelected: boolean;
  isPremium?: boolean;
  onSelect: () => void;
}

export function ThemeSelectionCard({
  themeName,
  themeKey,
  description,
  primaryColor,
  accentColor,
  tertiaryColor,
  isSelected,
  isPremium = false,
  onSelect,
}: ThemeSelectionCardProps) {
  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-300 hover:shadow-lg relative overflow-hidden',
        isSelected 
          ? 'border-2 border-primary shadow-lg ring-2 ring-primary/20' 
          : 'border-2 border-transparent hover:border-muted-foreground/30'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-6 space-y-4">
        {/* Header with Name and Badge */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-serif font-semibold text-foreground mb-1">
              {themeName}
            </h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          
          {/* Selection Indicator */}
          {isSelected && (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 ml-2">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Color Palette Indicators */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div
              className="w-10 h-10 rounded-lg shadow-sm border border-border/50 transition-transform group-hover:scale-110"
              style={{ backgroundColor: primaryColor }}
              title="Primary Color"
            />
            <div
              className="w-10 h-10 rounded-lg shadow-sm border border-border/50 transition-transform group-hover:scale-110"
              style={{ backgroundColor: accentColor }}
              title="Accent Color"
            />
            {tertiaryColor && (
              <div
                className="w-10 h-10 rounded-lg shadow-sm border border-border/50 transition-transform group-hover:scale-110"
                style={{ backgroundColor: tertiaryColor }}
                title="Tertiary Color"
              />
            )}
          </div>
          
          {/* Gradient Preview */}
          <div
            className="flex-1 h-10 rounded-lg shadow-sm border border-border/50"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
            }}
          />
        </div>

        {/* Premium Badge */}
        {isPremium && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Crown className="h-3.5 w-3.5 text-primary" />
            <span>Premium Theme</span>
          </div>
        )}

        {/* Currently Applied Badge */}
        {isSelected && (
          <div className="absolute top-3 right-3 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full border border-primary/20">
            Currently Applied
          </div>
        )}
      </CardContent>
    </Card>
  );
}
