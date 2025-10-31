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

const providerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['pos', 'online', 'transfer', 'cash']),
  status: z.enum(['active', 'inactive']),
  fee_percent: z.number().min(0).max(100),
  fee_bearer: z.enum(['property', 'guest']).default('property'),
  api_key: z.string().optional(),
  api_secret: z.string().optional(),
});

type ProviderForm = z.infer<typeof providerSchema>;

interface ProviderDrawerProps {
  open: boolean;
  onClose: () => void;
  providerId?: string | null;
}

export function ProviderDrawer({ open, onClose, providerId }: ProviderDrawerProps) {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [provider, setProvider] = useState<any>(null);

  const form = useForm<ProviderForm>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      name: '',
      type: 'cash',
      status: 'active',
      fee_percent: 0,
      fee_bearer: 'property',
      api_key: '',
      api_secret: '',
    },
  });

  useEffect(() => {
    if (providerId && open) {
      supabase
        .from('finance_providers')
        .select('*')
        .eq('id', providerId)
        .single()
        .then(({ data }) => {
          if (data) {
            setProvider(data);
            form.reset({
              name: data.name,
              type: data.type as 'pos' | 'online' | 'transfer' | 'cash',
              status: data.status as 'active' | 'inactive',
              fee_percent: data.fee_percent,
              fee_bearer: (data.fee_bearer as 'property' | 'guest') || 'property',
              api_key: data.api_key || '',
              api_secret: data.api_secret || '',
            });
          }
        });
    } else if (!open) {
      setProvider(null);
      form.reset({
        name: '',
        type: 'cash',
        status: 'active',
        fee_percent: 0,
        fee_bearer: 'property',
        api_key: '',
        api_secret: '',
      });
    }
  }, [providerId, open]);

  const selectedType = form.watch('type');

  const onSubmit = async (data: ProviderForm) => {
    if (!tenantId) return;

    setSubmitting(true);
    try {
      const payload = {
        name: data.name,
        type: data.type,
        status: data.status,
        fee_percent: data.fee_percent,
        fee_bearer: data.fee_bearer,
        api_key: data.api_key || null,
        api_secret: data.api_secret || null,
        tenant_id: tenantId,
        created_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (provider) {
        const { error } = await supabase
          .from('finance_providers')
          .update(payload)
          .eq('id', provider.id);

        if (error) throw error;
        toast.success('Provider updated successfully');
      } else {
        const { error } = await supabase
          .from('finance_providers')
          .insert([payload]);

        if (error) throw error;
        toast.success('Provider created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['finance-providers', tenantId] });
      onClose();
    } catch (error: any) {
      toast.error(`Operation failed: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{provider ? 'Edit Provider' : 'Add Provider'}</SheetTitle>
          <SheetDescription>
            Configure payment provider settings and integration details
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Provider Name</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="e.g., Moniepoint POS, Cash Register 1"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Provider Type</Label>
            <Select
              value={form.watch('type')}
              onValueChange={(value: any) => form.setValue('type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="pos">POS Terminal</SelectItem>
                <SelectItem value="transfer">Bank Transfer</SelectItem>
                <SelectItem value="online">Online Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fee_percent">Transaction Fee (%)</Label>
            <Input
              id="fee_percent"
              type="number"
              step="0.01"
              {...form.register('fee_percent', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {form.formState.errors.fee_percent && (
              <p className="text-sm text-destructive">{form.formState.errors.fee_percent.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fee_bearer">Who Pays the Transaction Fee?</Label>
            <Select
              value={form.watch('fee_bearer')}
              onValueChange={(value: 'property' | 'guest') => form.setValue('fee_bearer', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="property">
                  <div className="flex flex-col">
                    <span className="font-medium">Property/Hotel Pays</span>
                    <span className="text-xs text-muted-foreground">
                      Fee deducted from amount received (current default)
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="guest">
                  <div className="flex flex-col">
                    <span className="font-medium">Guest Pays</span>
                    <span className="text-xs text-muted-foreground">
                      Fee added to guest's total payment amount
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {form.watch('fee_bearer') === 'property' 
                ? '💡 Hotel receives less (gross amount - fee)' 
                : '💡 Guest pays more (amount + fee), hotel receives full amount'}
            </p>
          </div>

          {(selectedType === 'pos' || selectedType === 'online') && (
            <>
              <div className="space-y-2">
                <Label htmlFor="api_key">API Key</Label>
                <Input
                  id="api_key"
                  type="password"
                  {...form.register('api_key')}
                  placeholder="Enter API key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_secret">API Secret</Label>
                <Input
                  id="api_secret"
                  type="password"
                  {...form.register('api_secret')}
                  placeholder="Enter API secret"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="status">Active Status</Label>
            <Switch
              id="status"
              checked={form.watch('status') === 'active'}
              onCheckedChange={(checked) => form.setValue('status', checked ? 'active' : 'inactive')}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Saving...' : provider ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
