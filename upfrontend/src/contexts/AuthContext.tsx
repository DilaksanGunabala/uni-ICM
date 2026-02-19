import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import type { BackendUser } from '@/lib/api';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

// Map backend roles to frontend UserRole type
export type UserRole = 'super_admin' | 'dean' | 'hod' | 'lecturer' | 'instructor' | 'student';

export interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  departmentId?: number;
  department?: string;
  employeeId?: string;
  studentId?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Convert backend user to frontend user format
function convertBackendUser(backendUser: BackendUser): User {
  // Map backend role names to frontend format
  const roleMap: Record<string, UserRole> = {
    'SUPER_ADMIN': 'super_admin',
    'DEAN': 'dean',
    'HOD': 'hod',
    'LECTURER': 'lecturer',
    'INSTRUCTOR': 'instructor',
    'STUDENT': 'student',
  };

  const role = backendUser.role || backendUser.role_name || 'STUDENT';

  return {
    id: backendUser.id.toString(),
    name: `${backendUser.first_name} ${backendUser.last_name}`,
    firstName: backendUser.first_name,
    lastName: backendUser.last_name,
    email: backendUser.email,
    role: roleMap[role] || 'student',
    departmentId: backendUser.department_id,
    department: backendUser.department_name || undefined,
    employeeId: backendUser.employee_id,
    studentId: backendUser.student_id,
    avatar: api.getAvatarUrl(backendUser.avatar_url) || undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (storedUser && token) {
          const backendUser: BackendUser = JSON.parse(storedUser);
          setUser(convertBackendUser(backendUser));
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

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('Attempting login to backend...');

      const response = await api.login({ email, password });

      console.log('Login successful:', response);

      // Convert backend user to frontend format
      const frontendUser = convertBackendUser(response.user);
      setUser(frontendUser);

      toast.success(`Welcome, ${frontendUser.name}!`);
      return true;
    } catch (error: unknown) {
      console.error('Login failed:', error);
      const axiosError = error as AxiosError<{ detail?: string }>;
      const message = axiosError.response?.data?.detail || 'Login failed. Please check your credentials.';
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    toast.success('Logged out successfully');
  };

  const refreshUser = async () => {
    try {
      const backendUser = await api.getCurrentUser();
      const frontendUser = convertBackendUser(backendUser);
      setUser(frontendUser);
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(backendUser));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        refreshUser,
        updateUser,
        isAuthenticated: !!user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
