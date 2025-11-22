import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SetPinModal } from './SetPinModal';
import { ChangePinModal } from './ChangePinModal';
import { format } from 'date-fns';

const AUTHORIZED_ROLES = ['owner', 'manager', 'finance_manager', 'accounting'];

export function ManagerPinSection() {
  const { user, role, tenantId } = useAuth();
  const [showSetPin, setShowSetPin] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);

  // Fetch staff PIN status
  const { data: staffInfo } = useQuery({
    queryKey: ['staff-pin-status', user?.id, tenantId],
    queryFn: async () => {
      if (!user?.id || !tenantId) return null;
      
      const { data, error } = await supabase
        .from('staff')
        .select('id, manager_pin_hash, pin_set_at, pin_last_changed, role')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!tenantId,
  });

  // Only show for authorized roles
  if (!role || !AUTHORIZED_ROLES.includes(role)) {
    return null;
  }

  const hasPinSet = !!staffInfo?.manager_pin_hash;
  const pinLastChanged = staffInfo?.pin_last_changed 
    ? format(new Date(staffInfo.pin_last_changed), 'MMM dd, yyyy')
    : staffInfo?.pin_set_at 
    ? format(new Date(staffInfo.pin_set_at), 'MMM dd, yyyy')
    : null;

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-display text-foreground">Manager PIN</h3>
        </div>
        
        <div className="space-y-4">
          <div className="pb-3 border-b">
            <Label className="text-sm text-muted-foreground">PIN Status</Label>
            <div className="mt-1 flex items-center gap-2">
              {hasPinSet ? (
                <>
                  <Badge variant="default" className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    PIN Set
                  </Badge>
                  {pinLastChanged && (
                    <span className="text-xs text-muted-foreground">
                      Last updated: {pinLastChanged}
                    </span>
                  )}
                </>
              ) : (
                <Badge variant="destructive">PIN Not Set</Badge>
              )}
            </div>
          </div>

          <div className="pb-3 border-b">
            <Label className="text-sm text-muted-foreground">Purpose</Label>
            <p className="text-sm text-foreground mt-1">
              Required to approve high-risk financial operations including overpayments, 
              refunds, room rebates, and write-offs.
            </p>
          </div>

          <div className="flex gap-2">
            {hasPinSet ? (
              <Button 
                onClick={() => setShowChangePin(true)}
                variant="outline"
                className="w-full"
              >
                Change PIN
              </Button>
            ) : (
              <Button 
                onClick={() => setShowSetPin(true)}
                variant="default"
                className="w-full"
              >
                Set Manager PIN
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Your PIN is encrypted and securely stored. You will need this PIN to approve 
            sensitive financial transactions.
          </p>
        </div>
      </Card>

      <SetPinModal 
        open={showSetPin} 
        onClose={() => setShowSetPin(false)} 
      />
      
      <ChangePinModal 
        open={showChangePin} 
        onClose={() => setShowChangePin(false)} 
      />
    </>
  );
}
