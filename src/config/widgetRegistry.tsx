import { ROLES } from '@/lib/roles';
import { useRole } from '@/hooks/useRole';
import { FinanceOverviewKPIs } from '@/modules/finance-center/components/FinanceOverviewKPIs';
import { LiveTransactionFeed } from '@/modules/finance-center/components/LiveTransactionFeed';
import { DebtorsCard } from '@/modules/finance-center/components/DebtorsCard';
import { CreditorsCard } from '@/modules/finance-center/components/CreditorsCard';
import { SMSActivityWidget } from '@/modules/finance-center/components/SMSActivityWidget';

export interface WidgetDefinition {
  id: string;
  name: string;
  component: React.ComponentType<any>;
  allowedRoles: string[];
  order: number;
  gridSpan?: 'full' | 'half' | 'third' | 'quarter';
  category: 'operations' | 'finance' | 'housekeeping' | 'restaurant' | 'reports';
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // Operations Widgets
  {
    id: 'room-stats',
    name: 'Room Statistics',
    component: () => <div>Room Stats Widget</div>, // Placeholder
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.FRONTDESK, ROLES.HOUSEKEEPING],
    order: 1,
    gridSpan: 'quarter',
    category: 'operations',
  },
  {
    id: 'occupancy-rate',
    name: 'Occupancy Rate',
    component: () => <div>Occupancy Widget</div>, // Placeholder
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.FRONTDESK],
    order: 2,
    gridSpan: 'quarter',
    category: 'operations',
  },
  
  // Finance Widgets (restricted)
  {
    id: 'finance-kpis',
    name: 'Financial KPIs',
    component: FinanceOverviewKPIs,
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE, ROLES.ACCOUNTANT],
    order: 10,
    gridSpan: 'full',
    category: 'finance',
  },
  {
    id: 'live-transactions',
    name: 'Live Transaction Feed',
    component: LiveTransactionFeed,
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE, ROLES.ACCOUNTANT],
    order: 11,
    gridSpan: 'half',
    category: 'finance',
  },
  {
    id: 'debtors-card',
    name: 'Top Debtors',
    component: DebtorsCard,
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE, ROLES.ACCOUNTANT],
    order: 12,
    gridSpan: 'half',
    category: 'finance',
  },
  {
    id: 'creditors-card',
    name: 'Top Creditors',
    component: CreditorsCard,
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE, ROLES.ACCOUNTANT],
    order: 13,
    gridSpan: 'half',
    category: 'finance',
  },
  {
    id: 'sms-activity',
    name: 'SMS Activity',
    component: SMSActivityWidget,
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE, ROLES.ACCOUNTANT],
    order: 14,
    gridSpan: 'full',
    category: 'finance',
  },
  
  // Housekeeping Widgets
  {
    id: 'cleaning-queue',
    name: 'Cleaning Queue',
    component: () => <div>Cleaning Queue Widget</div>, // Placeholder
    allowedRoles: [ROLES.OWNER, ROLES.MANAGER, ROLES.HOUSEKEEPING],
    order: 20,
    gridSpan: 'full',
    category: 'housekeeping',
  },
];

/**
 * Hook to get widgets for current user
 * Filters by role and returns sorted list
 */
export function useWidgets() {
  const { role } = useRole();
  
  if (!role) return [];
  
  return WIDGET_REGISTRY
    .filter(widget => widget.allowedRoles.includes(role))
    .sort((a, b) => a.order - b.order);
}
