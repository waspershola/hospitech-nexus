import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useOrganizations } from '@/hooks/useOrganizations';

const orgSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  contact_person: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  credit_limit: z.number().min(0),
  allow_negative_balance: z.boolean(),
  active: z.boolean(),
});

type OrgForm = z.infer<typeof orgSchema>;

interface OrganizationDrawerProps {
  open: boolean;
  onClose: () => void;
  organizationId: string | null;
}

export function OrganizationDrawer({ open, onClose, organizationId }: OrganizationDrawerProps) {
  const { organizations, createOrganization } = useOrganizations();
  const isEditing = !!organizationId;
  const organization = organizations.find((o) => o.id === organizationId);

  const form = useForm<OrgForm>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: '',
      contact_person: '',
      contact_email: '',
      credit_limit: 0,
      allow_negative_balance: false,
      active: true,
    },
  });

  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name,
        contact_person: organization.contact_person || '',
        contact_email: organization.contact_email || '',
        credit_limit: Number(organization.credit_limit),
        allow_negative_balance: organization.allow_negative_balance,
        active: organization.active,
      });
    } else {
      form.reset({
        name: '',
        contact_person: '',
        contact_email: '',
        credit_limit: 0,
        allow_negative_balance: false,
        active: true,
      });
    }
  }, [organization, form]);

  const onSubmit = (data: OrgForm) => {
    createOrganization({
      name: data.name,
      contact_person: data.contact_person || null,
      contact_email: data.contact_email || null,
      wallet_id: null,
      credit_limit: data.credit_limit,
      allow_negative_balance: data.allow_negative_balance,
      active: data.active,
    });
    onClose();
    form.reset();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Organization' : 'Add Organization'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Update organization details' : 'Create a new corporate client'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Acme Corporation"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_person">Contact Person</Label>
            <Input
              id="contact_person"
              {...form.register('contact_person')}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              {...form.register('contact_email')}
              placeholder="contact@acme.com"
            />
            {form.formState.errors.contact_email && (
              <p className="text-sm text-destructive">{form.formState.errors.contact_email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="credit_limit">Credit Limit (₦)</Label>
            <Input
              id="credit_limit"
              type="number"
              {...form.register('credit_limit', { valueAsNumber: true })}
              placeholder="0"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Negative Balance</Label>
              <p className="text-sm text-muted-foreground">
                Allow wallet to go into negative
              </p>
            </div>
            <Switch
              checked={form.watch('allow_negative_balance')}
              onCheckedChange={(checked) => form.setValue('allow_negative_balance', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">
                Enable bookings for this organization
              </p>
            </div>
            <Switch
              checked={form.watch('active')}
              onCheckedChange={(checked) => form.setValue('active', checked)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
