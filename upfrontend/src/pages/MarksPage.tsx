import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import api, {
  Department,
  Subject,
  Mark as BackendMark,
  Assessment,
  getApiErrorMessage,
} from "@/lib/api";
import {
  Upload,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Loader2,
  ChevronRight,
  Building2,
  BookOpen,
  GraduationCap,
  Users,
  ArrowLeft,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";

// Mark display type for the table
interface MarkDisplay {
  id: number;
  studentId: string;
  studentName: string;
  subjectCode: string;
  subjectName: string;
  assessmentName: string;
  assessmentType: string;
  marks: number;
  maxMarks: number;
  percentage: number;
  status: "pending" | "approved" | "rejected";
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  remarks?: string;
}

// Generate batch options (E20, E21, E22, etc.)
const generateBatchOptions = (): string[] => {
  const currentYear = new Date().getFullYear();
  const batches: string[] = [];
  for (let year = currentYear; year >= 2018; year--) {
    batches.push(`E${year.toString().slice(-2)}`);
  }
  return batches;
};

// Semester options with type grouping
const semesterOptions = [
  { value: 1, label: "1", group: "General" },
  { value: 2, label: "2", group: "General" },
  { value: 3, label: "3", group: "General" },
  { value: 4, label: "4", group: "Special" },
  { value: 5, label: "5", group: "Special" },
  { value: 6, label: "6", group: "Special" },
  { value: 7, label: "7", group: "Special" },
  { value: 8, label: "8", group: "Special" },
] as const;

export function MarksPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Selection state - hierarchical
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string>("");

  // Data state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [marks, setMarks] = useState<MarkDisplay[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);

  // Loading states
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Dialog states
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddMarkDialogOpen, setIsAddMarkDialogOpen] = useState(false);
  const [selectedMark, setSelectedMark] = useState<MarkDisplay | null>(null);
  const [saving, setSaving] = useState(false);

  // Add mark form
  const [markForm, setMarkForm] = useState({
    student_id: "",
    assessment_id: "",
    marks_obtained: "",
    remarks: "",
  });

  const canEdit = user?.role === "lecturer" || user?.role === "super_admin";
  const canDelete = user?.role === "super_admin";
  const canApprove = user?.role === "hod" || user?.role === "super_admin";

  // Fetch departments on mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Fetch subjects when department and semester are selected
  // For GES: no department needed
  useEffect(() => {
    if (selectedSemester === "GES") {
      fetchSubjects();
    } else if (selectedDepartment && selectedSemester) {
      fetchSubjects();
    } else {
      setSubjects([]);
      setSelectedSubject(null);
    }
  }, [selectedDepartment, selectedSemester]);

  // Fetch batches when subject is selected
  useEffect(() => {
    if (selectedSubject) {
      fetchBatches();
      fetchAssessments();
    } else {
      setAvailableBatches([]);
      setSelectedBatch("");
      setAssessments([]);
    }
  }, [selectedSubject]);

  // Fetch marks when all selections are made
  useEffect(() => {
    if (selectedSubject && selectedBatch) {
      fetchMarks();
    } else {
      setMarks([]);
    }
  }, [selectedSubject, selectedBatch]);

  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const response = await api.getDepartments({ page_size: 100, is_active: true });
      setDepartments(response.items);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to load departments"),
        variant: "destructive",
      });
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      setLoadingSubjects(true);

      let response;
      if (selectedSemester === "GES") {
        // GES subjects are department-independent
        response = await api.getSubjects({
          semester_type: "GES",
          is_active: true,
          page_size: 100,
        });
      } else {
        if (!selectedDepartment || !selectedSemester) return;
        response = await api.getSubjects({
          department_id: selectedDepartment,
          semester: selectedSemester as number,
          is_active: true,
          page_size: 100,
        });
      }

      setSubjects(response.items);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to load subjects"),
        variant: "destructive",
      });
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchBatches = async () => {
    if (!selectedSubject) return;

    try {
      setLoadingBatches(true);
      const batches = await api.getBatchesForSubject(selectedSubject);
      // If no batches from API, use generated options
      setAvailableBatches(batches.length > 0 ? batches : generateBatchOptions());
    } catch (error: unknown) {
      // Fallback to generated batch options if API fails
      console.error("Failed to fetch batches:", error);
      setAvailableBatches(generateBatchOptions());
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchAssessments = async () => {
    if (!selectedSubject) return;

    try {
      const assessmentList = await api.getAssessmentsBySubject(selectedSubject);
      setAssessments(assessmentList);
    } catch (error: unknown) {
      console.error("Failed to fetch assessments:", error);
    }
  };

  const fetchMarks = async () => {
    if (!selectedSubject || !selectedBatch) return;

    try {
      setLoadingMarks(true);
      const response = await api.getMarks({
        subject_id: selectedSubject,
        batch: selectedBatch,
        page_size: 100,
      });

      const mappedMarks: MarkDisplay[] = response.items.map((m: BackendMark) => ({
        id: m.id,
        studentId: m.student_student_id || `STU-${m.student_id}`,
        studentName: m.student_name || "Unknown Student",
        subjectCode: m.subject_code || "",
        subjectName: m.subject_name || "",
        assessmentName: m.assessment_name || "",
        assessmentType: m.assessment_type || "",
        marks: m.marks_obtained,
        maxMarks: m.max_marks,
        percentage: m.percentage || Math.round((m.marks_obtained / m.max_marks) * 100),
        status: m.status.toLowerCase() as "pending" | "approved" | "rejected",
        submittedBy: m.submitter_name || "Unknown",
        submittedAt: m.submitted_at,
        reviewedBy: m.reviewer_name,
        reviewedAt: m.reviewed_at,
        remarks: m.remarks,
      }));

      setMarks(mappedMarks);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to load marks"),
        variant: "destructive",
      });
    } finally {
      setLoadingMarks(false);
    }
  };

  const handleApproveMark = async (markId: number) => {
    try {
      setSaving(true);
      await api.approveMark(markId);
      toast({
        title: "Mark Approved",
        description: "The mark has been approved successfully.",
      });
      fetchMarks();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to approve mark"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRejectMark = async (markId: number) => {
    try {
      setSaving(true);
      await api.rejectMark(markId, "Rejected by reviewer");
      toast({
        title: "Mark Rejected",
        description: "The mark has been rejected.",
      });
      fetchMarks();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to reject mark"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMark = async () => {
    if (!selectedSubject || !markForm.student_id || !markForm.assessment_id || !markForm.marks_obtained) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await api.createMark({
        subject_id: selectedSubject,
        student_id: parseInt(markForm.student_id),
        assessment_id: parseInt(markForm.assessment_id),
        marks_obtained: parseFloat(markForm.marks_obtained),
        remarks: markForm.remarks || undefined,
      });

      toast({
        title: "Mark Added",
        description: "The mark has been added successfully.",
      });

      setIsAddMarkDialogOpen(false);
      setMarkForm({ student_id: "", assessment_id: "", marks_obtained: "", remarks: "" });
      fetchMarks();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to add mark"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMark) return;

    toast({
      title: "Mark Deleted",
      description: "The mark entry has been deleted.",
      variant: "destructive",
    });
    setIsDeleteDialogOpen(false);
    setSelectedMark(null);
  };

  const resetSelection = (level: "department" | "semester" | "subject" | "batch") => {
    switch (level) {
      case "department":
        setSelectedDepartment(null);
        setSelectedSemester(null);
        setSelectedSubject(null);
        setSelectedBatch("");
        break;
      case "semester":
        setSelectedSemester(null);
        setSelectedSubject(null);
        setSelectedBatch("");
        break;
      case "subject":
        setSelectedSubject(null);
        setSelectedBatch("");
        break;
      case "batch":
        setSelectedBatch("");
        break;
    }
  };

  const getSelectedDepartmentName = () => {
    return departments.find((d) => d.id === selectedDepartment)?.name || "";
  };

  const getSelectedSubjectName = () => {
    const subject = subjects.find((s) => s.id === selectedSubject);
    return subject ? `${subject.code} - ${subject.name}` : "";
  };

  const columns: Column<MarkDisplay>[] = [
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
      key: "assessment",
      header: "Assessment",
      cell: (row) => (
        <div>
          <p className="font-medium">{row.assessmentName}</p>
          <p className="text-xs text-muted-foreground">{row.assessmentType}</p>
        </div>
      ),
    },
    {
      key: "marks",
      header: "Marks",
      cell: (row) => (
        <div className="font-medium">
          {row.marks}/{row.maxMarks}
          <span className="text-muted-foreground text-sm ml-2">({row.percentage}%)</span>
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
      cell: (row) => (
        <div className="text-sm">
          <p>{row.submittedBy}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(row.submittedAt).toLocaleDateString()}
          </p>
        </div>
      ),
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
            <DropdownMenuItem className="cursor-pointer">
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            {canApprove && row.status === "pending" && (
              <>
                <DropdownMenuItem
                  className="cursor-pointer text-success"
                  onClick={() => handleApproveMark(row.id)}
                  disabled={saving}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-destructive"
                  onClick={() => handleRejectMark(row.id)}
                  disabled={saving}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </DropdownMenuItem>
              </>
            )}
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

  // Render breadcrumb trail
  const renderBreadcrumbs = () => {
    const crumbs = [{ label: "Marks Management" }];

    if (selectedDepartment) {
      crumbs.push({ label: getSelectedDepartmentName() });
    }
    if (selectedSemester) {
      crumbs.push({ label: selectedSemester === "GES" ? "GES" : `Semester ${selectedSemester}` });
    }
    if (selectedSubject) {
      crumbs.push({ label: getSelectedSubjectName() });
    }
    if (selectedBatch) {
      crumbs.push({ label: `Batch ${selectedBatch}` });
    }

    return crumbs;
  };

  // Loading state
  if (loadingDepartments) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Marks Management"
        description="Select department, semester, subject, and batch to view marks"
        breadcrumbs={renderBreadcrumbs()}
        actions={
          selectedSubject && selectedBatch ? (
            <>
              <Button variant="outline" onClick={fetchMarks} disabled={loadingMarks}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loadingMarks ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              {canEdit && (
                <>
                  <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Bulk Upload
                  </Button>
                  <Button onClick={() => setIsAddMarkDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Mark
                  </Button>
                </>
              )}
            </>
          ) : undefined
        }
      />

      {/* Step 1: Select Department */}
      {!selectedDepartment && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Building2 className="h-5 w-5 text-primary" />
            <span>Step 1: Select Department</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <Card
                key={dept.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedDepartment(dept.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span>{dept.name}</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>{dept.code}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {dept.hod_name ? `HOD: ${dept.hod_name}` : "No HOD assigned"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Select Semester */}
      {selectedDepartment && !selectedSemester && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => resetSelection("department")} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Departments
          </Button>
          <div className="flex items-center gap-2 text-lg font-medium">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>Step 2: Select Semester</span>
            <span className="text-muted-foreground text-sm ml-2">
              ({getSelectedDepartmentName()})
            </span>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-medium">General (All Departments)</p>
            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-4">
              {semesterOptions.filter(s => s.group === "General").map((sem) => (
                <Card
                  key={sem.value}
                  className="cursor-pointer hover:border-blue-500 border-blue-200 transition-colors"
                  onClick={() => setSelectedSemester(sem.value)}
                >
                  <CardHeader className="p-4 text-center">
                    <CardTitle className="text-2xl text-blue-600">{sem.label}</CardTitle>
                    <CardDescription>General</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <p className="text-sm text-muted-foreground font-medium pt-2">Special (Department Specific)</p>
            <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-5 gap-4">
              {semesterOptions.filter(s => s.group === "Special").map((sem) => (
                <Card
                  key={sem.value}
                  className="cursor-pointer hover:border-purple-500 border-purple-200 transition-colors"
                  onClick={() => setSelectedSemester(sem.value)}
                >
                  <CardHeader className="p-4 text-center">
                    <CardTitle className="text-2xl text-purple-600">{sem.label}</CardTitle>
                    <CardDescription>Special</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <p className="text-sm text-muted-foreground font-medium pt-2">General Elective Subjects</p>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
              <Card
                className="cursor-pointer hover:border-amber-500 border-amber-200 transition-colors"
                onClick={() => setSelectedSemester("GES")}
              >
                <CardHeader className="p-4 text-center">
                  <CardTitle className="text-2xl text-amber-600">GES</CardTitle>
                  <CardDescription>Elective Subjects</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Select Subject */}
      {((selectedSemester === "GES") || (selectedDepartment && selectedSemester)) && !selectedSubject && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => resetSelection("semester")} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Semesters
          </Button>
          <div className="flex items-center gap-2 text-lg font-medium">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span>Step 3: Select Subject</span>
            <span className="text-muted-foreground text-sm ml-2">
              ({selectedSemester === "GES" ? "GES - General Elective" : `${getSelectedDepartmentName()} - Semester ${selectedSemester}`})
            </span>
          </div>

          {loadingSubjects ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : subjects.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No subjects found for this department and semester.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject) => (
                <Card
                  key={subject.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedSubject(subject.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <span>{subject.code}</span>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardTitle>
                    <CardDescription>{subject.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Credits: {subject.credits}</span>
                      {subject.coordinator_name && (
                        <span className="text-muted-foreground">
                          Coordinator: {subject.coordinator_name}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Select Batch */}
      {((selectedSemester === "GES") || (selectedDepartment && selectedSemester)) && selectedSubject && !selectedBatch && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => resetSelection("subject")} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Subjects
          </Button>
          <div className="flex items-center gap-2 text-lg font-medium">
            <Users className="h-5 w-5 text-primary" />
            <span>Step 4: Select Batch</span>
            <span className="text-muted-foreground text-sm ml-2">({getSelectedSubjectName()})</span>
          </div>

          {loadingBatches ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {availableBatches.map((batch) => (
                <Card
                  key={batch}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedBatch(batch)}
                >
                  <CardHeader className="p-4 text-center">
                    <CardTitle className="text-xl">{batch}</CardTitle>
                    <CardDescription>Batch</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 5: Show Marks Table */}
      {((selectedSemester === "GES") || (selectedDepartment && selectedSemester)) && selectedSubject && selectedBatch && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => resetSelection("batch")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Batches
            </Button>
            <div className="flex-1" />
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg text-sm">
              {selectedSemester !== "GES" && (
                <>
                  <span className="font-medium">{getSelectedDepartmentName()}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </>
              )}
              <span>{selectedSemester === "GES" ? "GES" : `Sem ${selectedSemester}`}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span>{getSelectedSubjectName()}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-primary">{selectedBatch}</span>
            </div>
          </div>

          {loadingMarks ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={marks}
              searchPlaceholder="Search by student name or ID..."
              searchKey="studentName"
              pageSize={10}
              emptyMessage="No marks found for this selection"
            />
          )}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Upload Marks</DialogTitle>
            <DialogDescription>
              Upload marks for {getSelectedSubjectName()} - Batch {selectedBatch}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Assessment</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select assessment" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {assessments.map((assessment) => (
                    <SelectItem key={assessment.id} value={assessment.id.toString()}>
                      {assessment.name} ({assessment.assessment_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Upload File</Label>
              <Input type="file" accept=".csv,.xlsx,.xls" />
              <p className="text-xs text-muted-foreground">
                CSV or Excel file with columns: Student ID, Marks
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Mark Dialog */}
      <Dialog open={isAddMarkDialogOpen} onOpenChange={setIsAddMarkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Mark</DialogTitle>
            <DialogDescription>
              Add a mark for {getSelectedSubjectName()} - Batch {selectedBatch}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="student_id">Student ID *</Label>
              <Input
                id="student_id"
                value={markForm.student_id}
                onChange={(e) => setMarkForm({ ...markForm, student_id: e.target.value })}
                placeholder="Enter student ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assessment">Assessment *</Label>
              <Select
                value={markForm.assessment_id}
                onValueChange={(value) => setMarkForm({ ...markForm, assessment_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assessment" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {assessments.map((assessment) => (
                    <SelectItem key={assessment.id} value={assessment.id.toString()}>
                      {assessment.name} ({assessment.assessment_type}) - Max: {assessment.max_marks}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marks">Marks Obtained *</Label>
              <Input
                id="marks"
                type="number"
                value={markForm.marks_obtained}
                onChange={(e) => setMarkForm({ ...markForm, marks_obtained: e.target.value })}
                placeholder="Enter marks"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Input
                id="remarks"
                value={markForm.remarks}
                onChange={(e) => setMarkForm({ ...markForm, remarks: e.target.value })}
                placeholder="Optional remarks"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMarkDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleAddMark} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Mark
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
            <div className="py-4 px-4 bg-muted rounded-lg">
              <p className="font-medium">
                {selectedMark.studentName} - {selectedMark.subjectCode}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedMark.assessmentName}: {selectedMark.marks}/{selectedMark.maxMarks}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
