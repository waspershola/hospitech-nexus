import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlatformPaymentProviders, PlatformPaymentProvider } from '@/hooks/usePlatformPaymentProviders';

const providerSchema = z.object({
  provider_type: z.enum(['stripe', 'monnify', 'paystack', 'flutterwave']),
  provider_name: z.string().min(1, 'Provider name is required'),
  api_key_encrypted: z.string().optional(),
  api_secret_encrypted: z.string().optional(),
  webhook_secret: z.string().optional(),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
});

type ProviderFormData = z.infer<typeof providerSchema>;

interface PaymentProviderFormProps {
  provider?: PlatformPaymentProvider;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaymentProviderForm({ provider, onSuccess, onCancel }: PaymentProviderFormProps) {
  const { createProvider, updateProvider } = usePlatformPaymentProviders();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProviderFormData>({
    resolver: zodResolver(providerSchema),
    defaultValues: provider
      ? {
          provider_type: provider.provider_type,
          provider_name: provider.provider_name,
          api_key_encrypted: '',
          api_secret_encrypted: '',
          webhook_secret: '',
          is_active: provider.is_active,
          is_default: provider.is_default,
        }
      : {
          provider_type: 'stripe',
          provider_name: '',
          is_active: true,
          is_default: false,
        },
  });

  const onSubmit = async (data: ProviderFormData) => {
    try {
      if (provider) {
        const updates: any = {
          provider_name: data.provider_name,
          is_active: data.is_active,
          is_default: data.is_default,
        };
        
        if (data.api_key_encrypted) updates.api_key_encrypted = data.api_key_encrypted;
        if (data.api_secret_encrypted) updates.api_secret_encrypted = data.api_secret_encrypted;
        if (data.webhook_secret) updates.webhook_secret = data.webhook_secret;

        await updateProvider.mutateAsync({ id: provider.id, updates });
      } else {
        const payload = {
          provider_type: data.provider_type,
          provider_name: data.provider_name,
          api_key_encrypted: data.api_key_encrypted,
          api_secret_encrypted: data.api_secret_encrypted,
          webhook_secret: data.webhook_secret,
          is_active: data.is_active,
          is_default: data.is_default,
          config: {},
        };
        await createProvider.mutateAsync(payload);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save provider:', error);
    }
  };

  const providerType = watch('provider_type');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="provider_type">Provider Type</Label>
        <Select
          value={providerType}
          onValueChange={(value) => setValue('provider_type', value as any)}
          disabled={!!provider}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="monnify">Monnify</SelectItem>
            <SelectItem value="paystack">Paystack</SelectItem>
            <SelectItem value="flutterwave">Flutterwave</SelectItem>
          </SelectContent>
        </Select>
        {errors.provider_type && (
          <p className="text-sm text-destructive">{errors.provider_type.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="provider_name">Provider Name</Label>
        <Input
          id="provider_name"
          {...register('provider_name')}
          placeholder="e.g., Stripe Production"
        />
        {errors.provider_name && (
          <p className="text-sm text-destructive">{errors.provider_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="api_key_encrypted">API Key {provider && '(leave blank to keep existing)'}</Label>
        <Input
          id="api_key_encrypted"
          type="password"
          {...register('api_key_encrypted')}
          placeholder="Enter API key"
        />
      </div>

      {providerType !== 'monnify' && (
        <div className="space-y-2">
          <Label htmlFor="api_secret_encrypted">
            API Secret {provider && '(leave blank to keep existing)'}
          </Label>
          <Input
            id="api_secret_encrypted"
            type="password"
            {...register('api_secret_encrypted')}
            placeholder="Enter API secret"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="webhook_secret">
          Webhook Secret {provider && '(leave blank to keep existing)'}
        </Label>
        <Input
          id="webhook_secret"
          type="password"
          {...register('webhook_secret')}
          placeholder="Enter webhook secret"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="is_active">Active</Label>
        <Switch
          id="is_active"
          checked={watch('is_active')}
          onCheckedChange={(checked) => setValue('is_active', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="is_default">Set as Default Provider</Label>
        <Switch
          id="is_default"
          checked={watch('is_default')}
          onCheckedChange={(checked) => setValue('is_default', checked)}
        />
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : provider ? 'Update Provider' : 'Add Provider'}
        </Button>
      </div>
    </form>
  );
}
