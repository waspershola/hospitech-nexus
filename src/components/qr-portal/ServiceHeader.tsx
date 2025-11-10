import { ArrowLeft, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServiceHeaderProps {
  logoUrl?: string | null;
  hotelName: string;
  roomNumber: string;
  onBack: () => void;
}

export function ServiceHeader({ logoUrl, hotelName, roomNumber, onBack }: ServiceHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-amber-900 to-amber-800 shadow-xl border-b border-amber-700/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-amber-50 hover:text-white hover:bg-amber-800/50 transition-all duration-300 hover:scale-110"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Center Content: Logo + Hotel Info */}
          <div className="flex items-center gap-4 flex-1 justify-center">
            {/* Logo Container */}
            <div className="w-12 h-12 rounded-full bg-amber-50/10 backdrop-blur-sm border border-amber-300/20 shadow-lg flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Hotel Logo" 
                  className="w-10 h-10 object-cover rounded-full"
                />
              ) : (
                <Crown className="h-6 w-6 text-amber-200" />
              )}
            </div>

            {/* Hotel Name & Room */}
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-amber-50 tracking-wide">
                {hotelName}
              </h1>
              <p className="text-sm text-amber-200/90 font-medium">
                {roomNumber}
              </p>
            </div>
          </div>

          {/* Spacer for symmetry */}
          <div className="w-10" />
        </div>
      </div>
    </header>
  );
}
