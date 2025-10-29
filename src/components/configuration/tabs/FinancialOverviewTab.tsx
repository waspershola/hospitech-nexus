import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFinancials } from '@/hooks/useFinancials';
import { useFinanceProviders } from '@/hooks/useFinanceProviders';
import { useFinanceLocations } from '@/hooks/useFinanceLocations';
import { useOrganizations } from '@/hooks/useOrganizations';
import { FinancialSetupWizard } from '../FinancialSetupWizard';
import { DollarSign, TrendingUp, Building2, MapPin, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function FinancialOverviewTab() {
  const { data: financials, isLoading: financialsLoading } = useFinancials();
  const { providers, isLoading: providersLoading } = useFinanceProviders();
  const { locations, isLoading: locationsLoading } = useFinanceLocations();
  const { organizations, isLoading: orgsLoading } = useOrganizations();
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);

  const activeProviders = providers.filter(p => p.status === 'active');
  const activeLocations = locations.filter(l => l.status === 'active');
  const activeOrgs = organizations.filter(o => o.active);

  const isLoading = financialsLoading || providersLoading || locationsLoading || orgsLoading;

  // Check if user needs onboarding
  const needsSetup = !financials || activeProviders.length === 0;

  useEffect(() => {
    if (!isLoading && needsSetup) {
      setShowWizard(true);
    }
  }, [isLoading, needsSetup]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Setup Wizard */}
      <FinancialSetupWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        currentStep={0}
      />

      {/* Quick Setup Banner */}
      {needsSetup && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Complete Your Financial Setup</h3>
                <p className="text-muted-foreground mb-4">
                  Get started with our guided setup wizard to configure your financial system.
                </p>
              </div>
              <Button onClick={() => setShowWizard(true)}>
                Start Setup Wizard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Currency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{financials?.currency || 'NGN'}</p>
                <p className="text-xs text-muted-foreground">
                  VAT: {financials?.vat_rate || 0}% | Service: {financials?.service_charge || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payment Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeProviders.length}</p>
                <p className="text-xs text-muted-foreground">
                  {providers.length - activeProviders.length} inactive
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeLocations.length}</p>
                <p className="text-xs text-muted-foreground">
                  {locations.length - activeLocations.length} inactive
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeOrgs.length}</p>
                <p className="text-xs text-muted-foreground">
                  {organizations.length - activeOrgs.length} inactive
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Setup Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Financial System Status
          </CardTitle>
          <CardDescription>Review and complete your financial configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {/* Tax & Currency */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                {financials ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-warning" />
                )}
                <div>
                  <p className="font-medium">Currency & Tax Settings</p>
                  <p className="text-sm text-muted-foreground">
                    {financials
                      ? `${financials.currency} configured with ${financials.vat_rate}% VAT`
                      : 'Not configured'}
                  </p>
                </div>
              </div>
              <Badge variant={financials ? 'default' : 'secondary'}>
                {financials ? 'Complete' : 'Pending'}
              </Badge>
            </div>

            {/* Payment Providers */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                {activeProviders.length > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-warning" />
                )}
                <div>
                  <p className="font-medium">Payment Providers</p>
                  <p className="text-sm text-muted-foreground">
                    {activeProviders.length > 0
                      ? `${activeProviders.length} active provider${activeProviders.length !== 1 ? 's' : ''}`
                      : 'No providers configured'}
                  </p>
                </div>
              </div>
              <Badge variant={activeProviders.length > 0 ? 'default' : 'secondary'}>
                {activeProviders.length > 0 ? 'Active' : 'Setup Required'}
              </Badge>
            </div>

            {/* Locations */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                {activeLocations.length > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-warning" />
                )}
                <div>
                  <p className="font-medium">Payment Locations</p>
                  <p className="text-sm text-muted-foreground">
                    {activeLocations.length > 0
                      ? `${activeLocations.length} configured location${activeLocations.length !== 1 ? 's' : ''}`
                      : 'No locations configured'}
                  </p>
                </div>
              </div>
              <Badge variant={activeLocations.length > 0 ? 'default' : 'secondary'}>
                {activeLocations.length > 0 ? 'Configured' : 'Optional'}
              </Badge>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/finance-center')}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Finance Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/finance-center?tab=reconciliation')}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Reconciliation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Tips</CardTitle>
          <CardDescription>Optimize your financial management setup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded bg-primary/10 mt-0.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Configure Tax Rates</p>
              <p className="text-sm text-muted-foreground">
                Set up VAT and service charge rates in the Tax & Service tab for accurate billing.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded bg-primary/10 mt-0.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Add Payment Providers</p>
              <p className="text-sm text-muted-foreground">
                Connect POS systems, bank accounts, and online payment gateways for comprehensive tracking.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded bg-primary/10 mt-0.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Setup Locations</p>
              <p className="text-sm text-muted-foreground">
                Define payment collection points (front desk, bar, restaurant) for better reporting.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded bg-primary/10 mt-0.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Configure Organizations</p>
              <p className="text-sm text-muted-foreground">
                Set up corporate clients with credit limits and spending rules for automated billing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
