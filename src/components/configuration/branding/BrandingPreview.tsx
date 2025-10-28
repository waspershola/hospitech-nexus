import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BrandingPreviewProps {
  logoUrl: string | null;
  heroImage: string | null;
  headline: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
}

export function BrandingPreview({
  logoUrl,
  heroImage,
  headline,
  primaryColor,
  secondaryColor,
  accentColor,
  fontHeading,
  fontBody
}: BrandingPreviewProps) {
  return (
    <Card className="p-6 space-y-4 bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Live Preview</h3>
        <span className="text-xs text-muted-foreground">Guest Portal</span>
      </div>

      <div className="border rounded-lg overflow-hidden shadow-lg bg-background">
        {/* Mock Guest Portal */}
        <div className="relative h-48 bg-muted overflow-hidden">
          {heroImage ? (
            <>
              <img 
                src={heroImage} 
                alt="Hero" 
                className="w-full h-full object-cover"
              />
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}40` }}
              >
                {headline && (
                  <h1 
                    className="text-3xl font-bold text-white text-center px-4"
                    style={{ fontFamily: `"${fontHeading}", serif` }}
                  >
                    {headline}
                  </h1>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-sm">Hero image preview</p>
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-12 object-contain" />
            ) : (
              <div className="h-12 w-32 bg-muted rounded flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Logo</span>
              </div>
            )}
          </div>

          {/* Mock Content */}
          <div style={{ fontFamily: `"${fontBody}", sans-serif` }}>
            <h2 
              className="text-xl font-bold mb-2"
              style={{ 
                fontFamily: `"${fontHeading}", serif`,
                color: primaryColor 
              }}
            >
              Welcome to Your Stay
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Experience luxury and comfort in our carefully designed rooms and suites.
            </p>
            
            <div className="flex gap-2">
              <Button 
                size="sm"
                style={{ 
                  backgroundColor: primaryColor,
                  color: 'white'
                }}
              >
                Book Now
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                style={{ 
                  borderColor: secondaryColor,
                  color: secondaryColor
                }}
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Color Palette Display */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Active Color Palette</p>
            <div className="flex gap-2">
              <div 
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: primaryColor }}
                title="Primary"
              />
              <div 
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: secondaryColor }}
                title="Secondary"
              />
              <div 
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: accentColor }}
                title="Accent"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
