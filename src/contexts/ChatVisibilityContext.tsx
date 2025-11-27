/**
 * PHASE-3: Chat Visibility Context
 * 
 * Tracks whether the guest is currently viewing the chat interface
 * to prevent duplicate sound notifications when chat is active
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ChatVisibilityContextType {
  isChatVisible: boolean;
  setIsChatVisible: (visible: boolean) => void;
  activeRequestId: string | null;
  setActiveRequestId: (id: string | null) => void;
}

const ChatVisibilityContext = createContext<ChatVisibilityContextType | null>(null);

export function ChatVisibilityProvider({ children }: { children: ReactNode }) {
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  
  return (
    <ChatVisibilityContext.Provider value={{ 
      isChatVisible, 
      setIsChatVisible,
      activeRequestId,
      setActiveRequestId
    }}>
      {children}
    </ChatVisibilityContext.Provider>
  );
}

export function useChatVisibility() {
  const context = useContext(ChatVisibilityContext);
  if (!context) {
    throw new Error('useChatVisibility must be used within ChatVisibilityProvider');
  }
  return context;
}
