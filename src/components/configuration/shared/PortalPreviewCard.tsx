import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Copy, QrCode, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export function PortalPreviewCard() {
  const { tenantId } = useAuth();
  const [showQrCode, setShowQrCode] = useState(false);

  const { data: tenant } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('tenants')
        .select('slug, domain')
        .eq('id', tenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: customDomain } = useQuery({
    queryKey: ['custom-domain', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('hotel_domains')
        .select('domain, status')
        .eq('tenant_id', tenantId)
        .eq('status', 'verified')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const portalUrl = customDomain?.domain
    ? `https://${customDomain.domain}`
    : `https://${tenant?.slug}.luxuryhotelpro.com`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(portalUrl);
    toast.success('Portal URL copied to clipboard');
  };

  return (
    <>
      <Card className="rounded-2xl shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Guest Portal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Portal URL</p>
              <p className="text-sm font-mono truncate">{portalUrl}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={copyToClipboard}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          {customDomain?.domain && (
            <Badge variant="outline" className="w-full justify-center">
              Custom Domain Active
            </Badge>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(portalUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Portal
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowQrCode(true)}
            >
              <QrCode className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showQrCode} onOpenChange={setShowQrCode}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Guest Portal QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 p-6">
            <div className="bg-white p-6 rounded-2xl shadow-[var(--shadow-luxury)]">
              <QRCodeSVG
                value={portalUrl}
                size={256}
                level="H"
                includeMargin
                fgColor="hsl(var(--primary))"
              />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Scan this QR code to access the guest portal
              </p>
              <p className="text-xs font-mono bg-muted px-3 py-1 rounded">{portalUrl}</p>
            </div>
            <Button onClick={copyToClipboard} className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              Copy Portal URL
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
