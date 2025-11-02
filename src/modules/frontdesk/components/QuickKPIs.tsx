import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Hotel, 
  Users, 
  LogIn, 
  LogOut, 
  UserCheck, 
  CreditCard,
  AlertTriangle,
  Fuel,
  CalendarRange
} from 'lucide-react';
import { useFrontDeskKPIs } from '../hooks/useFrontDeskKPIs';
import { usePendingPaymentsRooms } from '@/hooks/usePendingPaymentsRooms';
import { useNavigate } from 'react-router-dom';

interface QuickKPIsProps {
  onFilterClick: (status: string | null) => void;
  activeFilter: string | null;
}

export function QuickKPIs({ onFilterClick, activeFilter }: QuickKPIsProps) {
  const navigate = useNavigate();
  const { kpis, isLoading, error } = useFrontDeskKPIs();
  const { data: pendingPaymentsData } = usePendingPaymentsRooms();
  
  // Debug logging
  console.log('QuickKPIs render:', { kpis, isLoading, error, pendingPaymentsData });

  const cards = [
    { 
      label: 'Available', 
      value: kpis?.available || 0, 
      icon: Hotel, 
      color: 'text-[hsl(var(--status-available))]', 
      bg: 'bg-[hsl(var(--status-available)/0.1)]',
      filter: 'available'
    },
    { 
      label: 'Occupied', 
      value: kpis?.occupied || 0, 
      icon: Users, 
      color: 'text-[hsl(var(--status-occupied))]', 
      bg: 'bg-[hsl(var(--status-occupied)/0.1)]',
      filter: 'occupied'
    },
    { 
      label: 'Expected Arrivals', 
      value: kpis?.arrivals || 0, 
      icon: LogIn, 
      color: 'text-[hsl(var(--status-reserved))]', 
      bg: 'bg-[hsl(var(--status-reserved)/0.1)]'
    },
    { 
      label: 'Expected Departures', 
      value: kpis?.departures || 0, 
      icon: LogOut, 
      color: 'text-[hsl(var(--status-overstay))]', 
      bg: 'bg-[hsl(var(--status-overstay)/0.1)]'
    },
    { 
      label: 'In-House Guests', 
      value: kpis?.inHouse || 0, 
      icon: UserCheck, 
      color: 'text-primary', 
      bg: 'bg-primary/10'
    },
    { 
      label: 'Pending Payments', 
      value: pendingPaymentsData?.count || 0, 
      icon: CreditCard, 
      color: 'text-[hsl(var(--warning))]', 
      bg: 'bg-[hsl(var(--warning)/0.1)]',
      filter: 'pending_payments'
    },
    {
      label: 'Overstays',
      value: kpis?.overstays || 0,
      icon: AlertTriangle,
      color: 'text-[hsl(var(--status-overstay))]',
      bg: 'bg-[hsl(var(--status-overstay)/0.1)]',
      filter: 'overstay',
      showBadge: (kpis?.overstays || 0) > 0
    },
    { 
      label: 'Out of Service', 
      value: kpis?.outOfService || 0, 
      icon: AlertTriangle, 
      color: 'text-[hsl(var(--status-oos))]', 
      bg: 'bg-[hsl(var(--status-oos)/0.1)]',
      filter: 'maintenance'
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
        {cards.map((_, i) => (
          <Card key={i} className="p-2 md:p-3 animate-pulse">
            <div className="h-16 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }
  
  if (error) {
    console.error('QuickKPIs error:', error);
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
        <p className="text-sm">Failed to load KPIs. Please refresh.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
        {cards.map((card) => (
          <Card 
            key={card.label}
            className={`p-2 md:p-3 cursor-pointer transition-all duration-300 rounded-xl relative ${
              card.filter ? 'hover:scale-105' : ''
            } ${
              activeFilter === card.filter 
                ? 'ring-2 ring-primary shadow-xl scale-105' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => card.filter && onFilterClick(card.filter)}
          >
            {card.showBadge && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full shadow-lg text-[10px]"
              >
                {card.value}
              </Badge>
            )}
            <div className="flex items-center justify-between mb-1.5">
              <div className={`p-1.5 rounded-lg ${card.bg}`}>
                <card.icon className={`w-3 h-3 md:w-4 md:h-4 ${card.color}`} />
              </div>
              <span className="text-lg md:text-xl font-bold font-display text-foreground">{card.value}</span>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground truncate leading-tight">{card.label}</p>
          </Card>
        ))}
      </div>
      
      {/* Shortcut to Bookings Page */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/dashboard/bookings')}
          className="gap-2"
        >
          <CalendarRange className="h-4 w-4" />
          View All Bookings
        </Button>
      </div>
    </div>
  );
}
