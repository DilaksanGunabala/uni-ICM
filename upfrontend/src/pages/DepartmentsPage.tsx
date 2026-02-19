import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Building2,
  Users,
  LayoutGrid,
  List,
  MoreVertical,
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
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import api, { BackendDepartment, BackendUser, getApiErrorMessage } from "@/lib/api";

interface DepartmentData {
  id: string;
  name: string;
  code: string;
  description: string;
  hodId: number | null;
  hodName: string;
  isActive: boolean;
  subjectsCount?: number;
  studentsCount?: number;
  lecturersCount?: number;
}

export function DepartmentsPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<DepartmentData[]>([]);
  const [hods, setHods] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || "");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentData | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    hod_id: "",
  });

  const fetchDepartments = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [deptResponse, usersResponse] = await Promise.all([
        api.getDepartments({ page_size: 100 }),
        api.getUsers({ role_id: 2, page_size: 100 }), // role_id 2 = HOD
      ]);

      setHods(usersResponse.items);

      const mappedDepartments: DepartmentData[] = deptResponse.items.map((d: BackendDepartment) => ({
        id: d.id.toString(),
        name: d.name,
        code: d.code,
        description: d.description || "",
        hodId: d.hod_id || null,
        hodName: d.hod_name || "Not Assigned",
        isActive: d.is_active,
        subjectsCount: undefined,
        studentsCount: undefined,
        lecturersCount: undefined,
      }));

      setDepartments(mappedDepartments);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      toast({
        title: "Error",
        description: "Failed to load departments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...departments];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(query) ||
        d.code.toLowerCase().includes(query) ||
        d.hodName.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(d =>
        statusFilter === "active" ? d.isActive : !d.isActive
      );
    }

    setFilteredDepartments(filtered);
  }, [departments, searchQuery, statusFilter]);

  useEffect(() => {
    fetchDepartments();
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

      await api.createDepartment({
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
        hod_id: formData.hod_id ? parseInt(formData.hod_id) : undefined,
        is_active: true,
      });

      toast({
        title: "Department Created",
        description: `${formData.name} has been created successfully.`,
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchDepartments();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to create department."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedDepartment) return;

    try {
      setSaving(true);

      await api.updateDepartment(parseInt(selectedDepartment.id), {
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
        hod_id: formData.hod_id ? parseInt(formData.hod_id) : undefined,
      });

      toast({
        title: "Department Updated",
        description: `${formData.name} has been updated successfully.`,
      });

      setIsEditDialogOpen(false);
      resetForm();
      fetchDepartments();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update department."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDepartment) return;

    try {
      setSaving(true);
      await api.deleteDepartment(parseInt(selectedDepartment.id));

      toast({
        title: "Department Deleted",
        description: `${selectedDepartment.name} has been deleted.`,
      });

      setIsDeleteDialogOpen(false);
      setSelectedDepartment(null);
      fetchDepartments();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to delete department."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      hod_id: "",
    });
    setSelectedDepartment(null);
  };

  const openEditDialog = (department: DepartmentData) => {
    setSelectedDepartment(department);
    setFormData({
      name: department.name,
      code: department.code,
      description: department.description,
      hod_id: department.hodId?.toString() || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (department: DepartmentData) => {
    setSelectedDepartment(department);
    setIsDeleteDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all";

  // Table columns for table view
  const columns: Column<DepartmentData>[] = [
    {
      key: "code",
      header: "Code",
      cell: (row) => <span className="font-mono font-medium">{row.code}</span>,
      sortable: true,
    },
    {
      key: "name",
      header: "Department Name",
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          {row.description && (
            <p className="text-sm text-muted-foreground truncate max-w-xs">{row.description}</p>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      key: "hodName",
      header: "Head of Department",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className={row.hodId ? "" : "text-muted-foreground italic"}>
            {row.hodName}
          </span>
        </div>
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
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border shadow-lg">
            <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(row)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Department
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => openDeleteDialog(row)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Department
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
        title="Department Management"
        description="Manage departments and assign heads of department"
        breadcrumbs={[{ label: "Departments" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchDepartments(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{departments.length}</p>
              <p className="text-xs text-muted-foreground">Total Departments</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Building2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{departments.filter(d => d.isActive).length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{departments.filter(d => d.hodId).length}</p>
              <p className="text-xs text-muted-foreground">With HOD Assigned</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Users className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{departments.filter(d => !d.hodId).length}</p>
              <p className="text-xs text-muted-foreground">Without HOD</p>
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
            placeholder="Search by name, code, HOD..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filteredDepartments.length} of {departments.length}
          </span>
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No departments found</p>
            </div>
          ) : (
            filteredDepartments.map((dept) => (
              <Card key={dept.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                {/* Status indicator */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    dept.isActive ? "bg-success" : "bg-muted-foreground"
                  }`}
                />

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{dept.name}</CardTitle>
                        <CardDescription className="font-mono text-sm">
                          {dept.code}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border shadow-lg">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => openEditDialog(dept)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onClick={() => openDeleteDialog(dept)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Description */}
                  {dept.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {dept.description}
                    </p>
                  )}

                  {/* HOD Info */}
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Head of Department</p>
                      <p
                        className={`text-sm font-medium truncate ${
                          dept.hodId ? "" : "text-muted-foreground italic"
                        }`}
                      >
                        {dept.hodName}
                      </p>
                    </div>
                  </div>

                </CardContent>

                <CardFooter className="pt-0">
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm ${
                        dept.isActive ? "text-success" : "text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          dept.isActive ? "bg-success" : "bg-muted-foreground"
                        }`}
                      />
                      {dept.isActive ? "Active" : "Inactive"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(dept)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Table View */
        <DataTable
          columns={columns}
          data={filteredDepartments}
          pageSize={10}
          emptyMessage="No departments found"
        />
      )}

      {/* Create Department Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Department</DialogTitle>
            <DialogDescription>
              Create a new department in the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Department Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Computer Science"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="CS"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Department description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hod">Head of Department</Label>
              <Select value={formData.hod_id || "none"} onValueChange={(value) => setFormData({ ...formData, hod_id: value === "none" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select HOD" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">Not Assigned</SelectItem>
                  {hods.map((hod) => (
                    <SelectItem key={hod.id} value={hod.id.toString()}>
                      {hod.first_name} {hod.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !formData.name || !formData.code}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">Department Name</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_code">Code</Label>
                <Input
                  id="edit_code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_hod">Head of Department</Label>
              <Select value={formData.hod_id || "none"} onValueChange={(value) => setFormData({ ...formData, hod_id: value === "none" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select HOD" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">Not Assigned</SelectItem>
                  {hods.map((hod) => (
                    <SelectItem key={hod.id} value={hod.id.toString()}>
                      {hod.first_name} {hod.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this department? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedDepartment && (
            <div className="py-4 px-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/20">
                  <Building2 className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">{selectedDepartment.code} - {selectedDepartment.name}</p>
                  <p className="text-sm text-muted-foreground">HOD: {selectedDepartment.hodName}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setSelectedDepartment(null); }} disabled={saving}>
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
