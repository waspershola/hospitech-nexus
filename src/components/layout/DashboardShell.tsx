import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './Sidebar';
import Topbar from './Topbar';
import MobileNav from './MobileNav';
import { AudioPermissionPrompt } from '@/components/notifications/AudioPermissionPrompt';
import { useQRNotifications } from '@/hooks/useQRNotifications';

export default function DashboardShell() {
  // Phase 5: Unified ringtone system
  useQRNotifications();
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        
        <div className="flex flex-col flex-1">
          <header className="h-16 flex items-center border-b border-border bg-background px-4">
            <SidebarTrigger className="mr-4" />
            <Topbar />
          </header>
          
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet />
          </main>

          <MobileNav />
        </div>
      </div>
      
      {/* Audio permission prompt - shows once on first visit */}
      <AudioPermissionPrompt />
    </SidebarProvider>
  );
}