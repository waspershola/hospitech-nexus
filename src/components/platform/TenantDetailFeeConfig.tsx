import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePlatformFeeConfig } from '@/hooks/usePlatformFeeConfig';
import { Loader2, DollarSign, Clock, Users, TrendingUp, Settings } from 'lucide-react';
import { useState } from 'react';
import { FeeConfigModal } from './FeeConfigModal';

interface TenantDetailFeeConfigProps {
  tenantId: string;
  tenantName: string;
}

export default function TenantDetailFeeConfig({ tenantId, tenantName }: TenantDetailFeeConfigProps) {
  const { config, isLoading } = usePlatformFeeConfig(tenantId);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            No fee configuration found for this tenant
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Platform Fee Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Current fee settings for {tenantName}
            </p>
          </div>
          <Button onClick={() => setIsEditModalOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Edit Configuration
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Fee Type & Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" />
                Fee Structure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Fee Type</span>
                <Badge variant={config.fee_type === 'percentage' ? 'default' : 'secondary'}>
                  {config.fee_type === 'percentage' ? 'Percentage' : 'Flat Rate'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Booking Fee</span>
                <span className="font-semibold">
                  {config.fee_type === 'percentage' 
                    ? `${config.booking_fee}%` 
                    : `₦${config.booking_fee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">QR Payment Fee</span>
                <span className="font-semibold">
                  {config.fee_type === 'percentage' 
                    ? `${config.qr_fee}%` 
                    : `₦${config.qr_fee.toFixed(2)}`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Billing Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Billing Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Billing Cycle</span>
                <Badge variant={config.billing_cycle === 'realtime' ? 'default' : 'secondary'}>
                  {config.billing_cycle === 'realtime' ? 'Real-time' : 'Monthly'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={config.active ? 'default' : 'destructive'}>
                  {config.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Payer Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Fee Payer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Payer</span>
                <Badge variant={config.payer === 'guest' ? 'default' : 'secondary'}>
                  {config.payer === 'guest' ? 'Guest' : 'Property'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Mode</span>
                <Badge variant="outline">
                  {config.mode === 'inclusive' ? 'Inclusive' : 'Exclusive'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {config.payer === 'guest' && config.mode === 'inclusive' 
                  ? 'Fee is added to guest\'s total bill'
                  : 'Fee is deducted from property revenue'}
              </div>
            </CardContent>
          </Card>

          {/* Trial Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Trial Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Trial Exemption</span>
                <Badge variant={config.trial_exemption_enabled ? 'default' : 'outline'}>
                  {config.trial_exemption_enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Trial Days</span>
                <span className="font-semibold">{config.trial_days} days</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Notes */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Configuration Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(config.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated</span>
              <span>{new Date(config.updated_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <FeeConfigModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        tenantId={tenantId}
        tenantName={tenantName}
      />
    </>
  );
}
