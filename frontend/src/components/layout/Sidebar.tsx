'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types';
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  UserCheck,
  FileText,
  CheckSquare,
  FileBarChart,
  ClipboardList,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles: Role[];
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: [Role.SUPER_ADMIN, Role.HOD, Role.LECTURER, Role.STUDENT],
  },
  // Super Admin
  {
    name: 'Users',
    href: '/dashboard/super-admin/users',
    icon: Users,
    roles: [Role.SUPER_ADMIN],
  },
  {
    name: 'Departments',
    href: '/dashboard/super-admin/departments',
    icon: Building2,
    roles: [Role.SUPER_ADMIN],
  },
  {
    name: 'Subjects',
    href: '/dashboard/super-admin/subjects',
    icon: BookOpen,
    roles: [Role.SUPER_ADMIN],
  },
  {
    name: 'Enrollments',
    href: '/dashboard/super-admin/enrollments',
    icon: UserCheck,
    roles: [Role.SUPER_ADMIN],
  },
  {
    name: 'Audit Logs',
    href: '/dashboard/super-admin/audit-logs',
    icon: ClipboardList,
    roles: [Role.SUPER_ADMIN],
  },
  // HOD
  {
    name: 'Marks Approval',
    href: '/dashboard/hod/marks-approval',
    icon: CheckSquare,
    roles: [Role.HOD],
  },
  {
    name: 'Reports',
    href: '/dashboard/hod/reports',
    icon: FileBarChart,
    roles: [Role.HOD],
  },
  // Lecturer
  {
    name: 'My Subjects',
    href: '/dashboard/lecturer/subjects',
    icon: BookOpen,
    roles: [Role.LECTURER],
  },
  {
    name: 'Marks Entry',
    href: '/dashboard/lecturer/marks',
    icon: FileText,
    roles: [Role.LECTURER],
  },
  // Student
  {
    name: 'My Marks',
    href: '/dashboard/student/marks',
    icon: FileText,
    roles: [Role.STUDENT],
  },
  {
    name: 'My Reports',
    href: '/dashboard/student/reports',
    icon: FileBarChart,
    roles: [Role.STUDENT],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const userRole = user.role as Role;
  const filteredNav = navigation.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <nav className="px-3 py-4 space-y-1">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
