import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFolioById } from '@/hooks/useFolioById';
import { useOrgCreditCheck } from '@/hooks/useOrgCreditCheck';
import { normalizeFolioId } from '@/lib/folio/normalizeFolioId';
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
import { Loader2, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';

interface FrontDeskAddChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  folioId: string | { id: string };
  defaultDescription?: string;
  billingReference?: string | null;
  requestId?: string | null;
  origin: 'billing_center' | 'frontdesk_drawer' | 'room_drawer';
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

export function FrontDeskAddChargeModal({
  isOpen,
  onClose,
  folioId,
  defaultDescription = '',
  billingReference: propBillingRef = null,
  requestId: propRequestId = null,
  origin,
}: FrontDeskAddChargeModalProps) {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState(defaultDescription);
  const [department, setDepartment] = useState('');
  
  // Billing reference validation
  const [billingReference, setBillingReference] = useState(propBillingRef || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validatedRequest, setValidatedRequest] = useState<any>(null);
  const [validationError, setValidationError] = useState('');

  // Normalize folio ID
  const normalizedFolioId = normalizeFolioId(folioId);

  // Fetch folio to get organization info
  const { data: folio } = useFolioById(normalizedFolioId);
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

  // Auto-validate if billing reference passed as prop
  useEffect(() => {
    if (propBillingRef && isOpen) {
      setBillingReference(propBillingRef);
      validateReference(propBillingRef);
    }
  }, [propBillingRef, isOpen]);

  const validateReference = async (refCode?: string) => {
    const codeToValidate = refCode || billingReference;
    if (!codeToValidate.trim()) return;
    
    setIsValidating(true);
    setValidationError('');
    
    try {
      const { data, error } = await supabase
        .rpc('validate_billing_reference' as any, {
          p_tenant_id: tenantId,
          p_reference_code: codeToValidate.trim()
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

      // Build payload with defensive template-literal pattern
      const payload = {
        p_folio_id: `${normalizedFolioId}`, // Template literal defensive pattern
        p_amount: parseFloat(amount),
        p_description: description,
        p_department: department || null,
        p_reference_type: validatedRequest ? 'qr_request' : (propRequestId ? 'qr_request' : null),
        p_reference_id: validatedRequest?.request_id || propRequestId || null,
      };

      console.log('[FrontDeskAddChargeModal] UNIFIED-V2-DEFENSIVE: RPC Payload', {
        payload,
        types: {
          p_folio_id: typeof payload.p_folio_id,
          p_amount: typeof payload.p_amount,
          p_description: typeof payload.p_description,
          p_department: typeof payload.p_department,
          p_reference_type: typeof payload.p_reference_type,
          p_reference_id: typeof payload.p_reference_id,
        },
        origin,
      });

      const { data, error } = await supabase.rpc('folio_post_charge', payload);

      if (error) {
        console.error('[FrontDeskAddChargeModal] ❌ FOLIO-POST-CHARGE-ERROR', {
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint,
          code: (error as any).code,
          payload,
        });
        throw error;
      }
      
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
      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['folio', normalizedFolioId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['folio-transactions', normalizedFolioId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['billing-center'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['qr-billing-tasks', tenantId] });
      
      toast.success('Charge added successfully');
      
      // Broadcast realtime event
      window.postMessage({
        type: 'BILLING_COMPLETED',
        payload: {
          event: 'billing_completed',
          request_id: validatedRequest?.request_id || propRequestId,
          folio_id: normalizedFolioId,
          amount: parseFloat(amount),
          timestamp: new Date().toISOString()
        }
      }, '*');
      
      // Broadcast folio update for cross-tab sync
      window.postMessage({ 
        type: 'FOLIO_UPDATED', 
        folioId: normalizedFolioId
      }, '*');
      
      onClose();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" aria-describedby="add-charge-description">
        <DialogHeader>
          <DialogTitle>Add Charge to Folio</DialogTitle>
          <DialogDescription id="add-charge-description">
            Post a charge to the guest's folio with automatic wallet routing
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
                disabled={!!validatedRequest}
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
                disabled={!!validatedRequest}
                required
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department">Department (Optional)</Label>
              <Select value={department} onValueChange={setDepartment} disabled={!!validatedRequest}>
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

            {/* Auto-Wallet Selection Info */}
            <div className="space-y-2">
              <Label>Destination Wallet</Label>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Auto-selected (read-only)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Wallet automatically determined by payment type and guest billing
              </p>
            </div>

            {/* Billing Reference Section (only show if not passed as prop) */}
            {!propBillingRef && (
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
                    onClick={() => validateReference()}
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
            )}
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
              onClick={onClose}
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
