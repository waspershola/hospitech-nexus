import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { NavigationItem } from '@/hooks/usePlatformNavigation';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface NavigationItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<NavigationItem>) => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  initialData?: NavigationItem;
}

export function NavigationItemForm({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  mode,
  initialData,
}: NavigationItemFormProps) {
  const [label, setLabel] = useState(initialData?.label || '');
  const [path, setPath] = useState(initialData?.path || '');
  const [icon, setIcon] = useState(initialData?.icon || '');
  const [orderIndex, setOrderIndex] = useState(initialData?.order_index?.toString() || '999');
  const [isActive, setIsActive] = useState(initialData?.is_active !== false);
  const [roleInput, setRoleInput] = useState('');
  const [allowedRoles, setAllowedRoles] = useState<string[]>(initialData?.allowed_roles || []);

  const handleAddRole = () => {
    if (roleInput && !allowedRoles.includes(roleInput)) {
      setAllowedRoles([...allowedRoles, roleInput]);
      setRoleInput('');
    }
  };

  const handleRemoveRole = (role: string) => {
    setAllowedRoles(allowedRoles.filter(r => r !== role));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      ...(mode === 'edit' && initialData?.id ? { id: initialData.id } : {}),
      label,
      path,
      icon: icon || undefined,
      order_index: parseInt(orderIndex),
      is_active: isActive,
      allowed_roles: allowedRoles,
    });
  };

  const isValid = label && path;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Navigation Item' : 'Edit Navigation Item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Dashboard"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="path">Path</Label>
            <Input
              id="path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="e.g., /dashboard"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Icon (Lucide name)</Label>
            <Input
              id="icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g., LayoutDashboard"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="order_index">Order Index</Label>
            <Input
              id="order_index"
              type="number"
              value={orderIndex}
              onChange={(e) => setOrderIndex(e.target.value)}
              placeholder="999"
            />
          </div>

          <div className="space-y-2">
            <Label>Allowed Roles</Label>
            <div className="flex gap-2">
              <Input
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                placeholder="Enter role (e.g., owner)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRole();
                  }
                }}
              />
              <Button type="button" onClick={handleAddRole} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {allowedRoles.map((role) => (
                <Badge key={role} variant="secondary" className="gap-1">
                  {role}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleRemoveRole(role)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
