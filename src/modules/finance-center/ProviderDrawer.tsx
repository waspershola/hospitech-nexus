import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useFinanceProviders } from '@/hooks/useFinanceProviders';

const providerSchema = z.object({
  name: z.string().min(1, 'Provider name is required'),
  type: z.enum(['pos', 'online', 'transfer', 'cash']),
  fee_percent: z.number().min(0).max(100),
  status: z.enum(['active', 'inactive']),
  meta: z.record(z.any()).optional(),
});

type ProviderForm = z.infer<typeof providerSchema>;

interface ProviderDrawerProps {
  open: boolean;
  onClose: () => void;
  providerId: string | null;
}

export function ProviderDrawer({ open, onClose, providerId }: ProviderDrawerProps) {
  const { providers, createProvider, updateProvider } = useFinanceProviders();
  const provider = providerId ? providers.find(p => p.id === providerId) : null;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProviderForm>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      name: '',
      type: 'pos',
      fee_percent: 0,
      status: 'active',
      meta: {},
    },
  });

  useEffect(() => {
    if (provider) {
      setValue('name', provider.name);
      setValue('type', provider.type);
      setValue('fee_percent', provider.fee_percent);
      setValue('status', provider.status);
      setValue('meta', provider.meta);
    } else {
      reset();
    }
  }, [provider, setValue, reset]);

  const onSubmit = (data: ProviderForm) => {
    if (providerId) {
      updateProvider({ id: providerId, ...data });
    } else {
      createProvider({
        name: data.name,
        type: data.type,
        fee_percent: data.fee_percent,
        status: data.status,
        meta: data.meta || {},
      });
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{providerId ? 'Edit Provider' : 'Add Payment Provider'}</SheetTitle>
          <SheetDescription>
            Configure payment provider settings
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Provider Name</Label>
            <Input
              id="name"
              placeholder="e.g., Moniepoint POS"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Provider Type</Label>
            <Select
              value={watch('type')}
              onValueChange={(value) => setValue('type', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pos">POS Terminal</SelectItem>
                <SelectItem value="online">Online Gateway</SelectItem>
                <SelectItem value="transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fee_percent">Transaction Fee (%)</Label>
            <Input
              id="fee_percent"
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register('fee_percent', { valueAsNumber: true })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="status">Active</Label>
            <Switch
              id="status"
              checked={watch('status') === 'active'}
              onCheckedChange={(checked) =>
                setValue('status', checked ? 'active' : 'inactive')
              }
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {providerId ? 'Update' : 'Create'} Provider
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
