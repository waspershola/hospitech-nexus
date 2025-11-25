import { useState } from 'react';
import { Bot, Send, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useStaffAI } from '@/hooks/useStaffAI';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface StaffAIAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StaffAIAssistant({ open, onOpenChange }: StaffAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const { query, isLoading } = useStaffAI();

  const quickActions = [
    'How do I check in a walk-in guest?',
    'How do I handle a late checkout request?',
    'What do I do if the AC is not cooling?',
    'How do I create a folio adjustment?'
  ];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const response = await query(input);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Failed to get AI response');
      console.error('[StaffAIAssistant] Error:', error);
    }
  };

  const handleQuickAction = (question: string) => {
    setInput(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Staff AI Assistant
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-4 py-4">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
              <Bot className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Ask me anything about hotel operations, SOPs, and procedures
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {quickActions.map((action) => (
                    <Button
                      key={action}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction(action)}
                      className="text-left h-auto py-2 px-3"
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-2 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-lg px-4 py-2 bg-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <div className="flex gap-2">
            <Textarea
              placeholder="Ask a question about hotel operations..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="min-h-[80px]"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}