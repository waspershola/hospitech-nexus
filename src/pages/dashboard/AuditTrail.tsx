import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AuditLogsTab } from "@/components/audit/AuditLogsTab";

export default function AuditTrail() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>View detailed audit logs with advanced filtering</CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogsTab />
        </CardContent>
      </Card>
    </div>
  );
}
