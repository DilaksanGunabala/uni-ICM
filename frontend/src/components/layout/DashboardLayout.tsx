'use client';

import { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Role } from '@/types';

interface DashboardLayoutProps {
  children: ReactNode;
  allowedRoles?: Role[];
}

export default function DashboardLayout({ children, allowedRoles }: DashboardLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
