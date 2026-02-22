import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Edit,
  MoreHorizontal,
  Trash2,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  BookOpen,
  ArrowLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import api, { BackendSubject, BackendDepartment, BackendUser, getApiErrorMessage } from "@/lib/api";

interface SubjectData {
  id: string;
  code: string;
  name: string;
  semesterType: string;
  departmentId: number | null;
  departmentName: string;
  semester: number | null;
  credits: number;
  isActive: boolean;
  coordinatorId: number | null;
  coordinatorName: string | null;
  lecturerId: number | null;
  lecturerName: string | null;
}

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

export function SubjectsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Role-based capability flags
  const isAdmin = user?.role === 'super_admin';
  const canAssign = user?.role === 'super_admin' || user?.role === 'hod';

  // Selection state
  const [selectedSemester, setSelectedSemester] = useState<number | string | null>(null);

  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<SubjectData[]>([]);
  const [departments, setDepartments] = useState<BackendDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || "");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectData | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    semester_type: "GENERAL",
    department_id: "",
    semester: "1",
    credits: "3",
    coordinator_id: "none",
    lecturer_id: "none",
  });

  // Staff users for coordinator/lecturer dropdowns
  const [staffUsers, setStaffUsers] = useState<BackendUser[]>([]);
  const [lecturerUsers, setLecturerUsers] = useState<BackendUser[]>([]);

  // Stats for semester cards
  const [semesterCounts, setSemesterCounts] = useState<Record<string, number>>({});

  // Fetch departments and staff users on mount
  useEffect(() => {
    fetchDepartments();
    fetchAllSubjectsForCounts();
    if (canAssign) fetchStaffUsers();
  }, []);

  // Fetch subjects when semester is selected
  useEffect(() => {
    if (selectedSemester !== null) {
      fetchSubjectsForSemester();
    }
  }, [selectedSemester]);

  const fetchDepartments = async () => {
    try {
      const deptResponse = await api.getDepartments({ page_size: 100 });
      setDepartments(deptResponse.items);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      const response = await api.getUsers({ page_size: 100, is_active: true });
      // Filter by role_name (DB-agnostic, always reliable)
      const coordinatorRoleNames = ["HOD", "LECTURER", "DEAN", "INSTRUCTOR"];
      const lecturerRoleNames = ["LECTURER", "INSTRUCTOR"];
      setStaffUsers(response.items.filter((u: BackendUser) => coordinatorRoleNames.includes(u.role_name || "")));
      setLecturerUsers(response.items.filter((u: BackendUser) => lecturerRoleNames.includes(u.role_name || "")));
    } catch (error) {
      console.error('Failed to fetch staff users:', error);
    }
  };

  const fetchAllSubjectsForCounts = async () => {
    try {
      const response = await api.getSubjects({ page_size: 500 });
      const counts: Record<string, number> = {};

      response.items.forEach((s: BackendSubject) => {
        if (s.semester_type === "GES") {
          counts["GES"] = (counts["GES"] || 0) + 1;
        } else if (s.semester !== null) {
          counts[s.semester.toString()] = (counts[s.semester.toString()] || 0) + 1;
        }
      });

      setSemesterCounts(counts);
    } catch (error) {
      console.error('Failed to fetch subject counts:', error);
    }
  };

  const fetchSubjectsForSemester = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoadingSubjects(true);
      }

      let params: Record<string, unknown> = { page_size: 100 };

      if (selectedSemester === "GES") {
        params.semester_type = "GES";
      } else if (typeof selectedSemester === "number") {
        params.semester = selectedSemester;
      }

      const subjectsResponse = await api.getSubjects(params);

      const mappedSubjects: SubjectData[] = subjectsResponse.items.map((s: BackendSubject) => ({
        id: s.id.toString(),
        code: s.code,
        name: s.name,
        semesterType: s.semester_type || "GENERAL",
        departmentId: s.department_id,
        departmentName: s.department_name || "N/A",
        semester: s.semester,
        credits: s.credits,
        isActive: s.is_active,
        coordinatorId: s.coordinator_id ?? null,
        coordinatorName: s.coordinator_name || null,
        lecturerId: s.lecturer_id ?? null,
        lecturerName: s.lecturer_name || null,
      }));

      setSubjects(mappedSubjects);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      toast({
        title: "Error",
        description: "Failed to load subjects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingSubjects(false);
      setRefreshing(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...subjects];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.code.toLowerCase().includes(query) ||
        s.name.toLowerCase().includes(query) ||
        s.departmentName.toLowerCase().includes(query)
      );
    }

    // Department filter (only for Special semesters)
    if (departmentFilter !== "all") {
      filtered = filtered.filter(s => s.departmentId?.toString() === departmentFilter);
    }

    setFilteredSubjects(filtered);
  }, [subjects, searchQuery, departmentFilter]);

  // Update URL when search changes
  useEffect(() => {
    if (searchQuery) {
      setSearchParams({ search: searchQuery });
    } else {
      setSearchParams({});
    }
  }, [searchQuery]);

  const handleCreate = async () => {
    try {
      setSaving(true);

      const newSubject = await api.createSubject({
        code: formData.code,
        name: formData.name,
        semester_type: formData.semester_type,
        department_id: formData.semester_type === "SPECIAL" ? parseInt(formData.department_id) : undefined,
        semester: formData.semester_type !== "GES" ? parseInt(formData.semester) : undefined,
        credits: parseInt(formData.credits),
        coordinator_id: (formData.coordinator_id && formData.coordinator_id !== "none") ? parseInt(formData.coordinator_id) : undefined,
        is_active: true,
      } as Partial<BackendSubject>);

      // Assign lecturer if selected
      if (formData.lecturer_id && formData.lecturer_id !== "none") {
        try {
          await api.assignLecturer(newSubject.id, {
            lecturer_id: parseInt(formData.lecturer_id),
            academic_year: "2025/2026",
          });
        } catch {
          // lecturer assignment failure is non-fatal
          toast({
            title: "Warning",
            description: "Subject created but lecturer assignment failed. You can assign a lecturer via Edit.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Subject Created",
        description: `${formData.code} - ${formData.name} has been created successfully.`,
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchSubjectsForSemester();
      fetchAllSubjectsForCounts();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to create subject."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedSubject) return;

    try {
      setSaving(true);
      const subjectId = parseInt(selectedSubject.id);
      const newCoordId = (formData.coordinator_id && formData.coordinator_id !== "none")
        ? parseInt(formData.coordinator_id) : null;
      const newLecturerId = (formData.lecturer_id && formData.lecturer_id !== "none")
        ? parseInt(formData.lecturer_id) : null;
      const oldLecturerId = selectedSubject.lecturerId;

      if (isAdmin) {
        // Super Admin: full subject update including coordinator
        await api.updateSubject(subjectId, {
          code: formData.code,
          name: formData.name,
          semester_type: formData.semester_type,
          department_id: formData.semester_type === "SPECIAL" ? parseInt(formData.department_id) : null,
          semester: formData.semester_type !== "GES" ? parseInt(formData.semester) : null,
          credits: parseInt(formData.credits),
          coordinator_id: newCoordId,
        } as Partial<BackendSubject>);
      } else if (canAssign) {
        // HOD: only coordinator_id update (backend enforces dept scope)
        await api.updateSubject(subjectId, {
          coordinator_id: newCoordId,
        } as Partial<BackendSubject>);
      }

      // Handle lecturer assignment change (both admin and HOD)
      if (canAssign && newLecturerId !== oldLecturerId) {
        if (oldLecturerId) {
          try {
            const assignments = await api.getSubjectLecturers(subjectId);
            for (const a of assignments) {
              await api.removeSubjectLecturer(subjectId, a.id);
            }
          } catch {
            // ignore removal errors
          }
        }
        if (newLecturerId) {
          await api.assignLecturer(subjectId, {
            lecturer_id: newLecturerId,
            academic_year: "2025/2026",
          });
        }
      }

      toast({
        title: "Subject Updated",
        description: `${selectedSubject.code} - ${selectedSubject.name} has been updated successfully.`,
      });

      setIsEditDialogOpen(false);
      resetForm();
      fetchSubjectsForSemester();
      fetchAllSubjectsForCounts();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update subject."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSubject) return;

    try {
      setSaving(true);
      await api.deleteSubject(parseInt(selectedSubject.id));

      toast({
        title: "Subject Deleted",
        description: `${selectedSubject.code} - ${selectedSubject.name} has been deleted.`,
      });

      setIsDeleteDialogOpen(false);
      setSelectedSubject(null);
      fetchSubjectsForSemester();
      fetchAllSubjectsForCounts();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to delete subject."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    // Pre-fill form based on selected semester
    let defaultSemesterType = "GENERAL";
    let defaultSemester = "1";

    if (selectedSemester === "GES") {
      defaultSemesterType = "GES";
      defaultSemester = "";
    } else if (typeof selectedSemester === "number") {
      if (selectedSemester >= 4) {
        defaultSemesterType = "SPECIAL";
        defaultSemester = selectedSemester.toString();
      } else {
        defaultSemesterType = "GENERAL";
        defaultSemester = selectedSemester.toString();
      }
    }

    setFormData({
      code: "",
      name: "",
      semester_type: defaultSemesterType,
      department_id: "",
      semester: defaultSemester,
      credits: "3",
      coordinator_id: "none",
      lecturer_id: "none",
    });
    setSelectedSubject(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (subject: SubjectData) => {
    setSelectedSubject(subject);
    setFormData({
      code: subject.code,
      name: subject.name,
      semester_type: subject.semesterType,
      department_id: subject.departmentId ? subject.departmentId.toString() : "",
      semester: subject.semester ? subject.semester.toString() : "1",
      credits: subject.credits.toString(),
      coordinator_id: subject.coordinatorId ? subject.coordinatorId.toString() : "none",
      lecturer_id: subject.lecturerId ? subject.lecturerId.toString() : "none",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (subject: SubjectData) => {
    setSelectedSubject(subject);
    setIsDeleteDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDepartmentFilter("all");
  };

  const hasActiveFilters = searchQuery || departmentFilter !== "all";

  const getSemesterLabel = () => {
    if (selectedSemester === "GES") {
      return "GES - General Elective Subjects";
    }
    const sem = semesterOptions.find(s => s.value === selectedSemester);
    if (sem) {
      return `Semester ${sem.label} (${sem.group})`;
    }
    return "";
  };

  const isSpecialSemester = typeof selectedSemester === "number" && selectedSemester >= 4;

  const columns: Column<SubjectData>[] = [
    {
      key: "code",
      header: "Code",
      cell: (row) => <span className="font-mono font-medium">{row.code}</span>,
      sortable: true,
    },
    {
      key: "name",
      header: "Subject Name",
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-sm text-muted-foreground">{row.credits} Credits</p>
        </div>
      ),
      sortable: true,
    },
    ...(isSpecialSemester ? [{
      key: "departmentName" as keyof SubjectData,
      header: "Department",
      cell: (row: SubjectData) => <span className="text-sm">{row.departmentName}</span>,
    }] : []),
    {
      key: "coordinatorName",
      header: "Coordinator",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.coordinatorName || "Not assigned"}
        </span>
      ),
    },
    {
      key: "lecturerName",
      header: "Lecturer",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.lecturerName || "Not assigned"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <span
          className={`inline-flex items-center gap-1.5 text-sm ${
            row.isActive ? "text-success" : "text-muted-foreground"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              row.isActive ? "bg-success" : "bg-muted-foreground"
            }`}
          />
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    ...(canAssign ? [{
      key: "actions",
      header: "Actions",
      cell: (row: SubjectData) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border shadow-lg">
            <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(row)}>
              <Edit className="mr-2 h-4 w-4" />
              {isAdmin ? "Edit Subject" : "Assign Staff"}
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => openDeleteDialog(row)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Subject
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-[80px]",
    }] : []),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Subject Management"
        description="Manage subjects by semester"
        breadcrumbs={
          selectedSemester !== null
            ? [
                { label: "Subjects", onClick: () => setSelectedSemester(null) },
                { label: getSemesterLabel() },
              ]
            : [{ label: "Subjects" }]
        }
        actions={
          selectedSemester !== null ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchSubjectsForSemester(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              {isAdmin && (
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Subject
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Step 1: Select Semester */}
      {selectedSemester === null && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-lg font-medium">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>Select Semester to View Subjects</span>
          </div>

          {/* General Semesters (1-3) */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-medium">General Semesters (All Departments)</p>
            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-4">
              {semesterOptions.filter(s => s.group === "General").map((sem) => (
                <Card
                  key={sem.value}
                  className="cursor-pointer hover:border-blue-500 border-blue-200 transition-colors"
                  onClick={() => setSelectedSemester(sem.value)}
                >
                  <CardHeader className="p-6 text-center">
                    <CardTitle className="text-3xl text-blue-600">{sem.label}</CardTitle>
                    <CardDescription>General Semester</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 text-center">
                    <p className="text-sm text-muted-foreground">
                      {semesterCounts[sem.value.toString()] || 0} subjects
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Special Semesters (4-8) */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-medium">Special Semesters (Department Specific)</p>
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
                  <CardContent className="pt-0 text-center">
                    <p className="text-xs text-muted-foreground">
                      {semesterCounts[sem.value.toString()] || 0} subjects
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* GES */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-medium">General Elective Subjects</p>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
              <Card
                className="cursor-pointer hover:border-amber-500 border-amber-200 transition-colors"
                onClick={() => setSelectedSemester("GES")}
              >
                <CardHeader className="p-6 text-center">
                  <CardTitle className="text-3xl text-amber-600">GES</CardTitle>
                  <CardDescription>General Elective Subjects</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 text-center">
                  <p className="text-sm text-muted-foreground">
                    {semesterCounts["GES"] || 0} subjects
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Show Subjects Table */}
      {selectedSemester !== null && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setSelectedSemester(null)} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Semesters
          </Button>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedSemester === "GES"
                    ? "bg-amber-500/10"
                    : isSpecialSemester
                      ? "bg-purple-500/10"
                      : "bg-blue-500/10"
                }`}>
                  <BookOpen className={`h-5 w-5 ${
                    selectedSemester === "GES"
                      ? "text-amber-600"
                      : isSpecialSemester
                        ? "text-purple-600"
                        : "text-blue-600"
                  }`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{subjects.length}</p>
                  <p className="text-xs text-muted-foreground">Total Subjects</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <BookOpen className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{subjects.filter(s => s.isActive).length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
            <Filter className="h-4 w-4 text-muted-foreground" />

            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by code, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {isSpecialSemester && (
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-44 h-9">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}

            <span className="ml-auto text-sm text-muted-foreground">
              {filteredSubjects.length} of {subjects.length} subjects
            </span>
          </div>

          {loadingSubjects ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredSubjects}
              pageSize={10}
              emptyMessage="No subjects found for this semester"
            />
          )}
        </div>
      )}

      {/* Create Subject Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Subject</DialogTitle>
            <DialogDescription>
              Create a new subject for {getSemesterLabel()}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Subject Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="CS101"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credits">Credits *</Label>
                <Select value={formData.credits} onValueChange={(value) => setFormData({ ...formData, credits: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select credits" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {[1, 2, 3, 4, 5, 6].map((c) => (
                      <SelectItem key={c} value={c.toString()}>
                        {c} Credit{c !== 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Subject Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Introduction to Computer Science"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester_type">Subject Type *</Label>
              <Select
                value={formData.semester_type}
                onValueChange={(value) => {
                  const updates: Record<string, string> = { semester_type: value };
                  if (value === "GENERAL") updates.semester = "1";
                  else if (value === "SPECIAL") updates.semester = "4";
                  else if (value === "GES") { updates.semester = ""; updates.department_id = ""; }
                  if (value !== "SPECIAL") updates.department_id = "";
                  setFormData({ ...formData, ...updates });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="GENERAL">General (Sem 1-3)</SelectItem>
                  <SelectItem value="SPECIAL">Special (Sem 4-8, Dept Required)</SelectItem>
                  <SelectItem value="GES">GES (General Elective)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {formData.semester_type === "SPECIAL" && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select value={formData.department_id} onValueChange={(value) => setFormData({ ...formData, department_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {formData.semester_type !== "GES" && (
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester *</Label>
                  <Select value={formData.semester} onValueChange={(value) => setFormData({ ...formData, semester: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {(formData.semester_type === "GENERAL" ? [1, 2, 3] : [4, 5, 6, 7, 8]).map((sem) => (
                        <SelectItem key={sem} value={sem.toString()}>
                          Semester {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {canAssign && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="coordinator">Coordinator</Label>
                  <Select value={formData.coordinator_id} onValueChange={(value) => setFormData({ ...formData, coordinator_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="none">None</SelectItem>
                      {staffUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.first_name} {u.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lecturer">Lecturer</Label>
                  <Select value={formData.lecturer_id} onValueChange={(value) => setFormData({ ...formData, lecturer_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="none">None</SelectItem>
                      {lecturerUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.first_name} {u.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !formData.code || !formData.name || (formData.semester_type === "SPECIAL" && !formData.department_id)}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subject Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAdmin ? "Edit Subject" : "Assign Staff"}</DialogTitle>
            <DialogDescription>
              {isAdmin
                ? "Update subject information."
                : "Assign a coordinator and lecturer to this subject."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* HOD: read-only subject context */}
            {!isAdmin && selectedSubject && (
              <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Subject</p>
                <p className="font-semibold">{selectedSubject.code} — {selectedSubject.name}</p>
                {selectedSubject.departmentName && selectedSubject.departmentName !== "N/A" && (
                  <p className="text-sm text-muted-foreground">{selectedSubject.departmentName}</p>
                )}
              </div>
            )}

            {/* Admin-only fields */}
            {isAdmin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_code">Subject Code</Label>
                    <Input
                      id="edit_code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_credits">Credits</Label>
                    <Select value={formData.credits} onValueChange={(value) => setFormData({ ...formData, credits: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select credits" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {[1, 2, 3, 4, 5, 6].map((c) => (
                          <SelectItem key={c} value={c.toString()}>
                            {c} Credit{c !== 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Subject Name</Label>
                  <Input
                    id="edit_name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_semester_type">Subject Type</Label>
                  <Select
                    value={formData.semester_type}
                    onValueChange={(value) => {
                      const updates: Record<string, string> = { semester_type: value };
                      if (value === "GENERAL") updates.semester = "1";
                      else if (value === "SPECIAL") updates.semester = "4";
                      else if (value === "GES") { updates.semester = ""; updates.department_id = ""; }
                      if (value !== "SPECIAL") updates.department_id = "";
                      setFormData({ ...formData, ...updates });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="GENERAL">General (Sem 1-3)</SelectItem>
                      <SelectItem value="SPECIAL">Special (Sem 4-8, Dept Required)</SelectItem>
                      <SelectItem value="GES">GES (General Elective)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {formData.semester_type === "SPECIAL" && (
                    <div className="space-y-2">
                      <Label htmlFor="edit_department">Department</Label>
                      <Select value={formData.department_id} onValueChange={(value) => setFormData({ ...formData, department_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id.toString()}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {formData.semester_type !== "GES" && (
                    <div className="space-y-2">
                      <Label htmlFor="edit_semester">Semester</Label>
                      <Select value={formData.semester} onValueChange={(value) => setFormData({ ...formData, semester: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {(formData.semester_type === "GENERAL" ? [1, 2, 3] : [4, 5, 6, 7, 8]).map((sem) => (
                            <SelectItem key={sem} value={sem.toString()}>
                              Semester {sem}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Coordinator and Lecturer — visible to Admin and HOD */}
            {canAssign && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_coordinator">Coordinator</Label>
                  <Select value={formData.coordinator_id} onValueChange={(value) => setFormData({ ...formData, coordinator_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="none">None</SelectItem>
                      {staffUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.first_name} {u.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_lecturer">Lecturer</Label>
                  <Select value={formData.lecturer_id} onValueChange={(value) => setFormData({ ...formData, lecturer_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="none">None</SelectItem>
                      {lecturerUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.first_name} {u.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); }} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Subject</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this subject? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedSubject && (
            <div className="py-4 px-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/20">
                  <BookOpen className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">{selectedSubject.code} - {selectedSubject.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedSubject.departmentName}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setSelectedSubject(null); }} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
