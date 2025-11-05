import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePlatformTenants } from '@/hooks/usePlatformTenants';
import { usePlatformProviders } from '@/hooks/usePlatformProviders';
import { CreditCard, Plus } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function PlatformTenantsTab() {
  const { tenants, isLoading, assignProvider, addCredits } = usePlatformTenants();
  const { providers } = usePlatformProviders();
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [senderId, setSenderId] = useState('');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);

  const handleAssignProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    await assignProvider.mutateAsync({
      tenant_id: selectedTenant,
      provider_id: selectedProvider,
      sender_id: senderId,
    });

    setIsAssignDialogOpen(false);
    setSelectedProvider('');
    setSenderId('');
  };

  const handleAddCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    await addCredits.mutateAsync({
      tenant_id: selectedTenant,
      credits: parseInt(creditAmount),
      reference: `Manual top-up - ${new Date().toISOString()}`,
    });

    setIsCreditsDialogOpen(false);
    setCreditAmount('');
  };

  if (isLoading) {
    return <div>Loading tenants...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Tenant Management</h2>

      <div className="grid gap-4">
        {tenants?.map((tenant) => {
          const creditPool = tenant.credit_pool;
          const available = (creditPool?.total_credits || 0) - (creditPool?.consumed_credits || 0);

          return (
            <Card key={tenant.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{tenant.domain || 'Unnamed Tenant'}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Owner: {tenant.owner_email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={isAssignDialogOpen && selectedTenant === tenant.id} onOpenChange={(open) => {
                      setIsAssignDialogOpen(open);
                      if (open) setSelectedTenant(tenant.id);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Assign Provider
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign SMS Provider</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAssignProvider} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Provider</Label>
                            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                              <SelectContent>
                                {providers?.filter(p => p.is_active).map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.provider_type.toUpperCase()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Sender ID</Label>
                            <Input
                              value={senderId}
                              onChange={(e) => setSenderId(e.target.value)}
                              placeholder="e.g., YourBrand"
                              required
                            />
                          </div>

                          <Button type="submit" className="w-full">
                            Assign Provider
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isCreditsDialogOpen && selectedTenant === tenant.id} onOpenChange={(open) => {
                      setIsCreditsDialogOpen(open);
                      if (open) setSelectedTenant(tenant.id);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Add Credits
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add SMS Credits</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddCredits} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Credits Amount</Label>
                            <Input
                              type="number"
                              value={creditAmount}
                              onChange={(e) => setCreditAmount(e.target.value)}
                              placeholder="e.g., 1000"
                              required
                            />
                          </div>

                          <Button type="submit" className="w-full">
                            Add Credits
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">SMS Credits</span>
                  <Badge variant={available > 100 ? 'default' : 'destructive'}>
                    {available} available
                  </Badge>
                </div>

                {tenant.provider_assignments && tenant.provider_assignments.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Assigned Providers</span>
                    {tenant.provider_assignments.map((assignment: any) => (
                      <div key={assignment.id} className="flex items-center justify-between text-sm">
                        <span>
                          {assignment.provider?.provider_type?.toUpperCase()} - {assignment.sender_id}
                        </span>
                        {assignment.is_default && <Badge variant="outline">Default</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
