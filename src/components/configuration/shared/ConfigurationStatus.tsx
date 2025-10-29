import { useConfigStore } from '@/stores/configStore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';

export function ConfigurationStatus() {
  const { financials, branding, emailSettings, hotelMeta, isLoading, unsavedChanges } = useConfigStore();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const checks = [
    {
      name: 'Financial Settings',
      status: financials?.currency && financials?.vat_rate !== undefined ? 'complete' : 'incomplete',
      message: financials?.currency ? `Currency: ${financials.currency}, VAT: ${financials.vat_rate}%` : 'Missing currency or tax configuration',
    },
    {
      name: 'Hotel Branding',
      status: branding?.primary_color && branding?.font_heading ? 'complete' : 'incomplete',
      message: branding?.primary_color ? 'Brand colors and fonts configured' : 'Missing branding configuration',
    },
    {
      name: 'Email Settings',
      status: emailSettings?.from_email && emailSettings?.from_name ? 'complete' : 'incomplete',
      message: emailSettings?.from_email ? `From: ${emailSettings.from_name} <${emailSettings.from_email}>` : 'Missing email sender configuration',
    },
    {
      name: 'Hotel Information',
      status: hotelMeta?.hotel_name ? 'complete' : 'incomplete',
      message: hotelMeta?.hotel_name || 'Missing hotel name and details',
    },
  ];

  const incompleteCount = checks.filter(c => c.status === 'incomplete').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Configuration Health
          {incompleteCount === 0 ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Complete
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              {incompleteCount} Incomplete
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Review your configuration status and ensure all critical settings are configured
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {unsavedChanges.size > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have {unsavedChanges.size} unsaved {unsavedChanges.size === 1 ? 'change' : 'changes'}. Click "Save All Changes" to persist your updates.
            </AlertDescription>
          </Alert>
        )}

        {checks.map((check) => (
          <div key={check.name} className="flex items-start gap-3 p-3 rounded-lg border">
            {check.status === 'complete' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{check.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
