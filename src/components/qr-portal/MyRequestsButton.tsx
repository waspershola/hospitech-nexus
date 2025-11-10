import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQRThemeColors } from '@/hooks/useQRTheme';
import { cn } from '@/lib/utils';

interface ServiceRequest {
  id: string;
  service_category: string;
  status: string;
  created_at: string;
  note?: string;
}

interface MyRequestsButtonProps {
  /** Number of pending requests */
  pendingCount?: number;
  /** Array of actual requests */
  requests?: ServiceRequest[];
  /** Branding configuration for theme colors */
  branding?: {
    qr_theme?: string;
    qr_primary_color?: string;
    qr_accent_color?: string;
  };
  /** Callback when button is clicked */
  onClick?: () => void;
  /** Optional: Control panel open state externally */
  isOpen?: boolean;
  /** Callback when panel open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Callback when a request is clicked */
  onViewRequest?: (requestId: string) => void;
}

export function MyRequestsButton({
  pendingCount = 0,
  requests = [],
  branding,
  onClick,
  isOpen: controlledIsOpen,
  onOpenChange,
  onViewRequest,
}: MyRequestsButtonProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use controlled or internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(open);
    }
    onOpenChange?.(open);
  };

  const colors = useQRThemeColors(branding);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setIsOpen(!isOpen);
    }
  };

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#my-requests-panel') && !target.closest('#my-requests-button')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Button
          id="my-requests-button"
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-xl relative",
            "border-2 border-white/20"
          )}
          style={{
            background: colors.gradient,
          }}
          onClick={handleClick}
        >
          <MessageCircle className="h-6 w-6 text-white" />
          
          {/* Badge Counter */}
          {pendingCount > 0 && (
            <Badge
              className="absolute -top-2 -right-2 h-6 min-w-[24px] rounded-full px-1.5 animate-in zoom-in duration-300"
              style={{
                background: 'hsl(0 75% 50%)',
                color: 'white',
              }}
            >
              {pendingCount > 99 ? '99+' : pendingCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Sliding Panel */}
      {isOpen && (
        <div 
          id="my-requests-panel"
          className="fixed bottom-28 right-8 z-50 w-80 animate-in slide-in-from-bottom-8 fade-in duration-300"
        >
          <Card className="shadow-2xl border-2" style={{ borderColor: `${colors.primary}40` }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" style={{ color: colors.primary }} />
                  <CardTitle className="text-lg">My Requests</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Track your service requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {requests.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-muted-foreground">No active requests</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your service requests will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Real request items */}
                  {requests.slice(0, 3).map((request) => (
                    <div 
                      key={request.id}
                      className="p-3 rounded-lg bg-muted/50 border cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => onViewRequest?.(request.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium capitalize">
                            {request.service_category.replace('_', ' ')}
                          </p>
                          {request.note && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {request.note}
                            </p>
                          )}
                        </div>
                        <Badge 
                          variant="outline" 
                          className="text-xs capitalize"
                          style={{ 
                            borderColor: colors.primary,
                            color: colors.primary 
                          }}
                        >
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(request.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  ))}
                  
                  {requests.length > 3 && (
                    <div className="text-center pt-2">
                      <Button 
                        variant="link" 
                        size="sm"
                        style={{ color: colors.primary }}
                      >
                        View all {requests.length} requests
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
