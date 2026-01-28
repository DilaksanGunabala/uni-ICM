import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  BookOpen,
  Building2,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  Activity,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api, { BackendAuditLog } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AuditLogData {
  id: string;
  action: string;
  actionType: string;
  tableName: string;
  recordId: number;
  user: string;
  userEmail: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
  formattedTime: string;
  ipAddress: string | null;
}

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case 'INSERT':
      return Plus;
    case 'UPDATE':
      return Pencil;
    case 'DELETE':
      return Trash2;
    case 'APPROVE':
      return CheckCircle;
    case 'REJECT':
      return XCircle;
    case 'LOGIN':
      return LogIn;
    case 'LOGOUT':
      return LogOut;
    default:
      return Activity;
  }
};

const getActionColor = (actionType: string) => {
  switch (actionType) {
    case 'INSERT':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'UPDATE':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'DELETE':
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    case 'APPROVE':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'REJECT':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    case 'LOGIN':
      return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    case 'LOGOUT':
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    default:
      return 'bg-primary/10 text-primary border-primary/20';
  }
};

const getTableIcon = (tableName: string) => {
  switch (tableName) {
    case 'users':
      return Users;
    case 'subjects':
      return BookOpen;
    case 'departments':
      return Building2;
    case 'marks':
      return FileText;
    default:
      return Activity;
  }
};

const actionLabels: Record<string, string> = {
  'INSERT': 'Created',
  'UPDATE': 'Updated',
  'DELETE': 'Deleted',
  'APPROVE': 'Approved',
  'REJECT': 'Rejected',
  'LOGIN': 'Login',
  'LOGOUT': 'Logout',
};

const tableLabels: Record<string, string> = {
  'users': 'Users',
  'marks': 'Marks',
  'subjects': 'Subjects',
  'departments': 'Departments',
  'enrollments': 'Enrollments',
  'assessments': 'Assessments',
};

export function AuditLogsPage() {
  const { toast } = useToast();

  const [logs, setLogs] = useState<AuditLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 20;

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");

  // Detail dialog
  const [selectedLog, setSelectedLog] = useState<AuditLogData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchLogs = async (showRefreshing = false, pageNum = 1) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params: any = {
        page: pageNum,
        page_size: pageSize,
      };

      if (actionFilter !== "all") {
        params.action = actionFilter;
      }

      if (tableFilter !== "all") {
        params.table_name = tableFilter;
      }

      const response = await api.getAuditLogs(params);

      const mappedLogs: AuditLogData[] = response.items.map((log: BackendAuditLog) => ({
        id: log.id.toString(),
        action: `${actionLabels[log.action] || log.action} ${tableLabels[log.table_name] || log.table_name}`,
        actionType: log.action,
        tableName: log.table_name,
        recordId: log.record_id,
        user: log.user_full_name || log.user_email || 'Unknown User',
        userEmail: log.user_email || '',
        oldValue: log.old_value || null,
        newValue: log.new_value || null,
        timestamp: log.performed_at,
        formattedTime: formatTimestamp(log.performed_at),
        ipAddress: log.ip_address || null,
      }));

      setLogs(mappedLogs);
      setTotalPages(response.total_pages);
      setTotalItems(response.total);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to load audit logs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, tableFilter]);

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFullDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActionFilter("all");
    setTableFilter("all");
  };

  const hasActiveFilters = searchQuery || actionFilter !== "all" || tableFilter !== "all";

  // Filter logs by search query (client-side)
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.user.toLowerCase().includes(query) ||
      log.userEmail.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.tableName.toLowerCase().includes(query)
    );
  });

  const openDetailDialog = (log: AuditLogData) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  const parseJsonValue = (value: string | null) => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const exportToCSV = () => {
    const headers = ["ID", "Action", "Table", "Record ID", "User", "Email", "Timestamp", "IP Address"];
    const rows = filteredLogs.map(log => [
      log.id,
      log.action,
      log.tableName,
      log.recordId,
      log.user,
      log.userEmail,
      log.timestamp,
      log.ipAddress || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredLogs.length} audit logs to CSV.`,
    });
  };

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
        title="Audit Logs"
        description="View all system activity and changes"
        breadcrumbs={[{ label: "Audit Logs" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchLogs(true, page)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalItems}</p>
              <p className="text-xs text-muted-foreground">Total Logs</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Plus className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{logs.filter(l => l.actionType === 'INSERT').length}</p>
              <p className="text-xs text-muted-foreground">Creates</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Pencil className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{logs.filter(l => l.actionType === 'UPDATE').length}</p>
              <p className="text-xs text-muted-foreground">Updates</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{logs.filter(l => l.actionType === 'DELETE').length}</p>
              <p className="text-xs text-muted-foreground">Deletes</p>
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
            placeholder="Search by user, action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="INSERT">Created</SelectItem>
            <SelectItem value="UPDATE">Updated</SelectItem>
            <SelectItem value="DELETE">Deleted</SelectItem>
            <SelectItem value="APPROVE">Approved</SelectItem>
            <SelectItem value="REJECT">Rejected</SelectItem>
            <SelectItem value="LOGIN">Login</SelectItem>
            <SelectItem value="LOGOUT">Logout</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="All Tables" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Tables</SelectItem>
            <SelectItem value="users">Users</SelectItem>
            <SelectItem value="subjects">Subjects</SelectItem>
            <SelectItem value="departments">Departments</SelectItem>
            <SelectItem value="marks">Marks</SelectItem>
            <SelectItem value="enrollments">Enrollments</SelectItem>
            <SelectItem value="assessments">Assessments</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {filteredLogs.length} of {totalItems} logs
        </span>
      </div>

      {/* Logs List */}
      <div className="bg-card rounded-lg border">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground font-medium">No audit logs found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredLogs.map((log) => {
              const ActionIcon = getActionIcon(log.actionType);
              const TableIcon = getTableIcon(log.tableName);
              const actionColor = getActionColor(log.actionType);

              return (
                <div
                  key={log.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => openDetailDialog(log)}
                >
                  {/* Action Icon */}
                  <div className={cn("p-2 rounded-lg border shrink-0", actionColor)}>
                    <ActionIcon className="h-4 w-4" />
                  </div>

                  {/* Activity Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{log.action}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground">Record #{log.recordId}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px] bg-muted">
                          {getInitials(log.user)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{log.user}</span>
                      {log.userEmail && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground truncate">{log.userEmail}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Table Type */}
                  <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground">
                    <TableIcon className="h-3 w-3" />
                    <span className="capitalize">{log.tableName}</span>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {log.formattedTime}
                  </div>

                  {/* View Details */}
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(false, page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(false, page + 1)}
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Audit Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className={cn("p-3 rounded-lg border", getActionColor(selectedLog.actionType))}>
                  {(() => {
                    const Icon = getActionIcon(selectedLog.actionType);
                    return <Icon className="h-5 w-5" />;
                  })()}
                </div>
                <div>
                  <p className="font-semibold">{selectedLog.action}</p>
                  <p className="text-sm text-muted-foreground">Record #{selectedLog.recordId}</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">User</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-muted">
                        {getInitials(selectedLog.user)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{selectedLog.user}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                  <p className="text-sm">{selectedLog.userEmail || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Timestamp</p>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {formatFullDate(selectedLog.timestamp)}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">IP Address</p>
                  <p className="text-sm font-mono">{selectedLog.ipAddress || 'N/A'}</p>
                </div>
              </div>

              {/* Old/New Values */}
              {(selectedLog.oldValue || selectedLog.newValue) && (
                <div className="space-y-3">
                  {selectedLog.oldValue && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Previous Value</p>
                      <pre className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-xs overflow-auto max-h-40">
                        {JSON.stringify(parseJsonValue(selectedLog.oldValue), null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.newValue && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">New Value</p>
                      <pre className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg text-xs overflow-auto max-h-40">
                        {JSON.stringify(parseJsonValue(selectedLog.newValue), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
