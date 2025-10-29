import { Card } from '@/components/ui/card';
import { 
  Hotel, 
  Users, 
  LogIn, 
  LogOut, 
  UserCheck, 
  CreditCard,
  AlertTriangle,
  Fuel
} from 'lucide-react';
import { useFrontDeskKPIs } from '../hooks/useFrontDeskKPIs';

interface QuickKPIsProps {
  onFilterClick: (status: string | null) => void;
}

export function QuickKPIs({ onFilterClick }: QuickKPIsProps) {
  const { kpis, isLoading } = useFrontDeskKPIs();

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
      value: kpis?.pendingPayments || 0, 
      icon: CreditCard, 
      color: 'text-[hsl(var(--warning))]', 
      bg: 'bg-[hsl(var(--warning)/0.1)]'
    },
    {
      label: 'Overstays',
      value: kpis?.overstays || 0,
      icon: AlertTriangle,
      color: 'text-[hsl(var(--status-overstay))]',
      bg: 'bg-[hsl(var(--status-overstay)/0.1)]',
      filter: 'overstay'
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-20 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map((card) => (
        <Card 
          key={card.label}
          className={`p-3 md:p-4 cursor-pointer transition-all duration-300 hover:shadow-luxury rounded-2xl ${
            card.filter ? 'hover:scale-105' : ''
          }`}
          onClick={() => card.filter && onFilterClick(card.filter)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-xl ${card.bg}`}>
              <card.icon className={`w-4 h-4 md:w-5 md:h-5 ${card.color}`} />
            </div>
            <span className="text-xl md:text-2xl font-bold font-display text-foreground">{card.value}</span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground truncate">{card.label}</p>
        </Card>
      ))}
    </div>
  );
}
