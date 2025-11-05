import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { usePlatformNavigation, NavigationItem } from '@/hooks/usePlatformNavigation';
import { NavigationItemForm } from '@/components/platform/NavigationItemForm';
import { Plus, Pencil, Trash2, Navigation, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export function PlatformNavigationTab() {
  const { navigationItems, isLoading, syncDefaultNavigation, createNavItem, updateNavItem, deleteNavItem } = usePlatformNavigation();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<NavigationItem | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleCreate = () => {
    setFormMode('create');
    setSelectedItem(undefined);
    setFormOpen(true);
  };

  const handleEdit = (item: NavigationItem) => {
    setFormMode('edit');
    setSelectedItem(item);
    setFormOpen(true);
  };

  const handleSubmit = async (data: Partial<NavigationItem>) => {
    if (formMode === 'create') {
      await createNavItem.mutateAsync(data);
    } else {
      await updateNavItem.mutateAsync(data as NavigationItem & { id: string });
    }
    setFormOpen(false);
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
      await deleteNavItem.mutateAsync(itemToDelete);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleToggleActive = async (item: NavigationItem) => {
    await updateNavItem.mutateAsync({
      id: item.id,
      is_active: !item.is_active,
    });
  };

  const handleSync = async () => {
    await syncDefaultNavigation.mutateAsync();
  };

  if (isLoading) {
    return <div className="p-8">Loading navigation items...</div>;
  }

  const sortedItems = navigationItems?.sort((a, b) => a.order_index - b.order_index) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Platform Navigation</h2>
          <p className="text-muted-foreground">
            Manage navigation items across the platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSync} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Default
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Navigation Items</CardTitle>
          <CardDescription>
            {sortedItems.length} navigation item(s) configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No navigation items configured. Sync default navigation to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.order_index}</TableCell>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell className="font-mono text-sm">{item.path}</TableCell>
                    <TableCell>
                      {item.icon ? (
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{item.icon}</code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.allowed_roles && item.allowed_roles.length > 0 ? (
                          item.allowed_roles.map((role) => (
                            <Badge key={role} variant="outline" className="text-xs">
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="text-xs">All</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => handleToggleActive(item)}
                        />
                        <Badge variant={item.is_active ? 'default' : 'secondary'}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.tenant_id ? (
                        <Badge variant="outline">Tenant</Badge>
                      ) : (
                        <Badge>Global</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(item.id)}
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

      <NavigationItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        isSubmitting={createNavItem.isPending || updateNavItem.isPending}
        mode={formMode}
        initialData={selectedItem}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Navigation Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this navigation item? This action cannot be undone.
              Users will no longer see this item in their navigation menu.
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
