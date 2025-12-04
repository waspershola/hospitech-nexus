import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './Sidebar';
import Topbar from './Topbar';
import MobileNav from './MobileNav';
import { AudioPermissionPrompt } from '@/components/notifications/AudioPermissionPrompt';
import { useQRNotifications } from '@/hooks/useQRNotifications';
import { OfflineStatusIndicator } from '@/components/offline/OfflineStatusIndicator';
import { SyncStatusIndicator } from '@/components/offline/SyncStatusIndicator';
import { StaffAIAssistant } from '@/components/staff/StaffAIAssistant';
import { SMSCreditsWarningBanner } from '@/components/alerts/SMSCreditsWarningBanner';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';

export default function DashboardShell() {
  const [isAIOpen, setIsAIOpen] = useState(false);
  
  // Phase 5: Unified ringtone system
  useQRNotifications();

  // Keyboard shortcut for AI Assistant (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsAIOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        
        <div className="flex flex-col flex-1">
          <header className="h-16 flex items-center justify-between border-b border-border bg-background px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <Topbar />
            </div>
            
            {/* Offline Desktop Status Indicators (Electron only) */}
            <div className="flex items-center gap-2">
              <OfflineStatusIndicator />
              <SyncStatusIndicator />
            </div>
          </header>
          
          {/* Global SMS Credits Warning Banner */}
          <SMSCreditsWarningBanner />
          
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet />
          </main>

          <MobileNav />
        </div>
      </div>
      
      {/* Audio permission prompt - shows once on first visit */}
      <AudioPermissionPrompt />

      {/* Staff AI Assistant */}
      <StaffAIAssistant open={isAIOpen} onOpenChange={setIsAIOpen} />

      {/* Floating AI Button */}
      <Button
        onClick={() => setIsAIOpen(true)}
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-50"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>
    </SidebarProvider>
  );
}