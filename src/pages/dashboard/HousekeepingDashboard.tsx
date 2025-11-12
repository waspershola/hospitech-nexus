import { DepartmentRequestsManagement } from '@/components/department-dashboards/DepartmentRequestsManagement';
import { Sparkles } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { Navigate } from 'react-router-dom';

export default function HousekeepingDashboard() {
  const { role, staffInfo } = useRole();
  
  // Supervisors can only access their own department
  if (role === 'supervisor' && staffInfo?.department !== 'housekeeping') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Housekeeping Dashboard</h1>
          <p className="text-muted-foreground">Room cleaning and maintenance status</p>
        </div>
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      
      <DepartmentRequestsManagement 
        department="housekeeping" 
        departmentLabel="Housekeeping"
      />
    </div>
  );
}
