import { useConfigStore } from '@/stores/configStore';
import { ConfigCard } from '../shared/ConfigCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Percent } from 'lucide-react';
import { useAutoSave } from '@/hooks/useAutoSave';

export function TaxServiceTab() {
  const { financials, updateFinancials, saveFinancials } = useConfigStore();

  const handleChange = (field: string, value: any) => {
    updateFinancials({ [field]: value });
  };

  useAutoSave(saveFinancials, financials);

  return (
    <div className="space-y-6">
      <ConfigCard
        title="VAT Configuration"
        description="Value Added Tax settings"
        icon={Percent}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vat_rate">VAT Rate (%)</Label>
              <Input
                id="vat_rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={financials.vat_rate || 0}
                onChange={(e) => handleChange('vat_rate', parseFloat(e.target.value) || 0)}
                placeholder="7.50"
              />
            </div>

            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <Switch
                  id="vat_inclusive"
                  checked={financials.vat_inclusive || false}
                  onCheckedChange={(checked) => handleChange('vat_inclusive', checked)}
                />
                <Label htmlFor="vat_inclusive" className="cursor-pointer">
                  VAT Inclusive Pricing
                </Label>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {financials.vat_inclusive
              ? 'Prices shown include VAT. Tax will be calculated from the total.'
              : 'VAT will be added on top of listed prices.'}
          </p>
        </div>
      </ConfigCard>

      <ConfigCard
        title="Service Charge Configuration"
        description="Additional service fees"
        icon={Percent}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service_charge">Service Charge (%)</Label>
              <Input
                id="service_charge"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={financials.service_charge || 0}
                onChange={(e) => handleChange('service_charge', parseFloat(e.target.value) || 0)}
                placeholder="10.00"
              />
            </div>

            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <Switch
                  id="service_charge_inclusive"
                  checked={financials.service_charge_inclusive || false}
                  onCheckedChange={(checked) => handleChange('service_charge_inclusive', checked)}
                />
                <Label htmlFor="service_charge_inclusive" className="cursor-pointer">
                  Service Charge Inclusive
                </Label>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {financials.service_charge_inclusive
              ? 'Service charge is included in displayed prices.'
              : 'Service charge will be added separately to bills.'}
          </p>
        </div>
      </ConfigCard>

      {/* Preview */}
      <ConfigCard title="Calculation Preview">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Base Amount</span>
            <span className="font-medium">₦10,000.00</span>
          </div>
          {!financials.vat_inclusive && financials.vat_rate > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>VAT ({financials.vat_rate}%)</span>
              <span>₦{((10000 * (financials.vat_rate || 0)) / 100).toFixed(2)}</span>
            </div>
          )}
          {!financials.service_charge_inclusive && financials.service_charge > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Service Charge ({financials.service_charge}%)</span>
              <span>₦{((10000 * (financials.service_charge || 0)) / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold pt-3 border-t">
            <span>Total</span>
            <span>
              ₦
              {(
                10000 +
                (financials.vat_inclusive ? 0 : (10000 * (financials.vat_rate || 0)) / 100) +
                (financials.service_charge_inclusive ? 0 : (10000 * (financials.service_charge || 0)) / 100)
              ).toFixed(2)}
            </span>
          </div>
        </div>
      </ConfigCard>
    </div>
  );
}
