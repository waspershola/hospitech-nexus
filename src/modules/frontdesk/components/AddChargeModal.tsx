import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useRecordPayment } from '@/hooks/useRecordPayment';
import { useFinanceProviders } from '@/hooks/useFinanceProviders';
import { useFinanceLocations } from '@/hooks/useFinanceLocations';
import { useWallets } from '@/hooks/useWallets';
import { useOrgServiceRules } from '@/hooks/useOrgServiceRules';
import { useHotelServices } from '@/hooks/useHotelServices'; // HOTEL-SERVICES-V1
import { useState, useEffect } from 'react';

const chargeSchema = z.object({
  service_category: z.string().min(1, 'Service category is required'), // HOTEL-SERVICES-V1: Changed from service_type
  service_id: z.string().min(1, 'Service is required'), // HOTEL-SERVICES-V1: Service ID
  amount: z.number().positive('Amount must be greater than 0'),
  provider_id: z.string().min(1, 'Payment provider is required'),
  location_id: z.string().optional(),
  wallet_id: z.string().optional(),
  notes: z.string().optional(),
});

type ChargeForm = z.infer<typeof chargeSchema>;

interface AddChargeModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  roomNumber: string;
  organizationId?: string;
}

export function AddChargeModal({
  open,
  onClose,
  bookingId,
  roomNumber,
  organizationId,
}: AddChargeModalProps) {
  const { mutate: recordPayment, isPending } = useRecordPayment();
  const { providers } = useFinanceProviders();
  const { locations } = useFinanceLocations();
  const { wallets } = useWallets('department');
  const { serviceRules } = useOrgServiceRules(organizationId);
  const { data: hotelServices = [], isLoading: loadingServices } = useHotelServices(); // HOTEL-SERVICES-V1
  const [serviceError, setServiceError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChargeForm>({
    resolver: zodResolver(chargeSchema),
  });

  const selectedProviderId = watch('provider_id');
  const selectedLocationId = watch('location_id');
  const selectedCategory = watch('service_category'); // HOTEL-SERVICES-V1
  const selectedServiceId = watch('service_id'); // HOTEL-SERVICES-V1
  const activeProviders = providers.filter(p => p.status === 'active');
  const activeLocations = locations.filter(l => l.status === 'active');

  // HOTEL-SERVICES-V1: Get unique categories and filter services
  const serviceCategories = Array.from(
    new Set(hotelServices.map(s => s.category))
  ).sort();
  
  const availableServices = selectedCategory 
    ? hotelServices.filter(s => s.category === selectedCategory)
    : [];

  // HOTEL-SERVICES-V1: Auto-fill amount when service selected
  useEffect(() => {
    if (selectedServiceId) {
      const service = hotelServices.find(s => s.id === selectedServiceId);
      if (service && service.default_amount > 0) {
        setValue('amount', service.default_amount);
      }
    }
  }, [selectedServiceId, hotelServices, setValue]);

  // Check service restrictions
  useEffect(() => {
    setServiceError(null);
    
    if (!organizationId || !selectedCategory || !serviceRules) return;

    const allowedServices = serviceRules.allowed_services || [];
    
    // If no restrictions are set, allow all
    if (allowedServices.length === 0) return;
    
    // Check if selected category is allowed
    if (!allowedServices.includes(selectedCategory)) {
      setServiceError(`This organization is not allowed to use ${selectedCategory.replace('_', ' ')} service.`);
    }
  }, [selectedCategory, serviceRules, organizationId]);

  const onSubmit = (data: ChargeForm) => {
    // Block if service restriction error exists
    if (serviceError) {
      return;
    }

    const transaction_ref = `CHG-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const selectedProvider = activeProviders.find(p => p.id === data.provider_id);
    const selectedService = hotelServices.find(s => s.id === data.service_id); // HOTEL-SERVICES-V1

    recordPayment(
      {
        transaction_ref,
        booking_id: bookingId || undefined,
        amount: data.amount,
        method: selectedProvider?.type || 'cash',
        provider_id: data.provider_id,
        location_id: data.location_id,
        wallet_id: data.wallet_id,
        department: 'front_desk',
        metadata: {
          notes: data.notes,
          room_number: roomNumber,
          charge_type: 'manual',
          service_category: data.service_category, // HOTEL-SERVICES-V1
          service_id: data.service_id, // HOTEL-SERVICES-V1
          service_name: selectedService?.name, // HOTEL-SERVICES-V1
        },
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add Charge</DialogTitle>
          <DialogDescription>
            Record a payment or charge for {roomNumber ? `Room ${roomNumber}` : 'this booking'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serviceError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{serviceError}</AlertDescription>
            </Alert>
          )}

          {/* HOTEL-SERVICES-V1: Category selector */}
          <div className="space-y-2">
            <Label htmlFor="service_category">Service Category</Label>
            <Select
              value={selectedCategory}
              onValueChange={(value) => {
                setValue('service_category', value);
                setValue('service_id', ''); // Reset service when category changes
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {loadingServices ? (
                  <SelectItem value="loading" disabled>Loading services...</SelectItem>
                ) : serviceCategories.length === 0 ? (
                  <SelectItem value="empty" disabled>No services configured</SelectItem>
                ) : (
                  serviceCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.service_category && (
              <p className="text-sm text-destructive">{errors.service_category.message}</p>
            )}
          </div>

          {/* HOTEL-SERVICES-V1: Service selector (only shown after category) */}
          {selectedCategory && (
            <div className="space-y-2">
              <Label htmlFor="service_id">Service</Label>
              <Select
                value={selectedServiceId}
                onValueChange={(value) => setValue('service_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {availableServices.length === 0 ? (
                    <SelectItem value="empty" disabled>No services in this category</SelectItem>
                  ) : (
                    availableServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                        {service.default_amount > 0 && ` - ₦${service.default_amount.toLocaleString()}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.service_id && (
                <p className="text-sm text-destructive">{errors.service_id.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {activeLocations.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="location">Payment Location</Label>
              <Select
                value={selectedLocationId}
                onValueChange={(value) => setValue('location_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} {location.department && `(${location.department})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLocationId && (
                <p className="text-xs text-muted-foreground">
                  Provider will be auto-selected from location
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="provider_id">Payment Provider *</Label>
            <Select
              value={selectedProviderId}
              onValueChange={(value) => setValue('provider_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {activeProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.type === 'credit_deferred' && '🕐 '}
                    {provider.name} ({provider.type})
                    {provider.fee_percent > 0 && ` - ${provider.fee_percent}% fee`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.provider_id && (
              <p className="text-sm text-destructive">{errors.provider_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="wallet">Destination Wallet (Optional)</Label>
            <Select
              value={watch('wallet_id')}
              onValueChange={(value) => setValue('wallet_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select wallet" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map(wallet => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    {wallet.name || wallet.department} - ₦{wallet.balance.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !!serviceError}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Charge
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
