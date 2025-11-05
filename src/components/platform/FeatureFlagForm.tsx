import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FeatureFlag } from '@/hooks/useFeatureFlags';

interface FeatureFlagFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<FeatureFlag>) => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  initialData?: FeatureFlag;
}

export function FeatureFlagForm({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  mode,
  initialData,
}: FeatureFlagFormProps) {
  const [flagKey, setFlagKey] = useState(initialData?.flag_key || '');
  const [flagName, setFlagName] = useState(initialData?.flag_name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [enabledGlobally, setEnabledGlobally] = useState(initialData?.enabled_globally || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      ...(mode === 'edit' && initialData?.id ? { id: initialData.id } : {}),
      flag_key: flagKey,
      flag_name: flagName,
      description: description || undefined,
      enabled_globally: enabledGlobally,
    });
  };

  const isValid = flagKey && flagName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Feature Flag' : 'Edit Feature Flag'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flag_key">Flag Key</Label>
            <Input
              id="flag_key"
              value={flagKey}
              onChange={(e) => setFlagKey(e.target.value)}
              placeholder="e.g., advanced_analytics"
              disabled={mode === 'edit'}
              required
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier (cannot be changed after creation)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="flag_name">Display Name</Label>
            <Input
              id="flag_name"
              value={flagName}
              onChange={(e) => setFlagName(e.target.value)}
              placeholder="e.g., Advanced Analytics"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this feature flag controls..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="enabled_globally"
              checked={enabledGlobally}
              onCheckedChange={setEnabledGlobally}
            />
            <Label htmlFor="enabled_globally">Enable Globally for All Tenants</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Flag' : 'Update Flag'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
