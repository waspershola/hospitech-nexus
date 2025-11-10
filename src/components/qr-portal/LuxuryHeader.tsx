import { Crown, Sparkles, Home } from 'lucide-react';

interface LuxuryHeaderProps {
  logoUrl?: string;
  hotelName: string;
  displayName: string;
  themeGradient: string;
}

export function LuxuryHeader({ logoUrl, hotelName, displayName, themeGradient }: LuxuryHeaderProps) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 text-center space-y-6 animate-fade-in">
      {/* Logo Container */}
      <div className="w-24 h-24 mx-auto rounded-full backdrop-blur-sm border-2 border-white/20 shadow-2xl overflow-hidden bg-gradient-to-br from-background/80 to-muted/60 flex items-center justify-center">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt="Hotel Logo" 
            className="w-20 h-20 object-cover rounded-full border-2 border-white/20"
          />
        ) : (
          <Crown className="h-12 w-12 text-primary" />
        )}
      </div>

      {/* Hotel Name */}
      <h1 
        className="text-4xl font-serif mb-3 tracking-wide bg-clip-text text-transparent font-bold"
        style={{ backgroundImage: themeGradient }}
      >
        {hotelName}
      </h1>

      {/* Room/Guest Info with Decorative Icons */}
      <div className="flex items-center justify-center gap-4 text-muted-foreground mb-4">
        <Sparkles className="h-6 w-6 text-primary/70 animate-pulse" />
        <div className="flex items-center gap-2">
          <Home className="h-6 w-6 text-primary/70" />
          <span className="text-2xl font-bold font-serif tracking-wider bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {displayName}
          </span>
        </div>
        <Sparkles className="h-6 w-6 text-primary/70 animate-pulse" />
      </div>

      {/* Subtitle */}
      <p className="text-muted-foreground opacity-80 text-lg font-light">
        Luxury Guest Services
      </p>
    </div>
  );
}
