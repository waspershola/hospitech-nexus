import { useFinanceOverview } from '@/hooks/useFinanceOverview';
import { useDebtorsCreditors } from '@/hooks/useDebtorsCreditors';
import { FinanceOverviewKPIs } from './components/FinanceOverviewKPIs';
import { LiveTransactionFeed } from './components/LiveTransactionFeed';
import { LiveActivityStream } from './components/LiveActivityStream';
import { ProviderBreakdownCard } from './components/ProviderBreakdownCard';
import { DebtorsCard } from './components/DebtorsCard';
import { CreditorsCard } from './components/CreditorsCard';

export function FinanceOverviewTab() {
  const {
    kpis,
    kpisLoading,
    transactionFeed,
    transactionFeedLoading,
    providerBreakdown,
    providerBreakdownLoading
  } = useFinanceOverview();

  const debtorsCreditors = useDebtorsCreditors();

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <FinanceOverviewKPIs data={kpis} isLoading={kpisLoading} />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Live Transaction Feed (2/3 width) */}
        <div className="lg:col-span-2">
          <LiveTransactionFeed 
            transactions={transactionFeed || []} 
            isLoading={transactionFeedLoading} 
          />
        </div>

        {/* Activity Stream (1/3 width) */}
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
  );
}
