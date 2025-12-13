import React, { createContext, useContext, useState, ReactNode, useEffect, PropsWithChildren } from 'react';
import { User, Assignment, Score, StudentData, Role, Attendance, HealthRecord } from '../types';
import { MOCK_USERS, MOCK_STUDENTS, INITIAL_ASSIGNMENTS, INITIAL_SCORES, INITIAL_ATTENDANCE } from '../constants';

// *** Google Apps Script Web App URL ***
const API_URL = 'https://script.google.com/macros/s/AKfycbwEz7qB2vwlu6tTVx-CJrs1yFBPwbefN1Xlo1TLuG7G_JxB0Vxwknfvuc8EBuGamw-X/exec'; 

// *** Google Sheet Config for Direct Login ***
const USERS_SPREADSHEET_ID = '192jkPyqJHzlvaTqsI_zYW1z6exjoLBopwAz3NbGyxvc';
const USERS_SHEET_NAME = 'Users';

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
      console.warn("API Connection Failed, switching to Mock Data mode for demo.");
      return { status: 'mock_fallback' };
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    const res = await callApi('getData');
    
    if (res.status === 'success') {
      // Clean Students
      const cleanStudents = (res.students || []).map((s: any) => {
         let grade = Number(s.gradeLevel);
         let cls = s.classroom ? String(s.classroom).trim() : '';

         // Fix: Check if classroom is converted to Date string by Google Sheets (e.g., "2024-05-01T...")
         // This happens when inputs like "5/1" are interpreted as May 1st
         if (cls.length > 10 && !isNaN(Date.parse(cls))) {
            const date = new Date(cls);
            // Use local components to reconstruct "Month/Day"
            // "5/1" -> May 1st -> Month 5, Day 1
            const month = date.getMonth() + 1;
            const day = date.getDate();
            cls = `${month}/${day}`;
         }

         return {
            ...s,
            gradeLevel: grade,
            classroom: cls
         };
      });
      
      // Sort students by ID or Name for consistency
      cleanStudents.sort((a: StudentData, b: StudentData) => {
          return a.classroom.localeCompare(b.classroom) || a.studentId.localeCompare(b.studentId);
      });

      setStudents(cleanStudents);

      // Clean Assignments (Parse classrooms JSON string)
      const cleanAssignments = (res.assignments || []).map((a: any) => {
        let cls: string[] = [];
        if (Array.isArray(a.classrooms)) {
          cls = a.classrooms;
        } else if (typeof a.classrooms === 'string') {
          try {
            // Attempt to parse JSON
            cls = JSON.parse(a.classrooms);
          } catch (e) {
            // If parse fails, maybe it's a single value string or comma separated
            if (a.classrooms.includes(',')) {
                cls = a.classrooms.split(',').map((c: string) => c.trim());
            } else {
                cls = [a.classrooms];
            }
          }
        }
        return {
          ...a,
          gradeLevel: Number(a.gradeLevel),
          maxScore: Number(a.maxScore),
          classrooms: Array.isArray(cls) ? cls : []
        };
      });
      setAssignments(cleanAssignments);

      // Clean Scores
      const cleanScores = (res.scores || []).map((s: any) => ({
        ...s,
        score: (s.score === '' || s.score === null || s.score === undefined) ? null : Number(s.score)
      }));
      setScores(cleanScores);

      // Clean Attendance
      const cleanAttendance = (res.attendance || []).map((a: any) => ({
         ...a,
         date: typeof a.date === 'string' ? a.date.split('T')[0] : a.date
      }));
      setAttendance(cleanAttendance);

      // Clean Health Records
      const cleanHealth = (res.healthRecords || []).map((h: any) => ({
        ...h,
        weight: Number(h.weight),
        height: Number(h.height),
        bmi: Number(h.bmi)
      }));
      setHealthRecords(cleanHealth);

    } else if (res.status === 'mock_fallback') {
      if (students.length === 0) setStudents(MOCK_STUDENTS);
      if (assignments.length === 0) setAssignments(INITIAL_ASSIGNMENTS);
      if (scores.length === 0) setScores(INITIAL_SCORES);
      if (attendance.length === 0) setAttendance(INITIAL_ATTENDANCE);
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

  // Helper to fetch users directly from Google Sheet for Login
  const fetchUsersFromSheet = async (): Promise<any[]> => {
    const url = `https://docs.google.com/spreadsheets/d/${USERS_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${USERS_SHEET_NAME}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network response was not ok');
      const text = await res.text();
      // Parse Google Visualization API response
      const jsonString = text.substring(47).slice(0, -2);
      const json = JSON.parse(jsonString);
      
      return json.table.rows.map((row: any) => {
        const c = row.c;
        // Map Columns: 0:id, 1:username, 2:password, 3:name, 4:role, 5:gradeLevel, 6:classroom
        return {
          id: c[0]?.v ? String(c[0].v) : '',
          username: c[1]?.v ? String(c[1].v) : '',
          password: c[2]?.v ? String(c[2].v) : '',
          name: c[3]?.v ? String(c[3].v) : '',
          role: c[4]?.v === 'TEACHER' ? Role.TEACHER : Role.STUDENT,
          gradeLevel: c[5]?.v ? Number(c[5].v) : undefined,
          classroom: c[6]?.v ? String(c[6].v) : undefined,
        };
      });
    } catch (err) {
      console.warn('Failed to fetch users from sheet:', err);
      return [];
    }
  };

  const login = async (username: string, password?: string, role: Role = Role.TEACHER) => {
    setIsLoading(true);

    // 1. Try fetching from Google Sheet first
    try {
      const sheetUsers = await fetchUsersFromSheet();
      if (sheetUsers.length > 0) {
        const foundUser = sheetUsers.find(u => String(u.username) === String(username) && u.role === role);
        
        if (foundUser) {
          let isValid = false;
          if (role === Role.TEACHER) {
             // Check password for teacher
             if (String(foundUser.password) === String(password)) {
               isValid = true;
             }
          } else {
             // Student: No password needed
             isValid = true;
          }

          if (isValid) {
            const { password: _, ...userWithoutPassword } = foundUser;
            setIsLoading(false);
            setCurrentUser(userWithoutPassword);
            localStorage.setItem('user', JSON.stringify(userWithoutPassword));
            refreshData();
            return true;
          }
        }
      }
    } catch (e) {
      console.error("Sheet login error", e);
    }

    // 2. Fallback to API/Mock if Sheet login fails or user not found in Sheet
    const res = await callApi('login', { username, password, role });
    
    if (res.status === 'success') {
      setIsLoading(false);
      setCurrentUser(res.user);
      localStorage.setItem('user', JSON.stringify(res.user));
      refreshData();
      return true;
    } 
    
    if (res.status === 'mock_fallback' || res.status === 'error') {
       const foundUser = MOCK_USERS.find(u => u.username === username && u.role === role);
       if (foundUser) {
         if (role === Role.TEACHER) {
           if (password === '1234') {
             setIsLoading(false);
             setCurrentUser(foundUser);
             localStorage.setItem('user', JSON.stringify(foundUser));
             refreshData();
             return true;
           }
         } else {
           setIsLoading(false);
           setCurrentUser(foundUser);
           localStorage.setItem('user', JSON.stringify(foundUser));
           refreshData();
           return true;
         }
       }
    }

    setIsLoading(false);
    return false;
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
    await callApi('updateStudent', { payload: student });
  };

  const deleteStudent = async (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    await callApi('deleteStudent', { id });
  };

  const markAttendance = async (studentId: string, date: string, status: 'present' | 'late' | 'leave' | 'missing', reason?: string) => {
    const id = `ATT-${studentId}-${date}`;
    const newRecord: Attendance = { id, studentId, date, status, reason };
    
    setAttendance(prev => {
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
      const existingIndex = prev.findIndex(r => r.studentId === record.studentId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = record;
        return updated;
      }
      return [...prev, record];
    });
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
