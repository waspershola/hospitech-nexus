import { useState, createElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  DollarSign,
  Building2,
  MapPin,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FinancialSetupWizardProps {
  open: boolean;
  onClose: () => void;
  currentStep?: number;
}

const steps = [
  {
    id: 'currency',
    title: 'Currency & Tax Settings',
    description: 'Configure your base currency, VAT, and service charge',
    icon: DollarSign,
    path: '/dashboard/configuration?tab=financials',
  },
  {
    id: 'providers',
    title: 'Payment Providers',
    description: 'Add POS systems, bank accounts, and payment gateways',
    icon: Building2,
    path: '/dashboard/configuration?tab=providers',
  },
  {
    id: 'locations',
    title: 'Payment Locations',
    description: 'Define where payments are collected (optional)',
    icon: MapPin,
    path: '/dashboard/configuration?tab=locations',
  },
];

export function FinancialSetupWizard({
  open,
  onClose,
  currentStep = 0,
}: FinancialSetupWizardProps) {
  const [activeStep, setActiveStep] = useState(currentStep);
  const navigate = useNavigate();
  const progress = ((activeStep + 1) / steps.length) * 100;

  const handleNavigateToStep = (step: typeof steps[0]) => {
    navigate(step.path);
    onClose();
  };

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const CurrentStepIcon = steps[activeStep]?.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Financial System Setup</DialogTitle>
          </div>
          <DialogDescription>
            Let's configure your financial management system step by step
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Step {activeStep + 1} of {steps.length}
              </span>
              <span className="font-medium">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Current Step */}
          <div className="p-6 rounded-lg border-2 border-primary/20 bg-primary/5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                {CurrentStepIcon && <CurrentStepIcon className="h-6 w-6 text-primary" />}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">
                  {steps[activeStep]?.title}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {steps[activeStep]?.description}
                </p>

                <Button
                  onClick={() => handleNavigateToStep(steps[activeStep])}
                  size="sm"
                >
                  Configure Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* All Steps Overview */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground mb-3">
              Setup Progress
            </h4>
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === activeStep;
              const isCompleted = index < activeStep;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5'
                      : isCompleted
                      ? 'border-success/20 bg-success/5'
                      : 'border-border'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      isActive
                        ? 'bg-primary/10'
                        : isCompleted
                        ? 'bg-success/10'
                        : 'bg-muted'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Icon
                        className={`h-4 w-4 ${
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        isActive || isCompleted
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {step.title}
                    </p>
                  </div>
                  <Badge
                    variant={
                      isCompleted ? 'default' : isActive ? 'secondary' : 'outline'
                    }
                  >
                    {isCompleted ? 'Done' : isActive ? 'Current' : 'Pending'}
                  </Badge>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="ghost" onClick={handleSkip}>
              {activeStep < steps.length - 1 ? 'Skip This Step' : 'Close'}
            </Button>
            <div className="flex gap-2">
              {activeStep > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setActiveStep(activeStep - 1)}
                >
                  Previous
                </Button>
              )}
              <Button onClick={handleNext}>
                {activeStep < steps.length - 1 ? 'Next Step' : 'Finish Setup'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
