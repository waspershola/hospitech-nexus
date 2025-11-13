import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { usePlatformFeeAlerts, AlertRule } from '@/hooks/usePlatformFeeAlerts';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { AlertRuleDialog } from './AlertRuleDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function AlertRulesManager() {
  const { rules, saveRule, deleteRule } = usePlatformFeeAlerts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

  const handleToggleActive = (ruleId: string, currentActive: boolean) => {
    saveRule.mutate({ id: ruleId, active: !currentActive });
  };

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingRule(null);
    setDialogOpen(true);
  };

  const handleDelete = (ruleId: string) => {
    setRuleToDelete(ruleId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (ruleToDelete) {
      deleteRule.mutate(ruleToDelete);
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    }
  };

  if (rules.isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Alert Rules Configuration</CardTitle>
            <CardDescription>
              Manage automated revenue monitoring rules and thresholds
            </CardDescription>
          </div>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </CardHeader>
      <CardContent>
        {!rules.data || rules.data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No alert rules configured</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Last Checked</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.data.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      {rule.description && (
                        <div className="text-sm text-muted-foreground">{rule.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{rule.period}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm capitalize">{rule.metric.replace('_', ' ')}</span>
                  </TableCell>
                  <TableCell>
                    {rule.threshold_type === 'percentage_drop' ? (
                      <span>{rule.threshold_value}% drop</span>
                    ) : (
                      <span>₦{rule.threshold_value.toLocaleString()}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {rule.last_checked_at ? format(new Date(rule.last_checked_at), 'MMM d, h:mm a') : 'Never'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.active}
                        onCheckedChange={() => handleToggleActive(rule.id, rule.active)}
                      />
                      <span className="text-sm">
                        {rule.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleEdit(rule)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(rule.id)}
                        disabled={deleteRule.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>

    <AlertRuleDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      rule={editingRule}
    />

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Alert Rule</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this alert rule? This action cannot be undone.
            Any alerts generated by this rule will remain, but no new alerts will be created.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete}>
            Delete Rule
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
