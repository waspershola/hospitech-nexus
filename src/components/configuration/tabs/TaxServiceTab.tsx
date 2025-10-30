import { useConfigStore } from '@/stores/configStore';
import { ConfigCard } from '../shared/ConfigCard';
import { ValidationMessage } from '../shared/ValidationMessage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Percent } from 'lucide-react';
import { toast } from 'sonner';

export function TaxServiceTab() {
  const financials = useConfigStore(state => state.financials);
  const updateFinancials = useConfigStore(state => state.updateFinancials);
  const saveFinancials = useConfigStore(state => state.saveFinancials);
  const hasFinancialsUnsaved = useConfigStore(state => state.unsavedChanges.includes('financials'));
  const sectionError = useConfigStore(state => state.sectionErrors.financials);
  const lastSaved = useConfigStore(state => state.sectionLastSaved.financials);

  const handleChange = (field: string, value: any) => {
    // Validate percentage values
    if ((field === 'vat_rate' || field === 'service_charge') && typeof value === 'number') {
      if (value < 0) value = 0;
      if (value > 100) value = 100;
    }
    updateFinancials({ [field]: value });
  };

  const handleSave = async () => {
    try {
      await saveFinancials();
    } catch (error) {
      // Error is already handled by the store
      console.error('Save failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <ConfigCard
        title="VAT Configuration"
        description="Value Added Tax settings"
        icon={Percent}
        onSave={handleSave}
        hasUnsavedChanges={hasFinancialsUnsaved}
        lastSaved={lastSaved}
        error={sectionError}
        sectionKey="financials"
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
                className={(financials.vat_rate ?? 0) < 0 || (financials.vat_rate ?? 0) > 100 ? 'border-destructive' : ''}
              />
              {((financials.vat_rate ?? 0) < 0 || (financials.vat_rate ?? 0) > 100) && (
                <ValidationMessage message="VAT rate must be between 0% and 100%" />
              )}
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
        onSave={handleSave}
        hasUnsavedChanges={hasFinancialsUnsaved}
        lastSaved={lastSaved}
        error={sectionError}
        sectionKey="financials"
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
                className={(financials.service_charge ?? 0) < 0 || (financials.service_charge ?? 0) > 100 ? 'border-destructive' : ''}
              />
              {((financials.service_charge ?? 0) < 0 || (financials.service_charge ?? 0) > 100) && (
                <ValidationMessage message="Service charge must be between 0% and 100%" />
              )}
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

      {/* Enhanced Calculation Preview */}
      <ConfigCard title="Live Calculation Preview" description="See how tax and service charges apply to pricing">
        <div className="space-y-4">
          {/* Example 1: Room Booking */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="font-medium mb-3 text-foreground">Example: 3-Night Room Booking</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Room Rate (per night)</span>
                <span className="font-medium">₦10,000.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Number of Nights</span>
                <span className="font-medium">3</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₦30,000.00</span>
              </div>
              
              {financials.vat_rate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    VAT ({financials.vat_rate}%)
                    {financials.vat_inclusive && <span className="ml-1 text-xs">(included)</span>}
                  </span>
                  <span className={financials.vat_inclusive ? 'text-muted-foreground' : 'font-medium'}>
                    {financials.vat_inclusive
                      ? `₦${((30000 * financials.vat_rate) / (100 + financials.vat_rate)).toFixed(2)}`
                      : `₦${((30000 * financials.vat_rate) / 100).toFixed(2)}`
                    }
                  </span>
                </div>
              )}
              
              {financials.service_charge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Service Charge ({financials.service_charge}%)
                    {financials.service_charge_inclusive && <span className="ml-1 text-xs">(included)</span>}
                  </span>
                  <span className={financials.service_charge_inclusive ? 'text-muted-foreground' : 'font-medium'}>
                    {financials.service_charge_inclusive
                      ? `₦${((30000 * financials.service_charge) / (100 + financials.service_charge)).toFixed(2)}`
                      : `₦${((30000 * financials.service_charge) / 100).toFixed(2)}`
                    }
                  </span>
                </div>
              )}
              
              <div className="flex justify-between text-base font-bold pt-3 border-t">
                <span className="text-foreground">Guest Pays</span>
                <span className="text-primary">
                  ₦{(
                    30000 +
                    (financials.vat_inclusive ? 0 : (30000 * (financials.vat_rate || 0)) / 100) +
                    (financials.service_charge_inclusive ? 0 : (30000 * (financials.service_charge || 0)) / 100)
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Example 2: Single Payment */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <h4 className="font-medium mb-3 text-foreground">Example: ₦10,000 Payment</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Amount</span>
                <span className="font-medium">₦10,000.00</span>
              </div>
              {!financials.vat_inclusive && financials.vat_rate > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>+ VAT ({financials.vat_rate}%)</span>
                  <span>₦{((10000 * (financials.vat_rate || 0)) / 100).toFixed(2)}</span>
                </div>
              )}
              {!financials.service_charge_inclusive && financials.service_charge > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>+ Service ({financials.service_charge}%)</span>
                  <span>₦{((10000 * (financials.service_charge || 0)) / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total</span>
                <span>
                  ₦{(
                    10000 +
                    (financials.vat_inclusive ? 0 : (10000 * (financials.vat_rate || 0)) / 100) +
                    (financials.service_charge_inclusive ? 0 : (10000 * (financials.service_charge || 0)) / 100)
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> {' '}
              {financials.vat_inclusive && financials.service_charge_inclusive
                ? 'Both VAT and service charge are included in the displayed prices. The amounts shown are what customers see, with taxes calculated from the total.'
                : financials.vat_inclusive
                ? 'VAT is included in prices. Service charge is added separately.'
                : financials.service_charge_inclusive
                ? 'Service charge is included in prices. VAT is added separately.'
                : 'Both VAT and service charge are added on top of the base price.'
              }
            </p>
          </div>
        </div>
      </ConfigCard>
    </div>
  );
}
