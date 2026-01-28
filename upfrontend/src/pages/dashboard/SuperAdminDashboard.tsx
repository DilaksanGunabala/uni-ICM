import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/page-header";
import { StatsCard } from "@/components/ui/stats-card";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/ui/global-search";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  GraduationCap,
  BookOpen,
  UserPlus,
  Clock,
  Building2,
  Loader2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  ChevronRight,
  Activity,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api, { BackendAuditLog, DashboardStats } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ActivityData {
  id: string;
  action: string;
  actionType: string;
  tableName: string;
  user: string;
  userEmail: string;
  details: string;
  timestamp: string;
  rawTimestamp: string;
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

export function SuperAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch stats - this is critical
      try {
        const statsData = await api.getDashboardStats();
        setStats(statsData);
      } catch (statsError) {
        console.error('Failed to fetch stats:', statsError);
        // Set default stats if API fails
        setStats({
          totalUsers: 0,
          totalStudents: 0,
          totalLecturers: 0,
          totalHODs: 0,
          totalSubjects: 0,
          totalDepartments: 0,
        });
      }

      // Fetch audit logs - optional, don't fail if this doesn't work
      try {
        const auditLogsResponse = await api.getAuditLogs({ page_size: 8 });

        // Transform audit logs to activity format
        const activityData: ActivityData[] = auditLogsResponse.items.map((log: BackendAuditLog) => ({
          id: log.id.toString(),
          action: formatAction(log.action, log.table_name),
          actionType: log.action,
          tableName: log.table_name,
          user: log.user_full_name || log.user_email || 'Unknown User',
          userEmail: log.user_email || '',
          details: formatDetails(log),
          timestamp: formatTimestamp(log.performed_at),
          rawTimestamp: log.performed_at,
        }));

        setActivities(activityData);
      } catch (auditError) {
        console.error('Failed to fetch audit logs:', auditError);
        setActivities([]); // Empty activities if audit logs fail
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load some dashboard data. Please try refreshing.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatAction = (action: string, tableName: string): string => {
    const actionMap: Record<string, string> = {
      'INSERT': 'Created',
      'UPDATE': 'Updated',
      'DELETE': 'Deleted',
      'APPROVE': 'Approved',
      'REJECT': 'Rejected',
      'LOGIN': 'Logged in',
      'LOGOUT': 'Logged out',
    };

    const tableMap: Record<string, string> = {
      'users': 'User',
      'marks': 'Marks',
      'subjects': 'Subject',
      'departments': 'Department',
      'enrollments': 'Enrollment',
      'assessments': 'Assessment',
    };

    const actionText = actionMap[action] || action;
    const tableText = tableMap[tableName] || tableName;

    return `${actionText} ${tableText}`;
  };

  const formatDetails = (log: BackendAuditLog): string => {
    if (log.new_value) {
      try {
        const newVal = JSON.parse(log.new_value);
        if (newVal.email) return newVal.email;
        if (newVal.first_name && newVal.last_name) return `${newVal.first_name} ${newVal.last_name}`;
        if (newVal.name) return newVal.name;
        if (newVal.code) return newVal.code;
        if (newVal.marks_obtained !== undefined) return `Score: ${newVal.marks_obtained}`;
      } catch {
        // If not JSON, just show record ID
      }
    }
    return `Record #${log.record_id}`;
  };

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

    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
        title={`Welcome back, ${user?.name.split(" ")[0]}`}
        description="Here's an overview of the university marks system"
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={() => navigate('/departments')}>
              <Building2 className="mr-2 h-4 w-4" />
              Add Department
            </Button>
            <Button onClick={() => navigate('/users')}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </>
        }
      />

      {/* Search Bar */}
      <div className="mb-6">
        <GlobalSearch className="max-w-2xl" />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Total Students"
          value={stats?.totalStudents.toLocaleString() || '0'}
          icon={Users}
          description="Enrolled students"
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Total Lecturers"
          value={stats?.totalLecturers.toString() || '0'}
          icon={GraduationCap}
          description="Active faculty members"
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="Total Subjects"
          value={stats?.totalSubjects.toString() || '0'}
          icon={BookOpen}
          description="Offered this semester"
        />
        <StatsCard
          title="Departments"
          value={stats?.totalDepartments.toString() || '0'}
          icon={Building2}
          description="Active departments"
        />
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{stats?.totalUsers.toLocaleString() || '0'}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">HODs</p>
              <p className="text-2xl font-bold">{stats?.totalHODs || '0'}</p>
            </div>
            <GraduationCap className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">System Status</p>
              <p className="text-2xl font-bold text-success">Online</p>
            </div>
            <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {activities.length} activities
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/audit-logs')}>
            View All
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        {activities.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground font-medium">No recent activity</p>
            <p className="text-sm text-muted-foreground mt-1">Activity will appear here when actions are performed</p>
          </div>
        ) : (
          <div className="divide-y">
            {activities.map((activity) => {
              const ActionIcon = getActionIcon(activity.actionType);
              const TableIcon = getTableIcon(activity.tableName);
              const actionColor = getActionColor(activity.actionType);

              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/audit-logs')}
                >
                  {/* Action Icon */}
                  <div className={cn("p-2 rounded-lg border", actionColor)}>
                    <ActionIcon className="h-4 w-4" />
                  </div>

                  {/* Activity Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{activity.action}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground truncate">{activity.details}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px] bg-muted">
                          {getInitials(activity.user)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{activity.user}</span>
                    </div>
                  </div>

                  {/* Table Type */}
                  <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground">
                    <TableIcon className="h-3 w-3" />
                    <span className="capitalize">{activity.tableName}</span>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {activity.timestamp}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {activities.length > 0 && (
          <div className="p-3 border-t bg-muted/30 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => navigate('/audit-logs')}
            >
              View all activity logs
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
