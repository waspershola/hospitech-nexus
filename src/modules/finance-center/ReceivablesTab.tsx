import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';
import { AlertCircle, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { ManagerApprovalModal } from '@/modules/payments/ManagerApprovalModal';

export function ReceivablesTab() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [showManagerApproval, setShowManagerApproval] = useState(false);
  const [pendingWriteOffReceivable, setPendingWriteOffReceivable] = useState<any>(null);

  const { data: receivables, isLoading } = useQuery({
    queryKey: ['receivables', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('receivables')
        .select(`
          *,
          guest:guests(name, email, phone),
          organization:organizations(name),
          booking:bookings(id)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const markPaidMutation = useMutation({
    mutationFn: async (receivableId: string) => {
      const { error } = await supabase
        .from('receivables')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', receivableId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables', tenantId] });
      toast.success('Receivable marked as paid');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark as paid: ${error.message}`);
    },
  });

  const escalateMutation = useMutation({
    mutationFn: async (receivableId: string) => {
      const { error } = await supabase
        .from('receivables')
        .update({ status: 'escalated' })
        .eq('id', receivableId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables', tenantId] });
      toast.success('Receivable escalated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to escalate: ${error.message}`);
    },
  });

  const writeOffMutation = useMutation({
    mutationFn: async ({ receivableId, approvalToken }: { receivableId: string; approvalToken?: string }) => {
      const { error } = await supabase
        .from('receivables')
        .update({ 
          status: 'written_off',
          metadata: {
            written_off_at: new Date().toISOString(),
            manager_approved: !!approvalToken,
            approval_token_used: !!approvalToken,
          }
        })
        .eq('id', receivableId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables', tenantId] });
      
      // Reset states
      setShowManagerApproval(false);
      setPendingWriteOffReceivable(null);
      
      toast.success('Receivable written off');
    },
    onError: (error: Error) => {
      toast.error(`Failed to write off: ${error.message}`);
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async ({ receivableId, phone, amount, name, isOrg, hotelName }: {
      receivableId: string;
      phone: string;
      amount: number;
      name: string;
      isOrg: boolean;
      hotelName: string;
    }) => {
      const message = isOrg 
        ? `Reminder: Outstanding payment of ₦${amount.toLocaleString()} for ${name}. Please settle at your earliest convenience. - ${hotelName}`
        : `Hi ${name}, gentle reminder: You have an outstanding balance of ₦${amount.toLocaleString()}. Please contact us to settle. - ${hotelName}`;
      
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { 
          to: phone, 
          message,
          event_key: 'payment_reminder',
          tenant_id: tenantId,
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success('Payment reminder sent!'),
    onError: (error: Error) => toast.error(`Failed to send reminder: ${error.message}`),
  });

  const sendBulkRemindersMutation = useMutation({
    mutationFn: async (receivables: any[]) => {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .single();

      const hotelName = tenant?.name || 'Hotel';
      let sentCount = 0;
      let failedCount = 0;

      for (const ar of receivables) {
        if (!ar.guest?.phone) {
          failedCount++;
          continue;
        }

        try {
          await sendReminderMutation.mutateAsync({
            receivableId: ar.id,
            phone: ar.guest.phone,
            amount: ar.amount,
            name: ar.guest?.name || ar.organization?.name || 'Guest',
            isOrg: !!ar.organization_id,
            hotelName,
          });
          sentCount++;
          // Delay between sends to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          failedCount++;
        }
      }

      return { sentCount, failedCount };
    },
    onSuccess: (data) => {
      toast.success(`Sent ${data.sentCount} reminders. ${data.failedCount} failed.`);
    },
    onError: (error: Error) => {
      toast.error(`Bulk reminder failed: ${error.message}`);
    },
  });

  const totalAR = receivables?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
  const overdueCount = receivables?.filter(r => {
    const age = differenceInDays(new Date(), new Date(r.created_at));
    return age > 30;
  }).length || 0;
  const avgAge = receivables?.length 
    ? Math.round(receivables.reduce((sum, r) => 
        sum + differenceInDays(new Date(), new Date(r.created_at)), 0
      ) / receivables.length)
    : 0;

  if (isLoading) {
    return <div className="p-6">Loading receivables...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Receivables</p>
          <p className="text-3xl font-bold text-destructive">₦{totalAR.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{receivables?.length || 0} open invoices</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Overdue (30+ days)</p>
          <p className="text-3xl font-bold text-orange-600">{overdueCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Require immediate attention</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Average AR Age</p>
          <p className="text-3xl font-bold">{avgAge} days</p>
          <p className="text-xs text-muted-foreground mt-1">From creation date</p>
        </Card>
      </div>

      {/* Receivables Table */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Open Receivables</h3>
            <div className="flex items-center gap-2">
              {overdueCount > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const overdueWithPhone = receivables?.filter(ar => {
                        const age = differenceInDays(new Date(), new Date(ar.created_at));
                        return age > 30 && ar.guest?.phone;
                      });
                      if (overdueWithPhone && overdueWithPhone.length > 0) {
                        if (confirm(`Send payment reminders to ${overdueWithPhone.length} overdue accounts?`)) {
                          sendBulkRemindersMutation.mutate(overdueWithPhone);
                        }
                      } else {
                        toast.error('No overdue accounts with phone numbers');
                      }
                    }}
                    disabled={sendBulkRemindersMutation.isPending}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Bulk Reminders
                  </Button>
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {overdueCount} Overdue
                  </Badge>
                </>
              )}
            </div>
          </div>

          {!receivables || receivables.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No open receivables</p>
              <p className="text-sm mt-2">All outstanding balances have been settled</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest/Organization</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables?.map((ar) => {
                    const age = differenceInDays(new Date(), new Date(ar.created_at));
                    const isOverdue = age > 30;
                    
                    return (
                      <TableRow key={ar.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ar.guest?.name || ar.organization?.name}</p>
                            {ar.guest?.email && (
                              <p className="text-xs text-muted-foreground">{ar.guest.email}</p>
                            )}
                            {ar.organization && (
                              <Badge variant="outline" className="mt-1">Organization</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {ar.booking_id && (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {ar.booking_id.slice(0, 8)}
                            </code>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-destructive">
                          ₦{Number(ar.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isOverdue ? 'destructive' : age > 7 ? 'secondary' : 'default'}>
                            {age} days
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{ar.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {ar.guest?.phone && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={async () => {
                                  const { data: tenant } = await supabase
                                    .from('tenants')
                                    .select('name')
                                    .eq('id', tenantId)
                                    .single();
                                  const hotelName = tenant?.name || 'Hotel';
                                  
                                  sendReminderMutation.mutate({
                                    receivableId: ar.id,
                                    phone: ar.guest.phone!,
                                    amount: ar.amount,
                                    name: ar.guest?.name || ar.organization?.name || 'Guest',
                                    isOrg: !!ar.organization_id,
                                    hotelName,
                                  });
                                }}
                                disabled={sendReminderMutation.isPending}
                              >
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Send Reminder
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => markPaidMutation.mutate(ar.id)}
                              disabled={markPaidMutation.isPending}
                            >
                              Mark Paid
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => escalateMutation.mutate(ar.id)}
                              disabled={escalateMutation.isPending}
                            >
                              Escalate
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => {
                                setPendingWriteOffReceivable(ar);
                                setShowManagerApproval(true);
                              }}
                              disabled={writeOffMutation.isPending}
                            >
                              Write Off
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>

      {/* Manager Approval Modal */}
      <ManagerApprovalModal
        open={showManagerApproval}
        amount={pendingWriteOffReceivable?.amount || 0}
        type="write_off"
        actionReference={pendingWriteOffReceivable?.id}
        onApprove={(reason, approvalToken) => {
          console.log('[ReceivablesTab] Manager approved write-off', { reason, approvalToken });
          if (pendingWriteOffReceivable) {
            writeOffMutation.mutate({ 
              receivableId: pendingWriteOffReceivable.id, 
              approvalToken 
            });
          }
        }}
        onReject={() => {
          setShowManagerApproval(false);
          setPendingWriteOffReceivable(null);
          toast.info('Write-off cancelled - manager approval denied');
        }}
      />
    </div>
  );
}
