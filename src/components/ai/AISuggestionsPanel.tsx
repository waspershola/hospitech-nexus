/**
 * AI Suggestions Panel
 * Phase 3: Displays AI-generated reply suggestions for staff
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { processStaffReply } from '@/lib/ai/client';
import type { ProcessStaffReplyResult } from '@/lib/ai/types';

interface AISuggestionsPanelProps {
  tenantId: string;
  requestId: string;
  recentMessages: Array<{ message: string; direction: 'inbound' | 'outbound' }>;
  onApplySuggestion: (text: string) => void;
  className?: string;
}

export function AISuggestionsPanel({
  tenantId,
  requestId,
  recentMessages,
  onApplySuggestion,
  className = '',
}: AISuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create stable dependency using useMemo - only changes when last guest message content changes
  const lastGuestMessageId = useMemo(() => {
    const lastInbound = recentMessages.filter(m => m.direction === 'inbound').slice(-1)[0];
    return lastInbound ? JSON.stringify(lastInbound) : null;
  }, [recentMessages]);

  // Track if we've already generated for this message to prevent duplicate calls
  const hasGeneratedRef = useRef<string | null>(null);

  // Generate suggestions based on recent guest messages
  useEffect(() => {
    // Prevent duplicate generation for same message
    if (hasGeneratedRef.current === lastGuestMessageId) {
      return;
    }
    const generateSuggestions = async () => {
      // Only generate if there's a recent guest message
      const lastGuestMessage = recentMessages
        .filter(m => m.direction === 'inbound')
        .slice(-1)[0];

      if (!lastGuestMessage) {
        setSuggestions([]);
        hasGeneratedRef.current = null;
        return;
      }

      // Mark this message as processed
      hasGeneratedRef.current = lastGuestMessageId;

      // Phase 4: Detect guest language from recent messages
      const guestLanguage = (lastGuestMessage as any).detected_language || 'en';

      setIsLoading(true);
      try {
        // Generate 3 different reply suggestions
        const suggestionsPromises = [
          'Thank you for reaching out. I will assist you right away.',
          'I understand your request. Let me check on that for you immediately.',
          'Thank you for your patience. I am addressing this now.',
        ].map(async (template) => {
          try {
            const response = await processStaffReply(
              tenantId,
              template,
              guestLanguage
            );
            
            if (response.success && response.data) {
              const data = response.data as ProcessStaffReplyResult;
              return data.enhanced_text;
            }
            return template;
          } catch {
            return template;
          }
        });

        const results = await Promise.all(suggestionsPromises);
        setSuggestions(results.filter(Boolean).slice(0, 3));
      } catch (error) {
        console.error('[AISuggestionsPanel] Failed to generate suggestions:', error);
        // Fallback to basic templates
        setSuggestions([
          'Thank you for reaching out. I will assist you right away.',
          'I understand your request. Let me check on that for you.',
          'Thank you for your patience. I am addressing this now.',
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    generateSuggestions();
  }, [tenantId, lastGuestMessageId]); // Use stable ID instead of array reference

  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-muted-foreground">
          AI Suggestions
        </span>
        {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="text-xs rounded-xl border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-colors"
            onClick={() => onApplySuggestion(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
