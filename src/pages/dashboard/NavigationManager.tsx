import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Edit, Trash2, Eye, EyeOff, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

const ALL_ROLES = [
  'owner', 'manager', 'frontdesk', 'housekeeping', 'kitchen', 'bar',
  'maintenance', 'finance', 'accountant', 'supervisor', 'restaurant',
  'store_manager', 'procurement'
];

const ALL_DEPARTMENTS = [
  'front_office', 'housekeeping', 'kitchen', 'bar', 'food_beverage',
  'maintenance', 'inventory', 'management'
];

interface NavigationItem {
  id: string;
  name: string;
  path: string;
  icon: string;
  allowed_roles: string[];
  allowed_departments: string[];
  order_index: number;
  is_active: boolean;
  description?: string;
}

export default function NavigationManager() {
  const { tenantId } = useAuth();
  const { role, department } = useRole();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<NavigationItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const { data: navItems, isLoading } = useQuery({
    queryKey: ['navigation-admin', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('navigation_items')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('order_index');
      
      if (error) throw error;
      return data as NavigationItem[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (item: Partial<NavigationItem> & { id: string }) => {
      const { id, ...updateData } = item;
      const { error } = await supabase
        .from('navigation_items')
        .update(updateData as any)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['navigation-admin', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['navigation', tenantId] });
      toast.success('Navigation item updated');
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    onError: (error) => {
      toast.error('Failed to update navigation item');
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('navigation_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['navigation-admin', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['navigation', tenantId] });
      toast.success('Navigation item deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete navigation item');
      console.error(error);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('navigation_items')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['navigation-admin', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['navigation', tenantId] });
      toast.success('Navigation item visibility updated');
    },
  });

  const handleEdit = (item: NavigationItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingItem) return;
    updateMutation.mutate(editingItem);
  };

  const canUserSeeItem = (item: NavigationItem) => {
    const hasRole = role && item.allowed_roles.includes(role);
    if (!hasRole) return false;
    
    const allowedDepts = item.allowed_departments || [];
    if (allowedDepts.length === 0) return true; // Visible to all departments
    
    return department ? allowedDepts.includes(department) : false;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Navigation Manager</h1>
            <p className="text-muted-foreground mt-1">
              Configure which menu items are visible to each role and department
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowDebugPanel(!showDebugPanel)}
          >
            <Info className="w-4 h-4 mr-2" />
            {showDebugPanel ? 'Hide' : 'Show'} Debug Panel
          </Button>
        </div>

        {showDebugPanel && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="w-5 h-5" />
                Navigation Troubleshooting
              </CardTitle>
              <CardDescription>
                Current user context and navigation visibility analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Your Role</Label>
                  <p className="text-sm mt-1">{role || 'Not assigned'}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Your Department</Label>
                  <p className="text-sm mt-1">{department || 'Not assigned'}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-semibold mb-2 block">Navigation Visibility Analysis</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {navItems?.map((item) => {
                    const visible = canUserSeeItem(item);
                    return (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded border bg-background">
                        <div className="flex items-center gap-2">
                          {visible ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={visible ? "default" : "secondary"} className="text-xs">
                            {visible ? 'Visible' : 'Hidden'}
                          </Badge>
                          {!visible && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="w-4 h-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs max-w-xs">
                                  {!item.allowed_roles.includes(role || '') 
                                    ? `Your role "${role}" is not in allowed roles: ${item.allowed_roles.join(', ')}`
                                    : `Your department "${department}" is not in allowed departments: ${item.allowed_departments.join(', ')}`
                                  }
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Note:</strong> Empty "Allowed Departments" means the item is visible to all departments (role-only filtering).
                  If you can't see an item in the sidebar, check both role and department access above.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Navigation Items</CardTitle>
            <CardDescription>
              Manage navigation menu items. Empty departments array = visible to all departments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Roles
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-xs">User must have one of these roles</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Departments
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-xs">
                            Empty = all departments. Otherwise must match one.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Your Access</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {navItems?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.order_index}
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-mono text-sm">{item.path}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.allowed_roles.slice(0, 3).map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                        {item.allowed_roles.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.allowed_roles.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.allowed_departments.length === 0 ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">All Depts</Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Visible to all departments</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {item.allowed_departments.slice(0, 2).map((dept) => (
                            <Badge key={dept} variant="secondary" className="text-xs">
                              {dept}
                            </Badge>
                          ))}
                          {item.allowed_departments.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.allowed_departments.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: item.id,
                            is_active: !item.is_active,
                          })
                        }
                      >
                        {item.is_active ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger>
                          {canUserSeeItem(item) ? (
                            <Badge variant="default" className="text-xs">
                              <Eye className="w-3 h-3 mr-1" />
                              Visible
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <EyeOff className="w-3 h-3 mr-1" />
                              Hidden
                            </Badge>
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {canUserSeeItem(item) 
                              ? 'You can see this in your sidebar' 
                              : 'Hidden from your role/department'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this navigation item?')) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Navigation Item</DialogTitle>
              <DialogDescription>
                Configure which roles and departments can see this menu item
              </DialogDescription>
            </DialogHeader>

            {editingItem && (
              <div className="space-y-4 py-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={editingItem.name}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, name: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="path">Path</Label>
                    <Input
                      id="path"
                      value={editingItem.path}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, path: e.target.value })
                      }
                      placeholder="/dashboard/..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="icon">Icon (Lucide)</Label>
                    <Input
                      id="icon"
                      value={editingItem.icon}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, icon: e.target.value })
                      }
                      placeholder="Home"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editingItem.description || ''}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, description: e.target.value })
                      }
                      placeholder="Brief description of this menu item"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="order">Order Index</Label>
                    <Input
                      id="order"
                      type="number"
                      value={editingItem.order_index}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          order_index: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Allowed Roles</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {ALL_ROLES.map((role) => (
                        <div key={role} className="flex items-center space-x-2">
                          <Checkbox
                            id={`role-${role}`}
                            checked={editingItem.allowed_roles.includes(role)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditingItem({
                                  ...editingItem,
                                  allowed_roles: [...editingItem.allowed_roles, role],
                                });
                              } else {
                                setEditingItem({
                                  ...editingItem,
                                  allowed_roles: editingItem.allowed_roles.filter(
                                    (r) => r !== role
                                  ),
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor={`role-${role}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {role}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Allowed Departments</Label>
                    <p className="text-xs text-muted-foreground">
                      Leave all unchecked for "All Departments"
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_DEPARTMENTS.map((dept) => (
                        <div key={dept} className="flex items-center space-x-2">
                          <Checkbox
                            id={`dept-${dept}`}
                            checked={editingItem.allowed_departments.includes(dept)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditingItem({
                                  ...editingItem,
                                  allowed_departments: [
                                    ...editingItem.allowed_departments,
                                    dept,
                                  ],
                                });
                              } else {
                                setEditingItem({
                                  ...editingItem,
                                  allowed_departments:
                                    editingItem.allowed_departments.filter(
                                      (d) => d !== dept
                                    ),
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor={`dept-${dept}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {dept}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingItem(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save Changes</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
