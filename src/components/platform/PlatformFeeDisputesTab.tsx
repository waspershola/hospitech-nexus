import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAdminPlatformFeeDisputes } from '@/hooks/useAdminPlatformFeeDisputes';
import { Loader2, Eye, CheckCircle, XCircle, Clock, AlertTriangle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { AdminPlatformFeeDispute } from '@/hooks/useAdminPlatformFeeDisputes';

export function PlatformFeeDisputesTab() {
  const { disputes, isLoading, updateDispute, isUpdating } = useAdminPlatformFeeDisputes();
  const [selectedDispute, setSelectedDispute] = useState<AdminPlatformFeeDispute | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending', icon: Clock, className: '' },
      under_review: { variant: 'default' as const, label: 'Under Review', icon: Eye, className: '' },
      approved: { variant: 'default' as const, label: 'Approved', icon: CheckCircle, className: 'bg-green-500' },
      rejected: { variant: 'destructive' as const, label: 'Rejected', icon: XCircle, className: '' },
    };
    
    const statusInfo = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = statusInfo.icon;
    
    return (
      <Badge variant={statusInfo.variant} className={statusInfo.className || undefined}>
        <Icon className="h-3 w-3 mr-1" />
        {statusInfo.label}
      </Badge>
    );
  };

  const getActionBadge = (action: string) => {
    const actionConfig = {
      waive: { variant: 'destructive' as const, label: 'Waive Fee' },
      reduce: { variant: 'default' as const, label: 'Reduce Fee' },
      review: { variant: 'outline' as const, label: 'Review Only' },
    };
    
    return (
      <Badge variant={actionConfig[action as keyof typeof actionConfig]?.variant || 'outline'}>
        {actionConfig[action as keyof typeof actionConfig]?.label || action}
      </Badge>
    );
  };

  const handleOpenReview = (dispute: AdminPlatformFeeDispute) => {
    setSelectedDispute(dispute);
    setAdminNotes(dispute.admin_notes || '');
    setResolutionNotes(dispute.resolution_notes || '');
    setReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedDispute) return;

    await updateDispute.mutateAsync({
      disputeId: selectedDispute.id,
      status: 'approved',
      admin_notes: adminNotes,
      resolution_notes: resolutionNotes,
    });

    setReviewDialogOpen(false);
    setSelectedDispute(null);
    setAdminNotes('');
    setResolutionNotes('');
  };

  const handleReject = async () => {
    if (!selectedDispute) return;

    await updateDispute.mutateAsync({
      disputeId: selectedDispute.id,
      status: 'rejected',
      admin_notes: adminNotes,
      resolution_notes: resolutionNotes,
    });

    setReviewDialogOpen(false);
    setSelectedDispute(null);
    setAdminNotes('');
    setResolutionNotes('');
  };

  const handleMarkUnderReview = async (dispute: AdminPlatformFeeDispute) => {
    await updateDispute.mutateAsync({
      disputeId: dispute.id,
      status: 'under_review',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingDisputes = disputes.filter(d => d.status === 'pending');
  const underReviewDisputes = disputes.filter(d => d.status === 'under_review');
  const resolvedDisputes = disputes.filter(d => d.status === 'approved' || d.status === 'rejected');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-semibold mb-2">Platform Fee Disputes</h2>
        <p className="text-muted-foreground">
          Review and manage tenant fee disputes
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDisputes.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting admin action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{underReviewDisputes.length}</div>
            <p className="text-xs text-muted-foreground">Being investigated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedDisputes.length}</div>
            <p className="text-xs text-muted-foreground">Approved or rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Disputes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Disputes</CardTitle>
          <CardDescription>Platform fee disputes from all tenants</CardDescription>
        </CardHeader>
        <CardContent>
          {disputes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((dispute) => (
                  <TableRow key={dispute.id}>
                    <TableCell>{format(new Date(dispute.created_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="font-medium">{dispute.tenant_name}</TableCell>
                    <TableCell>₦{dispute.total_disputed_amount?.toLocaleString() || 0}</TableCell>
                    <TableCell>{getActionBadge(dispute.requested_action)}</TableCell>
                    <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReview(dispute)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                        {dispute.status === 'pending' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleMarkUnderReview(dispute)}
                            disabled={isUpdating}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Start Review
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">No disputes submitted yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Fee Dispute</DialogTitle>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4">
              {/* Dispute Info */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{selectedDispute.tenant_name}</strong> is disputing {selectedDispute.ledger_ids.length} fee(s) totaling ₦{selectedDispute.total_disputed_amount?.toLocaleString() || 0}
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Submitted</p>
                  <p className="text-base">{format(new Date(selectedDispute.created_at), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Requested Action</p>
                  <div className="mt-1">{getActionBadge(selectedDispute.requested_action)}</div>
                </div>
                {selectedDispute.requested_amount && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Requested Refund</p>
                    <p className="text-base font-semibold">₦{selectedDispute.requested_amount.toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Status</p>
                  <div className="mt-1">{getStatusBadge(selectedDispute.status)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tenant's Reason</Label>
                <div className="bg-muted p-3 rounded-md text-sm">
                  {selectedDispute.dispute_reason}
                </div>
              </div>

              {selectedDispute.supporting_docs && selectedDispute.supporting_docs.length > 0 && (
                <div className="space-y-2">
                  <Label>
                    <FileText className="h-4 w-4 inline mr-2" />
                    Supporting Documentation
                  </Label>
                  <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                    {selectedDispute.supporting_docs.map((doc: any, idx: number) => (
                      <div key={idx} className="text-xs">• {doc.reference}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="admin-notes">Internal Admin Notes (Private)</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Add internal notes about this dispute (not visible to tenant)..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resolution-notes">Resolution Notes (Sent to Tenant)</Label>
                <Textarea
                  id="resolution-notes"
                  placeholder="Explain your decision to the tenant..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {selectedDispute.requested_action === 'waive' && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <strong>Auto-Waiver:</strong> Approving this dispute will automatically waive the disputed fees using the waive-platform-fee function.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isUpdating || !resolutionNotes.trim()}
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Reject Dispute
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isUpdating || !resolutionNotes.trim()}
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Approve & Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
