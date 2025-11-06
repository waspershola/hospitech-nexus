import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { UsageLimitsCard } from '@/components/platform/UsageLimitsCard';
import { RefreshCw, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

export default function UsageMonitoring() {
  const [isChecking, setIsChecking] = useState(false);
  
  // For platform admin view - we'd need to select a tenant
  // For now showing example with a placeholder
  const { limits, warnings, hasExceededLimits, hasWarnings, isLoading } = useUsageLimits();

  const handleCheckLimits = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-usage-limits', {
        body: {},
      });

      if (error) throw error;

      toast.success(`Checked ${data.tenantsChecked} tenants, found ${data.warnings.length} warnings`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check limits';
      toast.error(errorMessage);
    } finally {
      setIsChecking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usage Monitoring</h1>
          <p className="text-muted-foreground">
            Track usage limits and warnings across all tenants
          </p>
        </div>
        <Button
          onClick={handleCheckLimits}
          disabled={isChecking}
        >
          {isChecking ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Bell className="mr-2 h-4 w-4" />
              Check All Limits
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Warnings</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warnings.length}</div>
            <p className="text-xs text-muted-foreground">
              {hasExceededLimits ? 'Some limits exceeded' : 'Approaching limits'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monitored Limits</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{limits.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all usage types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasExceededLimits ? 'Critical' : hasWarnings ? 'Warning' : 'Healthy'}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasExceededLimits ? 'Action required' : hasWarnings ? 'Monitor closely' : 'All systems normal'}
            </p>
          </CardContent>
        </Card>
      </div>

      <UsageLimitsCard 
        limits={limits}
        warnings={warnings}
        hasExceededLimits={hasExceededLimits}
      />

      <Card>
        <CardHeader>
          <CardTitle>Automated Monitoring</CardTitle>
          <CardDescription>
            Usage limits are checked automatically and notifications are sent when limits are approached
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-warning" />
              <span><strong>80% threshold:</strong> Warning notification sent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <span><strong>90% threshold:</strong> Critical warning sent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <span><strong>100% threshold:</strong> Limit exceeded, overage charges apply</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
