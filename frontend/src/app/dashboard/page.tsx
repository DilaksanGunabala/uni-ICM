'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      const dashboardRoutes: Record<Role, string> = {
        [Role.SUPER_ADMIN]: '/dashboard/super-admin',
        [Role.HOD]: '/dashboard/hod',
        [Role.LECTURER]: '/dashboard/lecturer',
        [Role.STUDENT]: '/dashboard/student',
      };

      const route = dashboardRoutes[user.role as Role];
      if (route) {
        router.push(route);
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
