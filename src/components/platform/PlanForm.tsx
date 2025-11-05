import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plan } from '@/hooks/usePlatformPlans';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface PlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Plan>) => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  initialData?: Plan;
}

export function PlanForm({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  mode,
  initialData,
}: PlanFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '0');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(initialData?.billing_cycle || 'monthly');
  const [isActive, setIsActive] = useState(initialData?.is_active !== false);
  const [trialDays, setTrialDays] = useState(initialData?.trial_days?.toString() || '0');
  
  // Limits
  const [smsLimit, setSmsLimit] = useState(initialData?.limits?.sms_sent?.toString() || '1000');
  const [storageLimit, setStorageLimit] = useState(initialData?.limits?.storage_used?.toString() || '10');
  const [apiCallsLimit, setApiCallsLimit] = useState(initialData?.limits?.api_calls?.toString() || '10000');
  const [usersLimit, setUsersLimit] = useState(initialData?.limits?.users_active?.toString() || '10');
  const [bookingsLimit, setBookingsLimit] = useState(initialData?.limits?.bookings_created?.toString() || '100');
  
  // Overage rates
  const [smsOverage, setSmsOverage] = useState(initialData?.overage_rates?.sms_sent?.toString() || '0.1');
  const [storageOverage, setStorageOverage] = useState(initialData?.overage_rates?.storage_used?.toString() || '5');
  const [apiOverage, setApiOverage] = useState(initialData?.overage_rates?.api_calls?.toString() || '0.01');
  const [usersOverage, setUsersOverage] = useState(initialData?.overage_rates?.users_active?.toString() || '10');
  const [bookingsOverage, setBookingsOverage] = useState(initialData?.overage_rates?.bookings_created?.toString() || '1');
  
  // Features
  const [featureInput, setFeatureInput] = useState('');
  const [features, setFeatures] = useState<string[]>(initialData?.features || []);

  const handleAddFeature = () => {
    if (featureInput && !features.includes(featureInput)) {
      setFeatures([...features, featureInput]);
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (feature: string) => {
    setFeatures(features.filter(f => f !== feature));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      ...(mode === 'edit' && initialData?.id ? { id: initialData.id } : {}),
      name,
      description: description || undefined,
      price: parseFloat(price),
      billing_cycle: billingCycle,
      limits: {
        sms_sent: parseInt(smsLimit),
        storage_used: parseInt(storageLimit),
        api_calls: parseInt(apiCallsLimit),
        users_active: parseInt(usersLimit),
        bookings_created: parseInt(bookingsLimit),
      },
      overage_rates: {
        sms_sent: parseFloat(smsOverage),
        storage_used: parseFloat(storageOverage),
        api_calls: parseFloat(apiOverage),
        users_active: parseFloat(usersOverage),
        bookings_created: parseFloat(bookingsOverage),
      },
      features,
      is_active: isActive,
      trial_days: parseInt(trialDays),
    });
  };

  const isValid = name && price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Plan' : 'Edit Plan'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="limits">Limits & Overage</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Starter, Professional, Enterprise"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the plan..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₦)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billing_cycle">Billing Cycle</Label>
                  <Select value={billingCycle} onValueChange={(value: any) => setBillingCycle(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trial_days">Trial Days</Label>
                <Input
                  id="trial_days"
                  type="number"
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="is_active">Active (Visible to customers)</Label>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SMS Sent (monthly)</Label>
                  <Input
                    type="number"
                    value={smsLimit}
                    onChange={(e) => setSmsLimit(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Overage rate: ₦</p>
                  <Input
                    type="number"
                    step="0.01"
                    value={smsOverage}
                    onChange={(e) => setSmsOverage(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Storage Used (GB)</Label>
                  <Input
                    type="number"
                    value={storageLimit}
                    onChange={(e) => setStorageLimit(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Overage rate: ₦ per GB</p>
                  <Input
                    type="number"
                    step="0.01"
                    value={storageOverage}
                    onChange={(e) => setStorageOverage(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>API Calls (monthly)</Label>
                  <Input
                    type="number"
                    value={apiCallsLimit}
                    onChange={(e) => setApiCallsLimit(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Overage rate: ₦</p>
                  <Input
                    type="number"
                    step="0.01"
                    value={apiOverage}
                    onChange={(e) => setApiOverage(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Active Users</Label>
                  <Input
                    type="number"
                    value={usersLimit}
                    onChange={(e) => setUsersLimit(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Overage rate: ₦ per user</p>
                  <Input
                    type="number"
                    step="0.01"
                    value={usersOverage}
                    onChange={(e) => setUsersOverage(e.target.value)}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Bookings Created (monthly)</Label>
                  <Input
                    type="number"
                    value={bookingsLimit}
                    onChange={(e) => setBookingsLimit(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Overage rate: ₦ per booking</p>
                  <Input
                    type="number"
                    step="0.01"
                    value={bookingsOverage}
                    onChange={(e) => setBookingsOverage(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Features</Label>
                <div className="flex gap-2">
                  <Input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    placeholder="Enter feature (e.g., Advanced Analytics)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddFeature} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {features.map((feature) => (
                    <Badge key={feature} variant="secondary" className="gap-1">
                      {feature}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveFeature(feature)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Plan' : 'Update Plan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
