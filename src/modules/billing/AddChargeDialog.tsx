import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFolioById } from '@/hooks/useFolioById';
import { useOrgCreditCheck } from '@/hooks/useOrgCreditCheck';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AddChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folioId: string;
}

const CHARGE_DEPARTMENTS = [
  { value: 'room', label: 'Room Charges' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar' },
  { value: 'spa', label: 'Spa' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'minibar', label: 'Minibar' },
  { value: 'telephone', label: 'Telephone' },
  { value: 'other', label: 'Other Services' },
];

export function AddChargeDialog({ open, onOpenChange, folioId }: AddChargeDialogProps) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');

  // Fetch folio to get organization info
  const { data: folio } = useFolioById(folioId);
  const organizationId = folio?.booking?.organization_id;
  const guestId = folio?.guest_id;

  // Check organization credit limits
  const { data: creditCheck } = useOrgCreditCheck({
    organizationId: organizationId || null,
    guestId: guestId || null,
    department: department || null,
    amount: parseFloat(amount) || 0,
    enabled: !!organizationId && !!amount && parseFloat(amount) > 0,
  });

  const addChargeMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase.rpc('folio_post_charge', {
        p_folio_id: folioId,
        p_amount: parseFloat(amount),
        p_description: description,
        p_department: department || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result?.success) throw new Error(result?.error || 'Failed to add charge');

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folio-by-id', folioId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['folio-transactions', folioId, tenantId] });
      toast.success('Charge added successfully');
      
      // Broadcast folio update for cross-tab sync
      window.postMessage({ 
        type: 'FOLIO_UPDATED', 
        folioId 
      }, '*');
      
      onOpenChange(false);
      setAmount('');
      setDescription('');
      setDepartment('');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add charge: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    
    addChargeMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Charge to Folio</DialogTitle>
          <DialogDescription>
            Post a new charge to this guest's folio
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (₦)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="e.g., Mini bar consumption, Extra towels..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department">Department (Optional)</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {CHARGE_DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Organization Credit Status */}
          {creditCheck && organizationId && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 mb-4">
              <div className="text-sm font-medium">Organization Credit Status</div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Remaining:</span>
                  <span className="font-medium">
                    ₦{creditCheck.total_credit_remaining.toLocaleString()} / ₦{creditCheck.total_credit_limit.toLocaleString()}
                  </span>
                </div>
                
                {creditCheck.guest_limit && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Guest {creditCheck.guest_period} Remaining:</span>
                    <span className="font-medium">
                      ₦{(creditCheck.guest_remaining || 0).toLocaleString()}
                    </span>
                  </div>
                )}
                
                {creditCheck.department_limit && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department {creditCheck.department_period} Remaining:</span>
                    <span className="font-medium">
                      ₦{(creditCheck.department_remaining || 0).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              
              {creditCheck.will_exceed ? (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This charge will exceed organization credit limits
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Sufficient credit available</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addChargeMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addChargeMutation.isPending}>
              {addChargeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Charge
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
