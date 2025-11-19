import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FinanceReportsTab } from "@/modules/finance-center/FinanceReportsTab";

export default function FinanceReports() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Finance Reports</CardTitle>
          <CardDescription>View revenue, department, and outstanding balance analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <FinanceReportsTab />
        </CardContent>
      </Card>
    </div>
  );
}
