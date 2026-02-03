'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Role } from '@/types';
import { api } from '@/lib/api';
import type { User, Department, PaginatedResponse } from '@/types';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Plus, Edit, Trash2, Search, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatRoleName, getRoleBadgeColor, handleApiError } from '@/lib/utils';

interface UserFormData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role_id: number;
  department_id?: number;
  employee_id?: string;
  student_id?: string;
  batch?: string;
  is_active: boolean;
}

// Helper function to extract batch from student_id (e.g., "E/20/123" -> "E20")
const extractBatchFromStudentId = (studentId: string | undefined): string => {
  if (!studentId) return '';
  const match = studentId.match(/([A-Z]+)[/.\-]?(\d{2})[/.\-]?\d*/i);
  if (match) {
    return `${match[1].toUpperCase()}${match[2]}`;
  }
  return '';
};

// Generate batch options (current year back to 2020)
const generateBatchOptions = (): string[] => {
  const currentYear = new Date().getFullYear();
  const batches: string[] = [];
  // Generate batches from current year back to 2020 (E26, E25, E24, ..., E20)
  for (let year = currentYear; year >= 2020; year--) {
    batches.push(`E${year.toString().slice(-2)}`);
  }
  return batches;
};

interface Filters {
  search: string;
  role_id?: number;
  department_id?: number;
  batch?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState<Filters>({
    search: '',
    role_id: undefined,
    department_id: undefined,
    batch: undefined,
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role_id: 4, // Default to STUDENT
    department_id: undefined,
    employee_id: '',
    student_id: '',
    batch: '',
    is_active: true,
  });

  const batchOptions = generateBatchOptions();

  const roles = [
    { id: 1, name: 'SUPER_ADMIN', label: 'Super Admin' },
    { id: 2, name: 'HOD', label: 'HOD' },
    { id: 3, name: 'LECTURER', label: 'Lecturer' },
    { id: 4, name: 'STUDENT', label: 'Student' },
  ];

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        page_size: pagination.pageSize,
      };

      if (filters.search) params.search = filters.search;
      if (filters.role_id) params.role_id = filters.role_id;
      if (filters.department_id) params.department_id = filters.department_id;
      if (filters.batch) params.batch = filters.batch;

      const response: PaginatedResponse<User> = await api.getUsers(params);
      setUsers(response.items);
      setPagination({
        page: response.page,
        pageSize: response.page_size,
        total: response.total,
        totalPages: response.total_pages,
      });
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await api.getDepartments({ page: 1, page_size: 100 });
      setDepartments(response.items);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, filters]);

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value });
    setPagination({ ...pagination, page: 1 });
  };

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, page: 1 });
  };

  const clearFilters = () => {
    setFilters({ search: '', role_id: undefined, department_id: undefined, batch: undefined });
    setPagination({ ...pagination, page: 1 });
  };

  const openCreateModal = () => {
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role_id: 4,
      department_id: undefined,
      employee_id: '',
      student_id: '',
      batch: '',
      is_active: true,
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '', // Don't populate password
      first_name: user.first_name,
      last_name: user.last_name,
      role_id: getRoleId(user.role),
      department_id: user.department_id || undefined,
      employee_id: user.employee_id || '',
      student_id: user.student_id || '',
      batch: extractBatchFromStudentId(user.student_id),
      is_active: user.is_active,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const getRoleId = (roleName: string): number => {
    const role = roles.find((r) => r.name === roleName);
    return role?.id || 4;
  };

  const handleCreateUser = async () => {
    try {
      setIsSubmitting(true);

      // Build user data
      const userData: any = {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role_id: formData.role_id,
        is_active: formData.is_active,
      };

      // Add optional fields based on role
      if (formData.department_id) {
        userData.department_id = formData.department_id;
      }

      if (formData.role_id === 4 && formData.student_id) {
        userData.student_id = formData.student_id;
      }

      if ((formData.role_id === 2 || formData.role_id === 3) && formData.employee_id) {
        userData.employee_id = formData.employee_id;
      }

      await api.createUser(userData);
      toast.success('User created successfully');
      setIsCreateModalOpen(false);
      fetchUsers();
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);

      const userData: any = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role_id: formData.role_id,
        is_active: formData.is_active,
      };

      // Add password only if provided
      if (formData.password) {
        userData.password = formData.password;
      }

      // Add optional fields
      if (formData.department_id) {
        userData.department_id = formData.department_id;
      }

      if (formData.role_id === 4 && formData.student_id) {
        userData.student_id = formData.student_id;
      }

      if ((formData.role_id === 2 || formData.role_id === 3) && formData.employee_id) {
        userData.employee_id = formData.employee_id;
      }

      await api.updateUser(selectedUser.id, userData);
      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);
      await api.deleteUser(selectedUser.id);
      toast.success('User deleted successfully');
      setIsDeleteDialogOpen(false);
      fetchUsers();
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const UserForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="label">First Name</label>
          <input
            id="first_name"
            type="text"
            className="input"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
          />
        </div>

        <div>
          <label htmlFor="last_name" className="label">Last Name</label>
          <input
            id="last_name"
            type="text"
            className="input"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="label">Email</label>
        <input
          id="email"
          type="email"
          className="input"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password {selectedUser && '(leave blank to keep unchanged)'}
        </label>
        <input
          id="password"
          type="password"
          className="input"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required={!selectedUser}
          placeholder={selectedUser ? 'Leave blank to keep current password' : ''}
        />
      </div>

      <div>
        <label htmlFor="role_id" className="label">Role</label>
        <select
          id="role_id"
          className="input"
          value={formData.role_id}
          onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })}
          required
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="department_id" className="label">Department</label>
        <select
          id="department_id"
          className="input"
          value={formData.department_id || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              department_id: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        >
          <option value="">None</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="batch" className="label">
          Batch {formData.role_id === 4 && <span className="text-red-500">*</span>}
        </label>
        <select
          id="batch"
          className="input"
          value={formData.batch || ''}
          onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
          required={formData.role_id === 4}
          disabled={formData.role_id !== 4}
        >
          <option value="">Select Batch</option>
          {batchOptions.map((batch) => (
            <option key={batch} value={batch}>
              {batch}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {formData.role_id === 4 ? 'e.g., E20 = 2020 intake, E21 = 2021 intake' : 'Only applicable for students'}
        </p>
      </div>

      <div>
        <label htmlFor="student_id" className="label">
          Student ID {formData.role_id === 4 && <span className="text-red-500">*</span>}
        </label>
        <input
          id="student_id"
          type="text"
          className="input"
          value={formData.student_id}
          onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
          placeholder="e.g., E/20/123"
          required={formData.role_id === 4}
          disabled={formData.role_id !== 4}
        />
        <p className="text-xs text-gray-500 mt-1">
          {formData.role_id === 4 ? 'Full student ID number' : 'Only applicable for students'}
        </p>
      </div>

      <div>
        <label htmlFor="employee_id" className="label">
          Employee ID {(formData.role_id === 2 || formData.role_id === 3) && <span className="text-red-500">*</span>}
        </label>
        <input
          id="employee_id"
          type="text"
          className="input"
          value={formData.employee_id}
          onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
          placeholder="e.g., EMP001"
          required={formData.role_id === 2 || formData.role_id === 3}
          disabled={formData.role_id !== 2 && formData.role_id !== 3}
        />
        <p className="text-xs text-gray-500 mt-1">
          {(formData.role_id === 2 || formData.role_id === 3) ? 'Staff employee ID' : 'Only applicable for HOD/Lecturer'}
        </p>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="mr-2"
        />
        <label htmlFor="is_active" className="text-sm text-gray-700">
          Active
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={() => {
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
          }}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={selectedUser ? handleUpdateUser : handleCreateUser}
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : selectedUser ? 'Update User' : 'Create User'}
        </button>
      </div>
    </div>
  );

  return (
    <DashboardLayout allowedRoles={[Role.SUPER_ADMIN]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage system users and their roles
            </p>
          </div>
          <button onClick={openCreateModal} className="btn-primary flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add User</span>
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  className="input pl-10"
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <select
                className="input"
                value={filters.role_id || ''}
                onChange={(e) =>
                  handleFilterChange('role_id', e.target.value ? parseInt(e.target.value) : undefined)
                }
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>

              <select
                className="input"
                value={filters.department_id || ''}
                onChange={(e) =>
                  handleFilterChange('department_id', e.target.value ? parseInt(e.target.value) : undefined)
                }
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>

              <select
                className="input"
                value={filters.batch || ''}
                onChange={(e) =>
                  handleFilterChange('batch', e.target.value || undefined)
                }
              >
                <option value="">All Batches</option>
                {batchOptions.map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))}
              </select>

              {(filters.search || filters.role_id || filters.department_id || filters.batch) && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Batch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user: any) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${getRoleBadgeColor(user.role_name || user.role)}`}>
                            {formatRoleName(user.role_name || user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {user.department_name || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {user.employee_id || user.student_id || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {user.student_id ? (
                              <span className="badge bg-blue-100 text-blue-800">
                                {extractBatchFromStudentId(user.student_id) || '-'}
                              </span>
                            ) : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`badge ${
                              user.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(user)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New User"
        size="lg"
      >
        <UserForm />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User"
        size="lg"
      >
        <UserForm />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete ${selectedUser?.first_name} ${selectedUser?.last_name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isSubmitting}
      />
    </DashboardLayout>
  );
}
