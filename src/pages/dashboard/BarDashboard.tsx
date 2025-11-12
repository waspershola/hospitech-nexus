import { DepartmentRequestsManagement } from '@/components/department-dashboards/DepartmentRequestsManagement';
import { Wine } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { Navigate } from 'react-router-dom';

export default function BarDashboard() {
  const { role, staffInfo } = useRole();
  
  // Supervisors can only access their own department
  if (role === 'supervisor' && staffInfo?.department !== 'food_beverage') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Bar Dashboard</h1>
          <p className="text-muted-foreground">Manage bar orders and service</p>
        </div>
        <Wine className="h-8 w-8 text-primary" />
      </div>
      
      <DepartmentRequestsManagement 
        department="restaurant" 
        departmentLabel="Bar"
      />
    </div>
  );
}
