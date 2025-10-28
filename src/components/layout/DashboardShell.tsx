import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileNav from './MobileNav';

export default function DashboardShell() {
  return (
    <div className="flex h-screen bg-offWhite text-charcoal">
      <Sidebar />
      
      <div className="flex flex-col flex-1 w-full">
        <Topbar />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-cardWhite md:rounded-tl-3xl shadow-inner">
          <Outlet />
        </main>

        <MobileNav />
      </div>
    </div>
  );
}