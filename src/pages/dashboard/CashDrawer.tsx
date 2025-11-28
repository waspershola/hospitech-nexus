import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CashDrawerStats } from '@/components/cash-drawer/CashDrawerStats';
import { CashDrawerHistory } from '@/components/cash-drawer/CashDrawerHistory';
import { OpenDrawerDialog } from '@/components/cash-drawer/OpenDrawerDialog';
import { CloseDrawerDialog } from '@/components/cash-drawer/CloseDrawerDialog';
import { useCashDrawer } from '@/hooks/useCashDrawer';

export default function CashDrawer() {
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const { currentDrawer, isLoading } = useCashDrawer();

  const hasOpenDrawer = currentDrawer?.status === 'open';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Cash Drawer</h1>
          <p className="text-muted-foreground">Track cash drawer operations and reconciliation</p>
        </div>
        <div className="flex items-center gap-3">
          {!hasOpenDrawer && (
            <Button onClick={() => setOpenDialogOpen(true)} disabled={isLoading}>
              Open Drawer
            </Button>
          )}
          {hasOpenDrawer && (
            <Button onClick={() => setCloseDialogOpen(true)} variant="destructive">
              Close Drawer
            </Button>
          )}
          <DollarSign className="h-8 w-8 text-primary" />
        </div>
      </div>

      <CashDrawerStats currentDrawer={currentDrawer} isLoading={isLoading} />

      <Card>
        <CardHeader>
          <CardTitle>Drawer History</CardTitle>
          <CardDescription>Recent cash drawer sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <CashDrawerHistory />
        </CardContent>
      </Card>

      <OpenDrawerDialog open={openDialogOpen} onOpenChange={setOpenDialogOpen} />
      <CloseDrawerDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        drawer={currentDrawer}
      />
    </div>
  );
}
