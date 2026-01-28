import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { mockSubjects } from "@/data/mockData";
import { Upload, Users, BookOpen, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function LecturerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filter subjects assigned to this lecturer (for demo, show all)
  const assignedSubjects = mockSubjects;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name.split(" ")[0]}`}
        description="Manage your assigned subjects and upload marks"
        actions={
          <Button onClick={() => navigate("/marks")}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Marks
          </Button>
        }
      />

      {/* Assigned Subjects */}
      <h2 className="text-lg font-semibold mb-4">Your Assigned Subjects</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {assignedSubjects.map((subject) => (
          <Card
            key={subject.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/marks")}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <StatusBadge status={subject.marksStatus} />
              </div>
              
              <h3 className="font-semibold text-lg mb-1">{subject.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {subject.code} • {subject.semester}
              </p>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {subject.studentsCount} students
                </div>
                <div className="flex items-center gap-1 text-primary font-medium">
                  Manage
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {assignedSubjects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-1">No Subjects Assigned</h3>
            <p className="text-muted-foreground">
              You haven't been assigned any subjects yet. Contact your HOD for assignment.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
