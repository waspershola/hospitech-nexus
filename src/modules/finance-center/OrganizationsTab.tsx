import { useState } from 'react';
import { Plus, Building2, Mail, User, CreditCard, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrganizations } from '@/hooks/useOrganizations';
import { OrganizationDrawer } from './OrganizationDrawer';
import { OrgWalletRulesDialog } from './OrgWalletRulesDialog';

export function OrganizationsTab() {
  const { organizations, isLoading } = useOrganizations();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [selectedOrgName, setSelectedOrgName] = useState<string>('');

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading organizations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Organizations</h2>
          <p className="text-muted-foreground">Manage corporate clients and their wallets</p>
        </div>
        <Button onClick={() => { setSelectedOrg(null); setDrawerOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Organization
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <Card
            key={org.id}
            className="p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => { setSelectedOrg(org.id); setDrawerOpen(true); }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{org.name}</h3>
                  <Badge variant={org.active ? 'default' : 'secondary'}>
                    {org.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              {org.contact_person && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  {org.contact_person}
                </div>
              )}
              {org.contact_email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {org.contact_email}
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="w-4 h-4" />
                Credit Limit: ₦{org.credit_limit.toLocaleString()}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedOrg(org.id);
                  setSelectedOrgName(org.name);
                  setRulesDialogOpen(true);
                }}
              >
                <Settings className="w-4 h-4 mr-2" />
                Wallet Rules
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {organizations.length === 0 && (
        <Card className="p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Organizations Yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your first corporate client to start managing their bookings and payments
          </p>
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Organization
          </Button>
        </Card>
      )}

      <OrganizationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        organizationId={selectedOrg}
      />
      
      {selectedOrg && (
        <OrgWalletRulesDialog
          open={rulesDialogOpen}
          onClose={() => setRulesDialogOpen(false)}
          organizationId={selectedOrg}
          organizationName={selectedOrgName}
        />
      )}
    </div>
  );
}
