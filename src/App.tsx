import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
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
import Reports from './pages/dashboard/Reports';
import Settings from './pages/dashboard/Settings';
import ConfigurationCenter from './pages/dashboard/ConfigurationCenter';
import FinanceCenter from './pages/dashboard/FinanceCenter';
import Payments from './pages/dashboard/Payments';
import Wallets from './pages/dashboard/Wallets';
import PortalHome from "./pages/portal/Home";
import PortalRequests from "./pages/portal/Requests";
import PortalPayments from "./pages/portal/Payments";

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
            
            <Route path="/dashboard" element={<ProtectedRoute><DashboardShell /></ProtectedRoute>}>
              <Route index element={<Overview />} />
              <Route path="front-desk" element={<FrontDesk />} />
              <Route path="rooms" element={<Rooms />} />
              <Route path="categories" element={<RoleGuard allowedRoles={['owner', 'manager']}><RoomCategories /></RoleGuard>} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="guests" element={<Guests />} />
              <Route path="payments" element={<Payments />} />
              <Route path="wallets" element={<Wallets />} />
              <Route path="reports" element={<RoleGuard allowedRoles={['owner', 'manager']}><Reports /></RoleGuard>} />
              <Route path="configuration" element={<RoleGuard allowedRoles={['owner', 'manager']}><ConfigurationCenter /></RoleGuard>} />
              <Route path="finance" element={<RoleGuard allowedRoles={['owner', 'manager']}><FinanceCenter /></RoleGuard>} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="/portal" element={<ProtectedRoute><GuestPortalShell /></ProtectedRoute>}>
              <Route index element={<PortalHome />} />
              <Route path="requests" element={<PortalRequests />} />
              <Route path="payments" element={<PortalPayments />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
