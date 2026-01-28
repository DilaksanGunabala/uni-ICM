import { useAuth } from "@/contexts/AuthContext";
import { RoleBadge } from "@/components/ui/role-badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Menu, Bell } from "lucide-react";

interface TopNavProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function TopNav({ onMenuClick, showMenuButton = true }: TopNavProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {showMenuButton && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">Marks Portal</span>
          </div>
        </div>

        {/* Right side */}
        {user && (
          <div className="flex items-center gap-3">
            <RoleBadge role={user.role} className="hidden sm:inline-flex" />
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                3
              </span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
