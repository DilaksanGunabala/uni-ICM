import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Loader2,
  RefreshCw,
  Filter,
  Search,
  ArrowLeft,
  Building2,
  BookOpen,
  GraduationCap,
  Users,
  Calendar,
  ChevronRight,
  Layers,
  FileText,
  FlaskConical,
  ClipboardList,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api, { BackendMark, BackendSubject, BackendEnrollment, BackendAssessment, BackendDepartment } from "@/lib/api";

interface MarkData {
  id: string;
  studentId: string;
  studentName: string;
  subjectCode: string;
  subjectName: string;
  assessmentType: string;
  assessmentName: string;
  marks: number;
  maxMarks: number;
  status: "pending" | "approved" | "rejected";
  submittedBy: string;
  enrollmentId: number;
  assessmentId: number;
}

interface SemesterInfo {
  number: number;
  category: "General" | "Advanced" | "Guess";
  description: string;
}

const statusMap: Record<string, "pending" | "approved" | "rejected"> = {
  'PENDING': 'pending',
  'APPROVED': 'approved',
  'REJECTED': 'rejected',
};

// Semester definitions
const SEMESTERS: SemesterInfo[] = [
  { number: 1, category: "General", description: "Foundation Level" },
  { number: 2, category: "General", description: "Foundation Level" },
  { number: 3, category: "General", description: "Foundation Level" },
  { number: 4, category: "Advanced", description: "Specialization Level" },
  { number: 5, category: "Advanced", description: "Specialization Level" },
  { number: 6, category: "Advanced", description: "Specialization Level" },
  { number: 7, category: "Advanced", description: "Specialization Level" },
  { number: 8, category: "Advanced", description: "Final Year" },
  { number: 0, category: "Guess", description: "Special Semester" },
];

// View modes for super admin navigation
type ViewMode = 'departments' | 'semesters' | 'subjects' | 'batches' | 'marks';

// Navigation breadcrumb item
interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export function MarksPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Navigation state for super admin
  const [viewMode, setViewMode] = useState<ViewMode>('departments');
  const [selectedDepartment, setSelectedDepartment] = useState<BackendDepartment | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<SemesterInfo | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<BackendSubject | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  // Data states
  const [departments, setDepartments] = useState<BackendDepartment[]>([]);
  const [subjects, setSubjects] = useState<BackendSubject[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [marks, setMarks] = useState<MarkData[]>([]);
  const [enrollments, setEnrollments] = useState<BackendEnrollment[]>([]);
  const [assessments, setAssessments] = useState<BackendAssessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<BackendAssessment[]>([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState<BackendEnrollment[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedMark, setSelectedMark] = useState<MarkData | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [assessmentTypeFilter, setAssessmentTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form state for adding marks (lecturer only)
  const [formData, setFormData] = useState({
    subject_id: "",
    enrollment_id: "",
    assessment_id: "",
    marks_obtained: "",
    is_absent: false,
  });

  const isLecturer = user?.role === "lecturer";
  const isSuperAdmin = user?.role === "super_admin";
  const isHOD = user?.role === "hod";
  const canAddMark = isLecturer;
  const canEdit = isLecturer;
  const canDelete = isSuperAdmin || isHOD;

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await api.getDepartments({ page_size: 100 });
      // Filter active departments on client side
      const activeDepartments = (response.items || []).filter((d: BackendDepartment) => d.is_active !== false);
      setDepartments(activeDepartments);
    } catch (error: any) {
      console.error('Failed to fetch departments:', error);
      let errorMessage = "Failed to load departments.";
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        }
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch subjects for a department and semester
  const fetchSubjects = async (departmentId: number | null, semester: number) => {
    try {
      setLoading(true);

      // Build query params based on semester type (page_size max is 100)
      const params: any = { page_size: 100 };

      // For Guess semester (0), show all subjects for the department (no semester filter)
      // For regular semesters (1-8), filter by semester
      if (semester > 0) {
        params.semester = semester;
      }

      // For advanced semesters (4-8), always filter by department
      if (semester >= 4 && departmentId) {
        params.department_id = departmentId;
      }

      // For Guess semester (0), filter by department
      if (semester === 0 && departmentId) {
        params.department_id = departmentId;
      }

      console.log('Fetching subjects with params:', params);
      const response = await api.getSubjects(params);
      console.log('Subjects response:', response);

      let filteredSubjects = response.items || [];

      // For general semesters (1-3), include both department-specific AND general subjects (department_id = null)
      if (semester >= 1 && semester <= 3) {
        filteredSubjects = filteredSubjects.filter((s: BackendSubject) =>
          s.department_id === departmentId || s.department_id === null
        );
      }

      // Filter only active subjects on client side
      filteredSubjects = filteredSubjects.filter((s: BackendSubject) => s.is_active !== false);

      console.log('Filtered subjects:', filteredSubjects.length);
      setSubjects(filteredSubjects);
    } catch (error: any) {
      console.error('Failed to fetch subjects:', error);
      console.error('Error response:', error.response?.data);

      // Extract error message properly
      let errorMessage = "Failed to load subjects. Please check if the backend is running.";
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((e: any) => e.msg || e.message || String(e)).join(', ');
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch batches for a subject
  const fetchBatches = async (subjectId: number) => {
    try {
      setLoading(true);
      const response = await api.getBatchesForSubject(subjectId);
      setBatches(response);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
      toast({
        title: "Error",
        description: "Failed to load batches.",
        variant: "destructive",
      });
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch marks for a subject and batch
  const fetchMarks = async (subjectId: number, batch?: string) => {
    try {
      setLoading(true);
      const marksResponse = await api.getMarks({ subject_id: subjectId, page_size: 500 });

      let filteredMarks = marksResponse.items;

      // Filter by batch if provided
      if (batch) {
        filteredMarks = filteredMarks.filter((m: BackendMark) => {
          if (!m.student_id) return false;
          // Extract batch from student_id (e.g., "E/20/123" -> "E20")
          const match = m.student_id.match(/([A-Z]+)[/.\-]?(\d{2})/i);
          if (match) {
            const studentBatch = `${match[1].toUpperCase()}${match[2]}`;
            return studentBatch === batch;
          }
          return false;
        });
      }

      const mappedMarks: MarkData[] = filteredMarks.map((m: BackendMark) => ({
        id: m.id.toString(),
        studentId: m.student_id || 'N/A',
        studentName: m.student_name || 'Unknown',
        subjectCode: m.subject_code || 'N/A',
        subjectName: m.subject_name || 'Unknown Subject',
        assessmentType: m.assessment_type || 'Unknown',
        assessmentName: m.assessment_name || 'Unknown Assessment',
        marks: m.marks_obtained,
        maxMarks: m.max_marks || 100,
        status: statusMap[m.status] || 'pending',
        submittedBy: m.submitted_by_name || 'Unknown',
        enrollmentId: m.enrollment_id,
        assessmentId: m.assessment_id,
      }));

      setMarks(mappedMarks);
    } catch (error) {
      console.error('Failed to fetch marks:', error);
      toast({
        title: "Error",
        description: "Failed to load marks data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch all data for lecturer view
  const fetchLecturerData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      let marksResponse, subjectsResponse, enrollmentsResponse, assessmentsResponse;

      try {
        marksResponse = await api.getMarks({ page_size: 100 });
      } catch (err) {
        console.error('Failed to fetch marks:', err);
        marksResponse = { items: [] };
      }

      try {
        subjectsResponse = await api.getSubjects({ page_size: 100 });
      } catch (err) {
        console.error('Failed to fetch subjects:', err);
        subjectsResponse = { items: [] };
      }

      try {
        enrollmentsResponse = await api.getEnrollments({ page_size: 500 });
      } catch (err) {
        console.error('Failed to fetch enrollments:', err);
        enrollmentsResponse = { items: [] };
      }

      try {
        assessmentsResponse = await api.getAssessments({ page_size: 100 });
      } catch (err) {
        console.error('Failed to fetch assessments:', err);
        assessmentsResponse = { items: [] };
      }

      setSubjects(subjectsResponse.items);
      setEnrollments(enrollmentsResponse.items);
      setAssessments(assessmentsResponse.items);

      const mappedMarks: MarkData[] = marksResponse.items.map((m: BackendMark) => ({
        id: m.id.toString(),
        studentId: m.student_id || 'N/A',
        studentName: m.student_name || 'Unknown',
        subjectCode: m.subject_code || 'N/A',
        subjectName: m.subject_name || 'Unknown Subject',
        assessmentType: m.assessment_type || 'Unknown',
        assessmentName: m.assessment_name || 'Unknown Assessment',
        marks: m.marks_obtained,
        maxMarks: m.max_marks || 100,
        status: statusMap[m.status] || 'pending',
        submittedBy: m.submitted_by_name || 'Unknown',
        enrollmentId: m.enrollment_id,
        assessmentId: m.assessment_id,
      }));

      setMarks(mappedMarks);
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.detail || "Failed to load marks data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (isSuperAdmin) {
      fetchDepartments();
    } else if (isHOD) {
      // HOD starts directly at semesters view with their department auto-selected
      setViewMode('semesters');
      // Create a pseudo-department object from user's department info
      // Note: User object uses departmentId and department (not department_id and department_name)
      if (user?.departmentId && user?.department) {
        setSelectedDepartment({
          id: user.departmentId,
          name: user.department,
          code: user.department.substring(0, 4).toUpperCase(), // Fallback code
          is_active: true,
          created_at: '',
          updated_at: '',
        });
      }
      setLoading(false);
    } else {
      fetchLecturerData();
    }
  }, [isSuperAdmin, isHOD]);

  // ============================================================================
  // NAVIGATION HANDLERS
  // ============================================================================

  const handleSelectDepartment = (dept: BackendDepartment) => {
    setSelectedDepartment(dept);
    setViewMode('semesters');
  };

  const handleSelectSemester = (sem: SemesterInfo) => {
    setSelectedSemester(sem);
    setViewMode('subjects');
    fetchSubjects(selectedDepartment?.id || null, sem.number);
  };

  const handleSelectSubject = (subject: BackendSubject) => {
    setSelectedSubject(subject);
    setViewMode('batches');
    fetchBatches(subject.id);
  };

  const handleSelectBatch = (batch: string) => {
    setSelectedBatch(batch);
    setViewMode('marks');
    if (selectedSubject) {
      fetchMarks(selectedSubject.id, batch);
    }
  };

  const handleBack = () => {
    if (viewMode === 'marks') {
      setViewMode('batches');
      setSelectedBatch(null);
      setMarks([]);
    } else if (viewMode === 'batches') {
      setViewMode('subjects');
      setSelectedSubject(null);
      setBatches([]);
    } else if (viewMode === 'subjects') {
      setViewMode('semesters');
      setSelectedSemester(null);
      setSubjects([]);
    } else if (viewMode === 'semesters' && !isHOD) {
      // HOD should not go back to departments (they only see their department)
      setViewMode('departments');
      setSelectedDepartment(null);
    }
    setSearchQuery("");
    setAssessmentTypeFilter("all");
    setStatusFilter("all");
  };

  const handleNavigateTo = (mode: ViewMode) => {
    if (mode === 'departments' && !isHOD) {
      // HOD should not navigate to departments
      setViewMode('departments');
      setSelectedDepartment(null);
      setSelectedSemester(null);
      setSelectedSubject(null);
      setSelectedBatch(null);
    } else if (mode === 'semesters') {
      setViewMode('semesters');
      setSelectedSemester(null);
      setSelectedSubject(null);
      setSelectedBatch(null);
    } else if (mode === 'subjects') {
      setViewMode('subjects');
      setSelectedSubject(null);
      setSelectedBatch(null);
    } else if (mode === 'batches') {
      setViewMode('batches');
      setSelectedBatch(null);
    }
  };

  // Build breadcrumbs based on current navigation state
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const crumbs: BreadcrumbItem[] = [];

    if (isHOD) {
      // HOD starts from semesters, show department name but not clickable to go back
      crumbs.push({ label: "Marks Management", onClick: () => handleNavigateTo('semesters') });
      if (selectedDepartment) {
        crumbs.push({ label: selectedDepartment.name });
      }
    } else {
      crumbs.push({ label: "Marks Management", onClick: () => handleNavigateTo('departments') });
      if (selectedDepartment) {
        crumbs.push({ label: selectedDepartment.code, onClick: () => handleNavigateTo('semesters') });
      }
    }

    if (selectedSemester) {
      const semLabel = selectedSemester.number === 0 ? "Guess" : `Semester ${selectedSemester.number}`;
      crumbs.push({ label: semLabel, onClick: () => handleNavigateTo('subjects') });
    }
    if (selectedSubject) {
      crumbs.push({ label: selectedSubject.code, onClick: () => handleNavigateTo('batches') });
    }
    if (selectedBatch) {
      crumbs.push({ label: selectedBatch });
    }

    return crumbs;
  };

  // ============================================================================
  // FILTERS AND DISPLAY
  // ============================================================================

  // Get unique assessment types from marks
  const assessmentTypes = [...new Set(marks.map(m => m.assessmentType))];

  // Filter marks based on search and filters
  const displayedMarks = marks.filter((mark) => {
    const matchesSearch = searchQuery === "" ||
      mark.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mark.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mark.assessmentName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = assessmentTypeFilter === "all" || mark.assessmentType === assessmentTypeFilter;
    const matchesStatus = statusFilter === "all" || mark.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Group marks by assessment type
  const marksByType = displayedMarks.reduce((acc, mark) => {
    if (!acc[mark.assessmentType]) {
      acc[mark.assessmentType] = [];
    }
    acc[mark.assessmentType].push(mark);
    return acc;
  }, {} as Record<string, MarkData[]>);

  // Update filtered assessments when subject changes (for lecturer form)
  useEffect(() => {
    if (formData.subject_id) {
      const subjectId = parseInt(formData.subject_id);
      setFilteredAssessments(assessments.filter(a => a.subject_id === subjectId));
      setFilteredEnrollments(enrollments.filter(e => e.subject_id === subjectId));
      setFormData(prev => ({ ...prev, enrollment_id: "", assessment_id: "" }));
    } else {
      setFilteredAssessments([]);
      setFilteredEnrollments([]);
    }
  }, [formData.subject_id, assessments, enrollments]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const resetForm = () => {
    setFormData({
      subject_id: "",
      enrollment_id: "",
      assessment_id: "",
      marks_obtained: "",
      is_absent: false,
    });
  };

  const handleAddMark = async () => {
    try {
      setSaving(true);

      await api.createMark({
        enrollment_id: parseInt(formData.enrollment_id),
        assessment_id: parseInt(formData.assessment_id),
        marks_obtained: parseFloat(formData.marks_obtained),
        is_absent: formData.is_absent,
      });

      toast({
        title: "Mark Added",
        description: "The mark has been added successfully and is pending approval.",
      });

      setIsAddDialogOpen(false);
      resetForm();
      fetchLecturerData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to add mark.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMark) return;

    try {
      setSaving(true);
      await api.deleteMark(parseInt(selectedMark.id));

      toast({
        title: "Mark Deleted",
        description: "The mark entry has been deleted.",
      });

      setIsDeleteDialogOpen(false);
      setSelectedMark(null);

      if (isSuperAdmin && selectedSubject) {
        fetchMarks(selectedSubject.id, selectedBatch || undefined);
      } else {
        fetchLecturerData();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to delete mark.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const headers = ['Student ID', 'Student Name', 'Subject Code', 'Subject Name', 'Assessment Type', 'Assessment', 'Marks', 'Max Marks', 'Percentage', 'Status', 'Submitted By'];
    const csvContent = [
      headers.join(','),
      ...displayedMarks.map(mark => [
        mark.studentId,
        `"${mark.studentName}"`,
        mark.subjectCode,
        `"${mark.subjectName}"`,
        mark.assessmentType,
        `"${mark.assessmentName}"`,
        mark.marks,
        mark.maxMarks,
        `${Math.round((mark.marks / mark.maxMarks) * 100)}%`,
        mark.status.toUpperCase(),
        `"${mark.submittedBy}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `marks_${selectedSubject?.code || 'all'}_${selectedBatch || 'all'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `Exported ${displayedMarks.length} marks to CSV.`,
    });
  };

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  // Get color for assessment type badge
  const getAssessmentTypeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      'ASSIGNMENT': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'QUIZ': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'MIDTERM': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'MID_SEMESTER': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'FINAL': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'FINAL_EXAM': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'PROJECT': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'LAB': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
      'INTERNAL': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      'PRESENTATION': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    };
    return typeColors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const getAssessmentIcon = (type: string) => {
    switch (type) {
      case 'ASSIGNMENT': return FileText;
      case 'QUIZ': return ClipboardList;
      case 'LAB': return FlaskConical;
      default: return BookOpen;
    }
  };

  const getSemesterColor = (category: string) => {
    switch (category) {
      case 'General': return 'from-blue-500 to-blue-600';
      case 'Advanced': return 'from-purple-500 to-purple-600';
      case 'Guess': return 'from-amber-500 to-amber-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  // ============================================================================
  // TABLE COLUMNS
  // ============================================================================

  const markColumns: Column<MarkData>[] = [
    {
      key: "studentId",
      header: "Student ID",
      cell: (row) => <span className="font-mono text-sm">{row.studentId}</span>,
      sortable: true,
    },
    {
      key: "studentName",
      header: "Student Name",
      cell: (row) => row.studentName,
      sortable: true,
    },
    {
      key: "assessmentType",
      header: "Type",
      cell: (row) => (
        <Badge className={`${getAssessmentTypeColor(row.assessmentType)} border-0`}>
          {row.assessmentType.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: "assessmentName",
      header: "Assessment",
      cell: (row) => <span className="font-medium">{row.assessmentName}</span>,
    },
    {
      key: "marks",
      header: "Marks",
      cell: (row) => (
        <div className="font-medium">
          {row.marks}/{row.maxMarks}
          <span className="text-muted-foreground text-sm ml-2">
            ({Math.round((row.marks / row.maxMarks) * 100)}%)
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "submittedBy",
      header: "Submitted By",
      cell: (row) => <span className="text-sm text-muted-foreground">{row.submittedBy}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border shadow-lg">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                setSelectedMark(row);
                setIsViewDialogOpen(true);
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            {canEdit && row.status === "pending" && (
              <DropdownMenuItem className="cursor-pointer">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => {
                  setSelectedMark(row);
                  setIsDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-[80px]",
    },
  ];

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading && (viewMode === 'departments' || viewMode === 'semesters')) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ============================================================================
  // SUPER ADMIN VIEWS
  // ============================================================================

  // VIEW 1: Department Selection
  if (isSuperAdmin && viewMode === 'departments') {
    return (
      <div>
        <PageHeader
          title="Marks Management"
          description="Select a department to view marks"
          breadcrumbs={[{ label: "Marks Management" }]}
          actions={
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchDepartments()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {departments.map((dept) => (
            <Card
              key={dept.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => handleSelectDepartment(dept)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {dept.code}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {dept.name}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {departments.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No departments found</p>
          </div>
        )}
      </div>
    );
  }

  // VIEW 2: Semester Selection (Super Admin and HOD)
  if ((isSuperAdmin || isHOD) && viewMode === 'semesters' && selectedDepartment) {
    const generalSemesters = SEMESTERS.filter(s => s.category === 'General');
    const advancedSemesters = SEMESTERS.filter(s => s.category === 'Advanced');
    const guessSemester = SEMESTERS.find(s => s.category === 'Guess');

    return (
      <div>
        <PageHeader
          title={isHOD ? "Select Semester" : `${selectedDepartment.code} - Select Semester`}
          description={selectedDepartment.name}
          breadcrumbs={getBreadcrumbs()}
          actions={
            !isHOD ? (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            ) : null
          }
        />

        <div className="space-y-8">
          {/* General Semesters */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold">General Semesters</h2>
              <Badge variant="secondary" className="ml-2">Foundation</Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {generalSemesters.map((sem) => (
                <Card
                  key={sem.number}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group overflow-hidden"
                  onClick={() => handleSelectSemester(sem)}
                >
                  <div className={`h-2 bg-gradient-to-r ${getSemesterColor(sem.category)}`} />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold group-hover:text-primary transition-colors">
                          Semester {sem.number}
                        </h3>
                        <p className="text-sm text-muted-foreground">{sem.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Advanced Semesters */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold">Advanced Semesters</h2>
              <Badge variant="secondary" className="ml-2">Specialization</Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {advancedSemesters.map((sem) => (
                <Card
                  key={sem.number}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group overflow-hidden"
                  onClick={() => handleSelectSemester(sem)}
                >
                  <div className={`h-2 bg-gradient-to-r ${getSemesterColor(sem.category)}`} />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold group-hover:text-primary transition-colors">
                          Semester {sem.number}
                        </h3>
                        <p className="text-sm text-muted-foreground">{sem.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Guess Semester */}
          {guessSemester && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-lg font-semibold">Special Semester</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group overflow-hidden"
                  onClick={() => handleSelectSemester(guessSemester)}
                >
                  <div className={`h-2 bg-gradient-to-r ${getSemesterColor(guessSemester.category)}`} />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold group-hover:text-primary transition-colors">
                          Guess Semester
                        </h3>
                        <p className="text-sm text-muted-foreground">{guessSemester.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // VIEW 3: Subject Selection (Super Admin and HOD)
  if ((isSuperAdmin || isHOD) && viewMode === 'subjects' && selectedDepartment && selectedSemester) {
    const semesterLabel = selectedSemester.number === 0 ? "Guess Semester" : `Semester ${selectedSemester.number}`;

    return (
      <div>
        <PageHeader
          title={isHOD ? semesterLabel : `${selectedDepartment.code} - ${semesterLabel}`}
          description="Select a subject to view marks"
          breadcrumbs={getBreadcrumbs()}
          actions={
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <Card
                key={subject.id}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                onClick={() => handleSelectSubject(subject)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {subject.code}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {subject.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {subject.credits} cr
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && subjects.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No subjects found for this semester</p>
          </div>
        )}
      </div>
    );
  }

  // VIEW 4: Batch Selection (Super Admin and HOD)
  if ((isSuperAdmin || isHOD) && viewMode === 'batches' && selectedSubject) {
    return (
      <div>
        <PageHeader
          title={`${selectedSubject.code} - Select Batch`}
          description={selectedSubject.name}
          breadcrumbs={getBreadcrumbs()}
          actions={
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {batches.map((batch) => (
              <Card
                key={batch}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                onClick={() => handleSelectBatch(batch)}
              >
                <CardContent className="p-6 text-center">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                    <Users className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                    {batch}
                  </h3>
                  <p className="text-sm text-muted-foreground">Batch</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && batches.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No batches found for this subject</p>
            <p className="text-sm mt-2">No students are enrolled in this subject yet.</p>
          </div>
        )}
      </div>
    );
  }

  // VIEW 5: Marks Display for Super Admin and HOD
  if ((isSuperAdmin || isHOD) && viewMode === 'marks' && selectedSubject && selectedBatch) {
    return (
      <div>
        <PageHeader
          title={`${selectedSubject.code} - ${selectedBatch}`}
          description={`${selectedSubject.name} | Marks for batch ${selectedBatch}`}
          breadcrumbs={getBreadcrumbs()}
          actions={
            <>
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button variant="outline" onClick={handleExport} disabled={displayedMarks.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </>
          }
        />

        {/* Summary Cards by Assessment Type */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{marks.length}</div>
              <p className="text-xs text-muted-foreground">Total Entries</p>
            </CardContent>
          </Card>
          {Object.entries(marksByType).slice(0, 3).map(([type, typeMarks]) => {
            const Icon = getAssessmentIcon(type);
            return (
              <Card key={type}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div className="text-2xl font-bold">{typeMarks.length}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">{type.replace('_', ' ')}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
          <Filter className="h-4 w-4 text-muted-foreground" />

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by student name, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <Select value={assessmentTypeFilter} onValueChange={setAssessmentTypeFilter}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Types</SelectItem>
              {assessmentTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || assessmentTypeFilter !== "all" || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setAssessmentTypeFilter("all");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </Button>
          )}

          <span className="ml-auto text-sm text-muted-foreground">
            {displayedMarks.length} of {marks.length} marks
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <DataTable
            columns={markColumns}
            data={displayedMarks}
            pageSize={15}
            emptyMessage="No marks found"
          />
        )}

        {/* View Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Mark Details</DialogTitle>
            </DialogHeader>
            {selectedMark && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Student ID</p>
                    <p className="font-medium">{selectedMark.studentId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Student Name</p>
                    <p className="font-medium">{selectedMark.studentName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Assessment Type</p>
                    <Badge className={`${getAssessmentTypeColor(selectedMark.assessmentType)} border-0 mt-1`}>
                      {selectedMark.assessmentType.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Assessment Name</p>
                    <p className="font-medium">{selectedMark.assessmentName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Marks</p>
                    <p className="font-medium text-lg">
                      {selectedMark.marks} / {selectedMark.maxMarks}
                      <span className="text-sm text-muted-foreground ml-2">
                        ({Math.round((selectedMark.marks / selectedMark.maxMarks) * 100)}%)
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <StatusBadge status={selectedMark.status} />
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Submitted By</p>
                    <p className="font-medium">{selectedMark.submittedBy}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Mark Entry</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this mark entry? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedMark && (
              <div className="py-4 px-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="font-medium">
                  {selectedMark.studentName} - {selectedMark.subjectCode}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedMark.assessmentType}: {selectedMark.assessmentName} - {selectedMark.marks}/{selectedMark.maxMarks}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ============================================================================
  // LECTURER VIEW
  // ============================================================================

  return (
    <div>
      <PageHeader
        title="Marks Management"
        description="View and manage student marks"
        breadcrumbs={[{ label: "Marks Management" }]}
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchLecturerData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            {canAddMark && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Add Mark</span>
              </Button>
            )}
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
        <Filter className="h-4 w-4 text-muted-foreground" />

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by student name, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {(searchQuery || statusFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
          >
            Clear filters
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {displayedMarks.length} of {marks.length} marks
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DataTable
          columns={markColumns}
          data={displayedMarks}
          pageSize={10}
          emptyMessage="No marks available"
        />
      )}

      {/* Add Mark Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Mark</DialogTitle>
            <DialogDescription>
              Enter marks for a student assessment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Select
                value={formData.subject_id}
                onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.code} - {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Student (Enrollment) *</Label>
              <Select
                value={formData.enrollment_id}
                onValueChange={(value) => setFormData({ ...formData, enrollment_id: value })}
                disabled={!formData.subject_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.subject_id ? "Select student" : "Select subject first"} />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {filteredEnrollments.map((enrollment) => (
                    <SelectItem key={enrollment.id} value={enrollment.id.toString()}>
                      {enrollment.student_student_id || enrollment.student_id} - {enrollment.student_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assessment *</Label>
              <Select
                value={formData.assessment_id}
                onValueChange={(value) => setFormData({ ...formData, assessment_id: value })}
                disabled={!formData.subject_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.subject_id ? "Select assessment" : "Select subject first"} />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {filteredAssessments.map((assessment) => (
                    <SelectItem key={assessment.id} value={assessment.id.toString()}>
                      {assessment.name} ({assessment.assessment_type}) - Max: {assessment.max_marks}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Marks Obtained *</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={formData.marks_obtained}
                onChange={(e) => setFormData({ ...formData, marks_obtained: e.target.value })}
                placeholder="Enter marks"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_absent"
                checked={formData.is_absent}
                onChange={(e) => setFormData({ ...formData, is_absent: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_absent" className="text-sm font-normal">
                Student was absent
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMark}
              disabled={
                saving ||
                !formData.enrollment_id ||
                !formData.assessment_id ||
                (!formData.is_absent && !formData.marks_obtained)
              }
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Mark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Details</DialogTitle>
          </DialogHeader>
          {selectedMark && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Student ID</p>
                  <p className="font-medium">{selectedMark.studentId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Student Name</p>
                  <p className="font-medium">{selectedMark.studentName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subject</p>
                  <p className="font-medium">{selectedMark.subjectCode}</p>
                  <p className="text-sm text-muted-foreground">{selectedMark.subjectName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assessment</p>
                  <p className="font-medium">{selectedMark.assessmentName}</p>
                  <p className="text-sm text-muted-foreground">{selectedMark.assessmentType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Marks</p>
                  <p className="font-medium text-lg">
                    {selectedMark.marks} / {selectedMark.maxMarks}
                    <span className="text-sm text-muted-foreground ml-2">
                      ({Math.round((selectedMark.marks / selectedMark.maxMarks) * 100)}%)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={selectedMark.status} />
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Submitted By</p>
                  <p className="font-medium">{selectedMark.submittedBy}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Mark Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this mark entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedMark && (
            <div className="py-4 px-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="font-medium">
                {selectedMark.studentName} - {selectedMark.subjectCode}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedMark.assessmentName}: {selectedMark.marks}/{selectedMark.maxMarks}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
