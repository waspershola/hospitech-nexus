import { DepartmentRequestsManagement } from '@/components/department-dashboards/DepartmentRequestsManagement';
import { Shirt } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { Navigate } from 'react-router-dom';

export default function LaundryDashboard() {
  const { role, staffInfo } = useRole();
  
  // Supervisors can only access their own department
  if (role === 'supervisor' && staffInfo?.department !== 'laundry') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Laundry Dashboard</h1>
          <p className="text-muted-foreground">Manage laundry service requests</p>
        </div>
        <Shirt className="h-8 w-8 text-primary" />
      </div>
      
      <DepartmentRequestsManagement 
        department="laundry" 
        departmentLabel="Laundry"
      />
    </div>
  );
}
