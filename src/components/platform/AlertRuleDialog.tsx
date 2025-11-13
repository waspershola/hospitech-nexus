import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { usePlatformFeeAlerts, AlertRule } from '@/hooks/usePlatformFeeAlerts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const alertRuleSchema = z.object({
  name: z.string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
  description: z.string()
    .trim()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  period: z.enum(['daily', 'weekly', 'monthly']),
  metric: z.enum(['total_revenue', 'booking_revenue', 'qr_revenue', 'tenant_revenue']),
  threshold_type: z.enum(['absolute', 'percentage_drop']),
  threshold_value: z.coerce
    .number()
    .min(0, 'Threshold must be positive')
    .max(100000000, 'Threshold value too large'),
  comparison_period: z.enum(['previous_day', 'previous_week', 'previous_month', 'same_period_last_month']).nullable(),
  tenant_id: z.string().uuid().nullable(),
  active: z.boolean(),
});

type AlertRuleFormData = z.infer<typeof alertRuleSchema>;

interface AlertRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: AlertRule | null;
}

export function AlertRuleDialog({ open, onOpenChange, rule }: AlertRuleDialogProps) {
  const { saveRule } = usePlatformFeeAlerts();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch tenants for dropdown
  const { data: tenants } = useQuery({
    queryKey: ['tenants-for-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const form = useForm<AlertRuleFormData>({
    resolver: zodResolver(alertRuleSchema),
    defaultValues: {
      name: '',
      description: '',
      period: 'daily',
      metric: 'total_revenue',
      threshold_type: 'percentage_drop',
      threshold_value: 50,
      comparison_period: 'previous_day',
      tenant_id: null,
      active: true,
    },
  });

  // Watch threshold_type to show/hide comparison_period
  const thresholdType = form.watch('threshold_type');
  const period = form.watch('period');

  // Update form when editing existing rule
  useEffect(() => {
    if (rule) {
      form.reset({
        name: rule.name,
        description: rule.description || '',
        period: rule.period,
        metric: rule.metric,
        threshold_type: rule.threshold_type,
        threshold_value: rule.threshold_value,
        comparison_period: rule.comparison_period as any,
        tenant_id: rule.tenant_id,
        active: rule.active,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        period: 'daily',
        metric: 'total_revenue',
        threshold_type: 'percentage_drop',
        threshold_value: 50,
        comparison_period: 'previous_day',
        tenant_id: null,
        active: true,
      });
    }
  }, [rule, form]);

  // Auto-adjust comparison_period based on period selection
  useEffect(() => {
    if (thresholdType === 'percentage_drop') {
      const comparisonMap: Record<string, string> = {
        daily: 'previous_day',
        weekly: 'previous_week',
        monthly: 'previous_month',
      };
      form.setValue('comparison_period', comparisonMap[period] as any);
    }
  }, [period, thresholdType, form]);

  const onSubmit = async (data: AlertRuleFormData) => {
    setIsSubmitting(true);
    try {
      const ruleData: any = {
        ...data,
        comparison_period: data.threshold_type === 'absolute' ? null : data.comparison_period,
      };

      if (rule?.id) {
        ruleData.id = rule.id;
      }

      await saveRule.mutateAsync(ruleData);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error saving alert rule:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getComparisonOptions = () => {
    switch (period) {
      case 'daily':
        return [
          { value: 'previous_day', label: 'Previous Day' },
        ];
      case 'weekly':
        return [
          { value: 'previous_week', label: 'Previous Week' },
        ];
      case 'monthly':
        return [
          { value: 'previous_month', label: 'Previous Month' },
          { value: 'same_period_last_month', label: 'Same Period Last Month' },
        ];
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Alert Rule' : 'Create Alert Rule'}</DialogTitle>
          <DialogDescription>
            Configure automated revenue monitoring rules and alert thresholds
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Rule Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Daily Revenue Drop Alert"
                        {...field}
                        maxLength={100}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe when this alert should trigger"
                        {...field}
                        maxLength={500}
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Period */}
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monitoring Period</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>How often to check revenue</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Metric */}
              <FormField
                control={form.control}
                name="metric"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revenue Metric</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select metric" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="total_revenue">Total Revenue</SelectItem>
                        <SelectItem value="booking_revenue">Booking Revenue</SelectItem>
                        <SelectItem value="qr_revenue">QR Payment Revenue</SelectItem>
                        <SelectItem value="tenant_revenue">Per-Tenant Revenue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Which revenue to monitor</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Threshold Type */}
              <FormField
                control={form.control}
                name="threshold_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Threshold Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage_drop">Percentage Drop</SelectItem>
                        <SelectItem value="absolute">Absolute Value</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>How to measure threshold</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Threshold Value */}
              <FormField
                control={form.control}
                name="threshold_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Threshold Value</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder={thresholdType === 'percentage_drop' ? '50' : '10000'}
                          {...field}
                          min="0"
                          step={thresholdType === 'percentage_drop' ? '1' : '100'}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          {thresholdType === 'percentage_drop' ? '%' : '₦'}
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {thresholdType === 'percentage_drop' 
                        ? 'Alert when revenue drops by this %' 
                        : 'Alert when revenue is at or below this amount'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Comparison Period - only show for percentage_drop */}
              {thresholdType === 'percentage_drop' && (
                <FormField
                  control={form.control}
                  name="comparison_period"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Compare With</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select comparison period" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getComparisonOptions().map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Compare current revenue against this period</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Tenant Selection */}
              <FormField
                control={form.control}
                name="tenant_id"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Specific Tenant (Optional)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === 'all' ? null : value)} 
                      value={field.value || 'all'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All tenants" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Tenants</SelectItem>
                        {tenants?.map(tenant => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Leave as "All Tenants" to monitor platform-wide revenue
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active Switch */}
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="col-span-2 flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Enable this rule to start monitoring revenue
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {rule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
