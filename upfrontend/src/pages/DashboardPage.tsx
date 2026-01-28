import { useAuth } from "@/contexts/AuthContext";
import { SuperAdminDashboard } from "./dashboard/SuperAdminDashboard";
import { HODDashboard } from "./dashboard/HODDashboard";
import { LecturerDashboard } from "./dashboard/LecturerDashboard";
import { StudentDashboard } from "./dashboard/StudentDashboard";

export function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case "super_admin":
      return <SuperAdminDashboard />;
    case "hod":
      return <HODDashboard />;
    case "lecturer":
      return <LecturerDashboard />;
    case "student":
      return <StudentDashboard />;
    default:
      return <StudentDashboard />;
  }
}
