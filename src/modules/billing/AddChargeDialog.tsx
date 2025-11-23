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
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  
  // Billing reference validation
  const [billingReference, setBillingReference] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validatedRequest, setValidatedRequest] = useState<any>(null);
  const [validationError, setValidationError] = useState('');

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

  const validateReference = async () => {
    if (!billingReference.trim()) return;
    
    setIsValidating(true);
    setValidationError('');
    
    try {
      const { data, error } = await supabase
        .rpc('validate_billing_reference' as any, {
          p_tenant_id: tenantId,
          p_reference_code: billingReference.trim()
        }) as any;
        
      if (error) throw error;
      
      const result = data?.[0] as {
        valid: boolean;
        request_id?: string;
        request_type?: string;
        department?: string;
        guest_name?: string;
        room_number?: string;
        total_amount?: number;
        description?: string;
        error_message?: string;
      };
      
      if (result?.valid) {
        setValidatedRequest(result);
        // Auto-populate fields
        setAmount(result.total_amount?.toString() || '');
        setDescription(result.description || '');
        setDepartment(result.department || '');
        toast.success(`✓ Valid billing task - ${result.guest_name || 'Guest'}`);
      } else {
        setValidationError(result?.error_message || 'Invalid reference');
        setValidatedRequest(null);
      }
    } catch (err: any) {
      setValidationError('Failed to validate reference');
      toast.error('Validation failed', { description: err.message });
    } finally {
      setIsValidating(false);
    }
  };

  const addChargeMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');

      // Extract UUID string if object was somehow passed
      const folioUuid = typeof folioId === 'string' ? folioId : (folioId as any)?.id || '';
      
      console.log('[AddChargeDialog] BILLING-REF-V2: Posting charge', {
        folioIdType: typeof folioId,
        folioUuid,
        amount: parseFloat(amount),
        billingReference: validatedRequest?.request_id,
      });

      const { data, error } = await supabase.rpc('folio_post_charge', {
        p_folio_id: folioUuid,
        p_amount: parseFloat(amount),
        p_description: description,
        p_department: department || null,
        p_reference_type: validatedRequest ? 'billing_reference' : null,
        p_reference_id: validatedRequest?.request_id || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result?.success) throw new Error(result?.error || 'Failed to add charge');

      // Update request billing status if reference was used
      if (validatedRequest) {
        await supabase
          .from('requests')
          .update({
            billing_status: 'posted_to_folio',
            billing_processed_by: user?.id || null,
            billing_processed_at: new Date().toISOString()
          })
          .eq('id', validatedRequest.request_id)
          .eq('tenant_id', tenantId);
      }

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
      setBillingReference('');
      setValidatedRequest(null);
      setValidationError('');
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

            {/* Billing Reference Section */}
            <div className="border-t pt-4 mt-2">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="billing-reference">
                  Billing Reference (Optional)
                </Label>
                <span className="text-xs text-muted-foreground">
                  Link to QR billing task
                </span>
              </div>
              
              <div className="flex gap-2">
                <Input
                  id="billing-reference"
                  placeholder="e.g., QR-84550D"
                  value={billingReference}
                  onChange={(e) => {
                    setBillingReference(e.target.value.toUpperCase());
                    setValidatedRequest(null);
                    setValidationError('');
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={validateReference}
                  disabled={!billingReference.trim() || isValidating}
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Validate'
                  )}
                </Button>
              </div>
              
              {/* Validation Success Alert */}
              {validatedRequest && (
                <Alert className="mt-2 border-green-500 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <strong>✓ Valid QR Billing Task</strong>
                    <div className="text-sm mt-1">
                      {validatedRequest.request_type} - {validatedRequest.guest_name}
                      {validatedRequest.room_number && ` (Room ${validatedRequest.room_number})`}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Amount: ₦{validatedRequest.total_amount?.toLocaleString()}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Validation Error Alert */}
              {validationError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}
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
