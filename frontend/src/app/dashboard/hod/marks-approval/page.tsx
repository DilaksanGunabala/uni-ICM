'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Role } from '@/types';
import { api } from '@/lib/api';
import type { Mark, Subject, PaginatedResponse } from '@/types';
import Modal from '@/components/common/Modal';
import { Search, CheckCircle, XCircle, Eye, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, getStatusBadgeColor, handleApiError } from '@/lib/utils';

interface ApprovalFormData {
  remarks: string;
}

export default function MarksApprovalPage() {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMark, setSelectedMark] = useState<Mark | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ApprovalFormData>({
    remarks: '',
  });

  const [filters, setFilters] = useState({
    search: '',
    subject_id: undefined as number | undefined,
    semester: undefined as number | undefined,
    status: 'PENDING',
  });

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  // Fetch marks
  const fetchMarks = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        page_size: pagination.pageSize,
        status: filters.status,
      };

      if (filters.subject_id) params.subject_id = filters.subject_id;
      if (filters.semester) params.semester = filters.semester;

      const response: PaginatedResponse<Mark> = await api.getMarks(params);
      setMarks(response.items);
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

  // Fetch subjects for filter
  const fetchSubjects = async () => {
    try {
      const response = await api.getSubjects({ page: 1, page_size: 100 });
      setSubjects(response.items);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchMarks();
  }, [pagination.page, filters]);

  const openApproveModal = (mark: Mark) => {
    setSelectedMark(mark);
    setFormData({ remarks: '' });
    setIsApproveModalOpen(true);
  };

  const openRejectModal = (mark: Mark) => {
    setSelectedMark(mark);
    setFormData({ remarks: '' });
    setIsRejectModalOpen(true);
  };

  const openViewModal = (mark: Mark) => {
    setSelectedMark(mark);
    setIsViewModalOpen(true);
  };

  const handleApproveMark = async () => {
    if (!selectedMark) return;

    try {
      setIsSubmitting(true);
      await api.approveMark(selectedMark.id, formData.remarks || undefined);
      toast.success('Mark approved successfully');
      setIsApproveModalOpen(false);
      fetchMarks();
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectMark = async () => {
    if (!selectedMark) return;

    if (!formData.remarks.trim()) {
      toast.error('Please provide remarks for rejection');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.rejectMark(selectedMark.id, formData.remarks);
      toast.success('Mark rejected successfully');
      setIsRejectModalOpen(false);
      fetchMarks();
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      subject_id: undefined,
      semester: undefined,
      status: 'PENDING',
    });
    setPagination({ ...pagination, page: 1 });
  };

  return (
    <DashboardLayout allowedRoles={[Role.HOD, Role.SUPER_ADMIN]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marks Approval</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve marks submitted by lecturers</p>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              className="input"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="">All Statuses</option>
            </select>

            <select
              className="input"
              value={filters.subject_id || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  subject_id: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} - {subject.name}
                </option>
              ))}
            </select>

            <select
              className="input"
              value={filters.semester || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  semester: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>

            {(filters.subject_id || filters.semester || filters.status !== 'PENDING') && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center justify-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-yellow-50 border-yellow-200">
            <h3 className="text-sm font-medium text-yellow-800">Pending Review</h3>
            <p className="text-3xl font-bold text-yellow-900 mt-2">
              {marks.filter((m: any) => m.status === 'PENDING').length}
            </p>
          </div>
          <div className="card bg-green-50 border-green-200">
            <h3 className="text-sm font-medium text-green-800">Approved</h3>
            <p className="text-3xl font-bold text-green-900 mt-2">
              {marks.filter((m: any) => m.status === 'APPROVED').length}
            </p>
          </div>
          <div className="card bg-red-50 border-red-200">
            <h3 className="text-sm font-medium text-red-800">Rejected</h3>
            <p className="text-3xl font-bold text-red-900 mt-2">
              {marks.filter((m: any) => m.status === 'REJECTED').length}
            </p>
          </div>
        </div>

        {/* Marks Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : marks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No marks found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Assessment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Marks
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Submitted By
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
                    {marks.map((mark: any) => (
                      <tr key={mark.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {mark.student_name || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">{mark.student_id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{mark.subject_code}</div>
                          <div className="text-xs text-gray-500">Sem {mark.semester}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{mark.assessment_name}</div>
                          <div className="text-xs text-gray-500">{mark.assessment_type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {mark.marks_obtained}/{mark.max_marks}
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round((mark.marks_obtained / mark.max_marks) * 100)}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{mark.submitted_by_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${getStatusBadgeColor(mark.status)}`}>
                            {mark.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openViewModal(mark)}
                            className="text-gray-600 hover:text-gray-900 mr-3"
                            title="View Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          {mark.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => openApproveModal(mark)}
                                className="text-green-600 hover:text-green-900 mr-3"
                                title="Approve"
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => openRejectModal(mark)}
                                className="text-red-600 hover:text-red-900"
                                title="Reject"
                              >
                                <XCircle className="h-5 w-5" />
                              </button>
                            </>
                          )}
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

      {/* View Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Mark Details"
        size="lg"
      >
        {selectedMark && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Student</p>
                <p className="font-medium">{(selectedMark as any).student_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Student ID</p>
                <p className="font-medium">{(selectedMark as any).student_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Subject</p>
                <p className="font-medium">{(selectedMark as any).subject_code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Assessment</p>
                <p className="font-medium">{(selectedMark as any).assessment_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Marks</p>
                <p className="font-medium text-lg">
                  {(selectedMark as any).marks_obtained} / {(selectedMark as any).max_marks}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Percentage</p>
                <p className="font-medium text-lg">
                  {Math.round(
                    ((selectedMark as any).marks_obtained / (selectedMark as any).max_marks) * 100
                  )}
                  %
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`badge ${getStatusBadgeColor((selectedMark as any).status)}`}>
                  {(selectedMark as any).status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Submitted By</p>
                <p className="font-medium">{(selectedMark as any).submitted_by_name}</p>
              </div>
            </div>
            {(selectedMark as any).remarks && (
              <div>
                <p className="text-sm text-gray-500">Remarks</p>
                <p className="font-medium">{(selectedMark as any).remarks}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Approve Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Approve Mark"
        size="md"
      >
        <div className="space-y-4">
          <p>Are you sure you want to approve this mark?</p>
          <div>
            <label className="label">Remarks (Optional)</label>
            <textarea
              className="input"
              rows={3}
              value={formData.remarks}
              onChange={(e) => setFormData({ remarks: e.target.value })}
              placeholder="Add any remarks..."
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsApproveModalOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleApproveMark}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Approving...' : 'Approve'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Mark"
        size="md"
      >
        <div className="space-y-4">
          <p>Please provide a reason for rejecting this mark.</p>
          <div>
            <label className="label">
              Remarks <span className="text-red-600">*</span>
            </label>
            <textarea
              className="input"
              rows={3}
              value={formData.remarks}
              onChange={(e) => setFormData({ remarks: e.target.value })}
              placeholder="Reason for rejection..."
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsRejectModalOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleRejectMark}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
