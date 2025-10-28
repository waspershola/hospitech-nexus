import { Search, Hotel, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export function HeaderBar() {
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

        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search rooms, guests..."
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-sm">
            <p className="font-medium text-foreground">{tenantName}</p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-mono">
              {currentTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
