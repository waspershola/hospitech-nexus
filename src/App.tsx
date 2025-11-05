import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Onboard from './pages/auth/Onboard';
import PasswordChangeRequired from './pages/auth/PasswordChangeRequired';
import ProtectedRoute from "./components/ProtectedRoute";
import RoleGuard from "./components/RoleGuard";
import DashboardShell from "./components/layout/DashboardShell";
import GuestPortalShell from "./components/layout/GuestPortalShell";
import Overview from './pages/dashboard/Overview';
import FrontDesk from './pages/dashboard/FrontDesk';
import Rooms from './pages/dashboard/Rooms';
import RoomCategories from './pages/dashboard/RoomCategories';
import Bookings from './pages/dashboard/Bookings';
import Guests from './pages/dashboard/Guests';
import GuestProfile from './pages/dashboard/GuestProfile';
import Reports from './pages/dashboard/Reports';
import Settings from './pages/dashboard/Settings';
import UserRoles from './pages/dashboard/UserRoles';
import Staff from './pages/dashboard/Staff';
import StaffActivity from './pages/dashboard/StaffActivity';
import ConfigurationCenter from './pages/dashboard/ConfigurationCenter';
import FinanceCenter from './pages/dashboard/FinanceCenter';
import FinanceDashboard from './pages/dashboard/FinanceDashboard';
import HousekeepingDashboard from './pages/dashboard/HousekeepingDashboard';
import MaintenanceDashboard from './pages/dashboard/MaintenanceDashboard';
import KitchenDashboard from './pages/dashboard/KitchenDashboard';
import BarDashboard from './pages/dashboard/BarDashboard';
import Payments from './pages/dashboard/Payments';
import Wallets from './pages/dashboard/Wallets';
import Debtors from './pages/dashboard/Debtors';
import Inventory from './pages/dashboard/Inventory';
import NavigationManager from './pages/dashboard/NavigationManager';
import { DepartmentRequestsTab } from './modules/inventory/DepartmentRequestsTab';
import PortalHome from "./pages/portal/Home";
import PortalRequests from "./pages/portal/Requests";
import PortalPayments from "./pages/portal/Payments";
import PlatformDashboard from "./pages/dashboard/platform/PlatformDashboard";
import PlatformBilling from "./pages/dashboard/platform/PlatformBilling";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import { usePlatformRole } from "./hooks/usePlatformRole";

function PlatformGuard({ children }: { children: React.ReactNode }) {
  const { isPlatformAdmin, isLoading } = usePlatformRole();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />;
  
  return <>{children}</>;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/onboard" element={<Onboard />} />
        <Route path="/auth/password-change" element={<PasswordChangeRequired />} />
            
            <Route path="/dashboard" element={<ProtectedRoute><DashboardShell /></ProtectedRoute>}>
              <Route index element={<Overview />} />
              <Route path="front-desk" element={<FrontDesk />} />
              <Route path="rooms" element={<Rooms />} />
              <Route path="room-categories" element={<RoleGuard allowedRoles={['owner', 'manager']}><RoomCategories /></RoleGuard>} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="guests" element={<Guests />} />
              <Route path="guests/:id" element={<GuestProfile />} />
              <Route path="payments" element={<Payments />} />
              <Route path="wallets" element={<Wallets />} />
              <Route path="inventory" element={<RoleGuard allowedRoles={['owner', 'manager', 'store_manager', 'procurement']}><Inventory /></RoleGuard>} />
              <Route path="stock-requests" element={<RoleGuard allowedRoles={['housekeeping','maintenance','restaurant','kitchen','bar','supervisor']}><DepartmentRequestsTab /></RoleGuard>} />
              <Route path="debtors" element={<RoleGuard allowedRoles={['owner', 'manager', 'finance', 'accountant']}><Debtors /></RoleGuard>} />
              <Route path="reports" element={<RoleGuard allowedRoles={['owner', 'manager', 'finance', 'accountant']}><Reports /></RoleGuard>} />
              {/* Redirects for backward compatibility */}
              <Route path="configuration" element={<Navigate to="/dashboard/configuration-center" replace />} />
              <Route path="finance" element={<Navigate to="/dashboard/finance-center" replace />} />
              
              <Route path="configuration-center" element={<RoleGuard allowedRoles={['owner', 'manager']}><ConfigurationCenter /></RoleGuard>} />
              <Route path="finance-center" element={<RoleGuard allowedRoles={['owner', 'manager', 'finance', 'accountant']}><FinanceCenter /></RoleGuard>} />
              
              {/* Department-specific dashboards */}
              <Route path="finance-dashboard" element={<RoleGuard allowedRoles={['owner', 'manager', 'finance', 'accountant']}><FinanceDashboard /></RoleGuard>} />
              <Route path="housekeeping-dashboard" element={<RoleGuard allowedRoles={['owner', 'manager', 'housekeeping', 'supervisor']}><HousekeepingDashboard /></RoleGuard>} />
              <Route path="maintenance-dashboard" element={<RoleGuard allowedRoles={['owner', 'manager', 'maintenance', 'supervisor']}><MaintenanceDashboard /></RoleGuard>} />
              <Route path="kitchen-dashboard" element={<RoleGuard allowedRoles={['owner', 'manager', 'restaurant', 'kitchen', 'supervisor']}><KitchenDashboard /></RoleGuard>} />
              <Route path="bar-dashboard" element={<RoleGuard allowedRoles={['owner', 'manager', 'bar', 'supervisor']}><BarDashboard /></RoleGuard>} />
              
          <Route path="settings" element={<Settings />} />
          <Route path="user-roles" element={<RoleGuard allowedRoles={['owner']}><UserRoles /></RoleGuard>} />
          <Route path="navigation-manager" element={<RoleGuard allowedRoles={['owner']}><NavigationManager /></RoleGuard>} />
          <Route path="staff" element={<RoleGuard allowedRoles={['owner', 'manager', 'supervisor']}><Staff /></RoleGuard>} />
          <Route path="staff-activity" element={<RoleGuard allowedRoles={['owner', 'manager', 'supervisor']}><StaffActivity /></RoleGuard>} />
          
          {/* Platform Admin - Main Dashboard */}
          <Route path="platform-admin" element={<PlatformGuard><PlatformDashboard /></PlatformGuard>} />
          
          {/* Platform Admin - Specific Sections (redirect to main dashboard with tab) */}
          <Route path="platform-users" element={<Navigate to="/dashboard/platform-admin?tab=users" replace />} />
          <Route path="platform-tenants" element={<Navigate to="/dashboard/platform-admin?tab=tenants" replace />} />
          <Route path="platform-plans" element={<Navigate to="/dashboard/platform-admin?tab=plans" replace />} />
          <Route path="platform-marketplace" element={<Navigate to="/dashboard/platform-admin?tab=marketplace" replace />} />
          <Route path="platform-email" element={<Navigate to="/dashboard/platform-admin?tab=email-providers" replace />} />
          <Route path="platform-features" element={<Navigate to="/dashboard/platform-admin?tab=feature-flags" replace />} />
          <Route path="platform-navigation" element={<Navigate to="/dashboard/platform-admin?tab=navigation" replace />} />
          <Route path="platform-support" element={<Navigate to="/dashboard/platform-admin?tab=support" replace />} />
          
          {/* Platform Billing - Separate Page */}
          <Route path="platform-billing" element={<PlatformGuard><PlatformBilling /></PlatformGuard>} />
            </Route>

            <Route path="/portal" element={<ProtectedRoute><GuestPortalShell /></ProtectedRoute>}>
              <Route index element={<PortalHome />} />
              <Route path="requests" element={<PortalRequests />} />
              <Route path="payments" element={<PortalPayments />} />
            </Route>

            {/* Payment callback routes */}
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
