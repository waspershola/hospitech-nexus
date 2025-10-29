import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const walletSchema = z.object({
  name: z.string().optional(),
  wallet_type: z.enum(['guest', 'department', 'organization']),
  department: z.string().optional(),
  currency: z.string().default('NGN'),
  initial_balance: z.number().default(0),
});

type WalletForm = z.infer<typeof walletSchema>;

interface CreateWalletDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateWalletDialog({ open, onClose }: CreateWalletDialogProps) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<WalletForm>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      currency: 'NGN',
      initial_balance: 0,
    },
  });

  const walletType = watch('wallet_type');

  const createMutation = useMutation({
    mutationFn: async (data: WalletForm) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data: wallet, error } = await supabase
        .from('wallets')
        .insert([{
          tenant_id: tenantId,
          name: data.name,
          wallet_type: data.wallet_type,
          department: data.department,
          currency: data.currency,
          balance: data.initial_balance,
        }])
        .select()
        .single();

      if (error) throw error;
      return wallet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets', tenantId] });
      toast.success('Wallet created successfully');
      reset();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create wallet: ${error.message}`);
    },
  });

  const onSubmit = (data: WalletForm) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Wallet</DialogTitle>
          <DialogDescription>
            Create a new wallet for guests, departments, or organizations
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wallet_type">Wallet Type *</Label>
            <Select
              value={walletType}
              onValueChange={(value: any) => setValue('wallet_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select wallet type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="guest">Guest Wallet</SelectItem>
                <SelectItem value="department">Department Wallet</SelectItem>
                <SelectItem value="organization">Organization Wallet</SelectItem>
              </SelectContent>
            </Select>
            {errors.wallet_type && (
              <p className="text-sm text-destructive">{errors.wallet_type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Wallet Name</Label>
            <Input
              id="name"
              placeholder={`e.g., ${walletType === 'guest' ? 'John Doe' : walletType === 'department' ? 'Front Desk' : 'ABC Corp'}`}
              {...register('name')}
            />
          </div>

          {walletType === 'department' && (
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                placeholder="e.g., Front Desk, Bar, Restaurant"
                {...register('department')}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={watch('currency')}
                onValueChange={(value) => setValue('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NGN">NGN (₦)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="initial_balance">Initial Balance</Label>
              <Input
                id="initial_balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('initial_balance', { valueAsNumber: true })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Wallet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
