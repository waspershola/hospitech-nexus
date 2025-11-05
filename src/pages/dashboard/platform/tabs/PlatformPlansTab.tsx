import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Check, Trash2 } from 'lucide-react';
import { usePlatformPlans } from '@/hooks/usePlatformPlans';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';

interface PlanFormData {
  name: string;
  monthly_price: number;
  trial_days: number;
  included_sms: number;
  max_rooms: number | null;
  max_staff: number | null;
  features: string[];
}

export function PlatformPlansTab() {
  const { plans, isLoading, createPlan, updatePlan, deletePlan } = usePlatformPlans();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch } = useForm<PlanFormData>({
    defaultValues: {
      name: '',
      monthly_price: 0,
      trial_days: 0,
      included_sms: 0,
      max_rooms: null,
      max_staff: null,
      features: [],
    },
  });

  const handleCreateOrUpdate = async (data: PlanFormData) => {
    try {
      const featureFlags = {
        max_rooms: data.max_rooms || -1,
        max_staff: data.max_staff || -1,
        features: data.features,
      };

      const planData = {
        name: data.name,
        monthly_price: data.monthly_price,
        trial_days: data.trial_days,
        included_sms: data.included_sms,
        feature_flags: featureFlags,
      };

      if (editingPlan) {
        await updatePlan.mutateAsync({ id: editingPlan, ...planData });
      } else {
        await createPlan.mutateAsync(planData);
      }
      setIsDialogOpen(false);
      setEditingPlan(null);
      reset();
    } catch (error) {
      console.error('Plan form error:', error);
    }
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan.id);
    const featureFlags = plan.feature_flags || {};
    reset({
      name: plan.name,
      monthly_price: plan.monthly_price,
      trial_days: plan.trial_days,
      included_sms: plan.included_sms,
      max_rooms: featureFlags.max_rooms === -1 ? null : featureFlags.max_rooms,
      max_staff: featureFlags.max_staff === -1 ? null : featureFlags.max_staff,
      features: featureFlags.features || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (planId: string) => {
    if (confirm('Are you sure you want to delete this plan?')) {
      await deletePlan.mutateAsync(planId);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading plans...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Plans Management</h2>
          <p className="text-muted-foreground">
            Create and manage subscription plans for tenants
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingPlan(null); reset(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleCreateOrUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Plan Name *</Label>
                  <Input id="name" {...register('name', { required: true })} placeholder="e.g., Starter" />
                </div>

                <div>
                  <Label htmlFor="monthly_price">Monthly Price (₦) *</Label>
                  <Input 
                    id="monthly_price" 
                    type="number" 
                    {...register('monthly_price', { required: true, valueAsNumber: true })} 
                    placeholder="10000" 
                  />
                </div>

                <div>
                  <Label htmlFor="trial_days">Trial Days</Label>
                  <Input 
                    id="trial_days" 
                    type="number" 
                    {...register('trial_days', { valueAsNumber: true })} 
                    placeholder="0" 
                  />
                </div>

                <div>
                  <Label htmlFor="included_sms">Included SMS *</Label>
                  <Input 
                    id="included_sms" 
                    type="number" 
                    {...register('included_sms', { required: true, valueAsNumber: true })} 
                    placeholder="100" 
                  />
                </div>

                <div>
                  <Label htmlFor="max_rooms">Max Rooms (leave empty for unlimited)</Label>
                  <Input 
                    id="max_rooms" 
                    type="number" 
                    {...register('max_rooms', { valueAsNumber: true })} 
                    placeholder="Unlimited" 
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="max_staff">Max Staff (leave empty for unlimited)</Label>
                  <Input 
                    id="max_staff" 
                    type="number" 
                    {...register('max_staff', { valueAsNumber: true })} 
                    placeholder="Unlimited" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setIsDialogOpen(false); setEditingPlan(null); reset(); }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const featureFlags: any = plan.feature_flags || {};
          const maxRooms = featureFlags.max_rooms === -1 ? 'Unlimited' : featureFlags.max_rooms;
          const maxStaff = featureFlags.max_staff === -1 ? 'Unlimited' : featureFlags.max_staff;

          return (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  <Badge variant="default">
                    <Check className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold">
                    ₦{plan.monthly_price.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground">
                      /month
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rooms:</span>
                    <span className="font-medium">{maxRooms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Staff:</span>
                    <span className="font-medium">{maxStaff}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SMS:</span>
                    <span className="font-medium">{plan.included_sms.toLocaleString()}</span>
                  </div>
                  {plan.trial_days > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trial:</span>
                      <span className="font-medium">{plan.trial_days} days</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEdit(plan)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleDelete(plan.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {plans.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No plans configured yet</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
