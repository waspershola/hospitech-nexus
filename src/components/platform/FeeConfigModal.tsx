import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlatformFeeConfig } from '@/hooks/usePlatformFeeConfig';
import { Loader2 } from 'lucide-react';

interface FeeConfigModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  tenantName: string;
}

export function FeeConfigModal({ open, onClose, tenantId, tenantName }: FeeConfigModalProps) {
  const { config, isLoading, updateConfig, isUpdating } = usePlatformFeeConfig(tenantId);

  const [feeType, setFeeType] = useState<'percentage' | 'flat'>('percentage');
  const [bookingFee, setBookingFee] = useState('2.00');
  const [qrFee, setQrFee] = useState('1.00');
  const [billingCycle, setBillingCycle] = useState<'realtime' | 'monthly'>('realtime');
  const [payer, setPayer] = useState<'guest' | 'property'>('property');
  const [active, setActive] = useState(true);

  // Load existing config when modal opens
  useEffect(() => {
    if (config) {
      setFeeType(config.fee_type);
      setBookingFee(config.booking_fee.toString());
      setQrFee(config.qr_fee.toString());
      setBillingCycle(config.billing_cycle);
      setPayer(config.payer);
      setActive(config.active);
    }
  }, [config]);

  const handleSave = () => {
    if (!config) return;

    updateConfig({
      configId: config.id,
      updates: {
        fee_type: feeType,
        booking_fee: parseFloat(bookingFee),
        qr_fee: parseFloat(qrFee),
        billing_cycle: billingCycle,
        payer: payer,
        active: active,
      },
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fee Configuration - {tenantName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Fee Type */}
            <div className="space-y-2">
              <Label htmlFor="fee-type">Fee Type</Label>
              <Select value={feeType} onValueChange={(value: 'percentage' | 'flat') => setFeeType(value)}>
                <SelectTrigger id="fee-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="flat">Flat Rate (₦)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Booking Fee */}
            <div className="space-y-2">
              <Label htmlFor="booking-fee">
                Booking Fee {feeType === 'percentage' ? '(%)' : '(₦)'}
              </Label>
              <Input
                id="booking-fee"
                type="number"
                step="0.01"
                min="0"
                value={bookingFee}
                onChange={(e) => setBookingFee(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                {feeType === 'percentage' 
                  ? `${bookingFee}% will be charged per booking`
                  : `₦${bookingFee} will be charged per booking`}
              </p>
            </div>

            {/* QR Payment Fee */}
            <div className="space-y-2">
              <Label htmlFor="qr-fee">
                QR Payment Fee {feeType === 'percentage' ? '(%)' : '(₦)'}
              </Label>
              <Input
                id="qr-fee"
                type="number"
                step="0.01"
                min="0"
                value={qrFee}
                onChange={(e) => setQrFee(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                {feeType === 'percentage' 
                  ? `${qrFee}% will be charged per QR payment`
                  : `₦${qrFee} will be charged per QR payment`}
              </p>
            </div>

            {/* Billing Cycle */}
            <div className="space-y-2">
              <Label htmlFor="billing-cycle">Billing Cycle</Label>
              <Select value={billingCycle} onValueChange={(value: 'realtime' | 'monthly') => setBillingCycle(value)}>
                <SelectTrigger id="billing-cycle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time (Instant deduction)</SelectItem>
                  <SelectItem value="monthly">Monthly (Invoice aggregation)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {billingCycle === 'realtime' 
                  ? 'Fees are deducted immediately per transaction'
                  : 'Fees are aggregated and invoiced monthly'}
              </p>
            </div>

            {/* Payer */}
            <div className="space-y-2">
              <Label htmlFor="payer">Fee Payer</Label>
              <Select value={payer} onValueChange={(value: 'guest' | 'property') => setPayer(value)}>
                <SelectTrigger id="payer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="property">Property (Exclusive - deducted from property revenue)</SelectItem>
                  <SelectItem value="guest">Guest (Inclusive - added to guest total)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {payer === 'property' 
                  ? 'Property bears the cost, fee deducted from their revenue'
                  : 'Guest pays the fee as an add-on to their total'}
              </p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="active">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable fee collection for this tenant
                </p>
              </div>
              <Switch
                id="active"
                checked={active}
                onCheckedChange={setActive}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onClose} disabled={isUpdating}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
