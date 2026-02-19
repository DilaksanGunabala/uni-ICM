import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, type UserRole } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { RegisterDeanPage } from "@/pages/register/RegisterDeanPage";
import { RegisterHODPage } from "@/pages/register/RegisterHODPage";
import { RegisterLecturerPage } from "@/pages/register/RegisterLecturerPage";
import { RegisterInstructorPage } from "@/pages/register/RegisterInstructorPage";
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

function RoleGuard({ allowedRoles, children }: { allowedRoles: UserRole[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

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
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/register/student" element={<RegisterPage />} />
              <Route path="/register/dean" element={<RegisterDeanPage />} />
              <Route path="/register/hod" element={<RegisterHODPage />} />
              <Route path="/register/lecturer" element={<RegisterLecturerPage />} />
              <Route path="/register/instructor" element={<RegisterInstructorPage />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route
                  path="/marks"
                  element={
                    <RoleGuard allowedRoles={["lecturer", "instructor", "hod", "super_admin"]}>
                      <MarksPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/my-marks"
                  element={
                    <RoleGuard allowedRoles={["student"]}>
                      <MyMarksPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/approvals"
                  element={
                    <RoleGuard allowedRoles={["dean", "hod", "super_admin"]}>
                      <ApprovalsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <RoleGuard allowedRoles={["super_admin"]}>
                      <UsersPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/subjects"
                  element={
                    <RoleGuard allowedRoles={["super_admin", "dean", "hod", "lecturer", "instructor"]}>
                      <SubjectsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/departments"
                  element={
                    <RoleGuard allowedRoles={["super_admin", "dean"]}>
                      <DepartmentsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/audit-logs"
                  element={
                    <RoleGuard allowedRoles={["super_admin", "dean"]}>
                      <AuditLogsPage />
                    </RoleGuard>
                  }
                />
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
