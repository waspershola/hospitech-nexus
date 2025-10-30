import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Bed, Calendar, Users, DollarSign } from 'lucide-react';
import { useFinanceOverview } from '@/hooks/useFinanceOverview';
import { useDebtorsCreditors } from '@/hooks/useDebtorsCreditors';
import { FinanceOverviewKPIs } from '@/modules/finance-center/components/FinanceOverviewKPIs';
import { LiveTransactionFeed } from '@/modules/finance-center/components/LiveTransactionFeed';
import { LiveActivityStream } from '@/modules/finance-center/components/LiveActivityStream';
import { ProviderBreakdownCard } from '@/modules/finance-center/components/ProviderBreakdownCard';
import { DebtorsCard } from '@/modules/finance-center/components/DebtorsCard';
import { CreditorsCard } from '@/modules/finance-center/components/CreditorsCard';

export default function Overview() {
  const { tenantId } = useAuth();
  const [stats, setStats] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    todayCheckIns: 0,
    totalGuests: 0,
  });

  const {
    kpis,
    kpisLoading,
    transactionFeed,
    transactionFeedLoading,
    providerBreakdown,
    providerBreakdownLoading
  } = useFinanceOverview();

  const debtorsCreditors = useDebtorsCreditors();

  useEffect(() => {
    if (!tenantId) return;

    const fetchStats = async () => {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('*')
        .eq('tenant_id', tenantId);

      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('tenant_id', tenantId);

      const { data: guests } = await supabase
        .from('guests')
        .select('*')
        .eq('tenant_id', tenantId);

      const occupiedRooms = rooms?.filter(r => r.status === 'occupied').length || 0;
      const todayCheckIns = bookings?.filter(b => {
        const checkIn = new Date(b.check_in);
        const today = new Date();
        return checkIn.toDateString() === today.toDateString();
      }).length || 0;

      setStats({
        totalRooms: rooms?.length || 0,
        occupiedRooms,
        todayCheckIns,
        totalGuests: guests?.length || 0,
      });
    };

    fetchStats();
  }, [tenantId]);

  const occupancyRate = stats.totalRooms > 0 
    ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display text-charcoal mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome to your hotel management dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Rooms</p>
              <p className="text-3xl font-bold text-charcoal">{stats.totalRooms}</p>
            </div>
            <Bed className="w-12 h-12 text-primary" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Occupancy Rate</p>
              <p className="text-3xl font-bold text-charcoal">{occupancyRate}%</p>
            </div>
            <DollarSign className="w-12 h-12 text-accent" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Today's Check-ins</p>
              <p className="text-3xl font-bold text-charcoal">{stats.todayCheckIns}</p>
            </div>
            <Calendar className="w-12 h-12 text-secondary" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Guests</p>
              <p className="text-3xl font-bold text-charcoal">{stats.totalGuests}</p>
            </div>
            <Users className="w-12 h-12 text-primary" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-display text-charcoal mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 rounded-xl bg-accent/10 hover:bg-accent/20 transition-all text-left">
            <p className="font-medium text-charcoal">New Booking</p>
            <p className="text-sm text-muted-foreground">Create a new reservation</p>
          </button>
          <button className="p-4 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all text-left">
            <p className="font-medium text-charcoal">Check-in Guest</p>
            <p className="text-sm text-muted-foreground">Process walk-in check-in</p>
          </button>
          <button className="p-4 rounded-xl bg-secondary/10 hover:bg-secondary/20 transition-all text-left">
            <p className="font-medium text-charcoal">Room Status</p>
            <p className="text-sm text-muted-foreground">Update room availability</p>
          </button>
        </div>
      </Card>

      {/* Finance Overview Section */}
      <div className="space-y-6 pt-8 border-t border-border">
        <div>
          <h2 className="text-2xl font-display text-charcoal mb-2">Financial Overview</h2>
          <p className="text-muted-foreground">Real-time financial metrics at a glance</p>
        </div>

        {/* Finance KPIs */}
        <FinanceOverviewKPIs data={kpis} isLoading={kpisLoading} />

        {/* Transaction Feed & Activity Stream */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LiveTransactionFeed 
              transactions={transactionFeed || []} 
              isLoading={transactionFeedLoading} 
            />
          </div>
          <LiveActivityStream transactions={transactionFeed || []} />
        </div>

        {/* Provider Breakdown */}
        <ProviderBreakdownCard 
          data={providerBreakdown} 
          isLoading={providerBreakdownLoading} 
        />

        {/* Debtors & Creditors */}
        <div className="grid lg:grid-cols-2 gap-6">
          <DebtorsCard 
            data={debtorsCreditors.data?.debtors || []} 
            isLoading={debtorsCreditors.isLoading} 
          />
          <CreditorsCard 
            data={debtorsCreditors.data?.creditors || []} 
            isLoading={debtorsCreditors.isLoading} 
          />
        </div>
      </div>
    </div>
  );
}