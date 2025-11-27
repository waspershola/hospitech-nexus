import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { ChatVisibilityProvider } from "./contexts/ChatVisibilityContext";
import { UpdateNotification } from "./components/offline/UpdateNotification";
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
import SpaDashboard from './pages/dashboard/SpaDashboard';
import LaundryDashboard from './pages/dashboard/LaundryDashboard';
import BillingCenter from './pages/dashboard/BillingCenter';
import GroupBillingCenter from './pages/GroupBillingCenter';
import ClosedFolios from './pages/dashboard/ClosedFolios';
import NightAudit from './pages/dashboard/NightAudit';
import AuditTrail from './pages/dashboard/AuditTrail';
import FinanceReports from './pages/dashboard/FinanceReports';
import Payments from './pages/dashboard/Payments';
import Wallets from './pages/dashboard/Wallets';
import Debtors from './pages/dashboard/Debtors';
import Inventory from './pages/dashboard/Inventory';
import Marketplace from './pages/dashboard/Marketplace';
import NavigationManager from './pages/dashboard/NavigationManager';
import { DepartmentRequestsTab } from './modules/inventory/DepartmentRequestsTab';
import PortalHome from "./pages/portal/Home";
import PortalRequests from "./pages/portal/Requests";
import PortalPayments from "./pages/portal/Payments";
import PlatformDashboard from "./pages/dashboard/platform/PlatformDashboard";
import PlatformBilling from "./pages/dashboard/platform/PlatformBilling";
import TenantDetail from "./pages/dashboard/platform/TenantDetail";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import ForcePasswordReset from "./pages/ForcePasswordReset";
import UsageMonitoring from "./pages/dashboard/UsageMonitoring";
import InvoiceManagement from "./pages/dashboard/InvoiceManagement";
import PaymentEnforcement from "./pages/dashboard/PaymentEnforcement";
import PlatformAnalytics from "./pages/dashboard/PlatformAnalytics";
import TenantHealthDashboard from "./pages/dashboard/TenantHealthDashboard";
import { usePlatformRole } from "./hooks/usePlatformRole";
import { Loader2 } from "lucide-react";

// Lazy load ALL QR portal components for better performance
const QRLandingPage = lazy(() => import("./components/qr-portal/QRLandingPage").then(m => ({ default: m.QRLandingPage })));
const QRServiceRequestForm = lazy(() => import("./components/qr-portal/QRServiceRequestForm").then(m => ({ default: m.QRServiceRequestForm })));
const QRChatInterface = lazy(() => import("./components/qr-portal/QRChatInterface").then(m => ({ default: m.QRChatInterface })));
const QRMenuBrowser = lazy(() => import("./components/qr-portal/QRMenuBrowser").then(m => ({ default: m.QRMenuBrowser })));
const QRWifiCredentials = lazy(() => import("./components/qr-portal/QRWifiCredentials").then(m => ({ default: m.QRWifiCredentials })));
const QRFeedback = lazy(() => import("./components/qr-portal/QRFeedback").then(m => ({ default: m.QRFeedback })));
const QRLaundryService = lazy(() => import("./components/qr-portal/QRLaundryService").then(m => ({ default: m.QRLaundryService })));
const QRSpaBooking = lazy(() => import("./components/qr-portal/QRSpaBooking").then(m => ({ default: m.QRSpaBooking })));
const QRDiningReservation = lazy(() => import("./components/qr-portal/QRDiningReservation").then(m => ({ default: m.QRDiningReservation })));
const QRRoomService = lazy(() => import("./components/qr-portal/QRRoomService").then(m => ({ default: m.QRRoomService })));
const QRHousekeepingService = lazy(() => import("./components/qr-portal/QRHousekeepingService").then(m => ({ default: m.QRHousekeepingService })));
const QROrderStatus = lazy(() => import("./components/qr-portal/QROrderStatus").then(m => ({ default: m.QROrderStatus })));
const QRRequestStatus = lazy(() => import("./components/qr-portal/QRRequestStatus").then(m => ({ default: m.QRRequestStatus })));
const QRPaymentHistory = lazy(() => import("./components/qr-portal/QRPaymentHistory"));
const QRRedirect = lazy(() => import("./components/qr-portal/QRRedirect").then(m => ({ default: m.QRRedirect })));

// Shared loading component for QR portal
const QRLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5">
    <div className="text-center space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
      <p className="text-muted-foreground animate-pulse">Loading...</p>
    </div>
  </div>
);

import { QRPortalWrapper } from "./components/qr-portal/QRPortalWrapper";

import QRManagement from "./pages/dashboard/QRManagement";
import GuestRequestsManagement from "./pages/dashboard/GuestRequestsManagement";
import DepartmentRequestsDashboard from "./pages/dashboard/DepartmentRequestsDashboard";
import QRAnalytics from "./pages/dashboard/QRAnalytics";
import QRPrintables from "./pages/dashboard/QRPrintables";
import QRPortalFeatures from "./pages/dashboard/QRPortalFeatures";
import QRPortalTheme from "./pages/dashboard/QRPortalTheme";
import WiFiManager from "./pages/dashboard/WiFiManager";
import MenuManagement from "./pages/dashboard/MenuManagement";
import ReservationsManagement from "./pages/dashboard/ReservationsManagement";
import LaundryManagement from "./pages/dashboard/LaundryManagement";
import SpaManagement from "./pages/dashboard/SpaManagement";
import QuickReplyTemplatesManagement from "./pages/dashboard/QuickReplyTemplatesManagement";
import QRBillingTasks from "./pages/dashboard/QRBillingTasks";
import OfflineDiagnosticsPage from "./pages/dashboard/OfflineDiagnostics";
import FAQManagement from './pages/dashboard/FAQManagement';
import SOPManagement from './pages/dashboard/SOPManagement';
import AIConciergeSetting from './pages/dashboard/AIConciergeSetting';

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
        <ChatVisibilityProvider>
          <Toaster />
          <Sonner />
          {/* Offline Desktop Auto-Update Notification (Electron only) */}
          <UpdateNotification />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/force-password-reset" element={<ForcePasswordReset />} />
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
              <Route path="marketplace" element={<Marketplace />} />
              <Route path="inventory" element={<RoleGuard allowedRoles={['owner', 'manager', 'store_manager', 'procurement']}><Inventory /></RoleGuard>} />
              <Route path="stock-requests" element={<RoleGuard allowedRoles={['housekeeping','maintenance','restaurant','kitchen','bar','supervisor']}><DepartmentRequestsTab /></RoleGuard>} />
              <Route path="debtors" element={<RoleGuard allowedRoles={['owner', 'manager', 'finance', 'accountant']}><Debtors /></RoleGuard>} />
              <Route path="reports" element={<RoleGuard allowedRoles={['owner', 'manager', 'finance', 'accountant']}><Reports /></RoleGuard>} />
              {/* Redirects for backward compatibility */}
              <Route path="configuration" element={<Navigate to="/dashboard/configuration-center" replace />} />
              <Route path="finance" element={<Navigate to="/dashboard/finance-center" replace />} />
              
              <Route path="configuration-center" element={<RoleGuard allowedRoles={['owner', 'manager']}><ConfigurationCenter /></RoleGuard>} />
              <Route path="finance-center" element={<RoleGuard allowedRoles={['owner', 'manager', 'finance', 'accountant']}><FinanceCenter /></RoleGuard>} />
              <Route path="billing/:folioId" element={<RoleGuard allowedRoles={['owner', 'manager', 'finance', 'accountant']}><BillingCenter /></RoleGuard>} />
              <Route path="group-billing/:groupId" element={<RoleGuard allowedRoles={['owner', 'manager', 'finance', 'accountant']}><GroupBillingCenter /></RoleGuard>} />
              <Route path="folios/closed" element={<RoleGuard allowedRoles={['owner', 'manager', 'finance', 'accountant']}><ClosedFolios /></RoleGuard>} />
              <Route path="night-audit" element={<RoleGuard allowedRoles={['owner', 'manager', 'finance', 'accountant']}><NightAudit /></RoleGuard>} />
              <Route path="audit" element={<RoleGuard allowedRoles={['owner', 'manager']}><AuditTrail /></RoleGuard>} />
              <Route path="finance/reports" element={<RoleGuard allowedRoles={['owner', 'manager', 'finance', 'accountant']}><FinanceReports /></RoleGuard>} />
              
              {/* Department-specific dashboards */}
              <Route path="finance-dashboard" element={<RoleGuard allowedRoles={['owner', 'manager', 'finance', 'accountant']}><FinanceDashboard /></RoleGuard>} />
              <Route path="housekeeping-dashboard" element={<RoleGuard allowedRoles={['owner', 'manager', 'housekeeping', 'supervisor']}><HousekeepingDashboard /></RoleGuard>} />
              <Route path="maintenance-dashboard" element={<RoleGuard allowedRoles={['owner', 'manager', 'maintenance', 'supervisor']}><MaintenanceDashboard /></RoleGuard>} />
              <Route path="kitchen-dashboard" element={<RoleGuard allowedRoles={['owner', 'manager', 'restaurant', 'kitchen', 'supervisor']}><KitchenDashboard /></RoleGuard>} />
              <Route path="bar-dashboard" element={<RoleGuard allowedRoles={['owner', 'manager', 'bar', 'supervisor']}><BarDashboard /></RoleGuard>} />
              <Route path="spa-dashboard" element={<RoleGuard allowedRoles={['owner', 'manager', 'spa', 'supervisor']}><SpaDashboard /></RoleGuard>} />
              <Route path="laundry-dashboard" element={<RoleGuard allowedRoles={['owner', 'manager', 'housekeeping', 'laundry', 'supervisor']}><LaundryDashboard /></RoleGuard>} />
              <Route path="qr-management" element={<RoleGuard allowedRoles={['owner', 'manager']}><QRManagement /></RoleGuard>} />
              <Route path="guest-requests" element={<GuestRequestsManagement />} />
              <Route path="department-requests" element={<DepartmentRequestsDashboard />} />
              <Route path="qr-billing-tasks" element={<RoleGuard allowedRoles={['owner', 'manager', 'frontdesk', 'finance']}><QRBillingTasks /></RoleGuard>} />
              <Route path="qr-analytics" element={<RoleGuard allowedRoles={['owner', 'manager']}><QRAnalytics /></RoleGuard>} />
              <Route path="qr-printables" element={<RoleGuard allowedRoles={['owner', 'manager']}><QRPrintables /></RoleGuard>} />
              <Route path="qr-portal-features" element={<RoleGuard allowedRoles={['owner', 'manager']}><QRPortalFeatures /></RoleGuard>} />
              <Route path="qr-portal-theme" element={<RoleGuard allowedRoles={['owner', 'manager']}><QRPortalTheme /></RoleGuard>} />
              <Route path="wifi-manager" element={<RoleGuard allowedRoles={['owner', 'manager']}><WiFiManager /></RoleGuard>} />
              <Route path="menu-management" element={<RoleGuard allowedRoles={['owner', 'manager', 'restaurant', 'kitchen']}><MenuManagement /></RoleGuard>} />
              <Route path="reservations-management" element={<RoleGuard allowedRoles={['owner', 'manager', 'restaurant', 'frontdesk']}><ReservationsManagement /></RoleGuard>} />
              <Route path="laundry-management" element={<RoleGuard allowedRoles={['owner', 'manager', 'housekeeping']}><LaundryManagement /></RoleGuard>} />
              <Route path="spa-management" element={<RoleGuard allowedRoles={['owner', 'manager', 'spa']}><SpaManagement /></RoleGuard>} />
              <Route path="quick-reply-templates" element={<RoleGuard allowedRoles={['owner', 'manager']}><QuickReplyTemplatesManagement /></RoleGuard>} />
              
          <Route path="settings" element={<Settings />} />
          <Route path="offline-diagnostics" element={<RoleGuard allowedRoles={['owner', 'manager']}><OfflineDiagnosticsPage /></RoleGuard>} />
          <Route path="faq-management" element={<RoleGuard allowedRoles={['owner', 'manager']}><FAQManagement /></RoleGuard>} />
          <Route path="sop-management" element={<RoleGuard allowedRoles={['owner', 'manager']}><SOPManagement /></RoleGuard>} />
          <Route path="ai-concierge" element={<RoleGuard allowedRoles={['owner', 'manager']}><AIConciergeSetting /></RoleGuard>} />
          <Route path="user-roles" element={<RoleGuard allowedRoles={['owner']}><UserRoles /></RoleGuard>} />
          <Route path="navigation-manager" element={<RoleGuard allowedRoles={['owner']}><NavigationManager /></RoleGuard>} />
          <Route path="staff" element={<RoleGuard allowedRoles={['owner', 'manager', 'supervisor']}><Staff /></RoleGuard>} />
          <Route path="staff-activity" element={<RoleGuard allowedRoles={['owner', 'manager', 'supervisor']}><StaffActivity /></RoleGuard>} />
          
          {/* Platform Admin - Main Dashboard */}
          <Route path="platform-admin" element={<PlatformGuard><PlatformDashboard /></PlatformGuard>} />
          <Route path="platform/tenants/:tenantId" element={<PlatformGuard><TenantDetail /></PlatformGuard>} />
          
          {/* Platform Admin - Specific Sections (redirect to main dashboard with tab) */}
          <Route path="platform-users" element={<Navigate to="/dashboard/platform-admin?tab=users" replace />} />
          <Route path="platform-tenants" element={<Navigate to="/dashboard/platform-admin?tab=tenants" replace />} />
          <Route path="platform-plans" element={<Navigate to="/dashboard/platform-admin?tab=plans" replace />} />
          <Route path="platform-marketplace" element={<Navigate to="/dashboard/platform-admin?tab=marketplace" replace />} />
          <Route path="platform-email" element={<Navigate to="/dashboard/platform-admin?tab=email-providers" replace />} />
          <Route path="platform-features" element={<Navigate to="/dashboard/platform-admin?tab=feature-flags" replace />} />
          <Route path="platform-navigation" element={<Navigate to="/dashboard/platform-admin?tab=navigation" replace />} />
          <Route path="platform-support" element={<Navigate to="/dashboard/platform-admin?tab=support" replace />} />
          
          {/* Platform Billing & Analytics */}
          <Route path="platform-billing" element={<PlatformGuard><PlatformBilling /></PlatformGuard>} />
          <Route path="platform-analytics" element={<PlatformGuard><PlatformAnalytics /></PlatformGuard>} />
          <Route path="platform-usage" element={<PlatformGuard><UsageMonitoring /></PlatformGuard>} />
          <Route path="platform-invoices" element={<PlatformGuard><InvoiceManagement /></PlatformGuard>} />
          <Route path="platform-enforcement" element={<PlatformGuard><PaymentEnforcement /></PlatformGuard>} />
          <Route path="platform-health" element={<PlatformGuard><TenantHealthDashboard /></PlatformGuard>} />
            </Route>

            <Route path="/portal" element={<ProtectedRoute><GuestPortalShell /></ProtectedRoute>}>
              <Route index element={<PortalHome />} />
              <Route path="requests" element={<PortalRequests />} />
              <Route path="payments" element={<PortalPayments />} />
            </Route>

            {/* Payment callback routes */}
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />

            {/* QR Portal - Public routes with global notification wrapper */}
            <Route path="/qr/:token/*" element={
              <Suspense fallback={<QRLoadingFallback />}>
                <QRPortalWrapper>
                  <Routes>
                    <Route index element={<QRLandingPage />} />
                    <Route path="service/:service" element={<QRServiceRequestForm />} />
                    <Route path="chat/:requestId" element={<QRChatInterface />} />
                    <Route path="menu" element={<QRMenuBrowser />} />
                    <Route path="wifi" element={<QRWifiCredentials />} />
                    <Route path="feedback" element={<QRFeedback />} />
                    <Route path="laundry" element={<QRLaundryService />} />
                    <Route path="spa" element={<QRSpaBooking />} />
                    <Route path="housekeeping" element={<QRHousekeepingService />} />
                    <Route path="dining" element={<QRDiningReservation />} />
                    <Route path="room-service" element={<QRRoomService />} />
                    <Route path="order/:orderId" element={<QROrderStatus />} />
                    <Route path="request-status/:requestId" element={<QRRequestStatus />} />
                    <Route path="payment-history" element={<QRPaymentHistory />} />
                    <Route path="redirect" element={<QRRedirect />} />
                  </Routes>
                </QRPortalWrapper>
              </Suspense>
            } />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </ChatVisibilityProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
