'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Role } from '@/types';
import { api } from '@/lib/api';
import type { Department, User, PaginatedResponse } from '@/types';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { handleApiError } from '@/lib/utils';

interface DepartmentFormData {
  name: string;
  code: string;
  description?: string;
  hod_id?: number;
  is_active: boolean;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    code: '',
    description: '',
    hod_id: undefined,
    is_active: true,
  });

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        page_size: pagination.pageSize,
      };

      if (searchTerm) params.search = searchTerm;

      const response: PaginatedResponse<Department> = await api.getDepartments(params);
      setDepartments(response.items);
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

  // Fetch HOD users
  const fetchHODs = async () => {
    try {
      const response = await api.getUsers({ role_id: 2, page: 1, page_size: 100 });
      setUsers(response.items);
    } catch (error) {
      console.error('Failed to fetch HODs:', error);
    }
  };

  useEffect(() => {
    fetchHODs();
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [pagination.page, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination({ ...pagination, page: 1 });
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      hod_id: undefined,
      is_active: true,
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (department: Department) => {
    setSelectedDepartment(department);
    setFormData({
      name: department.name,
      code: department.code,
      description: department.description || '',
      hod_id: department.hod_id || undefined,
      is_active: department.is_active,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (department: Department) => {
    setSelectedDepartment(department);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateDepartment = async () => {
    try {
      setIsSubmitting(true);
      await api.createDepartment(formData);
      toast.success('Department created successfully');
      setIsCreateModalOpen(false);
      fetchDepartments();
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDepartment = async () => {
    if (!selectedDepartment) return;

    try {
      setIsSubmitting(true);
      await api.updateDepartment(selectedDepartment.id, formData);
      toast.success('Department updated successfully');
      setIsEditModalOpen(false);
      fetchDepartments();
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return;

    try {
      setIsSubmitting(true);
      await api.deleteDepartment(selectedDepartment.id);
      toast.success('Department deleted successfully');
      setIsDeleteDialogOpen(false);
      fetchDepartments();
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const DepartmentForm = () => (
    <div className="space-y-4">
      <div>
        <label className="label">Department Name</label>
        <input
          type="text"
          className="input"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., Computer Science & Engineering"
        />
      </div>

      <div>
        <label className="label">Department Code</label>
        <input
          type="text"
          className="input"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          required
          placeholder="e.g., CSE"
        />
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          className="input"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the department"
        />
      </div>

      <div>
        <label className="label">Head of Department (HOD)</label>
        <select
          className="input"
          value={formData.hod_id || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              hod_id: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        >
          <option value="">Select HOD</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.first_name} {user.last_name} ({user.email})
            </option>
          ))}
        </select>
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
          onClick={selectedDepartment ? handleUpdateDepartment : handleCreateDepartment}
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Saving...'
            : selectedDepartment
            ? 'Update Department'
            : 'Create Department'}
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
            <h1 className="text-2xl font-bold text-gray-900">Departments Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage academic departments and HODs</p>
          </div>
          <button onClick={openCreateModal} className="btn-primary flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add Department</span>
          </button>
        </div>

        {/* Search */}
        <div className="card">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search departments..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => handleSearch('')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Departments Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No departments found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        HOD
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
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
                    {departments.map((dept: any) => (
                      <tr key={dept.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{dept.code}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{dept.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{dept.hod_name || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {dept.description || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`badge ${
                              dept.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {dept.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEditModal(dept)}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(dept)}
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
        title="Create New Department"
        size="lg"
      >
        <DepartmentForm />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Department"
        size="lg"
      >
        <DepartmentForm />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteDepartment}
        title="Delete Department"
        message={`Are you sure you want to delete ${selectedDepartment?.name}? This will also affect related subjects and enrollments.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isSubmitting}
      />
    </DashboardLayout>
  );
}
