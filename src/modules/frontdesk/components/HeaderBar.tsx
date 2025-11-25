import { Search, Hotel, Clock, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { OfflineIndicator } from './OfflineIndicator';
import { FrontDeskAlerts } from './FrontDeskAlerts';
import { QRRequestNotificationWidget } from '@/components/frontdesk/QRRequestNotificationWidget';

interface HeaderBarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onNewBooking?: () => void;
}

export function HeaderBar({ searchQuery = '', onSearchChange, onNewBooking }: HeaderBarProps) {
  const { tenantName } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-card border-b border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Hotel className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold text-foreground">
            Front Desk
          </h1>
        </div>

        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search rooms, guests..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <OfflineIndicator />
          <FrontDeskAlerts />
          <div className="text-sm hidden lg:block">
            <p className="font-medium text-foreground">{tenantName}</p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground hidden md:flex">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-mono">
              {currentTime.toLocaleTimeString()}
            </span>
          </div>
          <QRRequestNotificationWidget />
          <Button 
            onClick={onNewBooking} 
            size="default"
            className="hidden sm:flex h-8"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Booking
          </Button>
          <Button 
            onClick={onNewBooking} 
            size="icon"
            className="sm:hidden h-8 w-8"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
