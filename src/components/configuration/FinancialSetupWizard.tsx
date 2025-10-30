import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  DollarSign,
  Building2,
  MapPin,
  ArrowRight,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { useFinanceSettings } from '@/hooks/useFinanceSettings';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FinancialSetupWizardProps {
  open: boolean;
  onClose: () => void;
  currentStep?: number;
}

const CURRENCIES = [
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
];

export function FinancialSetupWizard({
  open,
  onClose,
  currentStep = 0,
}: FinancialSetupWizardProps) {
  const [activeStep, setActiveStep] = useState(currentStep);
  const [isSaving, setIsSaving] = useState(false);
  const { settings: financials, updateSettings } = useFinanceSettings();

  const [wizardData, setWizardData] = useState({
    currency: financials.currency || 'NGN',
    vat_rate: financials.vat_rate ?? 7.5,
    vat_inclusive: financials.vat_inclusive ?? false,
    service_charge: financials.service_charge ?? 10,
    service_charge_inclusive: financials.service_charge_inclusive ?? false,
  });

  const progress = ((activeStep + 1) / 3) * 100;

  const handleNext = async () => {
    if (activeStep === 0) {
      // Validate financial data
      if (wizardData.vat_rate < 0 || wizardData.vat_rate > 100) {
        toast.error('VAT rate must be between 0% and 100%');
        return;
      }
      if (wizardData.service_charge < 0 || wizardData.service_charge > 100) {
        toast.error('Service charge must be between 0% and 100%');
        return;
      }
    }

    if (activeStep < 2) {
      setActiveStep(activeStep + 1);
    } else {
      // Final step - save and close
      await handleFinish();
    }
  };

  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      // Save to database
      await updateSettings({
        currency: wizardData.currency,
        vat_rate: wizardData.vat_rate,
        vat_inclusive: wizardData.vat_inclusive,
        service_charge: wizardData.service_charge,
        service_charge_inclusive: wizardData.service_charge_inclusive,
      });

      toast.success('Financial setup completed successfully!', {
        description: 'Your settings have been saved.',
      });

      onClose();
    } catch (error: any) {
      console.error('Setup failed:', error);
      toast.error('Failed to complete setup', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCurrency = CURRENCIES.find((c) => c.code === wizardData.currency);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Financial System Setup</DialogTitle>
          </div>
          <DialogDescription>
            Configure your financial settings in just a few steps
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Step {activeStep + 1} of 3
              </span>
              <span className="font-medium">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Content */}
          <div className="min-h-[300px]">
            {activeStep === 0 && (
              <div className="space-y-6">
                <div className="p-6 rounded-lg border-2 border-primary/20 bg-primary/5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">Currency & Tax Settings</h3>
                      <p className="text-muted-foreground mb-4">
                        Set your base currency, VAT, and service charge rates
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Currency Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="currency">Base Currency</Label>
                    <Select
                      value={wizardData.currency}
                      onValueChange={(value) =>
                        setWizardData({ ...wizardData, currency: value })
                      }
                    >
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.name} ({currency.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* VAT Rate */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="vat">VAT Rate (%)</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Inclusive</span>
                        <Switch
                          checked={wizardData.vat_inclusive}
                          onCheckedChange={(checked) =>
                            setWizardData({ ...wizardData, vat_inclusive: checked })
                          }
                        />
                      </div>
                    </div>
                    <Input
                      id="vat"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={wizardData.vat_rate}
                      onChange={(e) =>
                        setWizardData({ ...wizardData, vat_rate: parseFloat(e.target.value) })
                      }
                    />
                  </div>

                  {/* Service Charge */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="service">Service Charge (%)</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Inclusive</span>
                        <Switch
                          checked={wizardData.service_charge_inclusive}
                          onCheckedChange={(checked) =>
                            setWizardData({
                              ...wizardData,
                              service_charge_inclusive: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                    <Input
                      id="service"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={wizardData.service_charge}
                      onChange={(e) =>
                        setWizardData({
                          ...wizardData,
                          service_charge: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>

                  {/* Example Calculation */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Example Calculation:</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCurrency?.symbol}10,000 base + VAT {wizardData.vat_rate}% (
                      {selectedCurrency?.symbol}
                      {((10000 * wizardData.vat_rate) / 100).toFixed(2)}) + Service{' '}
                      {wizardData.service_charge}% ({selectedCurrency?.symbol}
                      {((10000 * wizardData.service_charge) / 100).toFixed(2)}) ={' '}
                      <strong className="text-foreground">
                        {selectedCurrency?.symbol}
                        {(
                          10000 +
                          (10000 * wizardData.vat_rate) / 100 +
                          (10000 * wizardData.service_charge) / 100
                        ).toFixed(2)}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 1 && (
              <div className="space-y-6">
                <div className="p-6 rounded-lg border-2 border-primary/20 bg-primary/5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">Payment Providers</h3>
                      <p className="text-muted-foreground mb-4">
                        Configure payment providers in the Finance Center
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('/dashboard/finance?tab=providers', '_blank')}
                      >
                        Open Finance Center
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    You can skip this step and configure payment providers later in the Finance
                    Center. Common providers include Cash, Bank Transfer, POS systems, and online
                    payment gateways.
                  </p>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="space-y-6">
                <div className="p-6 rounded-lg border-2 border-success/20 bg-success/5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-success/10">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">Review & Complete</h3>
                      <p className="text-muted-foreground mb-4">
                        Review your settings before completing the setup
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-3">Financial Settings Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Currency:</span>
                        <span className="font-medium">
                          {selectedCurrency?.symbol} {wizardData.currency}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VAT Rate:</span>
                        <span className="font-medium">
                          {wizardData.vat_rate}%{' '}
                          {wizardData.vat_inclusive && (
                            <Badge variant="outline" className="ml-2">
                              Inclusive
                            </Badge>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service Charge:</span>
                        <span className="font-medium">
                          {wizardData.service_charge}%{' '}
                          {wizardData.service_charge_inclusive && (
                            <Badge variant="outline" className="ml-2">
                              Inclusive
                            </Badge>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Click <strong className="text-foreground">Finish Setup</strong> to save these
                      settings. You can always modify them later in the Configuration Center.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              {activeStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isSaving}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
              )}
              <Button onClick={handleNext} disabled={isSaving}>
                {isSaving ? (
                  'Saving...'
                ) : activeStep < 2 ? (
                  <>
                    Next Step
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  'Finish Setup'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
