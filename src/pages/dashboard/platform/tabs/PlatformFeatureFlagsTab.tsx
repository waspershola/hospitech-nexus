import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useFeatureFlags, FeatureFlag } from '@/hooks/useFeatureFlags';
import { FeatureFlagForm } from '@/components/platform/FeatureFlagForm';
import { Plus, Pencil, Trash2, Flag, CheckCircle2, XCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export function PlatformFeatureFlagsTab() {
  const { flags, isLoading, createFlag, updateFlag, deleteFlag } = useFeatureFlags();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [flagToDelete, setFlagToDelete] = useState<string | null>(null);

  const handleCreate = () => {
    setFormMode('create');
    setSelectedFlag(undefined);
    setFormOpen(true);
  };

  const handleEdit = (flag: FeatureFlag) => {
    setFormMode('edit');
    setSelectedFlag(flag);
    setFormOpen(true);
  };

  const handleSubmit = async (data: Partial<FeatureFlag>) => {
    if (formMode === 'create') {
      await createFlag.mutateAsync(data);
    } else {
      await updateFlag.mutateAsync(data as FeatureFlag & { id: string });
    }
    setFormOpen(false);
  };

  const handleDeleteClick = (id: string) => {
    setFlagToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (flagToDelete) {
      await deleteFlag.mutateAsync(flagToDelete);
      setDeleteDialogOpen(false);
      setFlagToDelete(null);
    }
  };

  const handleToggleGlobal = async (flag: FeatureFlag) => {
    await updateFlag.mutateAsync({
      id: flag.id,
      enabled_globally: !flag.enabled_globally,
    });
  };

  if (isLoading) {
    return <div className="p-8">Loading feature flags...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feature Flags</h2>
          <p className="text-muted-foreground">
            Control feature access across tenants with feature flags
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Flag
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Feature Flags</CardTitle>
          <CardDescription>
            {flags?.length || 0} feature flag(s) configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!flags || flags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No feature flags configured yet. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flag Key</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Global Status</TableHead>
                  <TableHead>Tenant Specific</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.map((flag) => (
                  <TableRow key={flag.id}>
                    <TableCell className="font-mono text-sm">{flag.flag_key}</TableCell>
                    <TableCell className="font-medium">{flag.flag_name}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {flag.description || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={flag.enabled_globally}
                          onCheckedChange={() => handleToggleGlobal(flag)}
                        />
                        {flag.enabled_globally ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Disabled
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {flag.tenant_id ? (
                        <Badge variant="outline">Yes</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(flag)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(flag.id)}
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

      <Card>
        <CardHeader>
          <CardTitle>Usage Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">What are Feature Flags?</h4>
            <p className="text-sm text-muted-foreground">
              Feature flags allow you to enable or disable features for specific tenants or globally across the platform.
              This enables A/B testing, gradual rollouts, and feature gating based on subscription plans.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">How to Use</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Create a flag with a unique key (e.g., <code className="text-xs bg-muted px-1 py-0.5 rounded">advanced_analytics</code>)</li>
              <li>Toggle "Enable Globally" to make it available to all tenants</li>
              <li>Or assign it to specific tenants for controlled rollouts</li>
              <li>Use the <code className="text-xs bg-muted px-1 py-0.5 rounded">isFeatureEnabled()</code> function in your code to check flag status</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <FeatureFlagForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        isSubmitting={createFlag.isPending || updateFlag.isPending}
        mode={formMode}
        initialData={selectedFlag}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature Flag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feature flag? This action cannot be undone.
              Features relying on this flag may behave unexpectedly.
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
