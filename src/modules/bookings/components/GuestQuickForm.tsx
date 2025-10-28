import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const guestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  id_number: z.string().optional(),
});

type GuestFormData = z.infer<typeof guestSchema>;

interface GuestQuickFormProps {
  onSuccess: (guestId: string) => void;
}

export function GuestQuickForm({ onSuccess }: GuestQuickFormProps) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: GuestFormData) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data: guest, error } = await supabase
        .from('guests')
        .insert([{
          tenant_id: tenantId,
          name: data.name,
          email: data.email || null,
          phone: data.phone,
          id_number: data.id_number || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return guest;
    },
    onSuccess: (guest) => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      toast.success('Guest added successfully');
      onSuccess(guest.id);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add guest: ${error.message}`);
    },
  });

  const onSubmit = (data: GuestFormData) => {
    createMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="John Doe"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="john@example.com"
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone *</Label>
        <Input
          id="phone"
          {...register('phone')}
          placeholder="+234 xxx xxx xxxx"
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="id_number">ID Number</Label>
        <Input
          id="id_number"
          {...register('id_number')}
          placeholder="ID or passport number"
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Adding Guest...
          </>
        ) : (
          'Add Guest'
        )}
      </Button>
    </form>
  );
}
