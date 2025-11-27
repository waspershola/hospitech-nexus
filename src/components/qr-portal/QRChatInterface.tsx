import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUnifiedRequestChat } from '@/hooks/useUnifiedRequestChat';
import { useQRToken } from '@/hooks/useQRToken';
import { useGuestNotifications } from '@/hooks/useGuestNotifications';
import { useOrderDetails } from '@/hooks/useOrderDetails';
import { useChatVisibility } from '@/contexts/ChatVisibilityContext';
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
  
  // PHASE-3: Track chat visibility to suppress duplicate sounds
  const { setIsChatVisible, setActiveRequestId } = useChatVisibility();
  
  // PHASE-1: Fix guest message persistence - use useQRToken for session restoration
  const { qrData, isValidating, error: qrError } = useQRToken(token);
  
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
  
  // PHASE-2: Only call chat hook when qrData is validated and tenant_id is available
  const canLoadChat = !isValidating && !!qrData?.tenant_id && !!requestId;
  
  // REALTIME-FIX-V2: Memoize chat options to prevent subscription recreation
  // PHASE-1: Use qrData.tenant_id from validated session instead of AuthContext
  const chatOptions = useMemo(() => {
    if (!canLoadChat) {
      return { tenantId: '', requestId: '', userType: 'guest' as const, guestName: 'Guest', qrToken: '' };
    }
    return {
      tenantId: qrData?.tenant_id || '',
      requestId: requestId || '',
      userType: 'guest' as const,
      guestName: 'Guest',
      qrToken: token || '',
    };
  }, [canLoadChat, qrData?.tenant_id, requestId, token]);
  
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

  // PHASE-3: Set chat visibility when component mounts to suppress sounds
  useEffect(() => {
    setIsChatVisible(true);
    setActiveRequestId(requestId || null);
    
    return () => {
      setIsChatVisible(false);
      setActiveRequestId(null);
    };
  }, [requestId, setIsChatVisible, setActiveRequestId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || isSending) return;

    const success = await sendMessage(messageText);
    
    if (success) {
      setMessageText('');
    }
  };

  // PHASE-1: Show loading state while validating QR token
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Validating session...</p>
        </div>
      </div>
    );
  }

  // PHASE-1: Show error state if QR validation failed
  if (qrError || !qrData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-destructive">{qrError || 'Invalid QR session'}</p>
          <Button onClick={() => navigate(`/qr/${token}`)}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

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
                    
                    {/* PHASE-4: ALWAYS show both original and translated text for ALL messages */}
                    {message.direction === 'inbound' ? (
                      <>
                        {/* Guest's own message: show what they typed (original) */}
                        <div className="space-y-2">
                          <p className="whitespace-pre-wrap font-medium">
                            {message.original_text || message.message}
                          </p>
                          
                          {message.detected_language && message.detected_language !== 'en' && (
                            <div className="flex items-center gap-1 text-xs opacity-70 pt-2 border-t border-primary-foreground/20">
                              <Globe className="h-3 w-3" />
                              <span>Language: {getLanguageName(message.detected_language)}</span>
                            </div>
                          )}
                          
                          {/* ALWAYS show translation notice - even if languages match */}
                          <div className="text-xs opacity-70 pt-1">
                            ✓ Staff will see this {message.translated_text !== message.original_text ? 'translated to English' : 'in original language'}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Staff message: ALWAYS show BOTH original and translated versions */}
                        <div className="space-y-3">
                          {/* PRIMARY: Translated version (what guest sees) */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs opacity-70">
                              <Globe className="h-3 w-3" />
                              <span>Translated:</span>
                            </div>
                            <p className="whitespace-pre-wrap font-medium">
                              {message.translated_text || message.message}
                            </p>
                          </div>
                          
                          {/* SECONDARY: Original staff text - ALWAYS display */}
                          <div className="pt-2 border-t border-muted-foreground/20 space-y-1">
                            <div className="text-xs opacity-70">
                              📄 Original (Staff):
                            </div>
                            <p className="text-xs opacity-70 whitespace-pre-wrap">
                              {message.original_text || message.message}
                            </p>
                          </div>
                        </div>
                      </>
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
