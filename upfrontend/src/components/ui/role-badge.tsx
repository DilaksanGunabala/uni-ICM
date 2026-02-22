import { cn } from "@/lib/utils";
import { UserRole } from "@/types";
import { Shield, GraduationCap, BookOpen, User, Star, Briefcase } from "lucide-react";

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
  showIcon?: boolean;
}

const roleConfig: Record<UserRole, { label: string; className: string; icon: typeof Shield }> = {
  super_admin: {
    label: 'Super Admin',
    className: 'bg-primary text-primary-foreground',
    icon: Shield,
  },
  dean: {
    label: 'Dean',
    className: 'bg-violet-600 text-white',
    icon: Star,
  },
  hod: {
    label: 'HOD',
    className: 'bg-primary/80 text-primary-foreground',
    icon: GraduationCap,
  },
  lecturer: {
    label: 'Lecturer',
    className: 'bg-primary/60 text-primary-foreground',
    icon: BookOpen,
  },
  instructor: {
    label: 'Instructor',
    className: 'bg-primary/40 text-primary-foreground',
    icon: Briefcase,
  },
  student: {
    label: 'Student',
    className: 'bg-muted text-muted-foreground',
    icon: User,
  },
};

export function RoleBadge({ role, className, showIcon = true }: RoleBadgeProps) {
  const config = roleConfig[role];
  const Icon = config.icon;
  
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  );
}
