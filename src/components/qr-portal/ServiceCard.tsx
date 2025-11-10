import { ChevronRight, LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  themeColor?: string;
}

export function ServiceCard({ icon: Icon, title, description, onClick, themeColor = 'primary' }: ServiceCardProps) {
  return (
    <Card 
      className="group cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/30 min-h-[120px] bg-card/80 backdrop-blur-sm"
      onClick={onClick}
    >
      <div className="p-6 sm:p-8 flex items-center gap-4">
        {/* Icon Container - Left */}
        <div 
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg shrink-0"
          style={{
            backgroundImage: `linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.2))`
          }}
        >
          <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
        </div>

        {/* Text Content - Center */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl sm:text-2xl font-serif transition-colors duration-300 group-hover:text-primary mb-1">
            {title}
          </h3>
          <p className="text-muted-foreground transition-colors duration-300 group-hover:text-foreground text-sm sm:text-base">
            {description}
          </p>
        </div>

        {/* Arrow Button - Right */}
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 shrink-0">
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
        </div>
      </div>
    </Card>
  );
}
