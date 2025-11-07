import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LucideIcon, Save, Clock, AlertCircle } from 'lucide-react';

interface ConfigCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  onSave?: () => void | Promise<void>;
  hasUnsavedChanges?: boolean;
  lastSaved?: Date;
  error?: string;
  sectionKey?: string;
}

export function ConfigCard({ 
  title, 
  description, 
  icon: Icon, 
  children, 
  onSave,
  hasUnsavedChanges = false,
  lastSaved,
  error,
  sectionKey
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
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="font-display text-xl text-foreground">{title}</CardTitle>
                  {hasUnsavedChanges && (
                    <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
                      Unsaved
                    </Badge>
                  )}
                  {lastSaved && !hasUnsavedChanges && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Saved {lastSaved.toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
                {description && (
                  <CardDescription className="mt-1">{description}</CardDescription>
                )}
              </div>
              {onSave && (
                <Button 
                  size="sm" 
                  onClick={async () => {
                    console.log('🔘 Save button clicked for:', sectionKey);
                    try {
                      await onSave();
                      console.log('✅ Save completed for:', sectionKey);
                    } catch (error) {
                      console.error('❌ Save failed for:', sectionKey, error);
                    }
                  }}
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
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
