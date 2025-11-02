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
import { useFinancials } from '@/hooks/useFinancials';
import { Settings, Info, AlertCircle } from 'lucide-react';
import { AVAILABLE_ADDONS, calculateGroupBookingTotal } from '@/lib/finance/groupBookingCalculator';
import { differenceInDays } from 'date-fns';
import type { BookingData } from '../BookingFlow';

interface BookingOptionsProps {
  bookingData: BookingData;
  onChange: (data: BookingData) => void;
  onNext: () => void;
}

export function BookingOptions({ bookingData, onChange }: BookingOptionsProps) {
  const { role } = useAuth();
  const { data: financials } = useFinancials();
  const canOverrideRate = role === 'owner' || role === 'manager';

  const [rateOverride, setRateOverride] = useState(bookingData.rateOverride?.toString() || '');
  const [selectedAddons, setSelectedAddons] = useState<string[]>(bookingData.selectedAddons || []);
  const [specialRequests, setSpecialRequests] = useState(bookingData.specialRequests || '');
  const [requiresApproval, setRequiresApproval] = useState(bookingData.requiresApproval || false);

  useEffect(() => {
    // Note: addonsTotal is now calculated based on addon type in groupBookingCalculator
    // We just store the selected addon IDs here
    const needsApproval = !!rateOverride && parseFloat(rateOverride) > 0;
    
    onChange({
      ...bookingData,
      rateOverride: rateOverride ? parseFloat(rateOverride) : undefined,
      selectedAddons,
      specialRequests,
      requiresApproval: needsApproval,
      approvalStatus: needsApproval ? 'pending' : undefined,
    });
    
    setRequiresApproval(needsApproval);
  }, [rateOverride, selectedAddons, specialRequests]);

  const handleAddonToggle = (addonId: string) => {
    setSelectedAddons(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  // Calculate preview total with current add-ons
  const calculatePreviewTotal = () => {
    if (!financials || !bookingData.checkIn || !bookingData.checkOut) return null;

    const nights = differenceInDays(new Date(bookingData.checkOut), new Date(bookingData.checkIn));
    const numberOfRooms = bookingData.selectedRoomIds?.length || 1;
    
    // Get average room rate from selected rooms (for group) or single room
    let roomRate = 0;
    if (bookingData.selectedRoomIds && bookingData.selectedRoomIds.length > 0) {
      // Group booking - use average rate (will be calculated from actual rooms in confirmation)
      // For preview, we'll use a placeholder - actual calculation happens in BookingConfirmation
      roomRate = 50000; // Placeholder for preview
    } else {
      // Single booking - we don't have roomRate stored, so use placeholder
      roomRate = 50000; // Placeholder for preview
    }

    const calculation = calculateGroupBookingTotal({
      roomRate,
      nights,
      numberOfRooms,
      selectedAddonIds: selectedAddons,
      financials,
      rateOverride: rateOverride ? parseFloat(rateOverride) : undefined,
    });

    return calculation;
  };

  const previewCalculation = calculatePreviewTotal();

  // Calculate display total for selected add-ons (base price only, actual calc happens in calculator)
  const addonsDisplayTotal = selectedAddons.reduce((sum, addonId) => {
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
            {requiresApproval && (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-300">
                  This booking will require manager approval before confirmation
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>
      )}

      {/* Add-ons */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Add-ons & Services</h4>
          {selectedAddons.length > 0 && (
            <Badge variant="secondary">
              {selectedAddons.length} selected • from ₦{addonsDisplayTotal.toLocaleString()}
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
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{addon.label}</p>
                      <Badge variant="outline" className="text-xs">
                        {addon.type === 'per_night' ? 'Per Night' : 'One Time'}
                      </Badge>
                    </div>
                    <p className="font-semibold text-sm">₦{addon.price.toLocaleString()}</p>
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

        {/* Live Preview with selected add-ons */}
        {selectedAddons.length > 0 && previewCalculation && (
          <div className="mt-4 p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-primary">
              <Info className="h-4 w-4" />
              Add-ons Preview
            </h4>
            <div className="space-y-2 text-sm">
              {previewCalculation.breakdown.addonsBreakdown.map(addon => (
                <div key={addon.id} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{addon.label}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      (x{addon.quantity} @ ₦{addon.unitPrice.toLocaleString()})
                    </span>
                  </div>
                  <span className="font-semibold">₦{addon.total.toLocaleString()}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-base">
                <span>Add-ons Total:</span>
                <Badge variant="secondary" className="text-base px-3 py-1">
                  ₦{previewCalculation.addonsTotal.toLocaleString()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground italic mt-2">
                This will be added to your room total in the next step
              </p>
            </div>
          </div>
        )}
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
      {(selectedAddons.length > 0 || rateOverride || specialRequests) && (
        <>
          <Separator />
          <Card className="p-4 bg-muted/30">
            <h4 className="text-sm font-medium mb-3">Options Summary</h4>
            <div className="space-y-2 text-sm">
              {rateOverride && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate Override:</span>
                  <span className="font-medium">₦{parseFloat(rateOverride).toLocaleString()}/night</span>
                </div>
              )}
              {selectedAddons.length > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Selected Add-ons:</span>
                    <span>{selectedAddons.length} items</span>
                  </div>
                  {selectedAddons.map(addonId => {
                    const addon = AVAILABLE_ADDONS.find(a => a.id === addonId);
                    return addon ? (
                      <div key={addonId} className="flex justify-between text-xs pl-2">
                        <span className="text-muted-foreground">
                          {addon.label} 
                          <Badge variant="outline" className="ml-1 text-[10px] h-4 px-1">
                            {addon.type === 'per_night' ? 'per night' : 'one time'}
                          </Badge>
                        </span>
                        <span>₦{addon.price.toLocaleString()}</span>
                      </div>
                    ) : null;
                  })}
                  <p className="text-xs text-muted-foreground italic pt-1">
                    Final total will be calculated based on nights and rooms selected
                  </p>
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
