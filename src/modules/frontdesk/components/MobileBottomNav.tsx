import { Home, CalendarPlus, DoorOpen, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  onNewBooking: () => void;
  onQuickCheckIn?: () => void;
  onQuickCheckOut?: () => void;
}

export function MobileBottomNav({ onNewBooking, onQuickCheckIn, onQuickCheckOut }: MobileBottomNavProps) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-2 px-3"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs">Overview</span>
        </Button>

        <Button
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-2 px-4 bg-primary hover:bg-primary/90"
          onClick={onNewBooking}
        >
          <CalendarPlus className="w-5 h-5" />
          <span className="text-xs font-medium">New Booking</span>
        </Button>

        {onQuickCheckIn && (
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-2 px-3"
            onClick={onQuickCheckIn}
          >
            <DoorOpen className="w-5 h-5" />
            <span className="text-xs">Check In</span>
          </Button>
        )}
      </div>
    </div>
  );
}
