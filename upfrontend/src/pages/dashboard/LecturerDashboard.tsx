import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, BookOpen, ArrowRight, Loader2, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api, { Subject } from "@/lib/api";

export function LecturerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        const data = await api.getMyAssignedSubjects();
        setSubjects(data);
      } catch (error) {
        console.error("Failed to fetch assigned subjects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

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

      <h2 className="text-lg font-semibold mb-4">Your Assigned Subjects</h2>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : subjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-1">No Subjects Assigned</h3>
            <p className="text-muted-foreground">
              You haven't been assigned any subjects yet. Contact your HOD for assignment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
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
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    <GraduationCap className="h-3 w-3" />
                    {subject.credits} credits
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-1">{subject.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {subject.code} • Semester {subject.semester ?? "N/A"}
                </p>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">
                    {subject.department_name || "General"}
                  </span>
                  <div className="flex items-center gap-1 text-primary font-medium">
                    Manage
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
