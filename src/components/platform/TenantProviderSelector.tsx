import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface TenantProviderSelectorProps {
  providers: Array<{ id: string; provider_type: string; is_active: boolean }>;
  selectedProvider: string;
  onProviderChange: (value: string) => void;
  senderId: string;
  onSenderIdChange: (value: string) => void;
  disabled?: boolean;
}

export function TenantProviderSelector({
  providers,
  selectedProvider,
  onProviderChange,
  senderId,
  onSenderIdChange,
  disabled,
}: TenantProviderSelectorProps) {
  const activeProviders = providers?.filter(p => p.is_active) || [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="provider">SMS Provider (optional)</Label>
        <Select 
          value={selectedProvider} 
          onValueChange={onProviderChange}
          disabled={disabled || activeProviders.length === 0}
        >
          <SelectTrigger id="provider">
            <SelectValue placeholder="Select SMS provider" />
          </SelectTrigger>
          <SelectContent>
            {activeProviders.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.provider_type.charAt(0).toUpperCase() + provider.provider_type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeProviders.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No active providers available. Create one first.
          </p>
        )}
      </div>

      {selectedProvider && (
        <div className="space-y-2">
          <Label htmlFor="sender_id">Sender ID</Label>
          <Input
            id="sender_id"
            value={senderId}
            onChange={(e) => onSenderIdChange(e.target.value)}
            placeholder="e.g., HotelName"
            disabled={disabled}
            maxLength={11}
          />
          <p className="text-xs text-muted-foreground">
            The name shown as sender in SMS messages (max 11 characters)
          </p>
        </div>
      )}
    </div>
  );
}
