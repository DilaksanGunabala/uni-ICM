'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Role } from '@/types';
import { BookOpen, FileText, TrendingUp, Award } from 'lucide-react';

export default function StudentDashboard() {
  const stats = [
    {
      name: 'Enrolled Subjects',
      value: '6',
      icon: BookOpen,
      color: 'bg-blue-500',
    },
    {
      name: 'Assessments',
      value: '24',
      icon: FileText,
      color: 'bg-purple-500',
    },
    {
      name: 'Average Score',
      value: '82%',
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      name: 'Current Grade',
      value: 'A-',
      icon: Award,
      color: 'bg-yellow-500',
    },
  ];

  return (
    <DashboardLayout allowedRoles={[Role.STUDENT]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            View your marks and academic progress
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/dashboard/student/marks"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <FileText className="h-6 w-6 text-primary-600 mb-2" />
              <h3 className="font-medium text-gray-900">My Marks</h3>
              <p className="text-sm text-gray-500">View all your marks and grades</p>
            </a>
            <a
              href="/dashboard/student/reports"
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <Award className="h-6 w-6 text-primary-600 mb-2" />
              <h3 className="font-medium text-gray-900">Reports</h3>
              <p className="text-sm text-gray-500">Download academic reports</p>
            </a>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Marks</h2>
          <p className="text-sm text-gray-500">
            Your recent assessment results will appear here.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
