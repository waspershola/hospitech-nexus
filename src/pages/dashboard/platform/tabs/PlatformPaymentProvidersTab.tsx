import { useState } from 'react';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { usePlatformPaymentProviders } from '@/hooks/usePlatformPaymentProviders';
import { PaymentProviderForm } from '@/components/platform/PaymentProviderForm';
import { Skeleton } from '@/components/ui/skeleton';

export function PlatformPaymentProvidersTab() {
  const { providers, isLoading, deleteProvider } = usePlatformPaymentProviders();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAdd = () => {
    setSelectedProvider(null);
    setShowDialog(true);
  };

  const handleEdit = (provider: any) => {
    setSelectedProvider(provider);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    await deleteProvider.mutateAsync(id);
    setDeleteConfirmId(null);
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'stripe':
        return '💳';
      case 'paystack':
        return '💰';
      case 'flutterwave':
        return '🦋';
      case 'monnify':
        return '💵';
      default:
        return '💳';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Providers</h2>
          <p className="text-muted-foreground">Manage payment gateway integrations</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Provider
        </Button>
      </div>

      {providers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No payment providers configured</p>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Provider
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((provider) => (
            <Card key={provider.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getProviderIcon(provider.provider_type)}</span>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {provider.provider_name}
                        {provider.is_default && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="capitalize">
                        {provider.provider_type}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={provider.is_active ? 'default' : 'secondary'}>
                    {provider.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(provider)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirmId(provider.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
                <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                  <p>API Key: {provider.api_key_encrypted ? '••••••••' : 'Not set'}</p>
                  <p>Webhook: {provider.webhook_secret ? '••••••••' : 'Not set'}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedProvider ? 'Edit Payment Provider' : 'Add Payment Provider'}
            </DialogTitle>
          </DialogHeader>
          <PaymentProviderForm
            provider={selectedProvider}
            onSuccess={() => setShowDialog(false)}
            onCancel={() => setShowDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment provider? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
