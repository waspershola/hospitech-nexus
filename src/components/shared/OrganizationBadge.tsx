import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OrganizationBadgeProps {
  organizationName: string;
  variant?: 'default' | 'secondary' | 'outline';
  showIcon?: boolean;
}

export function OrganizationBadge({ 
  organizationName, 
  variant = 'secondary',
  showIcon = true 
}: OrganizationBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant} className="gap-1">
            {showIcon && <Building2 className="h-3 w-3" />}
            {organizationName}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Organization Booking</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
