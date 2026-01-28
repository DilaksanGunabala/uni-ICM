'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Role } from '@/types';
import { CheckSquare, Users, FileText, TrendingUp } from 'lucide-react';

export default function HODDashboard() {
  const stats = [
    {
      name: 'Pending Approvals',
      value: '12',
      icon: CheckSquare,
      color: 'bg-yellow-500',
    },
    {
      name: 'Department Faculty',
      value: '18',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: 'Approved Marks',
      value: '156',
      icon: FileText,
      color: 'bg-green-500',
    },
    {
      name: 'Department Avg',
      value: '78%',
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
  ];

  return (
    <DashboardLayout allowedRoles={[Role.HOD]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HOD Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Department overview and marks approval
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/dashboard/hod/marks-approval"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <CheckSquare className="h-6 w-6 text-primary-600 mb-2" />
              <h3 className="font-medium text-gray-900">Approve Marks</h3>
              <p className="text-sm text-gray-500">Review and approve pending marks</p>
            </a>
            <a
              href="/dashboard/hod/reports"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <FileText className="h-6 w-6 text-primary-600 mb-2" />
              <h3 className="font-medium text-gray-900">Department Reports</h3>
              <p className="text-sm text-gray-500">View and generate reports</p>
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
