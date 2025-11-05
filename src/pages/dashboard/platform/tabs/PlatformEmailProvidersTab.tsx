import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useEmailProviders, EmailProvider } from '@/hooks/useEmailProviders';
import { EmailProviderForm } from '@/components/platform/EmailProviderForm';
import { Plus, Pencil, Trash2, Mail, CheckCircle2 } from 'lucide-react';

export function PlatformEmailProvidersTab() {
  const { providers, isLoading, createProvider, updateProvider, deleteProvider, testProvider } = useEmailProviders();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedProvider, setSelectedProvider] = useState<EmailProvider | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<string | null>(null);

  const handleCreate = () => {
    setFormMode('create');
    setSelectedProvider(undefined);
    setFormOpen(true);
  };

  const handleEdit = (provider: EmailProvider) => {
    setFormMode('edit');
    setSelectedProvider(provider);
    setFormOpen(true);
  };

  const handleSubmit = async (data: Partial<EmailProvider>) => {
    if (formMode === 'create') {
      await createProvider.mutateAsync(data);
    } else {
      await updateProvider.mutateAsync(data as EmailProvider & { id: string });
    }
    setFormOpen(false);
  };

  const handleDeleteClick = (id: string) => {
    setProviderToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (providerToDelete) {
      await deleteProvider.mutateAsync(providerToDelete);
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
    }
  };

  const handleTest = async (id: string) => {
    await testProvider.mutateAsync(id);
  };

  const getProviderIcon = (type: string) => {
    return <Mail className="h-4 w-4" />;
  };

  if (isLoading) {
    return <div className="p-8">Loading email providers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Providers</h2>
          <p className="text-muted-foreground">
            Manage email delivery providers (SMTP, SendGrid, Mailgun, Resend)
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Provider
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Providers</CardTitle>
          <CardDescription>
            {providers?.length || 0} email provider(s) configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!providers || providers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No email providers configured yet. Add one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">{provider.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getProviderIcon(provider.provider_type)}
                        <span className="capitalize">{provider.provider_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={provider.enabled ? 'default' : 'secondary'}>
                        {provider.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {provider.is_default && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      {provider.tenant_id ? (
                        <Badge variant="outline">Tenant-specific</Badge>
                      ) : (
                        <Badge>Global</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTest(provider.id)}
                        >
                          Test
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(provider)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(provider.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EmailProviderForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        isSubmitting={createProvider.isPending || updateProvider.isPending}
        mode={formMode}
        initialData={selectedProvider}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this email provider? This action cannot be undone.
              Tenants using this provider will need to be reconfigured.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
