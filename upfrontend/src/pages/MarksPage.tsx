import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { mockMarks } from "@/data/mockData";
import { Mark } from "@/types";
import {
  Upload,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export function MarksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMark, setSelectedMark] = useState<Mark | null>(null);

  const canEdit = user?.role === "lecturer" || user?.role === "super_admin";
  const canDelete = user?.role === "super_admin";

  const handleUpload = () => {
    toast({
      title: "Marks Uploaded",
      description: "The marks have been uploaded successfully and are pending approval.",
    });
    setIsUploadDialogOpen(false);
  };

  const handleDelete = () => {
    toast({
      title: "Mark Deleted",
      description: "The mark entry has been deleted.",
      variant: "destructive",
    });
    setIsDeleteDialogOpen(false);
    setSelectedMark(null);
  };

  const columns: Column<Mark>[] = [
    {
      key: "studentId",
      header: "Student ID",
      cell: (row) => <span className="font-mono text-sm">{row.studentId}</span>,
      sortable: true,
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
      sortable: true,
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border shadow-lg">
            <DropdownMenuItem className="cursor-pointer">
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            {canEdit && row.status === "pending" && (
              <DropdownMenuItem className="cursor-pointer">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => {
                  setSelectedMark(row);
                  setIsDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-[80px]",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Marks Management"
        description="Upload, view, and manage student marks"
        breadcrumbs={[{ label: "Marks Management" }]}
        actions={
          <>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Bulk Upload</span>
                </Button>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Add Mark</span>
                </Button>
              </>
            )}
          </>
        }
      />

      <DataTable
        columns={columns}
        data={mockMarks}
        searchPlaceholder="Search by student name..."
        searchKey="studentName"
        pageSize={8}
        emptyMessage="No marks available"
      />

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Marks</DialogTitle>
            <DialogDescription>
              Upload marks for a subject. Supported format: CSV, Excel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="cs301">CS301 - Data Structures</SelectItem>
                  <SelectItem value="cs302">CS302 - Algorithms</SelectItem>
                  <SelectItem value="cs303">CS303 - Database Systems</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assessment Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select assessment" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="midterm">Mid-term</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Upload File</Label>
              <Input type="file" accept=".csv,.xlsx,.xls" />
              <p className="text-xs text-muted-foreground">
                CSV or Excel file with columns: Student ID, Marks
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Mark Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this mark entry? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          {selectedMark && (
            <div className="py-4 px-4 bg-muted rounded-lg">
              <p className="font-medium">
                {selectedMark.studentName} - {selectedMark.subjectCode}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedMark.assessmentType}: {selectedMark.marks}/{selectedMark.maxMarks}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
