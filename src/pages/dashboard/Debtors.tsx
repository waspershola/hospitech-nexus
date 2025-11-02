import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { differenceInDays, format } from 'date-fns';
import { AlertCircle, Wallet, Search, Eye, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DebtorDetails {
  entity_id: string;
  entity_name: string;
  entity_type: 'guest' | 'organization';
  email?: string;
  phone?: string;
  total_debt: number;
  wallet_balance: number;
  net_position: number;
  receivable_count: number;
  oldest_receivable_age: number;
  receivables: Array<{
    id: string;
    amount: number;
    created_at: string;
    due_date: string | null;
    booking_id: string | null;
    status: string;
    created_by: string;
    location: string;
  }>;
}

export default function Debtors() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDebtor, setSelectedDebtor] = useState<DebtorDetails | null>(null);

  // Fetch all debtors with complete details
  const { data: debtors, isLoading } = useQuery({
    queryKey: ['debtors-full', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Fetch all open receivables
      const { data: receivables } = await supabase
        .from('receivables')
        .select(`
          id,
          amount,
          created_at,
          due_date,
          booking_id,
          status,
          guest_id,
          organization_id,
          created_by,
          metadata,
          guest:guests(id, name, email, phone),
          organization:organizations(id, name, contact_email),
          created_by_profile:profiles!receivables_created_by_fkey(full_name)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'open');

      if (!receivables) return [];

      // Group by entity
      const debtorMap = new Map<string, DebtorDetails>();

      for (const r of receivables) {
        const isGuest = !!r.guest_id;
        const entityId = isGuest ? r.guest_id! : r.organization_id!;
        const entityData = isGuest ? (r.guest as any) : (r.organization as any);

        if (debtorMap.has(entityId)) {
          const existing = debtorMap.get(entityId)!;
          existing.total_debt += Number(r.amount);
          existing.receivable_count += 1;
          existing.receivables.push({
            id: r.id,
            amount: Number(r.amount),
            created_at: r.created_at,
            due_date: r.due_date,
            booking_id: r.booking_id,
            status: r.status,
            created_by: (r.created_by_profile as any)?.full_name || 'System',
            location: (r.metadata as any)?.location || 'N/A'
          });
          const age = differenceInDays(new Date(), new Date(r.created_at));
          if (age > existing.oldest_receivable_age) {
            existing.oldest_receivable_age = age;
          }
        } else {
          // Fetch wallet balance
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('tenant_id', tenantId)
            .eq('owner_id', entityId)
            .eq('wallet_type', isGuest ? 'guest' : 'organization')
            .single();

          const walletBalance = Number(wallet?.balance || 0);
          const totalDebt = Number(r.amount);

          debtorMap.set(entityId, {
            entity_id: entityId,
            entity_name: entityData?.name || 'Unknown',
            entity_type: isGuest ? 'guest' : 'organization',
            email: isGuest ? entityData?.email : entityData?.contact_email,
            phone: isGuest ? entityData?.phone : undefined,
            total_debt: totalDebt,
            wallet_balance: walletBalance,
            net_position: totalDebt - walletBalance,
            receivable_count: 1,
            oldest_receivable_age: differenceInDays(new Date(), new Date(r.created_at)),
            receivables: [{
              id: r.id,
              amount: Number(r.amount),
              created_at: r.created_at,
              due_date: r.due_date,
              booking_id: r.booking_id,
              status: r.status,
              created_by: (r.created_by_profile as any)?.full_name || 'System',
              location: (r.metadata as any)?.location || 'N/A'
            }]
          });
        }
      }

      return Array.from(debtorMap.values()).sort((a, b) => b.net_position - a.net_position);
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
      queryClient.invalidateQueries({ queryKey: ['debtors-full', tenantId] });
      toast.success('Receivable marked as paid');
    },
  });

  const writeOffMutation = useMutation({
    mutationFn: async (receivableId: string) => {
      const { error } = await supabase
        .from('receivables')
        .update({ status: 'written_off' })
        .eq('id', receivableId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debtors-full', tenantId] });
      toast.success('Receivable written off');
    },
  });

  const filteredDebtors = debtors?.filter(d => 
    d.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDebt = debtors?.reduce((sum, d) => sum + d.total_debt, 0) || 0;
  const totalWalletCredits = debtors?.reduce((sum, d) => sum + d.wallet_balance, 0) || 0;
  const netReceivables = totalDebt - totalWalletCredits;
  const overdueDebtors = debtors?.filter(d => d.oldest_receivable_age > 30).length || 0;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold">Debtors Management</h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive view of receivables vs wallet credits
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Understanding the System:</strong> Receivables (debt owed to hotel) and Wallet Credits 
          (prepayments from guests) are separate. Net Position shows the actual amount owed after 
          applying available credits.
        </AlertDescription>
      </Alert>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Receivables</CardDescription>
            <CardTitle className="text-3xl text-destructive">₦{totalDebt.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{debtors?.length || 0} debtors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Wallet Credits</CardDescription>
            <CardTitle className="text-3xl text-green-600">₦{totalWalletCredits.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Prepayments available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Receivables</CardDescription>
            <CardTitle className="text-3xl text-orange-600">₦{netReceivables.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">After wallet offsets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue (30+ days)</CardDescription>
            <CardTitle className="text-3xl">{overdueDebtors}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Debtors Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Debtors</CardTitle>
          <CardDescription>
            Showing {filteredDebtors?.length || 0} of {debtors?.length || 0} debtors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!filteredDebtors || filteredDebtors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-semibold">No Outstanding Receivables</p>
              <p className="text-sm mt-2">All balances have been settled</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Total Debt</TableHead>
                  <TableHead className="text-right">Wallet Credit</TableHead>
                  <TableHead className="text-right">Net Position</TableHead>
                  <TableHead>Invoices</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDebtors.map((debtor) => {
                  const isOverdue = debtor.oldest_receivable_age > 30;
                  
                  return (
                    <TableRow key={debtor.entity_id} className={isOverdue ? 'bg-destructive/5' : ''}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{debtor.entity_name}</p>
                          {debtor.entity_type === 'organization' && (
                            <Badge variant="outline" className="mt-1">Organization</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {debtor.email && <p className="text-sm">{debtor.email}</p>}
                        {debtor.phone && <p className="text-xs text-muted-foreground">{debtor.phone}</p>}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        ₦{debtor.total_debt.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        ₦{debtor.wallet_balance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-600">
                        ₦{debtor.net_position.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{debtor.receivable_count} invoice{debtor.receivable_count > 1 ? 's' : ''}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isOverdue ? 'destructive' : debtor.oldest_receivable_age > 7 ? 'secondary' : 'default'}>
                          {debtor.oldest_receivable_age} days
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedDebtor(debtor)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Debtor Detail Modal */}
      {selectedDebtor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedDebtor.entity_name}</CardTitle>
                  <CardDescription className="mt-1">
                    {selectedDebtor.email} {selectedDebtor.phone && `• ${selectedDebtor.phone}`}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDebtor(null)}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Financial Summary */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card className="bg-destructive/5">
                  <CardHeader className="pb-2">
                    <CardDescription>Total Debt Owed</CardDescription>
                    <CardTitle className="text-2xl text-destructive">₦{selectedDebtor.total_debt.toLocaleString()}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="bg-green-50">
                  <CardHeader className="pb-2">
                    <CardDescription>Wallet Balance</CardDescription>
                    <CardTitle className="text-2xl text-green-600">₦{selectedDebtor.wallet_balance.toLocaleString()}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="bg-orange-50">
                  <CardHeader className="pb-2">
                    <CardDescription>Net Position</CardDescription>
                    <CardTitle className="text-2xl text-orange-600">₦{selectedDebtor.net_position.toLocaleString()}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Receivables List */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Individual Receivables</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDebtor.receivables.map((r) => {
                      const age = differenceInDays(new Date(), new Date(r.created_at));
                      
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            {r.booking_id ? (
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {r.booking_id.slice(0, 8)}
                              </code>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">₦{r.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{format(new Date(r.created_at), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={age > 30 ? 'destructive' : 'default'}>
                              {age} days
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{r.created_by}</TableCell>
                          <TableCell className="text-sm">{r.location}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markPaidMutation.mutate(r.id)}
                                disabled={markPaidMutation.isPending}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Mark Paid
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm('Write off this receivable? This cannot be undone.')) {
                                    writeOffMutation.mutate(r.id);
                                  }
                                }}
                                disabled={writeOffMutation.isPending}
                              >
                                <AlertTriangle className="h-3 w-3 mr-1" />
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
