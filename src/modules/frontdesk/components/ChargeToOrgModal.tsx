import { useState, useEffect } from 'react';
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
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useRecordPayment } from '@/hooks/useRecordPayment';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useFinanceLocations } from '@/hooks/useFinanceLocations';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const chargeSchema = z.object({
  organization_id: z.string().min(1, 'Organization is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  location_id: z.string().optional(),
  notes: z.string().optional(),
});

type ChargeForm = z.infer<typeof chargeSchema>;

interface ChargeToOrgModalProps {
  open: boolean;
  onClose: () => void;
  bookingId?: string;
  guestId?: string;
  roomNumber?: string;
  prefilledAmount?: number;
}

export function ChargeToOrgModal({
  open,
  onClose,
  bookingId,
  guestId,
  roomNumber,
  prefilledAmount,
}: ChargeToOrgModalProps) {
  const { tenantId } = useAuth();
  const { mutate: recordPayment, isPending } = useRecordPayment();
  const { organizations } = useOrganizations();
  const { locations } = useFinanceLocations();
  const [limitValidation, setLimitValidation] = useState<{
    allowed: boolean;
    message?: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChargeForm>({
    resolver: zodResolver(chargeSchema),
    defaultValues: {
      amount: prefilledAmount || 0,
    },
  });

  const selectedOrgId = watch('organization_id');
  const amount = watch('amount');
  const activeOrgs = organizations.filter(o => o.active);
  const activeLocations = locations.filter(l => l.status === 'active');

  // Validate organization spending limits
  useEffect(() => {
    if (!selectedOrgId || !amount || !guestId) {
      setLimitValidation(null);
      return;
    }

    const validateLimits = async () => {
      const { data, error } = await supabase.rpc('validate_org_limits', {
        _org_id: selectedOrgId,
        _guest_id: guestId,
        _department: 'front_desk',
        _amount: amount,
      });

      if (error) {
        console.error('Limit validation error:', error);
        setLimitValidation({ allowed: false, message: 'Failed to validate limits' });
        return;
      }

      const result = data as { allowed: boolean; detail?: string };
      setLimitValidation({
        allowed: result.allowed,
        message: result.detail,
      });
    };

    validateLimits();
  }, [selectedOrgId, amount, guestId, tenantId]);

  const onSubmit = (data: ChargeForm) => {
    const transaction_ref = `ORG-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    recordPayment(
      {
        transaction_ref,
        organization_id: data.organization_id,
        guest_id: guestId,
        booking_id: bookingId,
        amount: data.amount,
        method: 'transfer',
        location_id: data.location_id,
        department: 'front_desk',
        metadata: {
          notes: data.notes,
          room_number: roomNumber,
          charge_type: 'organization',
          requires_approval: !limitValidation?.allowed,
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

  const selectedOrg = organizations.find(o => o.id === selectedOrgId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Charge to Organization</DialogTitle>
          <DialogDescription>
            Charge this transaction to a corporate or organization account
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organization_id">Organization *</Label>
            <Select
              value={selectedOrgId}
              onValueChange={(value) => setValue('organization_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {activeOrgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.organization_id && (
              <p className="text-sm text-destructive">{errors.organization_id.message}</p>
            )}
          </div>

          {selectedOrg && (
            <Alert>
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <p><strong>Contact:</strong> {selectedOrg.contact_person || 'N/A'}</p>
                  <p><strong>Credit Limit:</strong> ₦{selectedOrg.credit_limit?.toLocaleString() || '0'}</p>
                  <p><strong>Negative Balance:</strong> {selectedOrg.allow_negative_balance ? 'Allowed' : 'Not Allowed'}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₦) *</Label>
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

          {limitValidation && (
            <Alert variant={limitValidation.allowed ? 'default' : 'destructive'}>
              {limitValidation.allowed ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {limitValidation.allowed
                  ? 'Transaction within spending limits'
                  : limitValidation.message || 'Spending limit exceeded - requires approval'}
              </AlertDescription>
            </Alert>
          )}

          {activeLocations.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="location_id">Payment Location (Optional)</Label>
              <Select
                value={watch('location_id')}
                onValueChange={(value) => setValue('location_id', value)}
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
            <Button type="submit" disabled={isPending || (limitValidation && !limitValidation.allowed)}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {limitValidation && !limitValidation.allowed ? 'Submit for Approval' : 'Charge Organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
