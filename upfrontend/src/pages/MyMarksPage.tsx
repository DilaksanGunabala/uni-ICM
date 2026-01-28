import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileText, Filter, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api, { BackendMark } from "@/lib/api";

interface MarkData {
  id: string;
  subjectCode: string;
  subjectName: string;
  assessmentType: string;
  marks: number;
  maxMarks: number;
  semester: string;
  status: "pending" | "approved" | "rejected";
  approvedAt: string | null;
}

const statusMap: Record<string, "pending" | "approved" | "rejected"> = {
  'PENDING': 'pending',
  'APPROVED': 'approved',
  'REJECTED': 'rejected',
};

export function MyMarksPage() {
  const { toast } = useToast();
  const [marks, setMarks] = useState<MarkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [assessmentFilter, setAssessmentFilter] = useState<string>("all");

  const fetchMyMarks = async () => {
    try {
      setLoading(true);
      const response = await api.getMyMarks();

      const mappedMarks: MarkData[] = response.map((m: BackendMark) => ({
        id: m.id.toString(),
        subjectCode: m.subject_code || 'N/A',
        subjectName: m.subject_name || 'Unknown Subject',
        assessmentType: m.assessment_type || m.assessment_name || 'Unknown',
        marks: m.marks_obtained,
        maxMarks: m.max_marks || 100,
        semester: m.semester?.toString() || 'N/A',
        status: statusMap[m.status] || 'pending',
        approvedAt: m.updated_at ? new Date(m.updated_at).toLocaleDateString() : null,
      }));

      setMarks(mappedMarks);
    } catch (error) {
      console.error('Failed to fetch marks:', error);
      toast({
        title: "Error",
        description: "Failed to load your marks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyMarks();
  }, []);

  // Get unique values for filters
  const subjects = [...new Set(marks.map((m) => m.subjectCode))];
  const semesters = [...new Set(marks.map((m) => m.semester))];
  const assessments = [...new Set(marks.map((m) => m.assessmentType))];

  // Filter marks
  const filteredMarks = marks.filter((mark) => {
    if (subjectFilter !== "all" && mark.subjectCode !== subjectFilter) return false;
    if (semesterFilter !== "all" && mark.semester !== semesterFilter) return false;
    if (assessmentFilter !== "all" && mark.assessmentType !== assessmentFilter)
      return false;
    return true;
  });

  const handleDownload = () => {
    toast({
      title: "Report Downloaded",
      description: "Your marks report has been downloaded as PDF.",
    });
  };

  const columns: Column<MarkData>[] = [
    {
      key: "subjectCode",
      header: "Subject",
      cell: (row) => (
        <div>
          <p className="font-medium">{row.subjectCode}</p>
          <p className="text-sm text-muted-foreground">{row.subjectName}</p>
        </div>
      ),
      sortable: true,
    },
    {
      key: "assessmentType",
      header: "Assessment",
      cell: (row) => row.assessmentType,
      sortable: true,
    },
    {
      key: "marks",
      header: "Marks Obtained",
      cell: (row) => (
        <div>
          <span className="text-lg font-bold">{row.marks}</span>
          <span className="text-muted-foreground">/{row.maxMarks}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: "percentage",
      header: "Percentage",
      cell: (row) => {
        const percentage = Math.round((row.marks / row.maxMarks) * 100);
        return (
          <span
            className={`font-medium ${
              percentage >= 80
                ? "text-success"
                : percentage >= 60
                ? "text-warning"
                : "text-destructive"
            }`}
          >
            {percentage}%
          </span>
        );
      },
      sortable: true,
    },
    {
      key: "semester",
      header: "Semester",
      cell: (row) => row.semester,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "approvedAt",
      header: "Date",
      cell: (row) => (
        <span className="text-muted-foreground">{row.approvedAt || "-"}</span>
      ),
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
        title="My Marks"
        description="View your academic performance and approved marks"
        breadcrumbs={[{ label: "My Marks" }]}
        actions={
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Filters:</span>

        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject} value={subject}>
                {subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={semesterFilter} onValueChange={setSemesterFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Semester" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Semesters</SelectItem>
            {semesters.map((semester) => (
              <SelectItem key={semester} value={semester}>
                Semester {semester}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={assessmentFilter} onValueChange={setAssessmentFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Assessment" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Assessments</SelectItem>
            {assessments.map((assessment) => (
              <SelectItem key={assessment} value={assessment}>
                {assessment}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(subjectFilter !== "all" ||
          semesterFilter !== "all" ||
          assessmentFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSubjectFilter("all");
              setSemesterFilter("all");
              setAssessmentFilter("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {filteredMarks.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-1">No Marks Found</h3>
          <p className="text-muted-foreground">
            {marks.length === 0
              ? "You don't have any marks recorded yet."
              : "No marks match your current filters."}
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredMarks}
          searchPlaceholder="Search by subject..."
          searchKey="subjectName"
          pageSize={10}
          emptyMessage="No marks available"
        />
      )}
    </div>
  );
}
