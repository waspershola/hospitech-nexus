import { Badge } from "@/components/ui/badge";
import { Sparkles, Languages, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AIMessageBadgeProps {
  isAutoResponse?: boolean;
  hasTranslation?: boolean;
  confidence?: number;
  detectedLanguage?: string;
}

export function AIMessageBadge({ 
  isAutoResponse, 
  hasTranslation, 
  confidence,
  detectedLanguage 
}: AIMessageBadgeProps) {
  if (isAutoResponse) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3" />
              Auto-Reply
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This was automatically answered by our AI assistant</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (hasTranslation) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 text-xs">
              <Languages className="h-3 w-3" />
              Translated {detectedLanguage && `(${detectedLanguage.toUpperCase()})`}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Message was translated for clarity</p>
            {confidence && <p className="text-xs">Confidence: {(confidence * 100).toFixed(0)}%</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
}
