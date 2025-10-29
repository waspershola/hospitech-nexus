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
import { useFinanceLocations } from '@/hooks/useFinanceLocations';

const ruleSchema = z.object({
  provider_id: z.string().min(1, 'Provider is required'),
  location_id: z.string().nullable(),
  department: z.string().optional(),
  auto_reconcile: z.boolean(),
  max_txn_limit: z.number().nullable(),
});

type RuleForm = z.infer<typeof ruleSchema>;

interface RuleDrawerProps {
  open: boolean;
  onClose: () => void;
  ruleId?: string | null;
}

export function RuleDrawer({ open, onClose, ruleId }: RuleDrawerProps) {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();
  const { providers } = useFinanceProviders();
  const { locations } = useFinanceLocations();
  const [submitting, setSubmitting] = useState(false);
  const [rule, setRule] = useState<any>(null);

  const form = useForm<RuleForm>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      provider_id: '',
      location_id: null,
      department: '',
      auto_reconcile: false,
      max_txn_limit: null,
    },
  });

  useEffect(() => {
    if (ruleId && open) {
      supabase
        .from('finance_provider_rules')
        .select('*')
        .eq('id', ruleId)
        .single()
        .then(({ data }) => {
          if (data) {
            setRule(data);
            form.reset({
              provider_id: data.provider_id,
              location_id: data.location_id,
              department: data.department || '',
              auto_reconcile: data.auto_reconcile || false,
              max_txn_limit: data.max_txn_limit,
            });
          }
        });
    } else if (!open) {
      setRule(null);
      form.reset({
        provider_id: '',
        location_id: null,
        department: '',
        auto_reconcile: false,
        max_txn_limit: null,
      });
    }
  }, [ruleId, open]);

  const onSubmit = async (data: RuleForm) => {
    if (!tenantId) return;

    setSubmitting(true);
    try {
      const payload = {
        provider_id: data.provider_id,
        location_id: data.location_id,
        department: data.department || null,
        auto_reconcile: data.auto_reconcile,
        max_txn_limit: data.max_txn_limit,
        tenant_id: tenantId,
        created_by: user?.id,
      };

      if (rule) {
        const { error } = await supabase
          .from('finance_provider_rules')
          .update(payload)
          .eq('id', rule.id);

        if (error) throw error;
        toast.success('Rule updated successfully');
      } else {
        const { error } = await supabase
          .from('finance_provider_rules')
          .insert([payload]);

        if (error) throw error;
        toast.success('Rule created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['provider-rules', tenantId] });
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
          <SheetTitle>{rule ? 'Edit Provider Rule' : 'Add Provider Rule'}</SheetTitle>
          <SheetDescription>
            Configure routing and reconciliation settings for this provider
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="provider_id">Payment Provider *</Label>
            <Select
              value={form.watch('provider_id')}
              onValueChange={(value) => form.setValue('provider_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name} ({provider.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.provider_id && (
              <p className="text-sm text-destructive">{form.formState.errors.provider_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location_id">Location</Label>
            <Select
              value={form.watch('location_id') || 'all'}
              onValueChange={(value) => form.setValue('location_id', value === 'all' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              {...form.register('department')}
              placeholder="e.g., Front Desk, Restaurant"
            />
            <p className="text-xs text-muted-foreground">Optional: Specify department for this rule</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_txn_limit">Maximum Transaction Limit (₦)</Label>
            <Input
              id="max_txn_limit"
              type="number"
              step="0.01"
              {...form.register('max_txn_limit', { 
                setValueAs: (v) => v === '' ? null : parseFloat(v) 
              })}
              placeholder="Leave empty for no limit"
            />
            <p className="text-xs text-muted-foreground">
              Transactions above this amount will require manual approval
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="auto_reconcile">Auto Reconciliation</Label>
              <p className="text-sm text-muted-foreground">
                Automatically reconcile transactions from this provider
              </p>
            </div>
            <Switch
              id="auto_reconcile"
              checked={form.watch('auto_reconcile')}
              onCheckedChange={(checked) => form.setValue('auto_reconcile', checked)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Saving...' : rule ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
