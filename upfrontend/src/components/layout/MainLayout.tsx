import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";

export function MainLayout() {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="page-container animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
