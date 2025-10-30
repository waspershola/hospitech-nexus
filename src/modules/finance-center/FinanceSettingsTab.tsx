import { CurrencySettingsCard } from '@/components/finance/CurrencySettingsCard';
import { TaxSettingsCard } from '@/components/finance/TaxSettingsCard';
import { ServiceChargeCard } from '@/components/finance/ServiceChargeCard';

export function FinanceSettingsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-semibold mb-2">Finance Settings</h2>
        <p className="text-muted-foreground">
          Configure currency, tax rates, and service charges for your property
        </p>
      </div>

      <div className="grid gap-6">
        <CurrencySettingsCard />
        <TaxSettingsCard />
        <ServiceChargeCard />
      </div>
    </div>
  );
}
