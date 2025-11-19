# Phase 2 Billing Center - Comprehensive Fix Plan
**Version**: PHASE-2-COMPLETION-PLAN-V1  
**Date**: 2025-01-19  
**Status**: Ready for Approval & Implementation

---

## Overview

**Goal**: Complete all 9 Phase 2 subphases to transition Billing Center from 85% to 100%

**Current Status**: 7/9 subphases complete (85%)  
**Missing**: 2 UI components + 3 backend RPCs  
**Total Effort**: ~8 hours critical path, 11 hours total

---

## Implementation Order (Priority-Based)

### 🔴 CRITICAL PATH (8 hours) - Required for Phase 2 Functionality

1. **Phase 2H: Folio Type Badge Component** (1.5 hours)
2. **Backend RPC: Transfer Charge** (2 hours)
3. **Backend RPC: Split Charge** (2.5 hours)
4. **Backend RPC: Merge Folios** (2 hours)

### 🟡 POLISH (1 hour) - UX Enhancement

5. **Phase 2G: Real-Time Sync Indicator** (1 hour)

---

## Step-by-Step Implementation Plan

---

## STEP 1: Phase 2H - Folio Type Badge Component

**Estimated Time**: 1.5 hours  
**Priority**: HIGH (visual clarity for multi-folio system)

### 1.1 Create FolioTypeBadge Component

**File**: `src/components/folio/FolioTypeBadge.tsx`

```typescript
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  BedDouble, Plus, Building, Users, Wine, 
  Sparkles, Utensils, FileText 
} from 'lucide-react';

interface FolioTypeBadgeProps {
  folioType: string;
  isPrimary?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const FOLIO_TYPE_CONFIG = {
  room: { 
    label: 'Room Charges', 
    icon: BedDouble, 
    variant: 'default' as const,
    description: 'Room and accommodation charges'
  },
  incidentals: { 
    label: 'Incidentals', 
    icon: Plus, 
    variant: 'secondary' as const,
    description: 'Miscellaneous charges'
  },
  corporate: { 
    label: 'Corporate', 
    icon: Building, 
    variant: 'default' as const,
    description: 'Company-paid expenses'
  },
  group: { 
    label: 'Group', 
    icon: Users, 
    variant: 'secondary' as const,
    description: 'Group booking charges'
  },
  mini_bar: { 
    label: 'Mini Bar', 
    icon: Wine, 
    variant: 'default' as const,
    description: 'Mini bar consumption'
  },
  spa: { 
    label: 'Spa', 
    icon: Sparkles, 
    variant: 'secondary' as const,
    description: 'Spa and wellness services'
  },
  restaurant: { 
    label: 'Restaurant', 
    icon: Utensils, 
    variant: 'default' as const,
    description: 'Dining charges'
  },
};

export function FolioTypeBadge({ 
  folioType, 
  isPrimary = false, 
  size = 'md', 
  showIcon = true,
  className
}: FolioTypeBadgeProps) {
  const config = FOLIO_TYPE_CONFIG[folioType as keyof typeof FOLIO_TYPE_CONFIG] || {
    label: folioType.replace('_', ' ').toUpperCase(),
    icon: FileText,
    variant: 'outline' as const,
    description: 'Custom folio type'
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <Badge 
      variant={isPrimary ? 'default' : config.variant}
      className={cn(
        'flex items-center gap-1.5 font-medium',
        sizeClasses[size],
        isPrimary && 'ring-2 ring-primary ring-offset-1',
        className
      )}
      title={`${config.description}${isPrimary ? ' (Primary Folio)' : ''}`}
    >
      {showIcon && <Icon className={cn(
        size === 'sm' && 'w-3 h-3',
        size === 'md' && 'w-4 h-4',
        size === 'lg' && 'w-5 h-5'
      )} />}
      {config.label}
      {isPrimary && <span className="text-xs opacity-75">(Primary)</span>}
    </Badge>
  );
}
```

### 1.2 Update BillingCenter.tsx

**Replace lines 197-201**:

```tsx
// OLD (line 197-201):
{folio && (
  <Badge variant="outline" className="text-sm">
    {folio.folio_type.replace('_', ' ').toUpperCase()}
  </Badge>
)}

// NEW:
{folio && (
  <FolioTypeBadge 
    folioType={folio.folio_type} 
    isPrimary={folio.is_primary}
    size="lg"
    showIcon={true}
  />
)}
```

**Add import** (line 16):
```tsx
import { FolioTypeBadge } from '@/components/folio/FolioTypeBadge';
```

### 1.3 Testing Checklist
- [ ] Badge displays correct folio type label
- [ ] Icon appears for each type
- [ ] Primary folios show ring indicator
- [ ] Tooltip shows folio description on hover
- [ ] Size variants work correctly

**Version Marker**: `FOLIO-TYPE-BADGE-V2H`

---

## STEP 2: Backend RPC - Transfer Charge

**Estimated Time**: 2 hours  
**Priority**: HIGH (core multi-folio functionality)

### 2.1 Create Database Function

**Migration SQL**:
```sql
-- Create function to transfer charge between folios
-- Version: FOLIO-TRANSFER-V1
CREATE OR REPLACE FUNCTION public.folio_transfer_charge(
  p_transaction_id UUID,
  p_source_folio_id UUID,
  p_target_folio_id UUID,
  p_amount NUMERIC,
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_folio stay_folios;
  v_target_folio stay_folios;
  v_transaction folio_transactions;
  v_new_txn_id UUID;
  v_reverse_txn_id UUID;
BEGIN
  -- Lock both folios
  SELECT * INTO v_source_folio
  FROM stay_folios
  WHERE id = p_source_folio_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  
  SELECT * INTO v_target_folio
  FROM stay_folios
  WHERE id = p_target_folio_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Folio not found');
  END IF;
  
  IF v_source_folio.status != 'open' OR v_target_folio.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Both folios must be open');
  END IF;
  
  -- Get original transaction
  SELECT * INTO v_transaction
  FROM folio_transactions
  WHERE id = p_transaction_id AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  IF v_transaction.folio_id != p_source_folio_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction does not belong to source folio');
  END IF;
  
  -- Create reversal transaction in source folio
  INSERT INTO folio_transactions (
    tenant_id, folio_id, transaction_type, amount, description,
    reference_type, reference_id, department, created_by, metadata
  ) VALUES (
    p_tenant_id,
    p_source_folio_id,
    CASE 
      WHEN v_transaction.transaction_type = 'charge' THEN 'adjustment_decrease'
      ELSE 'adjustment_increase'
    END,
    p_amount,
    'Transfer OUT: ' || v_transaction.description,
    'transfer',
    p_transaction_id,
    v_transaction.department,
    auth.uid(),
    jsonb_build_object(
      'transfer_type', 'source_reversal',
      'target_folio_id', p_target_folio_id,
      'original_transaction_id', p_transaction_id
    )
  ) RETURNING id INTO v_reverse_txn_id;
  
  -- Create new transaction in target folio
  INSERT INTO folio_transactions (
    tenant_id, folio_id, transaction_type, amount, description,
    reference_type, reference_id, department, created_by, metadata
  ) VALUES (
    p_tenant_id,
    p_target_folio_id,
    v_transaction.transaction_type,
    p_amount,
    'Transfer IN: ' || v_transaction.description,
    'transfer',
    p_transaction_id,
    v_transaction.department,
    auth.uid(),
    jsonb_build_object(
      'transfer_type', 'target_addition',
      'source_folio_id', p_source_folio_id,
      'original_transaction_id', p_transaction_id,
      'reversal_transaction_id', v_reverse_txn_id
    )
  ) RETURNING id INTO v_new_txn_id;
  
  -- Update source folio balances
  IF v_transaction.transaction_type IN ('charge', 'adjustment_increase') THEN
    UPDATE stay_folios
    SET 
      total_charges = total_charges - p_amount,
      balance = balance - p_amount,
      updated_at = now()
    WHERE id = p_source_folio_id;
  ELSE -- payment or adjustment_decrease
    UPDATE stay_folios
    SET 
      total_payments = total_payments - p_amount,
      balance = balance + p_amount,
      updated_at = now()
    WHERE id = p_source_folio_id;
  END IF;
  
  -- Update target folio balances
  IF v_transaction.transaction_type IN ('charge', 'adjustment_increase') THEN
    UPDATE stay_folios
    SET 
      total_charges = total_charges + p_amount,
      balance = balance + p_amount,
      updated_at = now()
    WHERE id = p_target_folio_id;
  ELSE -- payment or adjustment_decrease
    UPDATE stay_folios
    SET 
      total_payments = total_payments + p_amount,
      balance = balance - p_amount,
      updated_at = now()
    WHERE id = p_target_folio_id;
  END IF;
  
  -- Log audit event
  INSERT INTO finance_audit_events (
    tenant_id, event_type, user_id, target_id, payload
  ) VALUES (
    p_tenant_id,
    'charge_transferred',
    auth.uid(),
    p_transaction_id,
    jsonb_build_object(
      'source_folio_id', p_source_folio_id,
      'target_folio_id', p_target_folio_id,
      'amount', p_amount,
      'reversal_txn_id', v_reverse_txn_id,
      'new_txn_id', v_new_txn_id
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'reversal_transaction_id', v_reverse_txn_id,
    'new_transaction_id', v_new_txn_id,
    'source_folio_id', p_source_folio_id,
    'target_folio_id', p_target_folio_id,
    'amount', p_amount
  );
END;
$$;
```

### 2.2 Update useMultiFolios Hook

**Replace lines 116-139** in `src/hooks/useMultiFolios.ts`:

```typescript
const transferCharge = useMutation({
  mutationFn: async ({
    transactionId,
    targetFolioId,
    amount,
  }: {
    transactionId: string;
    targetFolioId: string;
    amount: number;
  }) => {
    if (!tenantId || !bookingId) throw new Error('No tenant or booking ID');
    
    // Get current folio ID from the transaction
    const { data: txn } = await supabase
      .from('folio_transactions')
      .select('folio_id')
      .eq('id', transactionId)
      .single();
    
    if (!txn) throw new Error('Transaction not found');
    
    const { data, error } = await supabase.rpc('folio_transfer_charge', {
      p_transaction_id: transactionId,
      p_source_folio_id: txn.folio_id,
      p_target_folio_id: targetFolioId,
      p_amount: amount,
      p_tenant_id: tenantId,
    });
    
    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Transfer failed');
    
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['multi-folios', bookingId, tenantId] });
    queryClient.invalidateQueries({ queryKey: ['folio-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['folio-ledger'] });
    toast.success('Charge transferred successfully');
  },
  onError: (error: Error) => {
    toast.error(`Failed to transfer charge: ${error.message}`);
  },
});
```

### 2.3 Testing Checklist
- [ ] Transfer ₦500 from Room folio to Incidentals folio
- [ ] Verify reversal transaction created in source folio
- [ ] Verify new transaction created in target folio
- [ ] Verify source folio balance decreased by ₦500
- [ ] Verify target folio balance increased by ₦500
- [ ] Verify audit event logged in finance_audit_events
- [ ] Verify real-time updates in both folios

**Version Marker**: `FOLIO-TRANSFER-V1`

---

## STEP 2: Backend RPC - Split Charge

**Estimated Time**: 2.5 hours  
**Priority**: HIGH (advanced multi-folio workflow)

### 2.1 Create Database Function

**Migration SQL**:
```sql
-- Create function to split charge across multiple folios
-- Version: FOLIO-SPLIT-V1
CREATE OR REPLACE FUNCTION public.folio_split_charge(
  p_transaction_id UUID,
  p_source_folio_id UUID,
  p_splits JSONB, -- [{"target_folio_id": "uuid", "amount": 100.00}, ...]
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_folio stay_folios;
  v_transaction folio_transactions;
  v_split JSONB;
  v_split_target UUID;
  v_split_amount NUMERIC;
  v_total_split NUMERIC := 0;
  v_new_txn_ids UUID[] := ARRAY[]::UUID[];
  v_new_txn_id UUID;
BEGIN
  -- Lock source folio
  SELECT * INTO v_source_folio
  FROM stay_folios
  WHERE id = p_source_folio_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source folio not found');
  END IF;
  
  IF v_source_folio.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source folio must be open');
  END IF;
  
  -- Get original transaction
  SELECT * INTO v_transaction
  FROM folio_transactions
  WHERE id = p_transaction_id AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  -- Validate splits total equals original amount
  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits)
  LOOP
    v_total_split := v_total_split + (v_split->>'amount')::NUMERIC;
  END LOOP;
  
  IF ABS(v_total_split - v_transaction.amount) > 0.01 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Split amounts must total transaction amount',
      'expected', v_transaction.amount,
      'received', v_total_split
    );
  END IF;
  
  -- Create reversal transaction in source folio
  INSERT INTO folio_transactions (
    tenant_id, folio_id, transaction_type, amount, description,
    reference_type, reference_id, department, created_by, metadata
  ) VALUES (
    p_tenant_id,
    p_source_folio_id,
    CASE 
      WHEN v_transaction.transaction_type = 'charge' THEN 'adjustment_decrease'
      ELSE 'adjustment_increase'
    END,
    v_transaction.amount,
    'Split OUT: ' || v_transaction.description,
    'split',
    p_transaction_id,
    v_transaction.department,
    auth.uid(),
    jsonb_build_object(
      'split_type', 'source_reversal',
      'original_transaction_id', p_transaction_id,
      'splits', p_splits
    )
  );
  
  -- Update source folio balance (full reversal)
  IF v_transaction.transaction_type IN ('charge', 'adjustment_increase') THEN
    UPDATE stay_folios
    SET 
      total_charges = total_charges - v_transaction.amount,
      balance = balance - v_transaction.amount,
      updated_at = now()
    WHERE id = p_source_folio_id;
  ELSE
    UPDATE stay_folios
    SET 
      total_payments = total_payments - v_transaction.amount,
      balance = balance + v_transaction.amount,
      updated_at = now()
    WHERE id = p_source_folio_id;
  END IF;
  
  -- Create split transactions in target folios
  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits)
  LOOP
    v_split_target := (v_split->>'target_folio_id')::UUID;
    v_split_amount := (v_split->>'amount')::NUMERIC;
    
    -- Lock target folio
    IF NOT EXISTS (
      SELECT 1 FROM stay_folios 
      WHERE id = v_split_target 
        AND tenant_id = p_tenant_id 
        AND status = 'open'
      FOR UPDATE
    ) THEN
      RAISE EXCEPTION 'Target folio % not found or not open', v_split_target;
    END IF;
    
    -- Create transaction in target folio
    INSERT INTO folio_transactions (
      tenant_id, folio_id, transaction_type, amount, description,
      reference_type, reference_id, department, created_by, metadata
    ) VALUES (
      p_tenant_id,
      v_split_target,
      v_transaction.transaction_type,
      v_split_amount,
      'Split IN: ' || v_transaction.description,
      'split',
      p_transaction_id,
      v_transaction.department,
      auth.uid(),
      jsonb_build_object(
        'split_type', 'target_addition',
        'source_folio_id', p_source_folio_id,
        'original_transaction_id', p_transaction_id,
        'split_amount', v_split_amount,
        'original_amount', v_transaction.amount
      )
    ) RETURNING id INTO v_new_txn_id;
    
    v_new_txn_ids := array_append(v_new_txn_ids, v_new_txn_id);
    
    -- Update target folio balance
    IF v_transaction.transaction_type IN ('charge', 'adjustment_increase') THEN
      UPDATE stay_folios
      SET 
        total_charges = total_charges + v_split_amount,
        balance = balance + v_split_amount,
        updated_at = now()
      WHERE id = v_split_target;
    ELSE
      UPDATE stay_folios
      SET 
        total_payments = total_payments + v_split_amount,
        balance = balance - v_split_amount,
        updated_at = now()
      WHERE id = v_split_target;
    END IF;
  END LOOP;
  
  -- Log audit event
  INSERT INTO finance_audit_events (
    tenant_id, event_type, user_id, target_id, payload
  ) VALUES (
    p_tenant_id,
    'charge_split',
    auth.uid(),
    p_transaction_id,
    jsonb_build_object(
      'source_folio_id', p_source_folio_id,
      'splits', p_splits,
      'new_transaction_ids', v_new_txn_ids
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'new_transaction_ids', v_new_txn_ids,
    'splits_created', jsonb_array_length(p_splits)
  );
END;
$$;
```

### 2.2 Update BillingCenter.tsx

**Replace lines 529-532** (current placeholder logic):

```typescript
// OLD:
onConfirm={(splits) => {
  console.log('[BillingCenter] Split charges:', splits);
  // TODO: Implement split via RPC
  setSplitDialogOpen(false);
}}

// NEW:
onConfirm={async (splits) => {
  if (!selectedTransactionId || !folioId) return;
  
  try {
    console.log('[BillingCenter] FOLIO-SPLIT-V1: Splitting transaction', {
      transactionId: selectedTransactionId,
      sourceFolioId: folioId,
      splits
    });
    
    const { data, error } = await supabase.rpc('folio_split_charge', {
      p_transaction_id: selectedTransactionId,
      p_source_folio_id: folioId,
      p_splits: splits,
      p_tenant_id: tenantId,
    });
    
    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Split failed');
    
    queryClient.invalidateQueries({ queryKey: ['folio-transactions', folioId, tenantId] });
    queryClient.invalidateQueries({ queryKey: ['folio-ledger', folioId, tenantId] });
    queryClient.invalidateQueries({ queryKey: ['multi-folios', folio.booking_id, tenantId] });
    
    toast.success(`Charge split into ${splits.length} folios`);
    setSplitDialogOpen(false);
  } catch (err: any) {
    console.error('[BillingCenter] FOLIO-SPLIT-V1: Error', err);
    toast.error(`Failed to split charge: ${err.message}`);
  }
}}
```

### 2.3 Testing Checklist
- [ ] Split ₦1000 charge: ₦600 to Incidentals, ₦400 to Corporate
- [ ] Verify reversal transaction (₦1000) in source folio
- [ ] Verify 2 new transactions created in target folios
- [ ] Verify source folio balance decreased by ₦1000
- [ ] Verify target folios balances increased correctly
- [ ] Verify split amounts validation (must total original amount)
- [ ] Verify audit event logged

**Version Marker**: `FOLIO-SPLIT-V1`

---

## STEP 3: Backend RPC - Merge Folios

**Estimated Time**: 2 hours  
**Priority**: HIGH (multi-folio consolidation)

### 3.1 Create Database Function

**Migration SQL**:
```sql
-- Create function to merge folios (move all transactions from source to target)
-- Version: FOLIO-MERGE-V1
CREATE OR REPLACE FUNCTION public.folio_merge(
  p_source_folio_id UUID,
  p_target_folio_id UUID,
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_folio stay_folios;
  v_target_folio stay_folios;
  v_txn_count INTEGER;
BEGIN
  -- Lock both folios
  SELECT * INTO v_source_folio
  FROM stay_folios
  WHERE id = p_source_folio_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  
  SELECT * INTO v_target_folio
  FROM stay_folios
  WHERE id = p_target_folio_id AND tenant_id = p_tenant_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Folio not found');
  END IF;
  
  IF v_source_folio.status != 'open' OR v_target_folio.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Both folios must be open');
  END IF;
  
  IF v_source_folio.booking_id != v_target_folio.booking_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Folios must belong to same booking');
  END IF;
  
  -- Move all transactions from source to target
  UPDATE folio_transactions
  SET 
    folio_id = p_target_folio_id,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'merged_from_folio', p_source_folio_id,
      'merged_at', now()
    )
  WHERE folio_id = p_source_folio_id 
    AND tenant_id = p_tenant_id;
  
  GET DIAGNOSTICS v_txn_count = ROW_COUNT;
  
  -- Update target folio balances
  UPDATE stay_folios
  SET 
    total_charges = total_charges + v_source_folio.total_charges,
    total_payments = total_payments + v_source_folio.total_payments,
    balance = balance + v_source_folio.balance,
    updated_at = now()
  WHERE id = p_target_folio_id;
  
  -- Close source folio
  UPDATE stay_folios
  SET 
    status = 'closed',
    total_charges = 0,
    total_payments = 0,
    balance = 0,
    updated_at = now(),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'merged_into', p_target_folio_id,
      'merged_at', now(),
      'original_charges', v_source_folio.total_charges,
      'original_payments', v_source_folio.total_payments,
      'original_balance', v_source_folio.balance
    )
  WHERE id = p_source_folio_id;
  
  -- Log audit event
  INSERT INTO finance_audit_events (
    tenant_id, event_type, user_id, target_id, payload
  ) VALUES (
    p_tenant_id,
    'folio_merged',
    auth.uid(),
    p_source_folio_id,
    jsonb_build_object(
      'source_folio_id', p_source_folio_id,
      'source_folio_number', v_source_folio.folio_number,
      'target_folio_id', p_target_folio_id,
      'target_folio_number', v_target_folio.folio_number,
      'transactions_moved', v_txn_count,
      'charges_merged', v_source_folio.total_charges,
      'payments_merged', v_source_folio.total_payments,
      'balance_merged', v_source_folio.balance
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'source_folio_id', p_source_folio_id,
    'target_folio_id', p_target_folio_id,
    'transactions_moved', v_txn_count,
    'source_folio_closed', true
  );
END;
$$;
```

### 3.2 Update BillingCenter.tsx

**Replace lines 537-543** (current placeholder logic):

```typescript
// OLD:
onConfirm={(targetId) => {
  console.log('[BillingCenter] Merge folio to:', targetId);
  // TODO: Implement merge via RPC
  setMergeFolioOpen(false);
}}

// NEW:
onConfirm={async (targetId) => {
  if (!folioId) return;
  
  try {
    console.log('[BillingCenter] FOLIO-MERGE-V1: Merging folio', {
      sourceFolioId: folioId,
      targetFolioId: targetId
    });
    
    const { data, error } = await supabase.rpc('folio_merge', {
      p_source_folio_id: folioId,
      p_target_folio_id: targetId,
      p_tenant_id: tenantId,
    });
    
    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Merge failed');
    
    toast.success(`Folio merged successfully. ${data.transactions_moved} transactions moved.`);
    
    // Navigate to target folio since source is now closed
    navigate(`/dashboard/billing/${targetId}`);
    
    // Invalidate all folio queries
    queryClient.invalidateQueries({ queryKey: ['multi-folios', folio.booking_id, tenantId] });
    queryClient.invalidateQueries({ queryKey: ['folio'] });
    
    setMergeFolioOpen(false);
  } catch (err: any) {
    console.error('[BillingCenter] FOLIO-MERGE-V1: Error', err);
    toast.error(`Failed to merge folio: ${err.message}`);
  }
}}
```

### 3.3 Testing Checklist
- [ ] Create 2 folios: Room (₦10,000 charges) + Incidentals (₦2,000 charges)
- [ ] Merge Incidentals into Room folio
- [ ] Verify all transactions moved to Room folio
- [ ] Verify Room folio totals: ₦12,000 charges
- [ ] Verify Incidentals folio status changed to 'closed'
- [ ] Verify Incidentals folio balance = ₦0
- [ ] Verify navigation to target folio after merge
- [ ] Verify audit event logged

**Version Marker**: `FOLIO-MERGE-V1`

---

## STEP 4: Phase 2G - Real-Time Sync Indicator

**Estimated Time**: 1 hour  
**Priority**: MEDIUM (polish feature)

### 4.1 Create RealTimeSyncIndicator Component

**File**: `src/components/folio/RealTimeSyncIndicator.tsx`

```typescript
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Circle, Wifi, WifiOff } from 'lucide-react';

interface RealTimeSyncIndicatorProps {
  channelStatus: 'connected' | 'syncing' | 'disconnected';
  lastUpdated?: Date;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Real-time sync status indicator
 * Shows connection status and last update time
 * Version: REALTIME-INDICATOR-V2G
 */
export function RealTimeSyncIndicator({ 
  channelStatus, 
  lastUpdated,
  showLabel = false,
  size = 'md'
}: RealTimeSyncIndicatorProps) {
  const [pulsing, setPulsing] = useState(false);
  
  // Trigger pulse animation when lastUpdated changes
  useEffect(() => {
    if (lastUpdated) {
      setPulsing(true);
      const timer = setTimeout(() => setPulsing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [lastUpdated]);
  
  const getStatusConfig = () => {
    switch (channelStatus) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bgColor: 'bg-green-500',
          label: 'Live',
          description: 'Real-time updates active'
        };
      case 'syncing':
        return {
          icon: Circle,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500',
          label: 'Syncing',
          description: 'Updating data...'
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-red-500',
          bgColor: 'bg-red-500',
          label: 'Offline',
          description: 'Reconnecting...'
        };
    }
  };
  
  const config = getStatusConfig();
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "flex items-center gap-1.5",
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'md' && 'text-sm px-2.5 py-1'
      )}
      title={`${config.description}${lastUpdated ? ` - Last updated ${format(lastUpdated, 'p')}` : ''}`}
    >
      <div className="relative">
        <div className={cn(
          "w-2 h-2 rounded-full",
          config.bgColor,
          pulsing && "animate-ping absolute"
        )} />
        <div className={cn(
          "w-2 h-2 rounded-full relative",
          config.bgColor
        )} />
      </div>
      {showLabel && (
        <span className={config.color}>{config.label}</span>
      )}
      {lastUpdated && size === 'md' && (
        <span className="text-xs text-muted-foreground">
          {format(lastUpdated, 'p')}
        </span>
      )}
    </Badge>
  );
}
```

### 4.2 Add Sync Status Tracking to BillingCenter

**Update BillingCenter.tsx**:

```typescript
// Add after line 48:
const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'disconnected'>('disconnected');
const [lastSyncUpdate, setLastSyncUpdate] = useState<Date | undefined>();

// Update real-time subscription (lines 77-121):
useEffect(() => {
  if (!folioId || !tenantId) {
    setSyncStatus('disconnected');
    return;
  }

  console.log('[BillingCenter] HOOKS-REFACTOR-V5: Setting up unified real-time subscription');
  setSyncStatus('connected');

  const channel = supabase
    .channel(`billing-center-${folioId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'folio_transactions',
      filter: `folio_id=eq.${folioId}`
    }, () => {
      console.log('[BillingCenter] HOOKS-REFACTOR-V5: Transaction update');
      setSyncStatus('syncing');
      setLastSyncUpdate(new Date());
      
      // Reset to connected after brief delay
      setTimeout(() => setSyncStatus('connected'), 500);
      
      queryClient.invalidateQueries({ queryKey: ['folio-transactions', folioId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['folio-ledger', folioId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['folio', folioId, tenantId] });
      
      if (folio?.booking_id) {
        queryClient.invalidateQueries({ queryKey: ['multi-folios', folio.booking_id, tenantId] });
      }
    })
    // ... rest of subscriptions
  .subscribe();
  
  // ... rest of cleanup
}, [folioId, tenantId, queryClient, folio?.booking_id]);
```

### 4.3 Add Indicator to Header

**Insert after Folio Type Badge** (after line 201):

```tsx
{folio && (
  <>
    <FolioTypeBadge 
      folioType={folio.folio_type} 
      isPrimary={folio.is_primary}
      size="lg"
      showIcon={true}
    />
    <RealTimeSyncIndicator 
      channelStatus={syncStatus}
      lastUpdated={lastSyncUpdate}
      showLabel={true}
      size="md"
    />
  </>
)}
```

### 4.4 Testing Checklist
- [ ] Indicator shows "Connected" on page load
- [ ] Indicator shows "Syncing" when payment is added in another tab
- [ ] Indicator returns to "Connected" after sync completes
- [ ] Pulsing animation plays on updates
- [ ] Last updated time displays correctly
- [ ] Tooltip shows full status description

**Version Marker**: `REALTIME-INDICATOR-V2G`

---

## Complete SQL Migration Package

### Migration 1: Transfer RPC
```sql
-- File: 20250119_folio_transfer_charge.sql
-- Version: FOLIO-TRANSFER-V1
-- [Full SQL from STEP 2.1 above]
```

### Migration 2: Split RPC
```sql
-- File: 20250119_folio_split_charge.sql
-- Version: FOLIO-SPLIT-V1
-- [Full SQL from STEP 3.1 above]
```

### Migration 3: Merge RPC
```sql
-- File: 20250119_folio_merge.sql
-- Version: FOLIO-MERGE-V1
-- [Full SQL from STEP 4.1 above]
```

---

## File Creation Checklist

### New Files to Create (2 files)
- [ ] `src/components/folio/FolioTypeBadge.tsx` - Folio type badge with icons
- [ ] `src/components/folio/RealTimeSyncIndicator.tsx` - Sync status indicator

### Files to Modify (2 files)
- [ ] `src/hooks/useMultiFolios.ts` - Update transferCharge mutation (remove placeholder)
- [ ] `src/pages/dashboard/BillingCenter.tsx` - Add sync tracking, integrate components

### Database Migrations (3 migrations)
- [ ] `20250119_folio_transfer_charge.sql`
- [ ] `20250119_folio_split_charge.sql`
- [ ] `20250119_folio_merge.sql`

---

## Testing Protocol

### Pre-Test Setup
1. Create test booking with check-in
2. Create 3 folios: Room (primary), Incidentals, Corporate
3. Add charges to each folio:
   - Room: ₦10,000 room charge
   - Incidentals: ₦2,000 minibar
   - Corporate: ₦3,000 conference room
4. Add payment to Room folio: ₦5,000

### Test Sequence

**Test 1: Create Folio** (Phase 2A)
- [ ] Click "Create Folio" button
- [ ] Select "Spa" type
- [ ] Verify new folio appears in Related Folios Panel
- [ ] Verify FolioSwitcher shows Spa tab

**Test 2: Folio Type Badge** (Phase 2H)
- [ ] Verify each folio shows correct badge with icon
- [ ] Verify primary folio has ring indicator
- [ ] Verify tooltip displays on hover

**Test 3: Cross-Folio Summary** (Phase 2F)
- [ ] Verify Grand Total = ₦10,000 (charges ₦15,000 - payments ₦5,000)
- [ ] Verify breakdown shows: Room ₦5,000, Incidentals ₦2,000, Corporate ₦3,000, Spa ₦0

**Test 4: Transfer Charge** (Phase 2D + Backend)
- [ ] Select ₦2,000 minibar charge in Incidentals folio
- [ ] Click "Transfer" row action
- [ ] Select Corporate folio as target
- [ ] Transfer full ₦2,000
- [ ] Verify Incidentals balance = ₦0
- [ ] Verify Corporate balance = ₦5,000 (₦3,000 + ₦2,000)
- [ ] Verify audit event logged

**Test 5: Split Charge** (Phase 2D + Backend)
- [ ] Select ₦10,000 room charge
- [ ] Click "Split" row action
- [ ] Split: ₦6,000 to Room, ₦4,000 to Corporate
- [ ] Verify Room balance = ₦1,000 (₦6,000 - ₦5,000 payment)
- [ ] Verify Corporate balance = ₦9,000 (₦5,000 + ₦4,000)
- [ ] Verify split amounts validation works

**Test 6: Merge Folios** (Phase 2D + Backend)
- [ ] Select Spa folio (₦0 balance)
- [ ] Click "Merge" quick action
- [ ] Select Room folio as target
- [ ] Confirm merge
- [ ] Verify Spa folio status = 'closed'
- [ ] Verify Room folio includes any Spa transactions
- [ ] Verify navigation to target folio

**Test 7: Real-Time Sync** (Phase 2G)
- [ ] Open Billing Center in 2 tabs
- [ ] Add payment in Tab 1
- [ ] Verify Tab 2 shows "Syncing" indicator
- [ ] Verify Tab 2 updates within 1-2 seconds
- [ ] Verify indicator shows "Connected" after update

**Test 8: Row Actions** (Phase 2E)
- [ ] Verify Transfer button appears on charge rows
- [ ] Verify Split button appears on charge rows
- [ ] Verify Reverse button appears (if implemented)
- [ ] Verify buttons are disabled for closed folios

**Test 9: Quick Actions** (Phase 2C)
- [ ] Verify all 5 quick action buttons render
- [ ] Verify Transfer/Merge only show when multiple folios exist
- [ ] Verify Add Payment opens correct dialog
- [ ] Verify Add Charge opens correct dialog

---

## Edge Function Deployment

**No new edge functions required** for Phase 2 completion.

All Phase 2 functionality uses database RPCs directly from frontend via Supabase client.

---

## Success Criteria

Phase 2 is **100% COMPLETE** when:

✅ **All 9 subphases implemented**:
- [x] 2A: Create Folio
- [x] 2B: Related Folios Panel
- [x] 2C: Quick Actions
- [x] 2D: Dialog Integration (with backend RPCs)
- [x] 2E: Row Actions
- [x] 2F: Cross-Folio Summary
- [ ] 2G: Real-Time Sync Indicator
- [ ] 2H: Folio Type Badge
- [x] 2I: Add Payment

✅ **All backend RPCs functional**:
- [ ] folio_transfer_charge
- [ ] folio_split_charge
- [ ] folio_merge

✅ **All tests pass**: See Testing Protocol above

✅ **Version markers in code**:
- `FOLIO-TYPE-BADGE-V2H`
- `FOLIO-TRANSFER-V1`
- `FOLIO-SPLIT-V1`
- `FOLIO-MERGE-V1`
- `REALTIME-INDICATOR-V2G`

---

## Next Phase After Completion

Once Phase 2 is 100% complete, proceed to:

**Phase 3**: Closed Folios Viewer
- Route: `/dashboard/folios/closed`
- Search and filter UI
- Read-only Billing Center for historical folios
- Reopen capability for corrections

---

## Risk Assessment

### Low Risk
- Folio Type Badge (new component, no side effects)
- Real-Time Sync Indicator (pure UI, no data changes)

### Medium Risk
- Transfer RPC (modifies 2 folios atomically)
- Split RPC (modifies multiple folios, complex validation)

### High Risk
- Merge RPC (irreversible, closes source folio, moves all transactions)
  - **Mitigation**: Add confirmation dialog, store original state in metadata, log detailed audit events

---

## Rollback Plan

If Phase 2 implementation fails:

1. **UI Components**: Simply don't import/use new components
2. **Backend RPCs**: Drop functions via migration:
   ```sql
   DROP FUNCTION IF EXISTS folio_transfer_charge;
   DROP FUNCTION IF EXISTS folio_split_charge;
   DROP FUNCTION IF EXISTS folio_merge;
   ```
3. **Revert Hook Changes**: Restore placeholder transferCharge mutation

No data corruption risk - all operations are atomic transactions with rollback on error.

---

## Approval Required

Please review this comprehensive plan and approve to proceed with implementation in the following order:

1. ✅ Phase 2H (Folio Type Badge)
2. ✅ Backend RPC (Transfer)
3. ✅ Backend RPC (Split)
4. ✅ Backend RPC (Merge)
5. ✅ Phase 2G (Sync Indicator)

**Reply "approved" to begin implementation, or request changes to the plan.**
