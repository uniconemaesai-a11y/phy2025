import React, { createContext, useContext, useState, ReactNode, useEffect, PropsWithChildren } from 'react';
import { User, Assignment, Score, StudentData, Role, Attendance, HealthRecord } from '../types';

// *** Google Apps Script Web App URL ***
const API_URL = 'https://script.google.com/macros/s/AKfycbwEz7qB2vwlu6tTVx-CJrs1yFBPwbefN1Xlo1TLuG7G_JxB0Vxwknfvuc8EBuGamw-X/exec'; 

interface AttendanceStats {
  present: number;
  late: number;
  leave: number;
  missing: number;
  totalDays: number;
  attendanceRate: number;
}

interface AppContextType {
  currentUser: User | null;
  login: (username: string, password?: string, role?: Role) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  refreshData: () => Promise<void>;
  
  assignments: Assignment[];
  addAssignment: (assignment: Assignment) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  
  scores: Score[];
  updateScore: (score: Score) => Promise<void>;
  
  students: StudentData[];
  getStudentScore: (studentId: string, assignmentId: string) => number | string;
  addStudent: (student: StudentData) => Promise<void>;
  updateStudent: (student: StudentData) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;

  attendance: Attendance[];
  markAttendance: (studentId: string, date: string, status: 'present' | 'late' | 'leave' | 'missing', reason?: string) => Promise<void>;
  markAttendanceBulk: (data: {studentId: string, date: string, status: 'present' | 'late' | 'leave' | 'missing', reason?: string}[]) => Promise<void>;
  getStudentAttendanceStats: (studentId: string) => AttendanceStats;
  getDailyAttendance: (date: string, classroom: string) => Attendance[];

  healthRecords: HealthRecord[];
  updateHealthRecord: (record: HealthRecord) => Promise<void>;
  getLatestHealthRecord: (studentId: string) => HealthRecord | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: PropsWithChildren) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Helper to call API
  const callApi = async (action: string, payload: any = {}) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("API Error:", error);
      return { status: 'error', message: 'การเชื่อมต่อขัดข้อง กรุณาลองใหม่' };
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    const res = await callApi('getData');
    if (res.status === 'success') {
      // Clean and Normalize Students Data
      const cleanStudents = (res.students || []).map((s: any) => ({
         ...s,
         gradeLevel: Number(s.gradeLevel),
         classroom: s.classroom ? String(s.classroom).trim() : ''
      }));
      setStudents(cleanStudents);

      setAssignments(res.assignments || []);
      setScores(res.scores || []);
      
      // Clean and Normalize Attendance Dates to YYYY-MM-DD
      const cleanAttendance = (res.attendance || []).map((a: any) => ({
         ...a,
         date: typeof a.date === 'string' ? a.date.split('T')[0] : a.date
      }));
      setAttendance(cleanAttendance);

      // Set Health Records (if available from API, or init empty array if not yet impl on backend)
      setHealthRecords(res.healthRecords || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
      refreshData();
    }
  }, []);

  const login = async (username: string, password?: string, role: Role = Role.TEACHER) => {
    setIsLoading(true);
    const res = await callApi('login', { username, password, role });
    setIsLoading(false);

    if (res.status === 'success') {
      setCurrentUser(res.user);
      localStorage.setItem('user', JSON.stringify(res.user));
      refreshData();
      return true;
    } else {
      alert(res.message || 'เข้าสู่ระบบไม่สำเร็จ');
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('user');
    setAssignments([]);
    setStudents([]);
    setScores([]);
    setAttendance([]);
    setHealthRecords([]);
  };

  const addAssignment = async (assignment: Assignment) => {
    setAssignments(prev => [...prev, assignment]);
    await callApi('addAssignment', { payload: assignment });
    refreshData();
  };

  const deleteAssignment = async (id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id));
    await callApi('deleteAssignment', { id });
  };

  const updateScore = async (newScore: Score) => {
    setScores(prev => {
      const existing = prev.findIndex(s => s.assignmentId === newScore.assignmentId && s.studentId === newScore.studentId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newScore;
        return updated;
      }
      return [...prev, newScore];
    });
    // Send to backend without waiting (optimistic)
    callApi('updateScore', { payload: newScore });
  };

  const getStudentScore = (studentId: string, assignmentId: string): number | string => {
    const found = scores.find(s => String(s.studentId) === String(studentId) && String(s.assignmentId) === String(assignmentId));
    return found && found.score !== null ? found.score : '';
  };

  const addStudent = async (student: StudentData) => {
    setStudents(prev => [...prev, student]);
    await callApi('addStudent', { payload: student });
  };

  const updateStudent = async (student: StudentData) => {
    setStudents(prev => prev.map(s => s.id === student.id ? student : s));
  };

  const deleteStudent = async (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    await callApi('deleteStudent', { id });
  };

  const markAttendance = async (studentId: string, date: string, status: 'present' | 'late' | 'leave' | 'missing', reason?: string) => {
    const id = `ATT-${studentId}-${date}`;
    const newRecord: Attendance = { id, studentId, date, status, reason };
    
    setAttendance(prev => {
      // Clean previous record for this student on this day if exists
      const filtered = prev.filter(a => !(String(a.studentId) === String(studentId) && a.date === date));
      return [...filtered, newRecord];
    });

    callApi('markAttendance', { payload: newRecord });
  };

  const markAttendanceBulk = async (data: {studentId: string, date: string, status: 'present' | 'late' | 'leave' | 'missing', reason?: string}[]) => {
    const newRecords: Attendance[] = data.map(d => ({
        id: `ATT-${d.studentId}-${d.date}`,
        studentId: d.studentId,
        date: d.date,
        status: d.status,
        reason: d.reason
    }));

    setAttendance(prev => {
      const updatingIds = new Set(newRecords.map(r => r.id));
      const others = prev.filter(r => !updatingIds.has(r.id));
      return [...others, ...newRecords];
    });

    await callApi('markAttendanceBulk', { payload: newRecords });
  };

  const getStudentAttendanceStats = (studentId: string): AttendanceStats => {
    const records = attendance.filter(a => String(a.studentId) === String(studentId));
    const totalDays = records.length;
    
    if (totalDays === 0) return { present: 0, late: 0, leave: 0, missing: 0, totalDays: 0, attendanceRate: 100 };

    const present = records.filter(a => a.status === 'present').length;
    const late = records.filter(a => a.status === 'late').length;
    const leave = records.filter(a => a.status === 'leave').length;
    const missing = records.filter(a => a.status === 'missing').length;

    const attendanceRate = Math.round(((present + late) / totalDays) * 100);

    return { present, late, leave, missing, totalDays, attendanceRate };
  };

  const getDailyAttendance = (date: string, classroom: string) => {
     const classStudents = students.filter(s => s.classroom === classroom);
     const studentIds = classStudents.map(s => String(s.studentId));
     return attendance.filter(a => a.date === date && studentIds.includes(String(a.studentId)));
  };

  const updateHealthRecord = async (record: HealthRecord) => {
    setHealthRecords(prev => {
      // Filter out existing record for this student to replace it (assuming 1 latest record per student for now, or append if history needed)
      // For this implementation, we'll just keep a list. In a real app, we might check date.
      const existingIndex = prev.findIndex(r => r.studentId === record.studentId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = record;
        return updated;
      }
      return [...prev, record];
    });
    // Optimistic UI, then call API
    await callApi('updateHealthRecord', { payload: record });
  };

  const getLatestHealthRecord = (studentId: string) => {
    return healthRecords.find(r => r.studentId === studentId);
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      login,
      logout,
      isLoading,
      refreshData,
      assignments,
      addAssignment,
      deleteAssignment,
      scores,
      updateScore,
      students,
      getStudentScore,
      addStudent,
      updateStudent,
      deleteStudent,
      attendance,
      markAttendance,
      markAttendanceBulk,
      getStudentAttendanceStats,
      getDailyAttendance,
      healthRecords,
      updateHealthRecord,
      getLatestHealthRecord
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};