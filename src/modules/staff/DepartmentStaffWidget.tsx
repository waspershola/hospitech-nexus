import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStaffManagement } from '@/hooks/useStaffManagement';
import { useRole } from '@/hooks/useRole';
import { Users, UserCheck, UserX } from 'lucide-react';

export function DepartmentStaffWidget() {
  const { department, isOwner, isManager } = useRole();
  const { staff, isLoading } = useStaffManagement({ 
    department: !isOwner && !isManager ? department : undefined 
  });

  const activeStaff = staff?.filter(s => s.status === 'active') || [];
  const suspendedStaff = staff?.filter(s => s.status === 'suspended') || [];
  const inactiveStaff = staff?.filter(s => s.status === 'inactive') || [];

  // Group by department
  const departmentCounts = staff?.reduce((acc, s) => {
    const dept = s.department || 'unassigned';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Staff Overview
        </CardTitle>
        <CardDescription>
          {department && !isOwner && !isManager 
            ? `${department.replace('_', ' ')} Department`
            : 'All Departments'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : (
          <>
            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-accent/50">
                <UserCheck className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold">{activeStaff.length}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
              
              <div className="text-center p-3 rounded-lg bg-accent/50">
                <UserX className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold">{suspendedStaff.length}</div>
                <div className="text-xs text-muted-foreground">Suspended</div>
              </div>
              
              <div className="text-center p-3 rounded-lg bg-accent/50">
                <UserX className="w-6 h-6 mx-auto mb-2 text-red-600" />
                <div className="text-2xl font-bold">{inactiveStaff.length}</div>
                <div className="text-xs text-muted-foreground">Inactive</div>
              </div>
            </div>

            {/* Department Breakdown (for owners/managers) */}
            {(isOwner || isManager) && Object.keys(departmentCounts).length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">By Department</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(departmentCounts).map(([dept, count]) => (
                    <div key={dept} className="flex items-center justify-between p-2 rounded border">
                      <span className="text-xs capitalize">{dept.replace('_', ' ')}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
