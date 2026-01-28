'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Role } from '@/types';
import { Users, Building2, BookOpen, FileText } from 'lucide-react';

export default function SuperAdminDashboard() {
  const stats = [
    {
      name: 'Total Users',
      value: '156',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: 'Departments',
      value: '8',
      icon: Building2,
      color: 'bg-green-500',
    },
    {
      name: 'Subjects',
      value: '42',
      icon: BookOpen,
      color: 'bg-purple-500',
    },
    {
      name: 'Pending Marks',
      value: '23',
      icon: FileText,
      color: 'bg-yellow-500',
    },
  ];

  return (
    <DashboardLayout allowedRoles={[Role.SUPER_ADMIN]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of system statistics and activity
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className="card">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/dashboard/super-admin/users"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <Users className="h-6 w-6 text-primary-600 mb-2" />
              <h3 className="font-medium text-gray-900">Manage Users</h3>
              <p className="text-sm text-gray-500">Add, edit, or remove users</p>
            </a>
            <a
              href="/dashboard/super-admin/departments"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <Building2 className="h-6 w-6 text-primary-600 mb-2" />
              <h3 className="font-medium text-gray-900">Departments</h3>
              <p className="text-sm text-gray-500">Manage departments and HODs</p>
            </a>
            <a
              href="/dashboard/super-admin/subjects"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <BookOpen className="h-6 w-6 text-primary-600 mb-2" />
              <h3 className="font-medium text-gray-900">Subjects</h3>
              <p className="text-sm text-gray-500">Manage subjects and assignments</p>
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
