import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStaffManagement } from '@/hooks/useStaffManagement';

interface SupervisorSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  department?: string;
  excludeStaffId?: string;
}

export function SupervisorSelector({
  value,
  onChange,
  department,
  excludeStaffId,
}: SupervisorSelectorProps) {
  const { staff, isLoading } = useStaffManagement();
  const [filteredSupervisors, setFilteredSupervisors] = useState<any[]>([]);

  useEffect(() => {
    if (!staff) return;

    // Filter supervisors
    const supervisors = staff.filter((s) => {
      // Exclude current staff being edited
      if (excludeStaffId && s.id === excludeStaffId) return false;

      // Only active staff
      if (s.status !== 'active') return false;

      // Filter by department if specified
      if (department && s.department !== department) return false;

      // Only show supervisors and managers
      const accessLevel = s.metadata?.access_level;
      return accessLevel === 'supervisor' || accessLevel === 'manager';
    });

    setFilteredSupervisors(supervisors);
  }, [staff, department, excludeStaffId]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Reporting To</Label>
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Loading supervisors..." />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="supervisor">Reporting To</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="supervisor">
          <SelectValue placeholder="Select supervisor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Supervisor</SelectItem>
          {filteredSupervisors.map((supervisor) => (
            <SelectItem key={supervisor.id} value={supervisor.id}>
              {supervisor.full_name} ({supervisor.role} - {supervisor.department})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {filteredSupervisors.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No supervisors found in this department
        </p>
      )}
    </div>
  );
}
