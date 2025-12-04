import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarRange } from 'lucide-react';
import { useFrontDeskKPIs } from '../hooks/useFrontDeskKPIs';
import { usePendingPaymentsRooms } from '@/hooks/usePendingPaymentsRooms';
import { useQRBillingTasks } from '@/hooks/useQRBillingTasks';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface QuickKPIsProps {
  onFilterClick: (status: string | null) => void;
  activeFilter: string | null;
  onArrivalsClick?: () => void;
}

export function QuickKPIs({ onFilterClick, activeFilter, onArrivalsClick }: QuickKPIsProps) {
  const navigate = useNavigate();
  const { kpis, isLoading, error } = useFrontDeskKPIs();
  const { data: pendingPaymentsData } = usePendingPaymentsRooms();
  const { count: qrBillingCount } = useQRBillingTasks();

  const cards = [
    { 
      label: 'Available', 
      value: kpis?.available || 0, 
      color: 'text-[hsl(var(--status-available))]', 
      bg: 'bg-[hsl(var(--status-available)/0.1)]',
      dotColor: 'bg-[hsl(var(--status-available))]',
      filter: 'available'
    },
    { 
      label: 'Occupied', 
      value: kpis?.occupied || 0, 
      color: 'text-[hsl(var(--status-occupied))]', 
      bg: 'bg-[hsl(var(--status-occupied)/0.1)]',
      dotColor: 'bg-[hsl(var(--status-occupied))]',
      filter: 'occupied'
    },
    { 
      label: 'Expected Arrivals', 
      value: kpis?.arrivals || 0, 
      color: 'text-[hsl(var(--status-reserved))]', 
      bg: 'bg-[hsl(var(--status-reserved)/0.1)]',
      dotColor: 'bg-[hsl(var(--status-reserved))]',
      clickable: true,
      onClick: onArrivalsClick
    },
    { 
      label: 'Expected Departures', 
      value: kpis?.departures || 0, 
      color: 'text-orange-600', 
      bg: 'bg-orange-50',
      dotColor: 'bg-orange-600',
    },
    { 
      label: 'In-House', 
      value: kpis?.inHouse || 0, 
      color: 'text-primary', 
      bg: 'bg-primary/10',
      dotColor: 'bg-primary'
    },
    { 
      label: 'Pending Payments', 
      value: pendingPaymentsData?.count || 0, 
      color: 'text-[hsl(var(--warning))]', 
      bg: 'bg-[hsl(var(--warning)/0.1)]',
      dotColor: 'bg-gray-400',
      filter: 'pending_payments'
    },
    { 
      label: 'QR Billing Tasks', 
      value: qrBillingCount || 0, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50',
      dotColor: 'bg-blue-600',
      clickable: true,
      onClick: () => navigate('/dashboard/qr-billing-tasks')
    },
    {
      label: 'Overstays',
      value: kpis?.overstays || 0,
      color: 'text-[hsl(var(--status-overstay))]',
      bg: 'bg-[hsl(var(--status-overstay)/0.1)]',
      dotColor: 'bg-[hsl(var(--status-overstay))]',
      filter: 'overstay',
      showBadge: (kpis?.overstays || 0) > 0
    },
    { 
      label: 'Out of Service', 
      value: kpis?.outOfService || 0, 
      color: 'text-[hsl(var(--status-oos))]', 
      bg: 'bg-[hsl(var(--status-oos)/0.1)]',
      dotColor: 'bg-[hsl(var(--status-oos))]',
      filter: 'maintenance'
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {cards.map((_, i) => (
          <div key={i} className="shrink-0 h-12 w-24 bg-muted rounded animate-pulse" />
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
    <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap lg:overflow-x-auto">
      {cards.map((card) => (
        <Card 
          key={card.label}
          className={cn(
            "shrink-0 py-1.5 px-2.5 cursor-pointer transition-all duration-200 rounded-lg relative",
            (card.filter || card.clickable) && 'hover:shadow-md',
            activeFilter === card.filter && 'ring-2 ring-primary shadow-md'
          )}
          onClick={() => {
            if (card.onClick) {
              card.onClick();
            } else if (card.filter) {
              onFilterClick(card.filter);
            }
          }}
        >
          {card.showBadge && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center rounded-full text-[9px]"
            >
              {card.value}
            </Badge>
          )}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-bold font-display text-foreground">{card.value}</span>
            <div className="flex items-center gap-1">
              <span className={cn("w-1.5 h-1.5 rounded-full", card.dotColor)} />
              <p className="text-[10px] text-muted-foreground whitespace-nowrap leading-tight">{card.label}</p>
            </div>
          </div>
        </Card>
      ))}
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => navigate('/dashboard/bookings')}
        className="gap-2 ml-auto shrink-0"
      >
        <CalendarRange className="h-3 h-3" />
        <span className="text-xs">View All Bookings</span>
      </Button>
    </div>
  );
}
