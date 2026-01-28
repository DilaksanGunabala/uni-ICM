export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  HOD = "HOD",
  LECTURER = "LECTURER",
  STUDENT = "STUDENT",
}

export enum MarkStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum EnrollmentStatus {
  ACTIVE = "ACTIVE",
  DROPPED = "DROPPED",
  COMPLETED = "COMPLETED",
}

export enum AssessmentType {
  QUIZ = "QUIZ",
  ASSIGNMENT = "ASSIGNMENT",
  MID_TERM = "MID_TERM",
  FINAL_EXAM = "FINAL_EXAM",
  PROJECT = "PROJECT",
  LAB = "LAB",
  PRESENTATION = "PRESENTATION",
  OTHER = "OTHER",
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  department_id?: number;
  employee_id?: string;
  student_id?: string;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  hod_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  hod_name?: string;
}

export interface Subject {
  id: number;
  code: string;
  name: string;
  department_id: number;
  semester: number;
  academic_year: string;
  credits: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department_name?: string;
  department_code?: string;
}

export interface Enrollment {
  id: number;
  student_id: number;
  subject_id: number;
  academic_year: string;
  enrollment_date: string;
  status: EnrollmentStatus;
  created_at: string;
  updated_at: string;
  student_name?: string;
  student_email?: string;
  student_student_id?: string;
  subject_code?: string;
  subject_name?: string;
  subject_credits?: number;
  department_name?: string;
}

export interface Assessment {
  id: number;
  subject_id: number;
  name: string;
  assessment_type: AssessmentType;
  max_marks: number;
  weightage?: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
  subject_code?: string;
  subject_name?: string;
  subject_semester?: number;
  department_name?: string;
}

export interface Mark {
  id: number;
  enrollment_id: number;
  assessment_id: number;
  marks_obtained: number;
  is_absent: boolean;
  status: MarkStatus;
  submitted_by: number;
  reviewed_by?: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
  student_id?: string;
  subject_name?: string;
  subject_code?: string;
  assessment_name?: string;
  assessment_type?: AssessmentType;
  max_marks?: number;
  lecturer_name?: string;
  reviewer_name?: string;
}

export interface AuditLog {
  id: number;
  table_name: string;
  record_id: number;
  action: string;
  old_value?: string;
  new_value?: string;
  performed_by: number;
  performed_at: string;
  ip_address?: string;
  user_agent?: string;
  user_email?: string;
  user_full_name?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  detail: string;
}
