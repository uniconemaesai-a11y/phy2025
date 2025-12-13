export enum Role {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  gradeLevel?: 5 | 6; // For students
  classroom?: string; // e.g., "5/1"
}

export interface Assignment {
  id: string;
  title: string;
  type: 'Assignment' | 'Quiz' | 'Project' | 'Exam';
  gradeLevel: 5 | 6;
  maxScore: number;
  dueDate: string;
  classrooms: string[];
  status: 'Active' | 'Draft' | 'Closed';
}

export interface Score {
  assignmentId: string;
  studentId: string;
  score: number | null; // null means not graded yet
  status: 'submitted' | 'pending' | 'not_submitted';
  feedback?: string;
}

export interface StudentData {
  id: string;
  studentId: string; // e.g., S001
  name: string;
  gradeLevel: 5 | 6;
  classroom: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'late' | 'leave' | 'missing'; // มา, สาย, ลา, ขาด
  reason?: string;
}

export interface HealthRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  weight: number; // kg
  height: number; // cm
  bmi: number;
  interpretation: 'ผอม' | 'สมส่วน' | 'ท้วม' | 'เริ่มอ้วน' | 'อ้วน';
}