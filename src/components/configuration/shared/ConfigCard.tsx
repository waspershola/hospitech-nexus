import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LucideIcon, Save } from 'lucide-react';

interface ConfigCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  onSave?: () => void | Promise<void>;
  hasUnsavedChanges?: boolean;
}

export function ConfigCard({ 
  title, 
  description, 
  icon: Icon, 
  children, 
  onSave,
  hasUnsavedChanges = false 
}: ConfigCardProps) {
  return (
    <Card className="bg-card rounded-2xl shadow-sm border transition-all hover:shadow-md hover:border-primary/20">
      <CardHeader>
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="font-display text-xl text-foreground">{title}</CardTitle>
                  {hasUnsavedChanges && (
                    <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                      Unsaved
                    </Badge>
                  )}
                </div>
                {description && (
                  <CardDescription className="mt-1">{description}</CardDescription>
                )}
              </div>
              {onSave && (
                <Button 
                  size="sm" 
                  onClick={onSave}
                  variant={hasUnsavedChanges ? "default" : "outline"}
                  className="shrink-0"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
