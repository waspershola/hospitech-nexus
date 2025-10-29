import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, TrendingDown } from 'lucide-react';

interface DepartmentOverviewProps {
  data: Array<{
    department: string;
    total_income: number;
    transaction_count: number;
  }>;
}

export function DepartmentOverview({ data }: DepartmentOverviewProps) {
  const sortedDepartments = [...data].sort((a, b) => b.total_income - a.total_income);
  const totalIncome = data.reduce((sum, d) => sum + d.total_income, 0);

  const getPerformanceColor = (income: number) => {
    const percentage = (income / totalIncome) * 100;
    if (percentage >= 30) return 'text-success';
    if (percentage >= 15) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Department Performance
        </CardTitle>
        <CardDescription>
          Income breakdown by department
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedDepartments.map((dept, index) => {
            const avgTransaction = dept.transaction_count > 0 
              ? dept.total_income / dept.transaction_count 
              : 0;
            const percentage = (dept.total_income / totalIncome) * 100;

            return (
              <Card key={dept.department || index} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold capitalize">
                        {dept.department || 'General'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {dept.transaction_count} transactions
                      </p>
                    </div>
                    <Badge variant="outline" className={getPerformanceColor(dept.total_income)}>
                      {percentage >= 30 ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : percentage < 15 ? (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      ) : null}
                      {percentage.toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Income</p>
                      <p className="text-xl font-bold text-primary">
                        ₦{dept.total_income.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Transaction</p>
                      <p className="text-sm font-medium">
                        ₦{avgTransaction.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {sortedDepartments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No department data available for this period
          </div>
        )}
      </CardContent>
    </Card>
  );
}
