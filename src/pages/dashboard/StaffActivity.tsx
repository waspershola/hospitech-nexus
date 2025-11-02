import { StaffActivityLog } from '@/modules/staff/StaffActivityLog';
import { DepartmentStaffWidget } from '@/modules/staff/DepartmentStaffWidget';

export default function StaffActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Staff Activity</h1>
        <p className="text-muted-foreground">Monitor staff actions and department overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StaffActivityLog />
        </div>
        
        <div>
          <DepartmentStaffWidget />
        </div>
      </div>
    </div>
  );
}
