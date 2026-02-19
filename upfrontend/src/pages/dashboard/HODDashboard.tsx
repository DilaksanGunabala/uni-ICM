import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/page-header";
import { StatsCard } from "@/components/ui/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CheckSquare, Clock, XCircle, Users, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api, { BackendMark } from "@/lib/api";

interface PendingMark {
  id: number;
  studentName: string;
  subjectCode: string;
  assessmentType: string;
  uploadedBy: string;
  uploadedAt: string;
}

export function HODDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [lecturerCount, setLecturerCount] = useState(0);
  const [pendingMarks, setPendingMarks] = useState<PendingMark[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [pendingRes, approvedRes, rejectedRes, lecturersRes] = await Promise.all([
          api.getMarks({ status: "PENDING", page_size: 100 }),
          api.getMarks({ status: "APPROVED", page: 1, page_size: 1 }),
          api.getMarks({ status: "REJECTED", page: 1, page_size: 1 }),
          api.getUsers({ department_id: user?.departmentId, role_id: 3, page: 1, page_size: 1 }),
        ]);

        setPendingCount(pendingRes.total);
        setApprovedCount(approvedRes.total);
        setRejectedCount(rejectedRes.total);
        setLecturerCount(lecturersRes.total);

        const mapped: PendingMark[] = pendingRes.items.map((m: BackendMark) => ({
          id: m.id,
          studentName: m.student_name || "Unknown Student",
          subjectCode: m.subject_code || "N/A",
          assessmentType: m.assessment_type || m.assessment_name || "Unknown",
          uploadedBy: m.submitter_name || "Unknown",
          uploadedAt: new Date(m.submitted_at).toLocaleDateString(),
        }));
        setPendingMarks(mapped);
      } catch (error) {
        console.error("Failed to fetch HOD dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.departmentId]);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name.split(" ")[0]}`}
        description={`${user?.department || "Your Department"} - Marks Overview`}
        actions={
          <Button onClick={() => navigate("/approvals")}>
            <CheckSquare className="mr-2 h-4 w-4" />
            View All Approvals
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatsCard
              title="Pending Approvals"
              value={pendingCount}
              icon={Clock}
              iconClassName="bg-warning/15"
              description="Awaiting your review"
            />
            <StatsCard
              title="Approved Marks"
              value={approvedCount.toLocaleString()}
              icon={CheckSquare}
              iconClassName="bg-success/15"
              description="Total approved"
            />
            <StatsCard
              title="Rejected Marks"
              value={rejectedCount}
              icon={XCircle}
              iconClassName="bg-destructive/15"
              description="Needs re-submission"
            />
            <StatsCard
              title="Department Staff"
              value={lecturerCount}
              icon={Users}
              description="Active lecturers"
            />
          </div>

          {/* Pending Approvals Preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold">Pending Approvals</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/approvals")}
                className="text-primary"
              >
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {pendingMarks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No pending approvals</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingMarks.slice(0, 4).map((mark) => (
                    <div
                      key={mark.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium">
                          {mark.subjectCode} - {mark.assessmentType}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Uploaded by {mark.uploadedBy} • {mark.uploadedAt}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status="pending" />
                        <Button size="sm" variant="outline" onClick={() => navigate("/approvals")}>
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
