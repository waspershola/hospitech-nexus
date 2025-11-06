import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformPlans } from '@/hooks/usePlatformPlans';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package } from 'lucide-react';
import { toast } from 'sonner';

interface TenantDetailPackageProps {
  tenant: any;
}

export default function TenantDetailPackage({ tenant }: TenantDetailPackageProps) {
  const queryClient = useQueryClient();
  const { plans, isLoading: plansLoading } = usePlatformPlans();
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);

  if (plansLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const assignPlan = useMutation({
    mutationFn: async (planId: string) => {
      const { data, error } = await supabase
        .from('platform_tenants')
        .update({ plan_id: planId })
        .eq('id', tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Plan assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-tenant', tenant.id] });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign plan');
    }
  });

  const handleAssignPlan = () => {
    if (selectedPlanId) {
      assignPlan.mutate(selectedPlanId);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Current Plan
          </CardTitle>
          <CardDescription>Subscription plan details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Plan Name</p>
            <p className="text-2xl font-bold">{tenant.plan?.name || 'No plan assigned'}</p>
          </div>

          {tenant.plan && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="font-medium">
                  ₦{tenant.plan.price_monthly?.toLocaleString()}/month
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Features</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {Array.isArray(tenant.plan.features) ? (
                    tenant.plan.features.map((feature: string, index: number) => (
                      <li key={index} className="text-sm">{feature}</li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">No features listed</li>
                  )}
                </ul>
              </div>
            </>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Change Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Plan</DialogTitle>
                <DialogDescription>
                  Select a new subscription plan for this tenant
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - ₦{plan.price_monthly?.toLocaleString()}/month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button 
                  onClick={handleAssignPlan} 
                  disabled={!selectedPlanId || assignPlan.isPending}
                  className="w-full"
                >
                  {assignPlan.isPending ? 'Assigning...' : 'Assign Plan'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add-ons</CardTitle>
          <CardDescription>Additional features and services</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Add-on management coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
