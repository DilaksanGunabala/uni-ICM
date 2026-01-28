'use client';

import { useAuth } from '@/context/AuthContext';
import { formatRoleName } from '@/lib/utils';
import { LogOut, User } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              University Marks Management
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-500" />
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{formatRoleName(user.role)}</p>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
