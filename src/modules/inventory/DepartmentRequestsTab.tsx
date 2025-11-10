import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useInventoryDepartmentRequests } from '@/hooks/useInventoryDepartmentRequests';
import { CheckCircle, XCircle, Package, AlertCircle } from 'lucide-react';
import { useRole } from '@/hooks/useRole';

export function DepartmentRequestsTab() {
  const { requests, processRequest } = useInventoryDepartmentRequests();
  const { isOwner, isManager, isStoreManager } = useRole();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueData, setIssueData] = useState<any>({});

  const canApprove = isOwner || isManager || isStoreManager;
  const canIssue = isOwner || isManager || isStoreManager;

  const handleApprove = async (requestId: string) => {
    await processRequest.mutateAsync({
      action: 'approve',
      request_id: requestId,
    });
  };

  const handleReject = async (requestId: string) => {
    await processRequest.mutateAsync({
      action: 'reject',
      request_id: requestId,
      notes: 'Request rejected',
    });
  };

  const handleOpenIssue = (request: any) => {
    setSelectedRequest(request);
    const initialIssueData: any = {};
    request.items.forEach((item: any) => {
      initialIssueData[item.item_id] = item.requested_qty;
    });
    setIssueData(initialIssueData);
    setIssueModalOpen(true);
  };

  const handleIssue = async () => {
    const items = selectedRequest.items.map((item: any) => ({
      item_id: item.item_id,
      requested_qty: item.requested_qty,
      issued_qty: issueData[item.item_id] || 0,
    }));

    await processRequest.mutateAsync({
      action: 'issue',
      request_id: selectedRequest.id,
      items,
    });

    setIssueModalOpen(false);
    setSelectedRequest(null);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'secondary',
      approved: 'default',
      issued: 'default',
      rejected: 'destructive',
      cancelled: 'secondary',
    };
    return colors[status] || 'secondary';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'destructive',
      normal: 'secondary',
      low: 'outline',
    };
    return colors[priority] || 'secondary';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Department Requests</CardTitle>
          <CardDescription>Review and process stock requests from departments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests?.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.request_number}</TableCell>
                  <TableCell className="capitalize">{request.department.replace('_', ' ')}</TableCell>
                  <TableCell>{request.requested_by}</TableCell>
                  <TableCell>{Array.isArray(request.items) ? request.items.length : 0} items</TableCell>
                  <TableCell>
                    <Badge variant={getPriorityColor(request.priority) as any}>
                      {request.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(request.status) as any}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(request.requested_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {request.status === 'pending' && canApprove && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(request.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {request.status === 'approved' && canIssue && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenIssue(request)}
                        >
                          <Package className="w-4 h-4 mr-1" />
                          Issue Items
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!requests?.length && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Issue Items - {selectedRequest?.request_number}</DialogTitle>
            <DialogDescription>
              Specify the quantity to issue for each item
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedRequest?.items.map((item: any, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">Item {index + 1}</p>
                    <p className="text-sm text-muted-foreground">
                      Requested: {item.requested_qty} units
                    </p>
                  </div>
                  {issueData[item.item_id] < item.requested_qty && (
                    <Badge variant="secondary">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Partial
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`issue-${item.item_id}`}>Issued Quantity</Label>
                  <Input
                    id={`issue-${item.item_id}`}
                    type="number"
                    step="0.01"
                    value={issueData[item.item_id] || 0}
                    onChange={(e) => setIssueData({
                      ...issueData,
                      [item.item_id]: parseFloat(e.target.value),
                    })}
                    max={item.requested_qty}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleIssue} disabled={processRequest.isPending}>
              Issue Items
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
