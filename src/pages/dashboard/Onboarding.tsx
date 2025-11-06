import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTenantOnboarding } from '@/hooks/useTenantOnboarding';
import { OnboardingChecklist } from '@/components/platform/OnboardingChecklist';
import { RefreshCw, PlayCircle } from 'lucide-react';
import { useState } from 'react';

export default function Onboarding() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const {
    onboarding,
    tasks,
    progress,
    isLoading,
    initializeOnboarding,
    completeTask,
    updateOnboardingStatus,
  } = useTenantOnboarding(selectedTenantId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenant Onboarding</h1>
          <p className="text-muted-foreground">
            Track and manage tenant onboarding progress
          </p>
        </div>
        <Button
          onClick={() => selectedTenantId && initializeOnboarding.mutate(selectedTenantId)}
          disabled={!selectedTenantId || initializeOnboarding.isPending}
        >
          <PlayCircle className="mr-2 h-4 w-4" />
          Initialize Onboarding
        </Button>
      </div>

      {!onboarding && (
        <Card>
          <CardHeader>
            <CardTitle>No Onboarding Found</CardTitle>
            <CardDescription>
              Select a tenant and initialize onboarding to get started
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {tasks && progress && (
        <OnboardingChecklist
          tasks={tasks}
          progress={progress}
          onCompleteTask={(taskId) => completeTask.mutate({ taskId })}
          onTaskClick={(task) => {
            console.log('Task clicked:', task);
            // Navigate to relevant page or show modal
          }}
        />
      )}

      {onboarding && (
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Status</CardTitle>
            <CardDescription>
              Current onboarding state and metadata
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-2xl font-bold capitalize">{onboarding.status}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Current Step</p>
                <p className="text-2xl font-bold">
                  {onboarding.current_step} / {onboarding.total_steps}
                </p>
              </div>
              {onboarding.started_at && (
                <div>
                  <p className="text-sm font-medium">Started</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(onboarding.started_at).toLocaleDateString()}
                  </p>
                </div>
              )}
              {onboarding.completed_at && (
                <div>
                  <p className="text-sm font-medium">Completed</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(onboarding.completed_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {progress && progress.percentage === 100 && onboarding.status !== 'completed' && (
              <Button
                className="mt-4"
                onClick={() =>
                  updateOnboardingStatus.mutate({
                    tenantId: selectedTenantId,
                    status: 'completed',
                  })
                }
              >
                Mark Onboarding Complete
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
