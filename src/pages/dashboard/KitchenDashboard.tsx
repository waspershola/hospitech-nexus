import { DepartmentRequestsManagement } from '@/components/department-dashboards/DepartmentRequestsManagement';
import { UtensilsCrossed } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { Navigate } from 'react-router-dom';

export default function KitchenDashboard() {
  const { role, staffInfo } = useRole();
  
  // Supervisors can only access their own department (food_beverage includes kitchen)
  if (role === 'supervisor' && staffInfo?.department !== 'food_beverage') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Kitchen Dashboard</h1>
          <p className="text-muted-foreground">Manage room service and dining orders</p>
        </div>
        <UtensilsCrossed className="h-8 w-8 text-primary" />
      </div>
      
      <DepartmentRequestsManagement 
        department="restaurant" 
        departmentLabel="Kitchen"
      />
    </div>
  );
}
