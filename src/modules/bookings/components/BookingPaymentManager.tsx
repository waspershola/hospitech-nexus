import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Receipt, CreditCard, Trash2, Loader2, Printer, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useRecordPayment } from '@/hooks/useRecordPayment';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceProviders } from '@/hooks/useFinanceProviders';
import { useFinanceLocations } from '@/hooks/useFinanceLocations';
import { usePrintReceipt } from '@/hooks/usePrintReceipt';
import { useReceiptData } from '@/hooks/useReceiptData';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import { useFolioById } from '@/hooks/useFolioById';

interface BookingPaymentManagerProps {
  bookingId: string;
}

interface BookingCharge {
  id: string;
  description: string;
  amount: number;
  category: string;
  created_at: string;
}

export function BookingPaymentManager({ bookingId }: BookingPaymentManagerProps) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const recordPayment = useRecordPayment();
  const { providers } = useFinanceProviders();
  const { locations } = useFinanceLocations();
  const { print, isPrinting } = usePrintReceipt();
  const { settings: receiptSettings } = useReceiptSettings();
  const { data: receiptData } = useReceiptData({ bookingId });
  
  // Get the default receipt settings
  const defaultSettings = receiptSettings?.[0];
  
  const activeProviders = providers.filter(p => p.status === 'active');
  const activeLocations = locations.filter(l => l.status === 'active');
  
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [chargeForm, setChargeForm] = useState({
    description: '',
    amount: '',
    category: 'room_service',
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    provider_id: '',
    location_id: '',
    reference: '',
  });

  // Fetch booking details
  const { data: booking, isLoading: bookingLoading, error: bookingError } = useQuery({
    queryKey: ['booking-payment', bookingId, tenantId],
    queryFn: async () => {
      console.log('BookingPaymentManager - Fetching booking:', bookingId);
      const { data, error } = await supabase
        .from('bookings')
        .select('*, guest:guests(*), room:rooms(*)')
        .eq('id', bookingId)
        .eq('tenant_id', tenantId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Booking not found');
      return data;
    },
    enabled: !!tenantId && !!bookingId,
  });

  // Fetch folio to check check-in status
  const { data: folio, isLoading: folioLoading, error: folioError } = useQuery({
    queryKey: ['booking-folio-check', bookingId, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stay_folios')
        .select('id, status')
        .eq('booking_id', bookingId)
        .eq('tenant_id', tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!bookingId,
  });

  // Fetch payments
  const { data: payments = [], isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: ['booking-payments', bookingId, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!bookingId,
  });

  const isLoading = bookingLoading || folioLoading || paymentsLoading;
  const hasError = bookingError || folioError || paymentsError;

  // Fetch charges from metadata
  const metadata = booking?.metadata as any;
  const charges: BookingCharge[] = metadata?.charges || [];

  // Add charge mutation
  const addChargeMutation = useMutation({
    mutationFn: async (charge: Omit<BookingCharge, 'id' | 'created_at'>) => {
      const newCharge = {
        id: crypto.randomUUID(),
        ...charge,
        created_at: new Date().toISOString(),
      };
      
      const updatedCharges = [...charges, newCharge];
      const newTotal = Number(booking.total_amount) + Number(charge.amount);
      
      const currentMetadata = booking.metadata as any;
      const { error } = await supabase
        .from('bookings')
        .update({
          metadata: { ...currentMetadata, charges: updatedCharges },
          total_amount: newTotal,
        })
        .eq('id', bookingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-payment', bookingId] });
      toast.success('Charge added successfully');
      setChargeForm({ description: '', amount: '', category: 'room_service' });
      setShowAddCharge(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove charge mutation
  const removeChargeMutation = useMutation({
    mutationFn: async (chargeId: string) => {
      const chargeToRemove = charges.find(c => c.id === chargeId);
      if (!chargeToRemove) throw new Error('Charge not found');
      
      const updatedCharges = charges.filter(c => c.id !== chargeId);
      const newTotal = Number(booking.total_amount) - Number(chargeToRemove.amount);
      
      const currentMetadata = booking.metadata as any;
      const { error } = await supabase
        .from('bookings')
        .update({
          metadata: { ...currentMetadata, charges: updatedCharges },
          total_amount: newTotal,
        })
        .eq('id', bookingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-payment', bookingId] });
      toast.success('Charge removed');
    },
  });

  const handleAddCharge = () => {
    if (!chargeForm.description || !chargeForm.amount) {
      toast.error('Please fill all fields');
      return;
    }
    addChargeMutation.mutate({
      description: chargeForm.description,
      amount: Number(chargeForm.amount),
      category: chargeForm.category,
    });
  };

  const handleAddPayment = () => {
    if (!paymentForm.amount) {
      toast.error('Please enter payment amount');
      return;
    }
    
    if (!paymentForm.provider_id) {
      toast.error('Please select a payment provider');
      return;
    }
    
    const selectedProvider = activeProviders.find(p => p.id === paymentForm.provider_id);
    
    recordPayment.mutate({
      transaction_ref: paymentForm.reference || `PAY-${Date.now()}`,
      booking_id: bookingId,
      guest_id: booking?.guest_id,
      amount: Number(paymentForm.amount),
      expected_amount: Number(booking?.total_amount),
      method: selectedProvider?.type || 'cash',
      provider_id: paymentForm.provider_id,
      location_id: paymentForm.location_id || undefined,
      metadata: { source: 'booking_folio' },
    }, {
      onSuccess: () => {
        setPaymentForm({ amount: '', provider_id: '', location_id: '', reference: '' });
        setShowAddPayment(false);
      },
    });
  };

  const handlePrintFolio = async () => {
    if (!booking || !receiptData) return;
    
    try {
      await print({
        receiptType: 'checkout',
        bookingId,
        guestId: receiptData.guest?.id,
        organizationId: receiptData.organization?.id,
        settingsId: defaultSettings?.id,
        receiptData,
      }, defaultSettings);
      toast.success('Folio printed successfully');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print folio');
    }
  };

  // Show unified loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error states with helpful messages
  if (bookingError) {
    console.error('BookingPaymentManager - Booking error:', bookingError);
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-2">
              <CreditCard className="h-12 w-12 mx-auto text-destructive opacity-50" />
              <p className="font-semibold text-destructive">Error Loading Booking</p>
              <p className="text-sm text-muted-foreground">
                {bookingError.message || 'Unable to load booking details'}
              </p>
              <p className="text-xs text-muted-foreground">Booking ID: {bookingId}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-2">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="font-semibold">Booking Not Found</p>
              <p className="text-sm text-muted-foreground">
                No booking exists with ID: {bookingId}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (folioError) {
    console.error('BookingPaymentManager - Folio error:', folioError);
  }

  if (!folio) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-2">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="font-semibold">Folio Not Available</p>
              <p className="text-sm text-muted-foreground">
                This booking hasn't been checked in yet. Folio will be available after check-in.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPaid = payments.reduce((sum, p) => sum + (p.status === 'completed' ? Number(p.amount) : 0), 0);
  const balance = Number(booking.total_amount) - totalPaid;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Booking Folio Summary
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrintFolio}
              disabled={isPrinting || !receiptData}
            >
              <Printer className="h-4 w-4 mr-2" />
              {isPrinting ? 'Printing...' : 'Print Folio'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Charges</p>
              <p className="text-2xl font-bold">₦{Number(booking.total_amount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">₦{totalPaid.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className={`text-2xl font-bold ${balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                ₦{balance.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charges Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Charges</CardTitle>
          <Button onClick={() => setShowAddCharge(!showAddCharge)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Charge
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddCharge && (
            <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Description</Label>
                  <Input
                    value={chargeForm.description}
                    onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                    placeholder="e.g., Room Service"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={chargeForm.category} onValueChange={(v) => setChargeForm({ ...chargeForm, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="room_service">Room Service</SelectItem>
                      <SelectItem value="minibar">Minibar</SelectItem>
                      <SelectItem value="laundry">Laundry</SelectItem>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="spa">Spa</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Amount (₦)</Label>
                <Input
                  type="number"
                  value={chargeForm.amount}
                  onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddCharge} disabled={addChargeMutation.isPending}>
                  {addChargeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Charge'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddCharge(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {charges.length === 0 && !showAddCharge && (
              <p className="text-sm text-muted-foreground text-center py-4">No additional charges</p>
            )}
            {charges.map((charge) => (
              <div key={charge.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{charge.description}</p>
                    <Badge variant="outline">{charge.category.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(charge.created_at), 'PPp')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold">₦{Number(charge.amount).toLocaleString()}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeChargeMutation.mutate(charge.id)}
                    disabled={removeChargeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payments Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payments</CardTitle>
          <Button onClick={() => setShowAddPayment(!showAddPayment)} size="sm" variant="default">
            <CreditCard className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddPayment && (
            <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
              <div className="space-y-4">
                <div>
                  <Label>Amount (₦)</Label>
                  <Input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder={balance > 0 ? balance.toString() : '0.00'}
                  />
                </div>
                
                {activeLocations.length > 0 && (
                  <div>
                    <Label>Payment Location (Optional)</Label>
                    <Select 
                      value={paymentForm.location_id} 
                      onValueChange={(v) => setPaymentForm({ ...paymentForm, location_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeLocations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name} {location.department && `(${location.department})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Payment Provider *</Label>
                  <Select 
                    value={paymentForm.provider_id} 
                    onValueChange={(v) => setPaymentForm({ ...paymentForm, provider_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.type === 'credit_deferred' && '🕐 '}
                          {provider.name}
                          {provider.fee_percent > 0 && ` (${provider.fee_percent}% fee)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Reference (Optional)</Label>
                <Input
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  placeholder="Transaction reference"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddPayment} disabled={recordPayment.isPending}>
                  {recordPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Payment'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddPayment(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {payments.length === 0 && !showAddPayment && (
              <p className="text-sm text-muted-foreground text-center py-4">No payments recorded</p>
            )}
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{payment.method_provider || payment.method}</p>
                    <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                      {payment.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {payment.transaction_ref} • {format(new Date(payment.created_at), 'PPp')}
                  </p>
                </div>
                <p className="font-semibold text-green-600">₦{Number(payment.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
