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
      color: 'text-green-600', 
      bg: 'bg-green-50',
      filter: 'available'
    },
    { 
      label: 'Occupied', 
      value: kpis?.occupied || 0, 
      icon: Users, 
      color: 'text-red-600', 
      bg: 'bg-red-50',
      filter: 'occupied'
    },
    { 
      label: 'Expected Arrivals', 
      value: kpis?.arrivals || 0, 
      icon: LogIn, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50'
    },
    { 
      label: 'Expected Departures', 
      value: kpis?.departures || 0, 
      icon: LogOut, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50'
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
      color: 'text-amber-600', 
      bg: 'bg-amber-50'
    },
    { 
      label: 'Out of Service', 
      value: kpis?.outOfService || 0, 
      icon: AlertTriangle, 
      color: 'text-gray-600', 
      bg: 'bg-gray-50',
      filter: 'maintenance'
    },
    { 
      label: 'Diesel Level', 
      value: `${kpis?.dieselLevel || 75}%`, 
      icon: Fuel, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50'
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card 
          key={card.label}
          className={`p-4 cursor-pointer transition-all hover:shadow-lg ${card.filter ? 'hover:scale-105' : ''}`}
          onClick={() => card.filter && onFilterClick(card.filter)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <span className="text-2xl font-bold text-foreground">{card.value}</span>
          </div>
          <p className="text-sm text-muted-foreground">{card.label}</p>
        </Card>
      ))}
    </div>
  );
}
