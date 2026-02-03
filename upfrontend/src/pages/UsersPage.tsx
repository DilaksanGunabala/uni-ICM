import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Column } from "@/components/ui/data-table";
import { RoleBadge } from "@/components/ui/role-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  UserPlus,
  Edit,
  MoreHorizontal,
  Trash2,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Download,
  Shield,
  UserCheck,
  UserX,
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
import { UserRole } from "@/types";
import { useToast } from "@/hooks/use-toast";
import api, { BackendUser, BackendDepartment, getApiErrorMessage } from "@/lib/api";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleBackend: string;
  department: string;
  departmentId: number | null;
  status: "active" | "inactive";
  employeeId?: string;
  studentId?: string;
}

const roleMap: Record<string, UserRole> = {
  'SUPER_ADMIN': 'super_admin',
  'HOD': 'hod',
  'LECTURER': 'lecturer',
  'STUDENT': 'student',
};

const reverseRoleMap: Record<UserRole, string> = {
  'super_admin': 'SUPER_ADMIN',
  'hod': 'HOD',
  'lecturer': 'LECTURER',
  'student': 'STUDENT',
};

// Backend role_id mapping (from database)
const roleIdMap: Record<string, number> = {
  'SUPER_ADMIN': 1,
  'HOD': 2,
  'LECTURER': 3,
  'STUDENT': 4,
};

const roleLabels: Record<string, string> = {
  'SUPER_ADMIN': 'Super Admin',
  'HOD': 'Head of Department',
  'LECTURER': 'Lecturer',
  'STUDENT': 'Student',
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

// Generate batch options (E20, E21, E22, etc.) based on current year
const generateBatchOptions = (): string[] => {
  const currentYear = new Date().getFullYear();
  const batches: string[] = [];
  // Generate batches from current year back to 2018
  for (let year = currentYear; year >= 2018; year--) {
    batches.push(`E${year.toString().slice(-2)}`);
  }
  return batches;
};

export function UsersPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] = useState<BackendDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || "");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "STUDENT" as string,
    department_id: "" as string,
    employee_id: "",
    student_id: "",
    batch: "",
  });

  // Stats
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    admins: users.filter(u => u.roleBackend === 'SUPER_ADMIN').length,
  };

  const fetchUsers = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [usersResponse, deptResponse] = await Promise.all([
        api.getUsers({ page_size: 100 }),
        api.getDepartments({ page_size: 100 }),
      ]);

      const deptMap = new Map(deptResponse.items.map(d => [d.id, d.name]));
      setDepartments(deptResponse.items);

      const mappedUsers: UserData[] = usersResponse.items.map((u: BackendUser) => {
        // Backend returns role_name from the users list endpoint
        const roleName = u.role_name || u.role || 'STUDENT';
        return {
          id: u.id.toString(),
          name: `${u.first_name} ${u.last_name}`,
          email: u.email,
          role: roleMap[roleName] || 'student',
          roleBackend: roleName,
          department: u.department_name || (u.department_id ? deptMap.get(u.department_id) || 'N/A' : 'N/A'),
          departmentId: u.department_id || null,
          status: u.is_active ? 'active' : 'inactive',
          employeeId: u.employee_id,
          studentId: u.student_id,
        };
      });

      setUsers(mappedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(query)) ||
        (u.studentId && u.studentId.toLowerCase().includes(query))
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(u => u.roleBackend === roleFilter);
    }

    // Department filter
    if (departmentFilter !== "all") {
      filtered = filtered.filter(u => u.departmentId?.toString() === departmentFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(u => u.status === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, roleFilter, departmentFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
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

      const userData: {
        first_name: string;
        last_name: string;
        email: string;
        password: string;
        role_id: number;
        department_id?: number;
        is_active: boolean;
        employee_id?: string;
        student_id?: string;
      } = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        password: formData.password,
        role_id: roleIdMap[formData.role],
        department_id: formData.department_id ? parseInt(formData.department_id) : undefined,
        is_active: true,
      };

      // Add employee_id or student_id based on role
      if (formData.role === 'STUDENT') {
        // Use provided student_id, or generate one based on batch if batch is selected
        if (formData.student_id) {
          userData.student_id = formData.student_id;
        } else if (formData.batch) {
          // Generate student_id in format E/XX/XXX where XX is batch year
          const batchYear = formData.batch.replace(/[A-Z]/gi, '');
          const randomNum = Math.floor(100 + Math.random() * 900);
          userData.student_id = `E/${batchYear}/${randomNum}`;
        } else {
          userData.student_id = `STU${Date.now()}`;
        }
      } else {
        userData.employee_id = formData.employee_id || `EMP${Date.now()}`;
      }

      await api.createUser(userData);

      toast({
        title: "User Created",
        description: `${formData.first_name} ${formData.last_name} has been created successfully.`,
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to create user."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);

      await api.updateUser(parseInt(selectedUser.id), {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        role_id: roleIdMap[formData.role],
        department_id: formData.department_id ? parseInt(formData.department_id) : undefined,
      });

      toast({
        title: "User Updated",
        description: `${formData.first_name} ${formData.last_name} has been updated successfully.`,
      });

      setIsEditDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update user."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);
      await api.deleteUser(parseInt(selectedUser.id));

      toast({
        title: "User Deleted",
        description: `${selectedUser.name} has been deleted successfully.`,
      });

      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to delete user."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      role: "STUDENT",
      department_id: "",
      employee_id: "",
      student_id: "",
      batch: "",
    });
    setSelectedUser(null);
  };

  // Extract batch from student ID (e.g., "E/20/123" -> "E20")
  const extractBatchFromStudentId = (studentId: string | undefined): string => {
    if (!studentId) return '';
    // Match patterns like E/20/123, E20/123, E.20.123, E-20-123
    const match = studentId.match(/([A-Z]+)[/.\-]?(\d{2})[/.\-]?\d*/i);
    if (match) {
      return `${match[1].toUpperCase()}${match[2]}`;
    }
    return '';
  };

  const openEditDialog = (user: UserData) => {
    const [firstName, ...lastNameParts] = user.name.split(" ");
    setSelectedUser(user);
    setFormData({
      first_name: firstName,
      last_name: lastNameParts.join(" "),
      email: user.email,
      password: "",
      role: reverseRoleMap[user.role],
      department_id: user.departmentId?.toString() || "",
      employee_id: user.employeeId || "",
      student_id: user.studentId || "",
      batch: extractBatchFromStudentId(user.studentId),
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: UserData) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setDepartmentFilter("all");
    setStatusFilter("all");
  };

  const exportToCSV = () => {
    // Use filtered users for export
    const dataToExport = filteredUsers.length > 0 ? filteredUsers : users;

    if (dataToExport.length === 0) {
      toast({
        title: "No Data",
        description: "No users to export.",
        variant: "destructive",
      });
      return;
    }

    // CSV headers
    const headers = ["Name", "Email", "Role", "Department", "ID", "Status"];

    // CSV rows
    const rows = dataToExport.map(user => [
      user.name,
      user.email,
      roleLabels[user.roleBackend] || user.roleBackend,
      user.department,
      user.studentId || user.employeeId || "",
      user.status === "active" ? "Active" : "Inactive"
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `Exported ${dataToExport.length} users to CSV.`,
    });
  };

  const hasActiveFilters = searchQuery || roleFilter !== "all" || departmentFilter !== "all" || statusFilter !== "all";

  const columns: Column<UserData>[] = [
    {
      key: "name",
      header: "User",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials(row.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-sm text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: "role",
      header: "Role",
      cell: (row) => <RoleBadge role={row.role} />,
    },
    {
      key: "department",
      header: "Department",
      cell: (row) => <span className="text-sm">{row.department}</span>,
    },
    {
      key: "id_number",
      header: "ID",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.studentId || row.employeeId || '-'}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <span
          className={`inline-flex items-center gap-1.5 text-sm ${
            row.status === "active" ? "text-success" : "text-muted-foreground"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              row.status === "active" ? "bg-success" : "bg-muted-foreground"
            }`}
          />
          {row.status === "active" ? "Active" : "Inactive"}
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
              Edit User
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => openDeleteDialog(row)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete User
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
        title="User Management"
        description="Manage system users including lecturers, students, and administrators"
        breadcrumbs={[{ label: "Users" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchUsers(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <UserCheck className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <UserX className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inactive}</p>
              <p className="text-xs text-muted-foreground">Inactive</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.admins}</p>
              <p className="text-xs text-muted-foreground">Admins</p>
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
            placeholder="Search by name, email, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            <SelectItem value="HOD">HOD</SelectItem>
            <SelectItem value="LECTURER">Lecturer</SelectItem>
            <SelectItem value="STUDENT">Student</SelectItem>
          </SelectContent>
        </Select>

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

        <span className="ml-auto text-sm text-muted-foreground">
          {filteredUsers.length} of {users.length} users
        </span>
      </div>

      <DataTable
        columns={columns}
        data={filteredUsers}
        pageSize={10}
        emptyMessage="No users found"
      />

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account in the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.doe@university.edu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min 6 characters"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    <SelectItem value="HOD">Head of Department</SelectItem>
                    <SelectItem value="LECTURER">Lecturer</SelectItem>
                    <SelectItem value="STUDENT">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={formData.department_id || "none"} onValueChange={(value) => setFormData({ ...formData, department_id: value === "none" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.role === 'STUDENT' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="student_id">Student ID</Label>
                  <Input
                    id="student_id"
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    placeholder="e.g., E/20/123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch">Batch</Label>
                  <Select value={formData.batch || "none"} onValueChange={(value) => setFormData({ ...formData, batch: value === "none" ? "" : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="none">Select batch</SelectItem>
                      {generateBatchOptions().map((batch) => (
                        <SelectItem key={batch} value={batch}>
                          {batch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input
                  id="employee_id"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  placeholder="e.g., EMP001"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !formData.first_name || !formData.last_name || !formData.email || !formData.password}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_first_name">First Name</Label>
                <Input
                  id="edit_first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_last_name">Last Name</Label>
                <Input
                  id="edit_last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    <SelectItem value="HOD">Head of Department</SelectItem>
                    <SelectItem value="LECTURER">Lecturer</SelectItem>
                    <SelectItem value="STUDENT">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_department">Department</Label>
                <Select value={formData.department_id || "none"} onValueChange={(value) => setFormData({ ...formData, department_id: value === "none" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4 px-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-destructive/20 text-destructive">
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedUser.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setSelectedUser(null); }} disabled={saving}>
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
