export type UserRole = 'super_admin' | 'dean' | 'hod' | 'lecturer' | 'instructor' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  avatar?: string;
}

export type MarkStatus = 'pending' | 'approved' | 'rejected';

export interface Mark {
  id: string;
  studentId: string;
  studentName: string;
  subjectCode: string;
  subjectName: string;
  assessmentType: string;
  marks: number;
  maxMarks: number;
  semester: string;
  status: MarkStatus;
  uploadedBy: string;
  uploadedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  semester: string;
  credits: number;
  lecturerId: string;
  lecturerName: string;
  department: string;
  studentsCount: number;
  marksStatus: MarkStatus;
}

export interface DashboardStats {
  totalStudents: number;
  totalLecturers: number;
  totalSubjects: number;
  pendingApprovals: number;
  approvedMarks: number;
  rejectedMarks: number;
}

export interface Activity {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
}
