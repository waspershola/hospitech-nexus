import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Receipt, Copy, ExternalLink, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function QRBillingTasks() {
  const { tenantId } = useAuth();

  // Fetch pending billing tasks
  const { data: billingTasks = [] } = useQuery({
    queryKey: ['qr-billing-tasks', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          rooms (number),
          guests (name, phone, email)
        `)
        .eq('tenant_id', tenantId)
        .eq('billing_status', 'pending_frontdesk')
        .eq('billing_routed_to', 'frontdesk')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const copyReferenceCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Reference code copied to clipboard');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">QR Billing Tasks</h1>
          <p className="text-muted-foreground">
            Requests transferred to Front Desk for billing
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {billingTasks.length} Pending
        </Badge>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Copy the billing reference code and use it in <strong>Billing Center</strong> or <strong>Front Desk → Add Charge</strong> to post charges to the guest's folio.
        </AlertDescription>
      </Alert>

      {billingTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No pending billing tasks</p>
            <p className="text-sm text-muted-foreground">
              Tasks transferred for billing will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {billingTasks.map((task) => {
            const metadata = task.metadata as any;
            // PHASE 4: Fix amount calculation - amounts already in Naira, not kobo
            const amount = task.billed_amount || 
                          metadata?.payment_info?.total_amount || 
                          metadata?.payment_info?.subtotal || 0;
            const amountDisplay = amount.toLocaleString();

            return (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-2xl text-primary">
                          {task.billing_reference_code}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyReferenceCode(task.billing_reference_code)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{task.type}</Badge>
                        {task.assigned_department && (
                          <Badge variant="secondary">{task.assigned_department}</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {task.rooms?.number && (
                          <p>Room {task.rooms.number}</p>
                        )}
                        {task.guests?.name && (
                          <p>Guest: {task.guests.name}</p>
                        )}
                        <p>
                          Transferred {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary">
                        ₦{amountDisplay}
                      </div>
                      <p className="text-sm text-muted-foreground">Amount Due</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">To process this billing task:</p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Copy the reference code above</li>
                      <li>Navigate to <strong>Billing Center</strong> or <strong>Front Desk</strong></li>
                      <li>Click <strong>"Add Charge"</strong> on the guest's folio</li>
                      <li>Paste the reference code to auto-populate charge details</li>
                    </ol>
                    {task.guest_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          // Navigate to billing center for this guest's folio
                          window.open(`/dashboard/billing/${task.guest_id}`, '_blank');
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Open Billing Center
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
