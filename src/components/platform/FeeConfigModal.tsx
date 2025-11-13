import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlatformFeeConfig } from '@/hooks/usePlatformFeeConfig';
import { WaiveFeeDialog } from './WaiveFeeDialog';
import { Loader2, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface FeeConfigModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  tenantName: string;
}

export function FeeConfigModal({ open, onClose, tenantId, tenantName }: FeeConfigModalProps) {
  const { config, ledger, isLoading, updateConfig, isUpdating } = usePlatformFeeConfig(tenantId);

  const [feeType, setFeeType] = useState<'percentage' | 'flat'>('percentage');
  const [bookingFee, setBookingFee] = useState('2.00');
  const [qrFee, setQrFee] = useState('1.00');
  const [billingCycle, setBillingCycle] = useState<'realtime' | 'monthly'>('realtime');
  const [payer, setPayer] = useState<'guest' | 'property'>('property');
  const [active, setActive] = useState(true);
  
  const [selectedLedgerIds, setSelectedLedgerIds] = useState<string[]>([]);
  const [waiveDialogOpen, setWaiveDialogOpen] = useState(false);

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
        mode: payer === 'guest' ? 'inclusive' : 'exclusive',
        active: active,
      },
    });

    onClose();
  };

  const tenantLedger = ledger || [];
  const waivabledFees = tenantLedger.filter(entry => 
    ['pending', 'billed'].includes(entry.status) && selectedLedgerIds.includes(entry.id)
  );

  const selectedFees = tenantLedger
    .filter(entry => selectedLedgerIds.includes(entry.id))
    .map(entry => ({
      id: entry.id,
      tenant_id: entry.tenant_id,
      tenant_name: tenantName,
      fee_amount: entry.fee_amount,
      reference_type: entry.reference_type,
      reference_id: entry.reference_id,
      status: entry.status
    }));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const waivabledIds = tenantLedger
        .filter(entry => ['pending', 'billed'].includes(entry.status))
        .map(entry => entry.id);
      setSelectedLedgerIds(waivabledIds);
    } else {
      setSelectedLedgerIds([]);
    }
  };

  const handleToggleLedger = (ledgerId: string) => {
    setSelectedLedgerIds(prev =>
      prev.includes(ledgerId)
        ? prev.filter(id => id !== ledgerId)
        : [...prev, ledgerId]
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Platform Fee Management - {tenantName}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="config" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="ledger">
                Fee Ledger
                {tenantLedger.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {tenantLedger.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-6 pt-4">
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
                  </div>

                  {/* Billing Cycle */}
                  <div className="space-y-2">
                    <Label htmlFor="billing-cycle">Billing Cycle</Label>
                    <Select value={billingCycle} onValueChange={(value: 'realtime' | 'monthly') => setBillingCycle(value)}>
                      <SelectTrigger id="billing-cycle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payer */}
                  <div className="space-y-2">
                    <Label htmlFor="payer">Fee Payer</Label>
                    <Select value={payer} onValueChange={(value: 'guest' | 'property') => setPayer(value)}>
                      <SelectTrigger id="payer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="property">Property (Exclusive)</SelectItem>
                        <SelectItem value="guest">Guest (Inclusive)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="active">Active Status</Label>
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
            </TabsContent>

            <TabsContent value="ledger" className="pt-4">
              <div className="space-y-4">
                {/* Actions Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedLedgerIds.length > 0 && selectedLedgerIds.length === waivabledFees.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedLedgerIds.length > 0 ? `${selectedLedgerIds.length} selected` : 'Select all waivable'}
                    </span>
                  </div>
                  <Button
                    onClick={() => setWaiveDialogOpen(true)}
                    disabled={waivabledFees.length === 0}
                    size="sm"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Waive Selected ({waivabledFees.length})
                  </Button>
                </div>

                {/* Ledger Table */}
                <ScrollArea className="h-[500px] border rounded-lg">
                  {tenantLedger.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No fee transactions yet</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium w-12"></th>
                          <th className="text-left p-3 font-medium">Date</th>
                          <th className="text-left p-3 font-medium">Type</th>
                          <th className="text-right p-3 font-medium">Amount</th>
                          <th className="text-center p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenantLedger.map((entry) => {
                          const isWaivable = ['pending', 'billed'].includes(entry.status);
                          return (
                            <tr key={entry.id} className="border-t hover:bg-muted/50">
                              <td className="p-3">
                                {isWaivable && (
                                  <Checkbox
                                    checked={selectedLedgerIds.includes(entry.id)}
                                    onCheckedChange={() => handleToggleLedger(entry.id)}
                                  />
                                )}
                              </td>
                              <td className="p-3">{format(new Date(entry.created_at), 'MMM dd, yyyy')}</td>
                              <td className="p-3 capitalize">{entry.reference_type.replace('_', ' ')}</td>
                              <td className="p-3 text-right font-medium">₦{Number(entry.fee_amount).toFixed(2)}</td>
                              <td className="p-3 text-center">
                                {entry.status === 'pending' && (
                                  <Badge variant="outline" className="bg-yellow-50">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                                {entry.status === 'billed' && (
                                  <Badge variant="outline" className="bg-blue-50">
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    Billed
                                  </Badge>
                                )}
                                {entry.status === 'paid' && (
                                  <Badge variant="outline" className="bg-green-50">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Paid
                                  </Badge>
                                )}
                                {entry.status === 'waived' && (
                                  <Badge variant="outline" className="bg-gray-50">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Waived
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3">
                                {entry.status === 'waived' && entry.waived_reason && (
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <div className="text-xs text-muted-foreground">
                                      <div className="font-medium">{entry.waived_reason}</div>
                                      {entry.waived_at && (
                                        <div>Waived on {format(new Date(entry.waived_at), 'MMM dd, yyyy')}</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <WaiveFeeDialog
        open={waiveDialogOpen}
        onOpenChange={setWaiveDialogOpen}
        selectedFees={selectedFees}
      />
    </>
  );
}
