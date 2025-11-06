import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePlatformTenants } from '@/hooks/usePlatformTenants';
import { usePlatformProviders } from '@/hooks/usePlatformProviders';
import { usePlatformPlans } from '@/hooks/usePlatformPlans';
import { useSoftDelete } from '@/hooks/useSoftDelete';
import { CreditCard, Plus, Trash2, PlayCircle, PauseCircle, Building2, AlertTriangle, MoreVertical, Package, Activity, Settings } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function PlatformTenantsTab() {
  const navigate = useNavigate();
  const {
    tenants, 
    isLoading, 
    createTenant,
    suspendTenant,
    activateTenant,
    deleteTenant,
    assignProvider, 
    addCredits 
  } = usePlatformTenants();
  const { providers } = usePlatformProviders();
  const { plans } = usePlatformPlans();
  const { softDeleteTenant } = useSoftDelete();

  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [senderId, setSenderId] = useState('');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<string | null>(null);

  // Create tenant form state
  const [hotelName, setHotelName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [domain, setDomain] = useState('');

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createTenant.mutateAsync({
      hotel_name: hotelName,
      owner_email: ownerEmail,
      owner_password: ownerPassword || undefined,
      plan_id: selectedPlan,
      domain: domain || undefined,
    });

    setIsCreateDialogOpen(false);
    setHotelName('');
    setOwnerEmail('');
    setOwnerPassword('');
    setSelectedPlan('');
    setDomain('');
  };

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

  const handleDeleteTenant = async () => {
    if (!tenantToDelete) return;
    await softDeleteTenant.mutateAsync(tenantToDelete);
    setDeleteConfirmOpen(false);
    setTenantToDelete(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      trial: { variant: 'secondary', label: 'Trial' },
      suspended: { variant: 'destructive', label: 'Suspended' },
      cancelled: { variant: 'outline', label: 'Cancelled' },
    };

    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tenants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tenant Management</h2>
          <p className="text-muted-foreground">Manage tenant lifecycle, plans, and resources</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Building2 className="h-4 w-4 mr-2" />
              Create Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>
                Set up a new hotel tenant with admin account, plan, and initial credits
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hotel_name">Hotel Name *</Label>
                  <Input
                    id="hotel_name"
                    value={hotelName}
                    onChange={(e) => setHotelName(e.target.value)}
                    placeholder="e.g., Grand Palace Hotel"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domain">Domain (optional)</Label>
                  <Input
                    id="domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="e.g., grandpalace.com"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="owner_email">Owner Email *</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@hotel.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_password">Password (optional)</Label>
                  <Input
                    id="owner_password"
                    type="password"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Leave blank to auto-generate"
                  />
                  <p className="text-xs text-muted-foreground">
                    If not provided, a secure password will be auto-generated
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan_id">Plan *</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan} required>
                  <SelectTrigger id="plan_id">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - ₦{plan.price_monthly?.toLocaleString() || 0}/mo (₦{plan.price_yearly?.toLocaleString() || 0}/yr)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm">What will be created:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>✓ Tenant account with selected plan</li>
                  <li>✓ Admin user account (owner role)</li>
                  <li>✓ 100 free trial SMS credits</li>
                  <li>✓ Default navigation items</li>
                  <li>✓ Default financial & branding settings</li>
                </ul>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTenant.isPending}>
                  {createTenant.isPending ? 'Creating...' : 'Create Tenant'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {tenants && tenants.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tenants yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first tenant to get started
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Building2 className="h-4 w-4 mr-2" />
                Create Tenant
              </Button>
            </CardContent>
          </Card>
        )}

        {tenants?.map((tenant) => {
          const creditPool = tenant.credit_pool;
          const available = (creditPool?.total_credits || 0) - (creditPool?.consumed_credits || 0);
          const plan = plans?.find(p => p.id === tenant.plan_id);

          return (
            <Card key={tenant.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle>{tenant.domain || 'Unnamed Tenant'}</CardTitle>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              {getStatusBadge(tenant.status)}
                            </div>
                          </TooltipTrigger>
                          {tenant.status === 'suspended' && tenant.suspension_reason && (
                            <TooltipContent>
                              <p className="text-sm">Reason: {tenant.suspension_reason}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <CardDescription className="space-y-1">
                      <div>Owner: {tenant.owner_email}</div>
                      {plan && <div>Plan: {plan.name} (₦{plan.price_monthly?.toLocaleString() || 0}/mo)</div>}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Created {new Date(tenant.created_at).toLocaleDateString()}</span>
                        {available < 50 && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Credits
                          </Badge>
                        )}
                      </div>
                    </CardDescription>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/dashboard/platform/tenants/${tenant.id}`)}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    
                    {tenant.status === 'suspended' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => activateTenant.mutate(tenant.id)}
                        disabled={activateTenant.isPending}
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Activate
                      </Button>
                    ) : tenant.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => suspendTenant.mutate(tenant.id)}
                        disabled={suspendTenant.isPending}
                      >
                        <PauseCircle className="h-4 w-4 mr-2" />
                        Suspend
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigate(`/dashboard/platform/tenants/${tenant.id}?tab=package`)}>
                          <Package className="h-4 w-4 mr-2" />
                          Change Plan
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/dashboard/platform/tenants/${tenant.id}?tab=activity`)}>
                          <Activity className="h-4 w-4 mr-2" />
                          View Activity
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/dashboard/platform/tenants/${tenant.id}?tab=settings`)}>
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedTenant(tenant.id);
                            setIsAssignDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Assign Provider
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedTenant(tenant.id);
                            setIsCreditsDialogOpen(true);
                          }}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Add Credits
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => {
                            setTenantToDelete(tenant.id);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Move to Trash
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">SMS Credits</span>
                      <Badge variant={available > 100 ? 'default' : available > 50 ? 'secondary' : 'destructive'}>
                        {available} available
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {creditPool?.total_credits || 0} total • {creditPool?.consumed_credits || 0} used
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
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

                {tenant.provider_assignments && tenant.provider_assignments.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Assigned Providers</span>
                    <div className="space-y-1">
                      {tenant.provider_assignments.map((assignment: any) => (
                        <div key={assignment.id} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                          <span>
                            {assignment.provider?.provider_type?.toUpperCase()} - {assignment.sender_id}
                          </span>
                          {assignment.is_default && <Badge variant="outline" className="ml-2">Default</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Tenant?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will move the tenant to trash. All tenant data will be preserved 
              and the account can be restored later by a super admin if needed.
              Users will no longer be able to access this tenant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTenant}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
