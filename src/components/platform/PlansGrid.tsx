import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  trial_days: number;
  is_active: boolean;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

interface PlansGridProps {
  plans: Plan[];
  onSelectPlan?: (planId: string) => void;
  onEditPlan?: (plan: Plan) => void;
  showActions?: boolean;
}

export function PlansGrid({ plans, onSelectPlan, onEditPlan, showActions = true }: PlansGridProps) {
  const formatFeature = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatLimit = (key: string, value: number) => {
    if (value === -1) return 'Unlimited';
    if (key === 'storage_gb') return `${value} GB`;
    return value.toLocaleString();
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {plans?.map((plan) => (
        <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{plan.name}</CardTitle>
              {!plan.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-3xl font-bold">
                ₦{Number(plan.price_monthly).toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground">/month</span>
              </div>
              <div className="text-sm text-muted-foreground">
                ₦{Number(plan.price_yearly).toLocaleString()}/year
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {plan.trial_days} days free trial
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Features:</p>
              {Object.entries(plan.features || {}).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <Check className={`h-4 w-4 ${value ? 'text-green-600' : 'text-muted-foreground'}`} />
                  <span className={!value ? 'text-muted-foreground' : ''}>
                    {formatFeature(key)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Limits:</p>
              {Object.entries(plan.limits || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatFeature(key)}</span>
                  <span className="font-medium">{formatLimit(key, value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
          {showActions && (
            <CardFooter className="flex gap-2">
              {onSelectPlan && (
                <Button
                  onClick={() => onSelectPlan(plan.id)}
                  className="flex-1"
                  disabled={!plan.is_active}
                >
                  Select Plan
                </Button>
              )}
              {onEditPlan && (
                <Button
                  onClick={() => onEditPlan(plan)}
                  variant="outline"
                  className="flex-1"
                >
                  Edit
                </Button>
              )}
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
}
