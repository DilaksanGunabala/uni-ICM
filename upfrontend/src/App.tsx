import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { MarksPage } from "@/pages/MarksPage";
import { MyMarksPage } from "@/pages/MyMarksPage";
import { ApprovalsPage } from "@/pages/ApprovalsPage";
import { UsersPage } from "@/pages/UsersPage";
import { SubjectsPage } from "@/pages/SubjectsPage";
import { DepartmentsPage } from "@/pages/DepartmentsPage";
import { AuditLogsPage } from "@/pages/AuditLogsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/marks" element={<MarksPage />} />
                <Route path="/my-marks" element={<MyMarksPage />} />
                <Route path="/approvals" element={<ApprovalsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/subjects" element={<SubjectsPage />} />
                <Route path="/departments" element={<DepartmentsPage />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
