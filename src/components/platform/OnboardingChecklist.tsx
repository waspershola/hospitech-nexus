import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface OnboardingTask {
  id: string;
  task_key: string;
  task_name: string;
  task_description: string;
  is_required: boolean;
  is_completed: boolean;
  completed_at?: string;
  sort_order: number;
}

interface OnboardingChecklistProps {
  tasks: OnboardingTask[];
  progress: {
    total: number;
    completed: number;
    percentage: number;
    requiredCompleted: number;
    requiredTotal: number;
  };
  onCompleteTask?: (taskId: string) => void;
  onTaskClick?: (task: OnboardingTask) => void;
}

export function OnboardingChecklist({ 
  tasks, 
  progress, 
  onCompleteTask,
  onTaskClick 
}: OnboardingChecklistProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Onboarding Progress</CardTitle>
            <CardDescription>
              {progress.completed} of {progress.total} tasks completed
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{progress.percentage}%</div>
            <p className="text-xs text-muted-foreground">
              {progress.requiredCompleted}/{progress.requiredTotal} required
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress.percentage} className="h-2" />

        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                task.is_completed ? 'bg-muted/50' : 'hover:bg-muted/30 cursor-pointer'
              }`}
              onClick={() => !task.is_completed && onTaskClick?.(task)}
            >
              <div className="flex items-center gap-3 flex-1">
                {task.is_completed ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${task.is_completed ? 'text-muted-foreground line-through' : ''}`}>
                      {task.task_name}
                    </p>
                    {task.is_required && !task.is_completed && (
                      <Badge variant="destructive" className="h-5 text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {task.task_description}
                  </p>
                </div>
              </div>
              
              {!task.is_completed && onCompleteTask && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompleteTask(task.id);
                  }}
                >
                  Mark Complete
                </Button>
              )}
            </div>
          ))}
        </div>

        {progress.requiredCompleted < progress.requiredTotal && (
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning rounded-lg">
            <AlertCircle className="h-4 w-4 text-warning" />
            <p className="text-sm">
              Complete all required tasks to finish onboarding
            </p>
          </div>
        )}

        {progress.percentage === 100 && (
          <div className="flex items-center gap-2 p-3 bg-success/10 border border-success rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <p className="text-sm font-medium">
              Congratulations! Onboarding complete
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
