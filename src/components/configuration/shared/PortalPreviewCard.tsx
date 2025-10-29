import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, Copy, QrCode, Globe } from 'lucide-react';
import { toast } from 'sonner';

export function PortalPreviewCard() {
  const { tenantId } = useAuth();

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
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
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
          <Button variant="outline" size="icon">
            <QrCode className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
