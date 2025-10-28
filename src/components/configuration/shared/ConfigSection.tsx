import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface ConfigSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
}

export function ConfigSection({ title, description, icon: Icon, children }: ConfigSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
