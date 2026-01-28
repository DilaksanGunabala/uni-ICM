import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import api, { BackendSubject, BackendDepartment } from "@/lib/api";

interface SubjectData {
  id: string;
  code: string;
  name: string;
  departmentId: number;
  departmentName: string;
  semester: number;
  academicYear: string;
  credits: number;
  isActive: boolean;
}

export function SubjectsPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<SubjectData[]>([]);
  const [departments, setDepartments] = useState<BackendDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || "");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectData | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    department_id: "",
    semester: "1",
    academic_year: "2024-2025",
    credits: "3",
  });

  const fetchSubjects = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [subjectsResponse, deptResponse] = await Promise.all([
        api.getSubjects({ page_size: 100 }),
        api.getDepartments({ page_size: 100 }),
      ]);

      setDepartments(deptResponse.items);

      const mappedSubjects: SubjectData[] = subjectsResponse.items.map((s: BackendSubject) => ({
        id: s.id.toString(),
        code: s.code,
        name: s.name,
        departmentId: s.department_id,
        departmentName: s.department_name || "N/A",
        semester: s.semester,
        academicYear: s.academic_year,
        credits: s.credits,
        isActive: s.is_active,
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
      setLoading(false);
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

    // Department filter
    if (departmentFilter !== "all") {
      filtered = filtered.filter(s => s.departmentId.toString() === departmentFilter);
    }

    // Semester filter
    if (semesterFilter !== "all") {
      filtered = filtered.filter(s => s.semester.toString() === semesterFilter);
    }

    setFilteredSubjects(filtered);
  }, [subjects, searchQuery, departmentFilter, semesterFilter]);

  useEffect(() => {
    fetchSubjects();
  }, []);

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

      await api.createSubject({
        code: formData.code,
        name: formData.name,
        department_id: parseInt(formData.department_id),
        semester: parseInt(formData.semester),
        academic_year: formData.academic_year,
        credits: parseInt(formData.credits),
        is_active: true,
      });

      toast({
        title: "Subject Created",
        description: `${formData.code} - ${formData.name} has been created successfully.`,
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create subject.",
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

      await api.updateSubject(parseInt(selectedSubject.id), {
        code: formData.code,
        name: formData.name,
        department_id: parseInt(formData.department_id),
        semester: parseInt(formData.semester),
        academic_year: formData.academic_year,
        credits: parseInt(formData.credits),
      });

      toast({
        title: "Subject Updated",
        description: `${formData.code} - ${formData.name} has been updated successfully.`,
      });

      setIsEditDialogOpen(false);
      resetForm();
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to update subject.",
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
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to delete subject.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      department_id: "",
      semester: "1",
      academic_year: "2024-2025",
      credits: "3",
    });
    setSelectedSubject(null);
  };

  const openEditDialog = (subject: SubjectData) => {
    setSelectedSubject(subject);
    setFormData({
      code: subject.code,
      name: subject.name,
      department_id: subject.departmentId.toString(),
      semester: subject.semester.toString(),
      academic_year: subject.academicYear,
      credits: subject.credits.toString(),
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
    setSemesterFilter("all");
  };

  const hasActiveFilters = searchQuery || departmentFilter !== "all" || semesterFilter !== "all";

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
    {
      key: "departmentName",
      header: "Department",
      cell: (row) => <span className="text-sm">{row.departmentName}</span>,
    },
    {
      key: "semester",
      header: "Semester",
      cell: (row) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
          Sem {row.semester}
        </span>
      ),
      sortable: true,
    },
    {
      key: "academicYear",
      header: "Academic Year",
      cell: (row) => <span className="text-sm text-muted-foreground">{row.academicYear}</span>,
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
            <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(row)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Subject
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => openDeleteDialog(row)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Subject
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-[80px]",
    },
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
        description="Manage subjects and assign lecturers"
        breadcrumbs={[{ label: "Subjects" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchSubjects(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
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

        <Select value={semesterFilter} onValueChange={setSemesterFilter}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="All Semesters" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Semesters</SelectItem>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <SelectItem key={sem} value={sem.toString()}>
                Semester {sem}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {filteredSubjects.length} of {subjects.length} subjects
        </span>
      </div>

      <DataTable
        columns={columns}
        data={filteredSubjects}
        pageSize={10}
        emptyMessage="No subjects found"
      />

      {/* Create Subject Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Subject</DialogTitle>
            <DialogDescription>
              Create a new subject in the system.
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
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="semester">Semester *</Label>
                <Select value={formData.semester} onValueChange={(value) => setFormData({ ...formData, semester: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <SelectItem key={sem} value={sem.toString()}>
                        Semester {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="academic_year">Academic Year</Label>
              <Input
                id="academic_year"
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                placeholder="2024-2025"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !formData.code || !formData.name || !formData.department_id}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subject Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>
              Update subject information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="edit_semester">Semester</Label>
                <Select value={formData.semester} onValueChange={(value) => setFormData({ ...formData, semester: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <SelectItem key={sem} value={sem.toString()}>
                        Semester {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_academic_year">Academic Year</Label>
              <Input
                id="edit_academic_year"
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
              />
            </div>
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
