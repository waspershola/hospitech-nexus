import { formatPaymentMetadata } from '@/lib/formatPaymentMetadata';
import { Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface PaymentMetadataDisplayProps {
  metadata: Record<string, any> | null | undefined;
  title?: string;
  showSeparator?: boolean;
  className?: string;
}

export function PaymentMetadataDisplay({ 
  metadata, 
  title = "Additional Information",
  showSeparator = false,
  className = ""
}: PaymentMetadataDisplayProps) {
  const formatted = formatPaymentMetadata(metadata || {});

  // Don't render anything if no data
  if (formatted.length === 0) {
    return null;
  }

  return (
    <>
      {showSeparator && <Separator />}
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4" />
          <h4 className="text-sm font-medium">{title}</h4>
        </div>
        
        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
          {formatted.map((field, index) => (
            <div 
              key={index} 
              className="flex items-start justify-between text-sm py-1.5 border-b border-border/40 last:border-0"
            >
              <span className="text-muted-foreground flex items-center gap-1.5">
                {field.icon && <span className="text-base">{field.icon}</span>}
                {field.label}
              </span>
              <span 
                className={`font-medium text-right ml-4 ${
                  field.type === 'currency' ? 'text-green-600 dark:text-green-400' : ''
                } ${
                  field.type === 'boolean' ? 'text-blue-600 dark:text-blue-400' : ''
                }`}
              >
                {field.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
