import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { studentMarks } from "@/data/mockData";
import { Download, FileText, TrendingUp, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedSemester, setSelectedSemester] = useState("Fall 2024");

  // Calculate stats
  const approvedMarks = studentMarks.filter((m) => m.status === "approved");
  const averageScore =
    approvedMarks.length > 0
      ? Math.round(
          approvedMarks.reduce((acc, m) => acc + (m.marks / m.maxMarks) * 100, 0) /
            approvedMarks.length
        )
      : 0;
  const highestScore = Math.max(...approvedMarks.map((m) => m.marks));
  const totalSubjects = new Set(approvedMarks.map((m) => m.subjectCode)).size;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name}`}
        description="View your academic performance and marks"
        actions={
          <Button onClick={() => navigate("/my-marks")}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        }
      />

      {/* Semester Selector */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm font-medium text-muted-foreground">Semester:</span>
        <Select value={selectedSemester} onValueChange={setSelectedSemester}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select semester" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="Fall 2024">Fall 2024</SelectItem>
            <SelectItem value="Spring 2024">Spring 2024</SelectItem>
            <SelectItem value="Fall 2023">Fall 2023</SelectItem>
          </SelectContent>
        </Select>
      </div>

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

      {/* Recent Marks Preview */}
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
          <div className="space-y-3">
            {approvedMarks.slice(0, 4).map((mark) => (
              <div
                key={mark.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="font-medium">{mark.subjectName}</p>
                  <p className="text-sm text-muted-foreground">
                    {mark.assessmentType} • {mark.approvedAt}
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
        </CardContent>
      </Card>
    </div>
  );
}
