import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CreditCard, MessageSquare, Users, Building2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function TenantStatusWidget() {
  const { tenantId, platformRole } = useAuth();

  const { data: planSummary, isLoading } = useQuery({
    queryKey: ['tenant-plan-summary', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_tenants')
        .select(`
          id,
          status,
          plan_id,
          platform_plans!inner (
            name,
            monthly_price,
            included_sms,
            feature_flags
          ),
          platform_usage (
            rooms_total,
            sms_sent
          )
        `)
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      // Get staff count
      const { count: staffCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      const planData: any = data.platform_plans;
      const usageData: any = data.platform_usage;
      const featureFlags: any = planData?.feature_flags || {};

      return {
        status: data.status,
        plan: {
          name: planData.name,
          price: planData.monthly_price,
          includedSMS: planData.included_sms,
          maxRooms: featureFlags.max_rooms,
          maxStaff: featureFlags.max_staff,
        },
        usage: {
          rooms: usageData?.rooms_total || 0,
          staff: staffCount || 0,
          sms: usageData?.sms_sent || 0,
        },
      };
    },
    enabled: !!tenantId && !!platformRole, // Only fetch if user has platform role
  });

  if (isLoading || !planSummary) {
    return null;
  }

  const { plan, usage, status } = planSummary;
  const smsPercentage = (usage.sms / plan.includedSMS) * 100;
  const roomsPercentage = plan.maxRooms === -1 ? 0 : (usage.rooms / plan.maxRooms) * 100;
  const staffPercentage = plan.maxStaff === -1 ? 0 : (usage.staff / plan.maxStaff) * 100;

  const isNearLimit = smsPercentage > 80 || roomsPercentage > 80 || staffPercentage > 80;

  return (
    <Card className={isNearLimit ? 'border-orange-500' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Plan</CardTitle>
          <Badge variant={status === 'active' ? 'default' : status === 'trial' ? 'secondary' : 'destructive'}>
            {status}
          </Badge>
        </div>
        <CardDescription>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="font-semibold">{plan.name}</span>
            <span className="text-muted-foreground">₦{plan.price.toLocaleString()}/month</span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* SMS Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span>SMS Credits</span>
            </div>
            <span className="font-medium">
              {usage.sms.toLocaleString()} / {plan.includedSMS.toLocaleString()}
            </span>
          </div>
          <Progress value={smsPercentage} className={smsPercentage > 80 ? 'bg-orange-200' : ''} />
          {smsPercentage > 80 && (
            <p className="text-xs text-orange-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {smsPercentage > 100 ? 'Over quota - additional charges apply' : 'Approaching SMS limit'}
            </p>
          )}
        </div>

        {/* Rooms Usage */}
        {plan.maxRooms !== -1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>Rooms</span>
              </div>
              <span className="font-medium">
                {usage.rooms} / {plan.maxRooms}
              </span>
            </div>
            <Progress value={roomsPercentage} className={roomsPercentage > 80 ? 'bg-orange-200' : ''} />
            {roomsPercentage > 80 && (
              <p className="text-xs text-orange-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Approaching room limit
              </p>
            )}
          </div>
        )}

        {/* Staff Usage */}
        {plan.maxStaff !== -1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Staff</span>
              </div>
              <span className="font-medium">
                {usage.staff} / {plan.maxStaff}
              </span>
            </div>
            <Progress value={staffPercentage} className={staffPercentage > 80 ? 'bg-orange-200' : ''} />
            {staffPercentage > 80 && (
              <p className="text-xs text-orange-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Approaching staff limit
              </p>
            )}
          </div>
        )}

        {isNearLimit && (
          <Button variant="default" className="w-full" size="sm">
            Upgrade Plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
