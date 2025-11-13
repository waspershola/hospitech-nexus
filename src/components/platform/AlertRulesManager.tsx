import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { usePlatformFeeAlerts } from '@/hooks/usePlatformFeeAlerts';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export function AlertRulesManager() {
  const { rules, saveRule, deleteRule } = usePlatformFeeAlerts();

  const handleToggleActive = (ruleId: string, currentActive: boolean) => {
    saveRule.mutate({ id: ruleId, active: !currentActive });
  };

  if (rules.isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Alert Rules Configuration</CardTitle>
          <CardDescription>
            Manage automated revenue monitoring rules and thresholds
          </CardDescription>
        </div>
        <Button size="sm">
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
                      <Button size="icon" variant="ghost">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteRule.mutate(rule.id)}
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
  );
}
