import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRingtone } from '@/hooks/useRingtone';
import { QrCode } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { QRRequestDrawer } from '@/components/qr-management/QRRequestDrawer';

export function QRRequestNotificationWidget() {
  const { tenantId } = useAuth();
  const { playRingtone } = useRingtone();
  const [qrRequestCount, setQrRequestCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!tenantId) return;

    const fetchCount = async () => {
      const { count } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .not('qr_token', 'is', null)
        .eq('status', 'pending');

      setQrRequestCount(count || 0);
    };

    fetchCount();

    const channel = supabase
      .channel('qr-requests-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'requests',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload: any) => {
          if (payload.new.qr_token) {
            setQrRequestCount(prev => prev + 1);
            
            playRingtone('/sounds/notification-default.mp3');
            
            toast.info('New QR Request Received', {
              description: `${payload.new.type} request from ${payload.new.room_number || 'Guest'}`,
              icon: <QrCode className="h-5 w-5 text-primary" />,
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload: any) => {
          if (payload.new.qr_token) {
            fetchCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, playRingtone]);

  const handleClick = () => {
    setDrawerOpen(true);
  };

  if (qrRequestCount === 0) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="relative gap-2"
      >
        <QrCode className="h-4 w-4" />
        <span className="hidden sm:inline">QR Requests</span>
        <Badge variant="default" className="ml-1">
          {qrRequestCount}
        </Badge>
      </Button>
      
      <QRRequestDrawer 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen} 
      />
    </>
  );
}
