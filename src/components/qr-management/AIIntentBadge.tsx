import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Wrench, 
  Utensils, 
  Waves, 
  Wifi, 
  Coffee,
  MessageCircle,
  AlertCircle,
  HelpCircle
} from "lucide-react";

interface AIIntentBadgeProps {
  intent: string;
  confidence?: number;
}

const intentConfig: Record<string, { icon: any; label: string; variant: any }> = {
  housekeeping: { icon: Home, label: "Housekeeping", variant: "default" },
  maintenance: { icon: Wrench, label: "Maintenance", variant: "destructive" },
  room_service: { icon: Utensils, label: "Room Service", variant: "default" },
  spa: { icon: Waves, label: "Spa", variant: "secondary" },
  pool: { icon: Waves, label: "Pool", variant: "secondary" },
  wifi: { icon: Wifi, label: "Wi-Fi", variant: "outline" },
  breakfast: { icon: Coffee, label: "Breakfast", variant: "outline" },
  complaint: { icon: AlertCircle, label: "Complaint", variant: "destructive" },
  request: { icon: MessageCircle, label: "Request", variant: "default" },
  faq: { icon: HelpCircle, label: "FAQ", variant: "secondary" },
  other: { icon: MessageCircle, label: "Other", variant: "outline" },
};

export function AIIntentBadge({ intent, confidence }: AIIntentBadgeProps) {
  const config = intentConfig[intent] || intentConfig.other;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
      {confidence && confidence < 0.8 && (
        <span className="text-xs opacity-70">
          ({(confidence * 100).toFixed(0)}%)
        </span>
      )}
    </Badge>
  );
}
