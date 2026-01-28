import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileSpreadsheet,
  CheckSquare,
  ClipboardList,
  Settings,
  X,
  GraduationCap,
  LogOut,
  ChevronsUpDown,
  User,
  Building,
  Building2,
  IdCard,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "hod", "lecturer", "student"],
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    roles: ["super_admin"],
  },
  {
    label: "Departments",
    href: "/departments",
    icon: Building2,
    roles: ["super_admin"],
  },
  {
    label: "Subjects",
    href: "/subjects",
    icon: BookOpen,
    roles: ["super_admin", "hod", "lecturer"],
  },
  {
    label: "Marks Management",
    href: "/marks",
    icon: FileSpreadsheet,
    roles: ["super_admin", "hod", "lecturer"],
  },
  {
    label: "Audit Logs",
    href: "/audit-logs",
    icon: ScrollText,
    roles: ["super_admin"],
  },
  {
    label: "Approvals",
    href: "/approvals",
    icon: CheckSquare,
    roles: ["hod"],
  },
  {
    label: "My Marks",
    href: "/my-marks",
    icon: ClipboardList,
    roles: ["student"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["super_admin", "hod", "lecturer", "student"],
  },
];

const roleLabels: Record<UserRole, string> = {
  super_admin: "Super Admin",
  hod: "Head of Department",
  lecturer: "Lecturer",
  student: "Student",
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(user.role)
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="font-semibold text-sm">Marks Portal</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {filteredItems.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Profile Section at Bottom */}
          <div className="border-t border-sidebar-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-sidebar-accent/50 transition-colors focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-offset-0">
                  <Avatar className="h-9 w-9 border-2 border-sidebar-border shrink-0">
                    {user.avatar && (
                      <AvatarImage src={user.avatar} alt={user.name} />
                    )}
                    <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary font-semibold text-sm">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-sidebar-foreground">
                      {user.name}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">
                      {roleLabels[user.role]}
                    </p>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/60 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-64 bg-popover border shadow-lg"
                side="top"
                align="start"
                sideOffset={8}
              >
                <div className="px-3 py-3">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building className="h-3 w-3" />
                      <span>{user.department || "No Department"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <IdCard className="h-3 w-3" />
                      <span>
                        {user.role === "student"
                          ? `Student ID: ${user.studentId || "N/A"}`
                          : `Employee ID: ${user.employeeId || "N/A"}`}
                      </span>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => { navigate('/settings'); onClose(); }}
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => { navigate('/settings'); onClose(); }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </>
  );
}
