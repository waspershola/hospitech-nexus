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
import { useWallets } from '@/hooks/useWallets';

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  department: z.string().optional(),
  provider_id: z.string().nullable(),
  wallet_id: z.string().nullable(),
  status: z.enum(['active', 'inactive']),
});

type LocationForm = z.infer<typeof locationSchema>;

interface LocationDrawerProps {
  open: boolean;
  onClose: () => void;
  locationId?: string | null;
}

export function LocationDrawer({ open, onClose, locationId }: LocationDrawerProps) {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();
  const { providers } = useFinanceProviders();
  const { wallets } = useWallets();
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<any>(null);

  const form = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: '',
      department: '',
      provider_id: null,
      wallet_id: null,
      status: 'active',
    },
  });

  useEffect(() => {
    if (locationId && open) {
      supabase
        .from('finance_locations')
        .select('*')
        .eq('id', locationId)
        .single()
        .then(({ data }) => {
          if (data) {
            setLocation(data);
            form.reset({
              name: data.name,
              department: data.department || '',
              provider_id: data.provider_id,
              wallet_id: data.wallet_id,
              status: data.status as 'active' | 'inactive',
            });
          }
        });
    } else if (!open) {
      setLocation(null);
      form.reset({
        name: '',
        department: '',
        provider_id: null,
        wallet_id: null,
        status: 'active',
      });
    }
  }, [locationId, open]);

  const onSubmit = async (data: LocationForm) => {
    if (!tenantId) return;

    setSubmitting(true);
    try {
      const payload = {
        name: data.name,
        department: data.department || null,
        provider_id: data.provider_id,
        wallet_id: data.wallet_id,
        status: data.status,
        tenant_id: tenantId,
        created_by: user?.id,
      };

      if (location) {
        const { error } = await supabase
          .from('finance_locations')
          .update(payload)
          .eq('id', location.id);

        if (error) throw error;
        toast.success('Location updated successfully');
      } else {
        const { error } = await supabase
          .from('finance_locations')
          .insert([payload]);

        if (error) throw error;
        toast.success('Location created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['finance-locations', tenantId] });
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
          <SheetTitle>{location ? 'Edit Location' : 'Add Location'}</SheetTitle>
          <SheetDescription>
            Configure payment collection point and link to provider and wallet
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Location Name</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="e.g., Front Desk POS, Restaurant Terminal"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              {...form.register('department')}
              placeholder="e.g., Front Desk, Restaurant, Bar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider_id">Payment Provider</Label>
            <Select
              value={form.watch('provider_id') || 'none'}
              onValueChange={(value) => form.setValue('provider_id', value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name} ({provider.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wallet_id">Linked Wallet</Label>
            <Select
              value={form.watch('wallet_id') || 'none'}
              onValueChange={(value) => form.setValue('wallet_id', value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select wallet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    {wallet.name || wallet.department || `${wallet.wallet_type} wallet`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              {submitting ? 'Saving...' : location ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
