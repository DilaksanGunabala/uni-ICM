import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Download, FileText, TrendingUp, Award, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api, { BackendMark } from "@/lib/api";

interface MarkData {
  id: number;
  subjectName: string;
  subjectCode: string;
  assessmentType: string;
  marks: number;
  maxMarks: number;
  status: "pending" | "approved" | "rejected";
  approvedAt: string | null;
}

const statusMap: Record<string, "pending" | "approved" | "rejected"> = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [marks, setMarks] = useState<MarkData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarks = async () => {
      try {
        setLoading(true);
        const response = await api.getMyMarks();
        const mapped: MarkData[] = response.map((m: BackendMark) => ({
          id: m.id,
          subjectName: m.subject_name || "Unknown Subject",
          subjectCode: m.subject_code || "N/A",
          assessmentType: m.assessment_type || m.assessment_name || "Unknown",
          marks: m.marks_obtained,
          maxMarks: m.max_marks || 100,
          status: statusMap[m.status] || "pending",
          approvedAt: m.reviewed_at ? new Date(m.reviewed_at).toLocaleDateString() : null,
        }));
        setMarks(mapped);
      } catch (error) {
        console.error("Failed to fetch student marks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarks();
  }, []);

  const approvedMarks = marks.filter((m) => m.status === "approved");
  const averageScore =
    approvedMarks.length > 0
      ? Math.round(
          approvedMarks.reduce((acc, m) => acc + (m.marks / m.maxMarks) * 100, 0) /
            approvedMarks.length
        )
      : 0;
  const highestScore =
    approvedMarks.length > 0 ? Math.max(...approvedMarks.map((m) => m.marks)) : 0;
  const totalSubjects = new Set(approvedMarks.map((m) => m.subjectCode)).size;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name}`}
        description="View your academic performance and marks"
        actions={
          <Button onClick={() => navigate("/my-marks")}>
            <Download className="mr-2 h-4 w-4" />
            View All Marks
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    <p className="text-2xl font-bold">{averageScore}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-success/10">
                    <Award className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Highest Score</p>
                    <p className="text-2xl font-bold">{highestScore}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-warning/10">
                    <FileText className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Subjects</p>
                    <p className="text-2xl font-bold">{totalSubjects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Approved Marks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold">Latest Approved Marks</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/my-marks")}
                className="text-primary"
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {approvedMarks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No approved marks yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {approvedMarks.slice(0, 4).map((mark) => (
                    <div
                      key={mark.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{mark.subjectName}</p>
                        <p className="text-sm text-muted-foreground">
                          {mark.assessmentType}
                          {mark.approvedAt ? ` • ${mark.approvedAt}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            {mark.marks}/{mark.maxMarks}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round((mark.marks / mark.maxMarks) * 100)}%
                          </p>
                        </div>
                        <StatusBadge status={mark.status} />
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
