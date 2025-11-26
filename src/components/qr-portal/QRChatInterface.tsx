import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUnifiedRequestChat } from '@/hooks/useUnifiedRequestChat';
import { useAuth } from '@/contexts/AuthContext';
import { useOrderDetails } from '@/hooks/useOrderDetails';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, CheckCheck, Package, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { ConnectionHealthIndicator } from '@/components/ui/ConnectionHealthIndicator';

export function QRChatInterface() {
  const { token, requestId } = useParams<{ token: string; requestId: string }>();
  const navigate = useNavigate();
  const { qrToken, guestId, tenantId } = useAuth();
  
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
  
  // REALTIME-FIX-V2: Memoize chat options to prevent subscription recreation
  const chatOptions = useMemo(() => ({
    tenantId: tenantId || '',
    requestId: requestId || '',
    userType: 'guest' as const,
    guestName: 'Guest',
    qrToken: qrToken || token || '',
  }), [tenantId, requestId, qrToken, token]);
  
  const { messages, isLoading, isSending, sendMessage } = useUnifiedRequestChat(chatOptions);
  
  // Check if this request has a linked order
  const { data: orderDetails } = useOrderDetails(requestId);
  
  const [messageText, setMessageText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // PHASE-5: Sound notification for new staff messages
  useEffect(() => {
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    // Play sound when staff replies (outbound messages to guest)
    if (lastMessage.direction === 'outbound' && lastMessage.id) {
      try {
        const audio = new Audio('/sounds/notification-default.mp3');
        audio.volume = 0.5;
        audio.play().catch(err => console.warn('Sound play failed:', err));
      } catch (err) {
        console.warn('Sound notification failed:', err);
      }
    }
  }, [messages.length]); // Only trigger when message count changes

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || isSending) return;

    const success = await sendMessage(messageText);
    
    if (success) {
      setMessageText('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
      {/* Action Header */}
      <div className="bg-card border-b p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          {orderDetails && orderDetails.type === 'order' ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const orderId = (orderDetails.data as any).id;
                navigate(`/qr/${token}/order/${orderId}`);
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : orderDetails && orderDetails.type === 'request' ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/qr/${token}/request/${requestId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/qr/${token}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Service Request Chat</h1>
              <ConnectionHealthIndicator />
            </div>
            <p className="text-sm text-muted-foreground">
              Request ID: {requestId?.substring(0, 8)}...
            </p>
          </div>
          {orderDetails && orderDetails.type === 'order' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const orderId = (orderDetails.data as any).id;
                navigate(`/qr/${token}/order/${orderId}`);
              }}
            >
              <Package className="h-4 w-4 mr-2" />
              View Order
            </Button>
          )}
          {orderDetails && orderDetails.type === 'request' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/qr/${token}/request/${requestId}`)}
            >
              <Package className="h-4 w-4 mr-2" />
              View Request
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="max-w-4xl mx-auto p-4 space-y-4">
            {isLoading && messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Send a message to start the conversation.
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.direction === 'inbound' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 space-y-1 ${
                      message.direction === 'inbound'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {message.sender_name}
                    </p>
                    
                    {/* PHASE-4: Guest sees original + translated (if different) */}
                    <p className="whitespace-pre-wrap">
                      {message.direction === 'inbound' 
                        ? message.message // Guest always sees their own original text
                        : (message.translated_text || message.message) // Guest sees translated staff reply
                      }
                    </p>
                    
                    {message.direction === 'outbound' && message.detected_language && message.detected_language !== 'en' && message.translated_text && (
                      <div className="flex items-center gap-1 text-xs opacity-70 mt-1">
                        <Globe className="h-3 w-3" />
                        <span>Translated to {getLanguageName(message.detected_language)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 justify-end">
                      <p className="text-xs opacity-70">
                        {format(new Date(message.created_at), 'HH:mm')}
                      </p>
                      {message.direction === 'inbound' && (
                        <CheckCheck className="h-3 w-3 opacity-70" />
                      )}
                      {message.ai_auto_response && (
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">Auto</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="bg-card border-t p-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-2">
          <Input
            placeholder="Type your message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={isSending}
            className="flex-1"
          />
          <Button type="submit" disabled={isSending || !messageText.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
