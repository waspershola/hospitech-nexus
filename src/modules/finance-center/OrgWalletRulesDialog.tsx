import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface WalletRule {
  id: string;
  organization_id: string;
  rule_type: 'per_guest' | 'per_department' | 'total_wallet_cap';
  entity_ref: string | null;
  limit_amount: number;
  period: 'daily' | 'weekly' | 'monthly' | 'none';
  active: boolean;
}

interface OrgWalletRulesDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
}

export function OrgWalletRulesDialog({ 
  open, 
  onClose, 
  organizationId,
  organizationName 
}: OrgWalletRulesDialogProps) {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();
  const [newRule, setNewRule] = useState({
    rule_type: 'per_guest' as const,
    entity_ref: '',
    limit_amount: 0,
    period: 'monthly' as const,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['wallet-rules', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_wallet_rules')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (error) throw error;
      return data as WalletRule[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      const { error } = await supabase
        .from('organization_wallet_rules')
        .insert([{
          tenant_id: tenantId,
          organization_id: organizationId,
          ...newRule,
          created_by: user?.id,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-rules', organizationId] });
      toast.success('Rule created');
      setNewRule({
        rule_type: 'per_guest',
        entity_ref: '',
        limit_amount: 0,
        period: 'monthly',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('organization_wallet_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-rules', organizationId] });
      toast.success('Rule deleted');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wallet Rules - {organizationName}</DialogTitle>
          <DialogDescription>
            Set spending limits and restrictions for this organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Add New Rule</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rule Type</Label>
                <Select
                  value={newRule.rule_type}
                  onValueChange={(value: any) => setNewRule({ ...newRule, rule_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_guest">Per Guest</SelectItem>
                    <SelectItem value="per_department">Per Department</SelectItem>
                    <SelectItem value="total_wallet_cap">Total Wallet Cap</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Period</Label>
                <Select
                  value={newRule.period}
                  onValueChange={(value: any) => setNewRule({ ...newRule, period: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="none">No Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(newRule.rule_type === 'per_guest' || newRule.rule_type === 'per_department') && (
                <div className="space-y-2">
                  <Label>Entity Reference</Label>
                  <Input
                    value={newRule.entity_ref}
                    onChange={(e) => setNewRule({ ...newRule, entity_ref: e.target.value })}
                    placeholder={newRule.rule_type === 'per_guest' ? 'Guest ID' : 'Department name'}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Limit Amount (₦)</Label>
                <Input
                  type="number"
                  value={newRule.limit_amount}
                  onChange={(e) => setNewRule({ ...newRule, limit_amount: parseFloat(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>

            <Button onClick={() => createMutation.mutate()} className="w-full mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </Card>

          <div className="space-y-3">
            <h3 className="font-semibold">Existing Rules</h3>
            {rules.map((rule) => (
              <Card key={rule.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge>{rule.rule_type.replace('_', ' ')}</Badge>
                      <Badge variant="outline">{rule.period}</Badge>
                      {rule.active && <Badge variant="default">Active</Badge>}
                    </div>
                    <div className="text-sm">
                      {rule.entity_ref && (
                        <div className="text-muted-foreground">
                          Reference: {rule.entity_ref}
                        </div>
                      )}
                      <div className="font-semibold">
                        Limit: ₦{rule.limit_amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(rule.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}

            {rules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No rules configured yet
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
