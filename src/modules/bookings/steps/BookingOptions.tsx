import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Plus, Info } from 'lucide-react';
import type { BookingData } from '../BookingFlow';

interface BookingOptionsProps {
  bookingData: BookingData;
  onChange: (data: BookingData) => void;
  onNext: () => void;
}

const AVAILABLE_ADDONS = [
  { id: 'breakfast', label: 'Breakfast', price: 2500, description: 'Continental breakfast for 2' },
  { id: 'late_checkout', label: 'Late Checkout (2 PM)', price: 5000, description: 'Extend checkout to 2 PM' },
  { id: 'early_checkin', label: 'Early Check-In (10 AM)', price: 3000, description: 'Check in at 10 AM' },
  { id: 'airport_pickup', label: 'Airport Pickup', price: 15000, description: 'One-way transfer from airport' },
  { id: 'parking', label: 'Parking', price: 1500, description: 'Per night secure parking' },
  { id: 'wifi_premium', label: 'Premium WiFi', price: 1000, description: 'High-speed internet access' },
];

export function BookingOptions({ bookingData, onChange }: BookingOptionsProps) {
  const { role } = useAuth();
  const canOverrideRate = role === 'owner' || role === 'manager';

  const [rateOverride, setRateOverride] = useState(bookingData.rateOverride?.toString() || '');
  const [selectedAddons, setSelectedAddons] = useState<string[]>(bookingData.selectedAddons || []);
  const [depositAmount, setDepositAmount] = useState(bookingData.depositAmount?.toString() || '');
  const [specialRequests, setSpecialRequests] = useState(bookingData.specialRequests || '');

  useEffect(() => {
    const addonsTotal = selectedAddons.reduce((sum, addonId) => {
      const addon = AVAILABLE_ADDONS.find(a => a.id === addonId);
      return sum + (addon?.price || 0);
    }, 0);

    onChange({
      ...bookingData,
      rateOverride: rateOverride ? parseFloat(rateOverride) : undefined,
      selectedAddons,
      addonsTotal,
      depositAmount: depositAmount ? parseFloat(depositAmount) : undefined,
      specialRequests,
    });
  }, [rateOverride, selectedAddons, depositAmount, specialRequests]);

  const handleAddonToggle = (addonId: string) => {
    setSelectedAddons(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const addonsTotal = selectedAddons.reduce((sum, addonId) => {
    const addon = AVAILABLE_ADDONS.find(a => a.id === addonId);
    return sum + (addon?.price || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-lg bg-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Booking Options</h3>
          <p className="text-sm text-muted-foreground">
            Customize this booking with add-ons and special arrangements
          </p>
        </div>
      </div>

      {/* Rate Override (Owner/Manager only) */}
      {canOverrideRate && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Manager Feature</Badge>
            <h4 className="text-sm font-medium">Rate Override</h4>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rateOverride">Custom Rate (₦ per night)</Label>
            <Input
              id="rateOverride"
              type="number"
              step="0.01"
              placeholder="Leave empty to use standard rate"
              value={rateOverride}
              onChange={(e) => setRateOverride(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Override the standard room rate for this booking
            </p>
          </div>
        </Card>
      )}

      {/* Add-ons */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Add-ons & Services</h4>
          {selectedAddons.length > 0 && (
            <Badge variant="secondary">
              {selectedAddons.length} selected • ₦{addonsTotal.toString()}
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          {AVAILABLE_ADDONS.map((addon) => {
            const isSelected = selectedAddons.includes(addon.id);

            return (
              <div
                key={addon.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleAddonToggle(addon.id)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleAddonToggle(addon.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{addon.label}</p>
                    <p className="font-semibold text-sm">₦{addon.price.toString()}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{addon.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {selectedAddons.length === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Select add-ons to enhance the guest experience
            </AlertDescription>
          </Alert>
        )}
      </Card>

      {/* Deposit */}
      <Card className="p-4 space-y-3">
        <h4 className="text-sm font-medium">Deposit</h4>
        <div className="space-y-2">
          <Label htmlFor="deposit">Deposit Amount (₦)</Label>
          <Input
            id="deposit"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Optional deposit to be collected at booking confirmation
          </p>
        </div>
      </Card>

      {/* Special Requests */}
      <Card className="p-4 space-y-3">
        <h4 className="text-sm font-medium">Special Requests</h4>
        <div className="space-y-2">
          <Label htmlFor="specialRequests">Guest Requests or Notes</Label>
          <Textarea
            id="specialRequests"
            placeholder="e.g., High floor room, extra pillows, allergies, accessibility needs..."
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Any special requirements or preferences for this booking
          </p>
        </div>
      </Card>

      {/* Summary */}
      {(selectedAddons.length > 0 || rateOverride || depositAmount || specialRequests) && (
        <>
          <Separator />
          <Card className="p-4 bg-muted/30">
            <h4 className="text-sm font-medium mb-3">Options Summary</h4>
            <div className="space-y-2 text-sm">
              {rateOverride && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate Override:</span>
                  <span className="font-medium">₦{parseFloat(rateOverride).toFixed(2)}/night</span>
                </div>
              )}
              {selectedAddons.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Add-ons Total:</span>
                  <span className="font-medium">₦{addonsTotal.toString()}</span>
                </div>
              )}
              {depositAmount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit Required:</span>
                  <span className="font-medium">₦{parseFloat(depositAmount).toFixed(2)}</span>
                </div>
              )}
              {specialRequests && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground block mb-1">Special Requests:</span>
                  <p className="text-xs italic">{specialRequests.substring(0, 100)}{specialRequests.length > 100 ? '...' : ''}</p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
