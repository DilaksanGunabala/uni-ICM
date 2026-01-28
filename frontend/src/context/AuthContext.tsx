'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { User, LoginRequest } from '@/types';
import { Role } from '@/types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Load user from localStorage on mount
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (storedUser && token) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Failed to load user from localStorage:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      console.log('AuthContext: Starting login...');
      setLoading(true);

      console.log('AuthContext: Calling api.login()...');
      const response = await api.login(credentials);

      console.log('AuthContext: API login successful, response:', response);
      console.log('AuthContext: Setting user state...');
      setUser(response.user);

      // Redirect based on role
      const dashboardRoutes: Record<Role, string> = {
        [Role.SUPER_ADMIN]: '/dashboard/super-admin',
        [Role.HOD]: '/dashboard/hod',
        [Role.LECTURER]: '/dashboard/lecturer',
        [Role.STUDENT]: '/dashboard/student',
      };

      console.log('AuthContext: User role:', response.user.role);
      const redirectPath = dashboardRoutes[response.user.role as Role] || '/dashboard';
      console.log('AuthContext: Redirect path:', redirectPath);

      console.log('AuthContext: Showing success toast...');
      toast.success(`Welcome, ${response.user.first_name}!`);

      console.log('AuthContext: Pushing to route:', redirectPath);
      router.push(redirectPath);

      console.log('AuthContext: Login completed successfully!');
    } catch (error: any) {
      console.error('AuthContext: Login failed with error:', error);
      console.error('AuthContext: Error type:', typeof error);
      console.error('AuthContext: Error stack:', error.stack);
      const message = error.response?.data?.detail || 'Login failed. Please check your credentials.';
      toast.error(message);
      throw error;
    } finally {
      console.log('AuthContext: Setting loading to false');
      setLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const hasRole = (role: Role): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: Role[]): boolean => {
    return user ? roles.includes(user.role as Role) : false;
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
