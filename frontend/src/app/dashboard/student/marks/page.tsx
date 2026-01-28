'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Role } from '@/types';
import { api } from '@/lib/api';
import type { Mark, Subject } from '@/types';
import { Search, Filter, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, getGrade, calculatePercentage, handleApiError } from '@/lib/utils';

interface Filters {
  subject_id?: number;
  semester?: number;
  academic_year?: string;
}

export default function StudentMarksPage() {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<Filters>({
    subject_id: undefined,
    semester: undefined,
    academic_year: undefined,
  });

  // Fetch student's marks (only APPROVED)
  const fetchMarks = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (filters.subject_id) params.subject_id = filters.subject_id;
      if (filters.semester) params.semester = filters.semester;
      if (filters.academic_year) params.academic_year = filters.academic_year;

      const response = await api.getMyMarks(params);
      setMarks(response);
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  // Fetch student's enrolled subjects
  const fetchSubjects = async () => {
    try {
      const enrollments = await api.getMyEnrollments({});
      const uniqueSubjects = enrollments
        .map((e: any) => e.subject)
        .filter((s: any, index: number, self: any) =>
          index === self.findIndex((t: any) => t.id === s.id)
        );
      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchMarks();
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      subject_id: undefined,
      semester: undefined,
      academic_year: undefined,
    });
  };

  // Calculate statistics
  const calculateStats = () => {
    if (marks.length === 0) {
      return {
        totalMarks: 0,
        obtainedMarks: 0,
        averagePercentage: 0,
        totalAssessments: 0,
      };
    }

    const totalMarks = marks.reduce((sum: number, m: any) => sum + m.max_marks, 0);
    const obtainedMarks = marks.reduce((sum: number, m: any) => sum + m.marks_obtained, 0);
    const averagePercentage = marks.length > 0 ? (obtainedMarks / totalMarks) * 100 : 0;

    return {
      totalMarks,
      obtainedMarks,
      averagePercentage: Math.round(averagePercentage * 100) / 100,
      totalAssessments: marks.length,
    };
  };

  const stats = calculateStats();

  // Group marks by subject
  const groupedMarks = marks.reduce((acc: any, mark: any) => {
    const subjectKey = mark.subject_code || 'Unknown';
    if (!acc[subjectKey]) {
      acc[subjectKey] = {
        subjectCode: mark.subject_code,
        subjectName: mark.subject_name,
        marks: [],
      };
    }
    acc[subjectKey].marks.push(mark);
    return acc;
  }, {});

  return (
    <DashboardLayout allowedRoles={[Role.STUDENT]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Marks</h1>
          <p className="text-sm text-gray-500 mt-1">View your approved assessment marks</p>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            <input
              type="text"
              placeholder="Academic Year (e.g., 2024-2025)"
              className="input"
              value={filters.academic_year || ''}
              onChange={(e) => setFilters({ ...filters, academic_year: e.target.value })}
            />

            {(filters.subject_id || filters.semester || filters.academic_year) && (
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card bg-blue-50 border-blue-200">
            <h3 className="text-sm font-medium text-blue-800">Total Assessments</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">{stats.totalAssessments}</p>
          </div>
          <div className="card bg-purple-50 border-purple-200">
            <h3 className="text-sm font-medium text-purple-800">Total Marks</h3>
            <p className="text-3xl font-bold text-purple-900 mt-2">{stats.totalMarks}</p>
          </div>
          <div className="card bg-green-50 border-green-200">
            <h3 className="text-sm font-medium text-green-800">Marks Obtained</h3>
            <p className="text-3xl font-bold text-green-900 mt-2">{stats.obtainedMarks}</p>
          </div>
          <div className="card bg-yellow-50 border-yellow-200">
            <h3 className="text-sm font-medium text-yellow-800">Average</h3>
            <p className="text-3xl font-bold text-yellow-900 mt-2">
              {stats.averagePercentage.toFixed(1)}%
            </p>
            <p className="text-sm text-yellow-700 mt-1">Grade: {getGrade(stats.averagePercentage)}</p>
          </div>
        </div>

        {/* Marks by Subject */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : marks.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No marks available yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Your approved marks will appear here once they are submitted by lecturers and approved
              by HOD
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedMarks).map((subjectKey) => {
              const subjectData = groupedMarks[subjectKey];
              const subjectTotal = subjectData.marks.reduce(
                (sum: number, m: any) => sum + m.max_marks,
                0
              );
              const subjectObtained = subjectData.marks.reduce(
                (sum: number, m: any) => sum + m.marks_obtained,
                0
              );
              const subjectPercentage = calculatePercentage(subjectObtained, subjectTotal);

              return (
                <div key={subjectKey} className="card">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {subjectData.subjectCode}
                      </h2>
                      <p className="text-sm text-gray-600">{subjectData.subjectName}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary-600">
                        {subjectPercentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">
                        Grade: {getGrade(subjectPercentage)}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Assessment
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Type
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Marks
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Percentage
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Grade
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Remarks
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {subjectData.marks.map((mark: any) => {
                          const percentage = calculatePercentage(
                            mark.marks_obtained,
                            mark.max_marks
                          );
                          return (
                            <tr key={mark.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {mark.assessment_name}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-600">{mark.assessment_type}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="text-sm font-semibold text-gray-900">
                                  {mark.marks_obtained} / {mark.max_marks}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="text-sm font-medium text-gray-900">
                                  {percentage.toFixed(1)}%
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span
                                  className={`badge ${
                                    percentage >= 85
                                      ? 'bg-green-100 text-green-800'
                                      : percentage >= 70
                                      ? 'bg-blue-100 text-blue-800'
                                      : percentage >= 50
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {getGrade(percentage)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-600 max-w-xs truncate">
                                  {mark.remarks || '-'}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={2} className="px-4 py-3 text-right font-semibold">
                            Total:
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">
                            {subjectObtained} / {subjectTotal}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">
                            {subjectPercentage.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`badge ${
                                subjectPercentage >= 85
                                  ? 'bg-green-100 text-green-800'
                                  : subjectPercentage >= 70
                                  ? 'bg-blue-100 text-blue-800'
                                  : subjectPercentage >= 50
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {getGrade(subjectPercentage)}
                            </span>
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
