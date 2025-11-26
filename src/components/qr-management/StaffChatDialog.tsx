import { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Globe } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useUnifiedRequestChat } from '@/hooks/useUnifiedRequestChat';
import { useAuth } from '@/contexts/AuthContext';

interface StaffChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any;
}

export default function StaffChatDialog({
  open,
  onOpenChange,
  request,
}: StaffChatDialogProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, tenantId } = useAuth();
  
  // REALTIME-FIX-V2: Memoize chat options to prevent subscription recreation
  const chatOptions = useMemo(() => ({
    tenantId: tenantId || '',
    requestId: request?.id || '',
    userType: 'staff' as const,
    userId: user?.id,
  }), [tenantId, request?.id, user?.id]);
  
  const { messages, isLoading, isSending, sendMessage } = useUnifiedRequestChat(chatOptions);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    const success = await sendMessage(message);
    if (success) {
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getLanguageName = (code: string): string => {
    const names: Record<string, string> = {
      'zh': 'Chinese',
      'ar': 'Arabic',
      'fr': 'French',
      'es': 'Spanish',
      'yo': 'Yoruba',
      'ha': 'Hausa',
      'ig': 'Igbo',
      'pidgin': 'Nigerian Pidgin',
      'en': 'English',
    };
    return names[code?.toLowerCase()] || code?.toUpperCase();
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Guest Request Chat</DialogTitle>
          <DialogDescription className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {request.metadata?.guest_name || 'Anonymous Guest'}
              </span>
              {request.metadata?.guest_contact && (
                <span className="text-sm">({request.metadata.guest_contact})</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="capitalize">
                {request.type.replace('_', ' ')}
              </Badge>
              {request.room?.number && (
                <span>Room {request.room.number}</span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No messages yet
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 space-y-2 ${
                      msg.direction === 'outbound'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">
                        {msg.sender_name}
                      </div>
                      {msg.intent && (
                        <Badge variant="secondary" className="text-xs">
                          {msg.intent.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Phase 3: Show "Translated from X" tag */}
                    {msg.detected_language && msg.detected_language !== 'en' && msg.translated_text && msg.translated_text !== msg.original_text && (
                      <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
                        <Globe className="h-3 w-3" />
                        <span>Translated from {getLanguageName(msg.detected_language)}</span>
                      </div>
                    )}
                    
                    {msg.original_text && msg.cleaned_text && msg.original_text !== msg.cleaned_text ? (
                      <div className="space-y-1">
                        <div className="text-sm whitespace-pre-wrap">
                          {msg.translated_text || msg.cleaned_text}
                        </div>
                        <details className="text-xs opacity-70">
                          <summary className="cursor-pointer">Original</summary>
                          <div className="mt-1">{msg.original_text}</div>
                        </details>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.translated_text || msg.cleaned_text || msg.message}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <div
                        className={`text-xs ${
                          msg.direction === 'outbound'
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {format(new Date(msg.created_at), 'h:mm a')}
                      </div>
                      {msg.detected_language && msg.detected_language !== 'en' && (
                        <Badge variant="outline" className="text-xs">
                          {msg.detected_language.toUpperCase()}
                        </Badge>
                      )}
                      {msg.confidence && msg.confidence < 0.8 && (
                        <span className="text-xs opacity-70">
                          {(msg.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="resize-none"
            rows={3}
            disabled={isSending}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="h-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
