import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DashboardLayout } from "@/components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import InvestmentPlans from "./pages/InvestmentPlans";
import Tasks from "./pages/Tasks";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              } />
              <Route path="/plans" element={
                <DashboardLayout>
                  <InvestmentPlans />
                </DashboardLayout>
              } />
              <Route path="/tasks" element={
                <DashboardLayout>
                  <Tasks />
                </DashboardLayout>
              } />
              <Route path="/deposit" element={
                <DashboardLayout>
                  <Deposit />
                </DashboardLayout>
              } />
              <Route path="/withdraw" element={
                <DashboardLayout>
                  <Withdraw />
                </DashboardLayout>
              } />
              <Route path="/profile" element={
                <DashboardLayout>
                  <Profile />
                </DashboardLayout>
              } />
              <Route path="/admin" element={
                <DashboardLayout>
                  <Admin />
                </DashboardLayout>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
