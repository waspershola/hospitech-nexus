import { Badge } from '@/components/ui/badge';
import { Building2, User, Users, Martini, ShoppingBag } from 'lucide-react';

interface FolioTypeBadgeProps {
  folioType: string;
  className?: string;
}

const FOLIO_TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; variant: 'default' | 'secondary' | 'outline' }> = {
  room: {
    label: 'Room',
    icon: Building2,
    variant: 'default',
  },
  incidentals: {
    label: 'Incidentals',
    icon: ShoppingBag,
    variant: 'secondary',
  },
  corporate: {
    label: 'Corporate',
    icon: Building2,
    variant: 'outline',
  },
  group: {
    label: 'Group',
    icon: Users,
    variant: 'outline',
  },
  mini_bar: {
    label: 'Mini Bar',
    icon: Martini,
    variant: 'secondary',
  },
  spa: {
    label: 'Spa',
    icon: User,
    variant: 'secondary',
  },
  restaurant: {
    label: 'Restaurant',
    icon: User,
    variant: 'secondary',
  },
};

/**
 * Displays a badge indicating the folio type with appropriate icon and styling
 * Version: BILLING-CENTER-V2.1-FOLIO-TYPE-BADGE
 */
export function FolioTypeBadge({ folioType, className }: FolioTypeBadgeProps) {
  const config = FOLIO_TYPE_CONFIG[folioType] || {
    label: folioType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    icon: Building2,
    variant: 'outline' as const,
  };

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
