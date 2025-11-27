import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useQRToken } from '@/hooks/useQRToken';
import { useGuestInfo } from '@/hooks/useGuestInfo';
import { useGuestSessionContext } from '@/components/qr-portal/QRPortalWrapper'; // GUEST-SESSION-SECURITY
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, BellOff, Bell, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function QRDoNotDisturb() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { qrData } = useQRToken(token);
  const { guestInfo, saveGuestInfo } = useGuestInfo(token);
  const { guestSessionToken } = useGuestSessionContext(); // GUEST-SESSION-SECURITY
  const [dndEnabled, setDndEnabled] = useState(false);
  const [guestName, setGuestName] = useState(guestInfo?.name || '');
  const [guestPhone, setGuestPhone] = useState(guestInfo?.phone || '');

  const toggleDND = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!token || !qrData?.tenant_id) {
        toast.error('Session not ready. Please wait and try again.');
        return;
      }

      const status = enabled ? 'ENABLED' : 'DISABLED';
      const note = `Do Not Disturb ${status} by guest${guestName ? ` (${guestName})` : ''}`;

      console.log('[QRDoNotDisturb] Creating DND request:', {
        status,
        tenant_id: qrData?.tenant_id,
      });

      const { data, error } = await supabase.functions.invoke('qr-request', {
        body: {
          action: 'create_request',
          type: 'do_not_disturb',
          qr_token: token,
          guest_name: guestName.trim() || 'Guest',
          guest_contact: guestPhone.trim(),
          guest_session_token: guestSessionToken, // GUEST-SESSION-SECURITY: Include session token
          service_category: 'guest_services',
          note,
          priority: 'normal',
          metadata: {
            qr_token: token,
            room_number: (qrData as any)?.room?.number || 'N/A',
            guest_label: 'Guest',
            service_category: 'guest_services',
            dnd_status: status,
            payment_info: {
              billable: false,
            },
          },
        },
      });

      if (error) {
        console.error('[QRDoNotDisturb] Request creation error:', error);
        throw new Error(error.message || 'Failed to update Do Not Disturb status');
      }

      console.log('[QRDoNotDisturb] DND request created:', data?.request?.id);
      return data?.request || data;
    },
    onSuccess: (data, enabled) => {
      // Save guest info
      if (guestName.trim() || guestPhone.trim()) {
        saveGuestInfo(guestName.trim() || 'Guest', guestPhone.trim());
      }
      
      setDndEnabled(enabled);
      toast.success(
        enabled 
          ? 'Do Not Disturb enabled. Staff has been notified.' 
          : 'Do Not Disturb disabled. Staff has been notified.'
      );
    },
    onError: (error: any) => {
      console.error('[QRDoNotDisturb] Mutation error:', error);
      toast.error(`Error: ${error?.message || 'Failed to update Do Not Disturb status'}`);
    },
  });

  if (!qrData || !qrData.tenant_id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading your session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/qr/${token}`)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
              {dndEnabled ? <BellOff className="h-5 w-5 text-primary" /> : <Bell className="h-5 w-5 text-primary" />}
              Do Not Disturb
            </h1>
            <p className="text-sm text-muted-foreground">{qrData?.tenant?.hotel_name}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Card className="shadow-xl border-2 border-primary/10">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Room Privacy Settings</CardTitle>
            <CardDescription>
              Control whether housekeeping and staff can enter your room
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* DND Status Display */}
            <div className={`p-6 rounded-lg border-2 transition-all ${
              dndEnabled 
                ? 'bg-destructive/10 border-destructive/30' 
                : 'bg-green-500/10 border-green-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {dndEnabled ? (
                    <BellOff className="h-8 w-8 text-destructive" />
                  ) : (
                    <Bell className="h-8 w-8 text-green-600" />
                  )}
                  <div>
                    <h3 className="text-xl font-semibold">
                      {dndEnabled ? 'Do Not Disturb is ON' : 'Do Not Disturb is OFF'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {dndEnabled 
                        ? 'Staff will not enter your room unless requested' 
                        : 'Housekeeping services are available as scheduled'
                      }
                    </p>
                  </div>
                </div>
                {dndEnabled && <CheckCircle className="h-6 w-6 text-destructive" />}
              </div>
            </div>

            {/* Toggle Control */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="dnd-toggle" className="text-base font-semibold cursor-pointer">
                  Enable Do Not Disturb
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Prevent housekeeping visits and staff entry
                </p>
              </div>
              <Switch
                id="dnd-toggle"
                checked={dndEnabled}
                onCheckedChange={(checked) => toggleDND.mutate(checked)}
                disabled={toggleDND.isPending}
                className="ml-4"
              />
            </div>

            {/* Information Card */}
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-2">
                <h4 className="font-semibold text-sm">Important Information</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Front desk staff will be notified of your preference</li>
                  <li>Emergency services can still access your room if needed</li>
                  <li>You can toggle this setting anytime during your stay</li>
                  <li>Scheduled cleaning can be requested separately if needed</li>
                </ul>
              </CardContent>
            </Card>

            {/* Submit Button for Confirmation */}
            {toggleDND.isPending && (
              <div className="flex items-center justify-center gap-2 p-4 bg-primary/10 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Notifying staff...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              Your privacy is important to us. Staff will respect your Do Not Disturb preference.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default QRDoNotDisturb;
