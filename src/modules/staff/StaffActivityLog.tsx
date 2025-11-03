import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useStaffActivities } from '@/hooks/useStaffActivity';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Calendar } from 'lucide-react';

interface StaffActivityLogProps {
  staffId?: string;
}

export function StaffActivityLog({ staffId }: StaffActivityLogProps) {
  const [filters, setFilters] = useState({
    staff_id: staffId,
    department: '',
    action: '',
  });

  const { data: activities, isLoading } = useStaffActivities(filters);

  const actionColors: Record<string, string> = {
    staff_created: 'default',
    staff_updated: 'secondary',
    staff_status_changed: 'outline',
    staff_deleted: 'destructive',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Staff Activity Log
        </CardTitle>
        <CardDescription>Recent actions performed by staff members</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        {!staffId && (
          <div className="flex gap-4">
            <Select value={filters.department} onValueChange={(value) => setFilters({ ...filters, department: value })}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Departments</SelectItem>
                <SelectItem value="front_office">Front Office</SelectItem>
                <SelectItem value="housekeeping">Housekeeping</SelectItem>
                <SelectItem value="food_beverage">Food & Beverage</SelectItem>
                <SelectItem value="kitchen">Kitchen</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="accounts">Accounts</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="management">Management</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.action} onValueChange={(value) => setFilters({ ...filters, action: value })}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                <SelectItem value="staff_created">Created</SelectItem>
                <SelectItem value="staff_updated">Updated</SelectItem>
                <SelectItem value="staff_status_changed">Status Changed</SelectItem>
                <SelectItem value="staff_deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Activity Timeline */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading activities...</div>
          ) : activities && activities.length > 0 ? (
            activities.map((activity) => (
              <div key={activity.id} className="flex gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex-shrink-0">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={(actionColors[activity.action] as any) || 'default'} className="text-xs">
                          {activity.action.replace('staff_', '').replace('_', ' ')}
                        </Badge>
                        {activity.department && (
                          <span className="text-xs text-muted-foreground capitalize">
                            {activity.department.replace('_', ' ')}
                          </span>
                        )}
                        {activity.role && (
                          <span className="text-xs text-muted-foreground capitalize">
                            • {activity.role.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No activities found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
