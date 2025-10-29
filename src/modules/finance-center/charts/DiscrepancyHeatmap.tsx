import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DiscrepancyHeatmapProps {
  data: Array<{
    date: string;
    department: string;
    discrepancy: number;
    unmatched_count: number;
  }>;
}

export function DiscrepancyHeatmap({ data }: DiscrepancyHeatmapProps) {
  const { departments, dates, heatmapData, maxDiscrepancy } = useMemo(() => {
    const deptSet = new Set<string>();
    const dateSet = new Set<string>();
    const matrix: Record<string, Record<string, { discrepancy: number; count: number }>> = {};

    data.forEach(item => {
      deptSet.add(item.department || 'general');
      dateSet.add(item.date);

      const dept = item.department || 'general';
      const date = item.date;

      if (!matrix[dept]) matrix[dept] = {};
      if (!matrix[dept][date]) {
        matrix[dept][date] = { discrepancy: 0, count: 0 };
      }

      matrix[dept][date].discrepancy += item.discrepancy;
      matrix[dept][date].count += item.unmatched_count;
    });

    const departments = Array.from(deptSet).sort();
    const dates = Array.from(dateSet).sort();
    const allDiscrepancies = Object.values(matrix)
      .flatMap(dept => Object.values(dept).map(d => d.discrepancy));
    const maxDiscrepancy = Math.max(...allDiscrepancies, 1);

    return { departments, dates, heatmapData: matrix, maxDiscrepancy };
  }, [data]);

  const getIntensityColor = (discrepancy: number) => {
    if (discrepancy === 0) return 'bg-muted';
    const intensity = Math.min(discrepancy / maxDiscrepancy, 1);
    if (intensity > 0.7) return 'bg-destructive';
    if (intensity > 0.4) return 'bg-warning';
    return 'bg-warning/50';
  };

  const totalDiscrepancy = data.reduce((sum, item) => sum + item.discrepancy, 0);
  const totalUnmatched = data.reduce((sum, item) => sum + item.unmatched_count, 0);

  if (departments.length === 0 || dates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Discrepancy Heatmap
          </CardTitle>
          <CardDescription>
            Financial discrepancies by department and date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No discrepancy data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-primary" />
          Discrepancy Heatmap
        </CardTitle>
        <CardDescription>
          Financial discrepancies by department and date
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Total Discrepancy</p>
            <p className="text-2xl font-bold text-destructive">₦{totalDiscrepancy.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Unmatched Transactions</p>
            <p className="text-2xl font-bold">{totalUnmatched}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <TooltipProvider>
            <div className="inline-block min-w-full">
              <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${dates.length}, 60px)` }}>
                {/* Header row */}
                <div className="font-medium text-xs p-2"></div>
                {dates.map(date => (
                  <div key={date} className="font-medium text-xs p-2 text-center">
                    {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                ))}

                {/* Department rows */}
                {departments.map(dept => (
                  <>
                    <div key={`${dept}-label`} className="font-medium text-xs p-2 capitalize">
                      {dept}
                    </div>
                    {dates.map(date => {
                      const cell = heatmapData[dept]?.[date];
                      const discrepancy = cell?.discrepancy || 0;
                      const count = cell?.count || 0;

                      return (
                        <Tooltip key={`${dept}-${date}`}>
                          <TooltipTrigger asChild>
                            <div
                              className={`h-12 rounded ${getIntensityColor(discrepancy)} cursor-pointer hover:ring-2 hover:ring-primary transition-all flex items-center justify-center`}
                            >
                              {count > 0 && (
                                <Badge variant="outline" className="text-[10px] px-1">
                                  {count}
                                </Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <p className="font-semibold">{dept} - {date}</p>
                              <p>Discrepancy: ₦{discrepancy.toLocaleString()}</p>
                              <p>Unmatched: {count}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-6 text-xs">
                <span className="text-muted-foreground">Intensity:</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-muted"></div>
                  <span>None</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-warning/50"></div>
                  <span>Low</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-warning"></div>
                  <span>Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-destructive"></div>
                  <span>High</span>
                </div>
              </div>
            </div>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
