import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useQRToken } from '@/hooks/useQRToken';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Wifi, Copy, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

interface WiFiCredential {
  id: string;
  location: string;
  network_name: string;
  password: string;
  instructions?: string;
  is_active: boolean;
}

export function QRWifiCredentials() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { qrData } = useQRToken(token);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ['wifi-credentials', qrData?.tenant_id],
    queryFn: async () => {
      if (!qrData?.tenant_id) return [];
      const { data, error } = await supabase
        .from('wifi_credentials')
        .select('*')
        .eq('tenant_id', qrData.tenant_id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data as WiFiCredential[];
    },
    enabled: !!qrData?.tenant_id,
  });

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Generate WiFi QR code data
  const generateWiFiQRData = (credential: WiFiCredential) => {
    // WiFi QR code format: WIFI:T:WPA;S:network;P:password;;
    return `WIFI:T:WPA;S:${credential.network_name};P:${credential.password};;`;
  };

  if (isLoading || !qrData || !qrData.tenant_id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading your session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-50/30 dark:to-blue-950/10">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/qr/${token}`)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">WiFi Access</h1>
            <p className="text-muted-foreground mt-1">Complimentary high-speed internet</p>
          </div>
        </div>

        {credentials.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wifi className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                WiFi credentials are not available at the moment.
                <br />
                Please contact the front desk for assistance.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {credentials.map(credential => (
              <Card 
                key={credential.id}
                className="bg-gradient-to-br from-card to-blue-50/50 dark:to-blue-950/20 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 text-white">
                      <Wifi className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="font-display text-2xl">
                        {credential.location || 'WiFi Network'}
                      </CardTitle>
                      <CardDescription className="text-base">
                        Connect to our secure network
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Network Name */}
                  <div className="bg-accent/10 dark:bg-accent/5 p-4 rounded-xl border-2 border-accent/30">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold mb-2 block">
                      Network Name
                    </Label>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-lg font-mono tracking-wide">
                        {credential.network_name}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(credential.network_name, `network-${credential.id}`)}
                        className="rounded-full hover:bg-accent/20"
                      >
                        {copiedField === `network-${credential.id}` ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="bg-accent/10 dark:bg-accent/5 p-4 rounded-xl border-2 border-accent/30">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold mb-2 block">
                      Password
                    </Label>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-lg font-mono tracking-wider">
                        {credential.password}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(credential.password, `password-${credential.id}`)}
                        className="rounded-full hover:bg-accent/20"
                      >
                        {copiedField === `password-${credential.id}` ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* QR Code for WiFi */}
                  <div className="flex flex-col items-center gap-4 p-6 bg-white dark:bg-card rounded-xl border-2 border-border">
                    <p className="text-sm text-muted-foreground text-center">
                      Scan to connect automatically
                    </p>
                    <div className="p-4 bg-white rounded-lg">
                      <QRCodeSVG
                        value={generateWiFiQRData(credential)}
                        size={200}
                        level="H"
                        includeMargin
                      />
                    </div>
                  </div>

                  {credential.instructions && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Instructions:</strong> {credential.instructions}
                      </p>
                    </div>
                  )}

                  {/* Help Section */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-3">
                      Having trouble connecting?
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/qr/${token}/request/maintenance`)}
                      className="w-full"
                    >
                      Request Technical Support
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}