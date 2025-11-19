import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useFinanceProviders } from '@/hooks/useFinanceProviders';

const paymentMethodSchema = z.object({
  method_name: z.string().min(1, 'Method name is required'),
  method_type: z.enum(['cash', 'card', 'transfer', 'mobile_money', 'cheque', 'pos', 'online']),
  active: z.boolean().default(true),
  requires_reference: z.boolean().default(false),
  requires_approval: z.boolean().default(false),
  provider_id: z.string().optional().nullable(),
  display_order: z.number().default(0),
});

type PaymentMethodForm = z.infer<typeof paymentMethodSchema>;

interface PaymentMethodDrawerProps {
  open: boolean;
  onClose: () => void;
  methodId?: string | null;
}

export function PaymentMethodDrawer({ open, onClose, methodId }: PaymentMethodDrawerProps) {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();
  const { providers } = useFinanceProviders();
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState<any>(null);

  const form = useForm<PaymentMethodForm>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      method_name: '',
      method_type: 'cash',
      active: true,
      requires_reference: false,
      requires_approval: false,
      provider_id: null,
      display_order: 0,
    },
  });

  useEffect(() => {
    if (methodId && open) {
      supabase
        .from('payment_methods')
        .select('*')
        .eq('id', methodId)
        .single()
        .then(({ data }) => {
          if (data) {
            setMethod(data);
            form.reset({
              method_name: data.method_name,
              method_type: data.method_type as 'cash' | 'card' | 'transfer' | 'mobile_money' | 'cheque' | 'pos' | 'online',
              active: data.active,
              requires_reference: data.requires_reference,
              requires_approval: data.requires_approval,
              provider_id: data.provider_id,
              display_order: data.display_order,
            });
          }
        });
    } else if (!open) {
      setMethod(null);
      form.reset({
        method_name: '',
        method_type: 'cash',
        active: true,
        requires_reference: false,
        requires_approval: false,
        provider_id: null,
        display_order: 0,
      });
    }
  }, [methodId, open]);

  const onSubmit = async (data: PaymentMethodForm) => {
    if (!tenantId) {
      toast.error('Tenant ID not found');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        method_name: data.method_name,
        method_type: data.method_type,
        active: data.active,
        requires_reference: data.requires_reference,
        requires_approval: data.requires_approval,
        provider_id: data.provider_id || null,
        display_order: data.display_order,
        tenant_id: tenantId,
        created_by: user?.id,
      };

      if (method) {
        const { error } = await supabase
          .from('payment_methods')
          .update(payload)
          .eq('id', method.id);

        if (error) throw error;
        toast.success('Payment method updated successfully');
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert([payload]);

        if (error) throw error;
        toast.success('Payment method created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['payment-methods', tenantId] });
      onClose();
    } catch (error: any) {
      console.error('Error saving payment method:', error);
      toast.error(error.message || 'Failed to save payment method');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{method ? 'Edit' : 'Add'} Payment Method</SheetTitle>
          <SheetDescription>
            {method ? 'Update' : 'Configure'} payment method settings
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="method_name">Method Name *</Label>
            <Input
              id="method_name"
              placeholder="e.g., Cash Payment, Visa/Mastercard"
              {...form.register('method_name')}
            />
            {form.formState.errors.method_name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.method_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="method_type">Method Type *</Label>
            <Select
              value={form.watch('method_type')}
              onValueChange={(value) =>
                form.setValue('method_type', value as any)
              }
            >
              <SelectTrigger id="method_type">
                <SelectValue placeholder="Select method type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">💵 Cash</SelectItem>
                <SelectItem value="card">💳 Card</SelectItem>
                <SelectItem value="transfer">🏦 Bank Transfer</SelectItem>
                <SelectItem value="mobile_money">📱 Mobile Money</SelectItem>
                <SelectItem value="cheque">📄 Cheque</SelectItem>
                <SelectItem value="pos">🖥️ POS</SelectItem>
                <SelectItem value="online">🌐 Online Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider_id">Link to Provider (Optional)</Label>
            <Select
              value={form.watch('provider_id') || ''}
              onValueChange={(value) =>
                form.setValue('provider_id', value || null)
              }
            >
              <SelectTrigger id="provider_id">
                <SelectValue placeholder="No provider linked" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No provider</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Link this method to a payment provider for tracking
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order"
              type="number"
              min="0"
              placeholder="0"
              {...form.register('display_order', { valueAsNumber: true })}
            />
            <p className="text-sm text-muted-foreground">
              Lower numbers appear first in the list
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="active">Active</Label>
                <p className="text-sm text-muted-foreground">
                  Show this method in payment forms
                </p>
              </div>
              <Switch
                id="active"
                checked={form.watch('active')}
                onCheckedChange={(checked) => form.setValue('active', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requires_reference">Requires Reference</Label>
                <p className="text-sm text-muted-foreground">
                  Require transaction reference/ID
                </p>
              </div>
              <Switch
                id="requires_reference"
                checked={form.watch('requires_reference')}
                onCheckedChange={(checked) =>
                  form.setValue('requires_reference', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requires_approval">Requires Approval</Label>
                <p className="text-sm text-muted-foreground">
                  Payments need manager approval
                </p>
              </div>
              <Switch
                id="requires_approval"
                checked={form.watch('requires_approval')}
                onCheckedChange={(checked) =>
                  form.setValue('requires_approval', checked)
                }
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? 'Saving...' : method ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
