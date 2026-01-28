import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/page-header";
import { StatsCard } from "@/components/ui/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { mockStats, mockMarks } from "@/data/mockData";
import { CheckSquare, Clock, XCircle, AlertCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function HODDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const pendingMarks = mockMarks.filter((m) => m.status === "pending");

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name.split(" ")[0]}`}
        description="Department of Computer Science - Marks Overview"
        actions={
          <Button onClick={() => navigate("/approvals")}>
            <CheckSquare className="mr-2 h-4 w-4" />
            View All Approvals
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Pending Approvals"
          value={mockStats.pendingApprovals}
          icon={Clock}
          iconClassName="bg-warning/15"
          description="Awaiting your review"
        />
        <StatsCard
          title="Approved Marks"
          value={mockStats.approvedMarks.toLocaleString()}
          icon={CheckSquare}
          iconClassName="bg-success/15"
          description="This semester"
        />
        <StatsCard
          title="Rejected Marks"
          value={mockStats.rejectedMarks}
          icon={XCircle}
          iconClassName="bg-destructive/15"
          description="Needs re-submission"
        />
        <StatsCard
          title="Department Staff"
          value={mockStats.totalLecturers}
          icon={AlertCircle}
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
                    <StatusBadge status={mark.status} />
                    <Button size="sm" variant="outline">
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
