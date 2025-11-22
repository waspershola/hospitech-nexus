import { useStaffRequests } from '@/hooks/useStaffRequests';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, TrendingUp, MessageSquare, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { QRRequestDrawer } from '@/components/qr-management/QRRequestDrawer';
import { toast } from 'sonner';

interface DepartmentRequestsWidgetProps {
  department: string;
  departmentLabel: string;
}

export function DepartmentRequestsWidget({ department, departmentLabel }: DepartmentRequestsWidgetProps) {
  const { requests, isLoading, updateRequestStatus } = useStaffRequests();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filter requests by department
  const departmentRequests = requests.filter(
    r => r.qr_token && r.assigned_department === department
  );

  const pending = departmentRequests.filter(r => r.status === 'pending').length;
  const inProgress = departmentRequests.filter(r => r.status === 'in_progress').length;
  const completedToday = departmentRequests.filter(r => {
    if (r.status !== 'completed') return false;
    const today = new Date();
    const completedDate = new Date((r as any).completed_at || r.created_at);
    return completedDate.toDateString() === today.toDateString();
  }).length;

  const handleUpdateStatus = async (requestId: string, status: string) => {
    const success = await updateRequestStatus(requestId, status);
    if (success) {
      toast.success(`Request ${status.replace('_', ' ')}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pending}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting response
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgress}</div>
              <p className="text-xs text-muted-foreground">
                Currently handling
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedToday}</div>
              <p className="text-xs text-muted-foreground">
                Tasks finished
              </p>
            </CardContent>
          </Card>
        </div>

        {departmentRequests.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{departmentLabel} Requests</CardTitle>
              <CardDescription>QR portal requests assigned to {departmentLabel.toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Room/Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium capitalize">
                            {request.type?.replace('_', ' ')}
                          </div>
                          {request.note && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {request.note}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {request.metadata?.room_number || request.room?.number || 'Common Area'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.status === 'pending'
                              ? 'secondary'
                              : request.status === 'completed'
                              ? 'default'
                              : 'default'
                          }
                        >
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(request.created_at), 'MMM d, h:mm a')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {request.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(request.id, 'in_progress')}
                            >
                              Start
                            </Button>
                          )}
                          {request.status === 'in_progress' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleUpdateStatus(request.id, 'completed')}
                            >
                              Complete
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDrawerOpen(true)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No requests assigned to {departmentLabel.toLowerCase()} yet.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <QRRequestDrawer 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen}
      />
    </>
  );
}
