import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { usePlatformPaymentProviders } from '@/hooks/usePlatformPaymentProviders';
import { useAddonPurchase } from '@/hooks/useAddonPurchase';
import { Loader2, CreditCard } from 'lucide-react';

interface AddonPurchaseDialogProps {
  addon: {
    id: string;
    name: string;
    description: string;
    price: number;
    currency?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddonPurchaseDialog({ addon, open, onOpenChange }: AddonPurchaseDialogProps) {
  const { providers } = usePlatformPaymentProviders();
  const { purchaseAddon, isPurchasing } = useAddonPurchase();
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  const activeProviders = providers.filter(p => p.is_active);
  const defaultProvider = activeProviders.find(p => p.is_default);

  const handlePurchase = async () => {
    if (!addon || !selectedProvider) return;

    await purchaseAddon.mutateAsync({
      addonId: addon.id,
      paymentProviderId: selectedProvider,
    });
  };

  const formatPrice = (price: number, currency?: string) => {
    const curr = currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(price);
  };

  if (!addon) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Purchase Addon</DialogTitle>
          <DialogDescription>
            Complete your purchase for {addon.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-semibold">{addon.name}</h4>
            <p className="text-sm text-muted-foreground">{addon.description}</p>
            <p className="text-2xl font-bold">
              {formatPrice(addon.price, addon.currency)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-provider">Payment Method</Label>
            <Select
              value={selectedProvider || defaultProvider?.id}
              onValueChange={setSelectedProvider}
            >
              <SelectTrigger id="payment-provider">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {activeProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span>{provider.provider_name}</span>
                      {provider.is_default && (
                        <span className="text-xs text-muted-foreground">(Default)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeProviders.length === 0 && (
              <p className="text-sm text-destructive">
                No payment providers configured. Please contact support.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPurchasing}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={!selectedProvider || isPurchasing || activeProviders.length === 0}
          >
            {isPurchasing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay {formatPrice(addon.price, addon.currency)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
