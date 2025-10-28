import { ConfigCard } from '../shared/ConfigCard';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Lock } from 'lucide-react';

export function PermissionsTab() {
  return (
    <ConfigCard
      title="Role-Based Permissions"
      description="Configure access levels and approval workflows"
      icon={Lock}
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <h4 className="font-medium">Financial Controls</h4>
          <div className="space-y-3 ml-4">
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Require approval for discounts over 10%</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Manager approval for refunds</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Owner approval for write-offs</Label>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Booking Controls</h4>
          <div className="space-y-3 ml-4">
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Allow overbooking</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Require deposit on booking</Label>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Data Access</h4>
          <div className="space-y-3 ml-4">
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Frontdesk can view financial reports</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Housekeeping can access guest notes</Label>
              <Switch />
            </div>
          </div>
        </div>
      </div>
    </ConfigCard>
  );
}
