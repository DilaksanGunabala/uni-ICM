import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X, Eye, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api, { BackendMark, getApiErrorMessage } from "@/lib/api";

interface MarkData {
  id: string;
  markId: number;
  studentId: string;
  studentName: string;
  subjectCode: string;
  subjectName: string;
  assessmentType: string;
  marks: number;
  maxMarks: number;
  status: "pending" | "approved" | "rejected";
  uploadedBy: string;
  uploadedAt: string;
}

const statusMap: Record<string, "pending" | "approved" | "rejected"> = {
  'PENDING': 'pending',
  'APPROVED': 'approved',
  'REJECTED': 'rejected',
};

export function ApprovalsPage() {
  const { toast } = useToast();
  const [marks, setMarks] = useState<MarkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMark, setSelectedMark] = useState<MarkData | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchPendingMarks = async () => {
    try {
      setLoading(true);
      const response = await api.getMarks({ status: 'PENDING', page_size: 100 });

      const mappedMarks: MarkData[] = response.items.map((m: BackendMark) => ({
        id: m.id.toString(),
        markId: m.id,
        studentId: m.student_student_id || 'N/A',
        studentName: m.student_name || 'Unknown Student',
        subjectCode: m.subject_code || 'N/A',
        subjectName: m.subject_name || 'Unknown Subject',
        assessmentType: m.assessment_type || m.assessment_name || 'Unknown',
        marks: m.marks_obtained,
        maxMarks: m.max_marks || 100,
        status: statusMap[m.status] || 'pending',
        uploadedBy: m.submitter_name || 'Unknown',
        uploadedAt: new Date(m.submitted_at).toLocaleDateString(),
      }));

      setMarks(mappedMarks);
    } catch (error) {
      console.error('Failed to fetch pending marks:', error);
      toast({
        title: "Error",
        description: "Failed to load pending approvals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingMarks();
  }, []);

  const handleApprove = async () => {
    if (!selectedMark) return;

    try {
      setProcessing(true);
      await api.approveMark(selectedMark.markId);

      toast({
        title: "Marks Approved",
        description: `Marks for ${selectedMark.studentName} have been approved.`,
      });

      setIsApproveDialogOpen(false);
      setSelectedMark(null);
      fetchPendingMarks();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to approve marks."),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedMark || !rejectReason.trim()) return;

    try {
      setProcessing(true);
      await api.rejectMark(selectedMark.markId, rejectReason);

      toast({
        title: "Marks Rejected",
        description: `Marks for ${selectedMark.studentName} have been rejected.`,
        variant: "destructive",
      });

      setIsRejectDialogOpen(false);
      setSelectedMark(null);
      setRejectReason("");
      fetchPendingMarks();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to reject marks."),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const columns: Column<MarkData>[] = [
    {
      key: "studentId",
      header: "Student ID",
      cell: (row) => <span className="font-mono text-sm">{row.studentId}</span>,
    },
    {
      key: "studentName",
      header: "Student Name",
      cell: (row) => row.studentName,
      sortable: true,
    },
    {
      key: "subjectCode",
      header: "Subject",
      cell: (row) => (
        <div>
          <p className="font-medium">{row.subjectCode}</p>
          <p className="text-xs text-muted-foreground">{row.subjectName}</p>
        </div>
      ),
    },
    {
      key: "assessmentType",
      header: "Assessment",
      cell: (row) => row.assessmentType,
    },
    {
      key: "marks",
      header: "Marks",
      cell: (row) => (
        <div className="font-medium">
          {row.marks}/{row.maxMarks}
          <span className="text-muted-foreground text-sm ml-2">
            ({Math.round((row.marks / row.maxMarks) * 100)}%)
          </span>
        </div>
      ),
    },
    {
      key: "uploadedBy",
      header: "Uploaded By",
      cell: (row) => (
        <div>
          <p className="text-sm">{row.uploadedBy}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {row.uploadedAt}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => {
              setSelectedMark(row);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="default"
            className="h-8 bg-success hover:bg-success/90"
            onClick={() => {
              setSelectedMark(row);
              setIsApproveDialogOpen(true);
            }}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-8"
            onClick={() => {
              setSelectedMark(row);
              setIsRejectDialogOpen(true);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: "w-[140px]",
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
        title="Pending Approvals"
        description="Review and approve marks submitted by lecturers"
        breadcrumbs={[{ label: "Approvals" }]}
      />

      {marks.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-lg">
          <Check className="h-16 w-16 mx-auto mb-4 text-success opacity-50" />
          <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
          <p className="text-muted-foreground">
            There are no pending approvals at the moment.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={marks}
          searchPlaceholder="Search by student name..."
          searchKey="studentName"
          pageSize={10}
          emptyMessage="No pending approvals"
        />
      )}

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Marks</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve these marks? This action will make them
              visible to the student.
            </DialogDescription>
          </DialogHeader>
          {selectedMark && (
            <div className="py-4 px-4 bg-muted rounded-lg">
              <p className="font-medium">{selectedMark.studentName}</p>
              <p className="text-sm text-muted-foreground mb-2">
                {selectedMark.subjectCode} - {selectedMark.subjectName}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm">{selectedMark.assessmentType}</span>
                <span className="font-bold">
                  {selectedMark.marks}/{selectedMark.maxMarks}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleApprove} className="bg-success hover:bg-success/90" disabled={processing}>
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Marks</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting these marks. The lecturer will be
              notified.
            </DialogDescription>
          </DialogHeader>
          {selectedMark && (
            <div className="py-4 px-4 bg-muted rounded-lg mb-4">
              <p className="font-medium">{selectedMark.studentName}</p>
              <p className="text-sm text-muted-foreground">
                {selectedMark.subjectCode} - {selectedMark.assessmentType}:{" "}
                {selectedMark.marks}/{selectedMark.maxMarks}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Rejection</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || processing}
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
