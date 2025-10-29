import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, Copy, QrCode, Check } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

export function PortalPreview() {
  const { tenantId } = useAuth();
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: tenant } = useQuery({
    queryKey: ['tenant-slug', tenantId],
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
        .select('domain')
        .eq('tenant_id', tenantId)
        .eq('status', 'verified')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const portalUrl = customDomain?.domain
    ? `https://${customDomain.domain}/portal`
    : `https://${tenant?.slug}.lovable.app/portal`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success('Portal link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Card className="p-6 space-y-4 bg-card border-2 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Guest Portal</h3>
            <p className="text-sm text-muted-foreground">Share this link with your guests</p>
          </div>
          {customDomain?.domain && (
            <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
              Custom Domain Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <code className="flex-1 text-sm truncate">{portalUrl}</code>
          <Button size="sm" variant="ghost" onClick={copyToClipboard}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open(portalUrl, '_blank')} className="flex-1">
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Portal
          </Button>
          <Button variant="outline" onClick={() => setShowQR(true)} className="flex-1">
            <QrCode className="w-4 h-4 mr-2" />
            Show QR Code
          </Button>
        </div>
      </Card>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Guest Portal QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center p-6 bg-white rounded-lg">
              <QRCodeSVG value={portalUrl} size={256} level="H" />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Guests can scan this code to access the portal
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyToClipboard} className="flex-1">
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
