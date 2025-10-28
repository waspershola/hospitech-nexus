import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface ConfigCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
}

export function ConfigCard({ title, description, icon: Icon, children }: ConfigCardProps) {
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
            <CardTitle className="font-display text-xl text-foreground">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
