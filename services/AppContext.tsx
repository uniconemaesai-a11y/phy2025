
import React, { createContext, useContext, useState, ReactNode, useEffect, PropsWithChildren, useRef } from 'react';
import { User, Assignment, Score, StudentData, Role, Attendance, HealthRecord, Announcement, Quiz, QuizResult, ToastNotification, QuestProgress, DailyQuest, InventoryItem } from '../types';
import { MOCK_USERS, MOCK_STUDENTS, INITIAL_ASSIGNMENTS, INITIAL_SCORES, INITIAL_ATTENDANCE, MOCK_ANNOUNCEMENTS, MOCK_QUIZZES } from '../constants';

// *** REPLACE THIS WITH YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL ***
const API_URL = 'https://script.google.com/macros/s/AKfycbwbiGi7sLuQHvBiErENFqkyjH31yEZ5gZXQsiLuM1S9oyQYAQKpNXeAfatT5DfZOriz/exec'; 

interface AttendanceStats {
  present: number;
  late: number;
  leave: number;
  missing: number;
  totalDays: number;
  attendanceRate: number;
}

// Default Quests Configuration
export const DAILY_QUESTS: DailyQuest[] = [
  { id: 'water', title: 'ดื่มน้ำสะอาด', icon: '💧', target: 8, unit: 'แก้ว', xpReward: 20, coinReward: 10 },
  { id: 'fruit', title: 'กินผัก/ผลไม้', icon: '🥗', target: 2, unit: 'มื้อ', xpReward: 30, coinReward: 15 },
  { id: 'exercise', title: 'ออกกำลังกาย 30 นาที', icon: '🏃', target: 1, unit: 'ครั้ง', xpReward: 50, coinReward: 25 },
  { id: 'sleep', title: 'นอนหลับ 8 ชั่วโมง', icon: '💤', target: 1, unit: 'คืน', xpReward: 30, coinReward: 15 },
  { id: 'teeth', title: 'แปรงฟัน เช้า-เย็น', icon: '🦷', target: 2, unit: 'ครั้ง', xpReward: 20, coinReward: 10 },
];

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  type: 'POTION' | 'BUFF' | 'COSMETIC';
  effectValue?: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'potion_s', name: 'น้ำแดงโซดา (S)', description: 'ฟื้นฟู 20 HP ในการต่อสู้', price: 50, icon: '🥤', type: 'POTION', effectValue: 20 },
  { id: 'potion_l', name: 'เวย์โปรตีน (L)', description: 'ฟื้นฟู 50 HP ในการต่อสู้', price: 100, icon: '🥛', type: 'POTION', effectValue: 50 },
  { id: 'energy_drink', name: 'เกลือแร่สปอร์ต', description: 'เพิ่ม 2 Energy ทันที', price: 80, icon: '⚡', type: 'BUFF', effectValue: 2 },
];

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
  updateScoreBulk: (scores: Score[]) => Promise<void>;
  
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

  announcements: Announcement[];
  addAnnouncement: (announcement: Announcement) => Promise<void>;

  quizzes: Quiz[];
  addQuiz: (quiz: Quiz) => Promise<void>;
  deleteQuiz: (id: string) => Promise<void>;
  quizResults: QuizResult[];
  submitQuiz: (result: QuizResult) => Promise<void>;

  // Quest System
  questProgress: QuestProgress[];
  updateQuestProgress: (studentId: string, questId: string, increment: number) => void;
  getTodayQuests: (studentId: string) => { quest: DailyQuest, progress: QuestProgress }[];

  // Shop & Inventory
  studentDataExtras: Record<string, { coins: number, inventory: InventoryItem[] }>;
  buyItem: (studentId: string, item: ShopItem) => boolean;
  consumeItem: (studentId: string, itemId: string) => void;
  addCoins: (studentId: string, amount: number) => void;

  toasts: ToastNotification[];
  showToast: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to clean up Classroom strings
const normalizeClassroom = (val: any, grade: number): string => {
  let str = String(val || '').trim();
  if (str.startsWith("'")) str = str.substring(1);
  if (/^[56]\/[1-9]$/.test(str)) return str;
  if (str.includes('-') || str.includes('/')) {
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
          const d = date.getDate();
          const m = date.getMonth() + 1;
          if (m === grade && d < 10) return `${grade}/${d}`;
          if (d === grade && m < 10) return `${grade}/${m}`;
      }
  }
  return str;
};

export const AppProvider = ({ children }: PropsWithChildren) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  
  // New State for Quests & Shop (Mock Local Storage for Demo)
  const [questProgress, setQuestProgress] = useState<QuestProgress[]>([]);
  const [studentDataExtras, setStudentDataExtras] = useState<Record<string, { coins: number, inventory: InventoryItem[] }>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const prevScoresRef = useRef<Score[]>([]);

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

  const showToast = (title: string, message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const refreshData = async () => {
    setIsLoading(true);
    const res = await callApi('getData');
    
    if (res.status === 'success') {
      const cleanStudents = (res.students || []).map((s: any) => ({
        ...s,
        gradeLevel: Number(s.gradeLevel),
        classroom: normalizeClassroom(s.classroom, Number(s.gradeLevel))
      }));
      setStudents(cleanStudents);

      const cleanAssignments = (res.assignments || []).map((a: any) => {
        let cls = [];
        try {
           if (Array.isArray(a.classrooms)) cls = a.classrooms;
           else if (typeof a.classrooms === 'string') cls = JSON.parse(a.classrooms);
        } catch(e) { cls = [String(a.classrooms)]; }
        
        return {
          ...a,
          gradeLevel: Number(a.gradeLevel),
          maxScore: Number(a.maxScore),
          classrooms: cls
        };
      });
      setAssignments(cleanAssignments);

      const cleanScores = (res.scores || []).map((s: any) => ({
        ...s,
        assignmentId: String(s.assignmentId),
        studentId: String(s.studentId),
        score: (s.score === '' || s.score === null || s.score === undefined) ? null : Number(s.score)
      }));
      
      if (currentUser?.role === Role.TEACHER && prevScoresRef.current.length > 0) {
        cleanScores.forEach((newScore: Score) => {
          const oldScore = prevScoresRef.current.find(os => os.assignmentId === newScore.assignmentId && os.studentId === newScore.studentId);
          if (newScore.status === 'submitted' && oldScore?.status !== 'submitted') {
             const sName = cleanStudents.find((s: any) => s.id === newScore.studentId)?.name || 'นักเรียน';
             showToast('ส่งงานใหม่', `${sName} ส่งงานแล้ว`, 'info');
          }
        });
      }
      prevScoresRef.current = cleanScores;
      setScores(cleanScores);
      setAttendance(res.attendance || []);
      setHealthRecords(res.healthRecords || []);
      if (res.announcements) setAnnouncements(res.announcements);
      
      if (res.quizzes) {
         setQuizzes(res.quizzes.map((q: any) => {
             let questions = [];
             try {
                if (typeof q.questions === 'string') {
                    questions = JSON.parse(q.questions);
                    if (typeof questions === 'string') questions = JSON.parse(questions);
                } else {
                    questions = q.questions;
                }
             } catch(e) { questions = []; }

             return {
                 ...q,
                 gradeLevel: Number(q.gradeLevel),
                 timeLimit: Number(q.timeLimit),
                 totalScore: Number(q.totalScore),
                 questions: Array.isArray(questions) ? questions : [],
                 status: q.status || 'published'
             };
         }));
      }

      if (res.quizResults) {
         setQuizResults(res.quizResults.map((r: any) => {
             let answers = {};
             try {
                if (typeof r.answers === 'string') {
                     answers = JSON.parse(r.answers);
                     if (typeof answers === 'string') answers = JSON.parse(answers);
                } else {
                     answers = r.answers;
                }
             } catch(e) { answers = {}; }
             
             return {
                 ...r,
                 score: Number(r.score),
                 totalScore: Number(r.totalScore),
                 answers: answers || {}
             };
         }));
      }

    } else if (res.status === 'mock_fallback') {
      if (students.length === 0) setStudents(MOCK_STUDENTS);
      if (assignments.length === 0) setAssignments(INITIAL_ASSIGNMENTS);
      if (scores.length === 0) {
        setScores(INITIAL_SCORES);
        prevScoresRef.current = INITIAL_SCORES;
      }
      if (attendance.length === 0) setAttendance(INITIAL_ATTENDANCE);
      if (announcements.length === 0) setAnnouncements(MOCK_ANNOUNCEMENTS);
      if (quizzes.length === 0) setQuizzes(MOCK_QUIZZES);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
      refreshData();
    }
    // Load local data for demo
    const storedQuests = localStorage.getItem('questProgress');
    if (storedQuests) setQuestProgress(JSON.parse(storedQuests));
    
    const storedExtras = localStorage.getItem('studentDataExtras');
    if (storedExtras) setStudentDataExtras(JSON.parse(storedExtras));
  }, []);

  // Sync Extras to LocalStorage
  useEffect(() => {
      localStorage.setItem('studentDataExtras', JSON.stringify(studentDataExtras));
  }, [studentDataExtras]);

  const login = async (username: string, password?: string, role: Role = Role.TEACHER) => {
    setIsLoading(true);
    const res = await callApi('login', { username, password, role });

    if (res.status === 'success' && res.user) {
       setIsLoading(false);
       setCurrentUser(res.user);
       localStorage.setItem('user', JSON.stringify(res.user));
       refreshData();
       showToast('ยินดีต้อนรับ', `สวัสดีคุณ ${res.user.name}`, 'success');
       return true;
    }

    if (res.status === 'mock_fallback') {
        if (role === Role.TEACHER) {
          const foundTeacher = MOCK_USERS.find(u => u.username === username && u.role === Role.TEACHER);
          if (foundTeacher && password === '1234') {
            setIsLoading(false);
            setCurrentUser(foundTeacher);
            localStorage.setItem('user', JSON.stringify(foundTeacher));
            refreshData();
            showToast('ยินดีต้อนรับ', `สวัสดีคุณ ${foundTeacher.name}`, 'success');
            return true;
          }
        } else if (role === Role.STUDENT) {
          const foundStudent = MOCK_STUDENTS.find(s => s.studentId === username);
          if (foundStudent) {
            const user: User = {
               id: foundStudent.id,
               username: foundStudent.studentId,
               name: foundStudent.name,
               role: Role.STUDENT,
               gradeLevel: foundStudent.gradeLevel,
               classroom: foundStudent.classroom
            };
            setIsLoading(false);
            setCurrentUser(user);
            localStorage.setItem('user', JSON.stringify(user));
            refreshData();
            showToast('ยินดีต้อนรับ', `สวัสดีน้อง ${user.name}`, 'success');
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
    setQuizzes([]);
    setQuizResults([]);
    showToast('ออกจากระบบ', 'ไว้พบกันใหม่นะครับ', 'info');
  };

  // --- CRUD Functions (Assignments, Students, etc.) ---
  const addAssignment = async (assignment: Assignment) => {
    setAssignments(prev => [...prev, assignment]);
    await callApi('addAssignment', { payload: assignment });
    showToast('สำเร็จ', 'สร้างชิ้นงานแล้ว', 'success');
  };

  const deleteAssignment = async (id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id));
    await callApi('deleteAssignment', { id });
    showToast('สำเร็จ', 'ลบชิ้นงานแล้ว', 'info');
  };

  const updateScore = async (newScore: Score) => {
    setScores(prev => {
      const existing = prev.findIndex(s => s.assignmentId === newScore.assignmentId && s.studentId === newScore.studentId);
      if (existing >= 0) {
        const up = [...prev];
        up[existing] = newScore;
        return up;
      }
      return [...prev, newScore];
    });
    callApi('updateScore', { payload: newScore });
  };

  const updateScoreBulk = async (scoresData: Score[]) => {
     setScores(prev => {
        let newScores = [...prev];
        scoresData.forEach(newScore => {
            const idx = newScores.findIndex(s => s.assignmentId === newScore.assignmentId && s.studentId === newScore.studentId);
            if (idx >= 0) newScores[idx] = newScore;
            else newScores.push(newScore);
        });
        return newScores;
     });
     await callApi('updateScoreBulk', { payload: scoresData });
     showToast('สำเร็จ', 'บันทึกคะแนนทั้งหมดแล้ว', 'success');
  };

  const getStudentScore = (studentId: string, assignmentId: string): number | string => {
    const found = scores.find(s => String(s.studentId) === String(studentId) && String(s.assignmentId) === String(assignmentId));
    return found && found.score !== null ? found.score : '';
  };

  const addStudent = async (student: StudentData) => {
    setStudents(prev => [...prev, student]);
    await callApi('addStudent', { payload: student });
    showToast('สำเร็จ', 'เพิ่มนักเรียนแล้ว', 'success');
  };

  const updateStudent = async (student: StudentData) => {
    setStudents(prev => prev.map(s => s.id === student.id ? student : s));
    await callApi('updateStudent', { payload: student });
    showToast('สำเร็จ', 'อัปเดตข้อมูลแล้ว', 'success');
  };

  const deleteStudent = async (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    await callApi('deleteStudent', { id });
    showToast('สำเร็จ', 'ลบข้อมูลแล้ว', 'info');
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

  const markAttendanceBulk = async (data: any[]) => {
    const newRecords = data.map(d => ({
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
    showToast('สำเร็จ', 'บันทึกเวลาเรียนแล้ว', 'success');
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
     const classStudents = students.filter(s => s.classroom === classroom).map(s => s.id);
     return attendance.filter(a => a.date === date && classStudents.includes(a.studentId));
  };

  const updateHealthRecord = async (record: HealthRecord) => {
     setHealthRecords(prev => {
        const idx = prev.findIndex(r => r.studentId === record.studentId);
        if (idx >= 0) {
           const next = [...prev];
           next[idx] = record;
           return next;
        }
        return [...prev, record];
     });
     await callApi('updateHealthRecord', { payload: record });
     showToast('สำเร็จ', 'บันทึกข้อมูลสุขภาพแล้ว', 'success');
  };

  const getLatestHealthRecord = (studentId: string) => {
     return healthRecords.find(r => r.studentId === studentId);
  };

  const addAnnouncement = async (announcement: Announcement) => {
     setAnnouncements(prev => [announcement, ...prev]);
     await callApi('addAnnouncement', { payload: announcement });
     showToast('สำเร็จ', 'ประกาศข้อความแล้ว', 'success');
  };

  const addQuiz = async (quiz: Quiz) => {
     setQuizzes(prev => [...prev, quiz]);
     await callApi('addQuiz', { payload: quiz });
     showToast('สำเร็จ', 'สร้างแบบทดสอบแล้ว', 'success');
  };

  const deleteQuiz = async (id: string) => {
     setQuizzes(prev => prev.filter(q => q.id !== id));
     await callApi('deleteQuiz', { id });
     showToast('สำเร็จ', 'ลบแบบทดสอบแล้ว', 'info');
  };

  const submitQuiz = async (result: QuizResult) => {
     setQuizResults(prev => [...prev, result]);
     await callApi('submitQuiz', { payload: result });
     showToast('สำเร็จ', 'ส่งคำตอบแล้ว', 'success');
  };

  // --- Quest System Functions ---
  const updateQuestProgress = (studentId: string, questId: string, increment: number) => {
      const date = new Date().toISOString().split('T')[0];
      const questDef = DAILY_QUESTS.find(q => q.id === questId);
      if (!questDef) return;

      setQuestProgress(prev => {
          const existingIdx = prev.findIndex(p => p.studentId === studentId && p.questId === questId && p.date === date);
          let newProgress = [...prev];
          let earnedCoins = 0;

          if (existingIdx >= 0) {
              const current = newProgress[existingIdx];
              if (current.isCompleted) return prev; // Already done

              const newVal = Math.min(current.current + increment, questDef.target);
              newProgress[existingIdx] = {
                  ...current,
                  current: newVal,
                  isCompleted: newVal >= questDef.target
              };
              
              if (newVal >= questDef.target && !current.isCompleted) {
                   earnedCoins = questDef.coinReward;
                   showToast('สำเร็จ!', `ภารกิจ "${questDef.title}" ครบแล้ว! (+${questDef.xpReward} XP, +${questDef.coinReward} Coins)`, 'success');
              }
          } else {
              const newVal = Math.min(increment, questDef.target);
              newProgress.push({
                  studentId,
                  date,
                  questId,
                  current: newVal,
                  isCompleted: newVal >= questDef.target
              });
              if (newVal >= questDef.target) {
                   earnedCoins = questDef.coinReward;
                   showToast('สำเร็จ!', `ภารกิจ "${questDef.title}" ครบแล้ว! (+${questDef.xpReward} XP, +${questDef.coinReward} Coins)`, 'success');
              }
          }
          
          if (earnedCoins > 0) {
              addCoins(studentId, earnedCoins);
          }

          localStorage.setItem('questProgress', JSON.stringify(newProgress));
          return newProgress;
      });
  };

  const getTodayQuests = (studentId: string) => {
      const date = new Date().toISOString().split('T')[0];
      return DAILY_QUESTS.map(quest => {
          const progress = questProgress.find(p => p.studentId === studentId && p.questId === quest.id && p.date === date) || {
              studentId,
              date,
              questId: quest.id,
              current: 0,
              isCompleted: false
          };
          return { quest, progress };
      });
  };

  // --- Shop & Currency System ---
  const addCoins = (studentId: string, amount: number) => {
      setStudentDataExtras(prev => {
          const current = prev[studentId] || { coins: 0, inventory: [] };
          return {
              ...prev,
              [studentId]: { ...current, coins: current.coins + amount }
          };
      });
  };

  const buyItem = (studentId: string, item: ShopItem) => {
      const data = studentDataExtras[studentId] || { coins: 0, inventory: [] };
      if (data.coins < item.price) {
          showToast('เงินไม่พอ', 'กรุณาทำภารกิจเพื่อสะสมเหรียญ', 'error');
          return false;
      }

      setStudentDataExtras(prev => {
          const current = prev[studentId] || { coins: 0, inventory: [] };
          const existingItemIdx = current.inventory.findIndex(i => i.itemId === item.id);
          let newInventory = [...current.inventory];
          
          if (existingItemIdx >= 0) {
              newInventory[existingItemIdx] = { ...newInventory[existingItemIdx], count: newInventory[existingItemIdx].count + 1 };
          } else {
              newInventory.push({ itemId: item.id, count: 1 });
          }

          return {
              ...prev,
              [studentId]: { coins: current.coins - item.price, inventory: newInventory }
          };
      });
      showToast('สำเร็จ', `ซื้อ ${item.name} เรียบร้อยแล้ว`, 'success');
      return true;
  };

  const consumeItem = (studentId: string, itemId: string) => {
      setStudentDataExtras(prev => {
          const current = prev[studentId];
          if (!current) return prev;
          
          const existingItemIdx = current.inventory.findIndex(i => i.itemId === itemId);
          if (existingItemIdx === -1) return prev;

          let newInventory = [...current.inventory];
          if (newInventory[existingItemIdx].count > 1) {
              newInventory[existingItemIdx] = { ...newInventory[existingItemIdx], count: newInventory[existingItemIdx].count - 1 };
          } else {
              newInventory = newInventory.filter(i => i.itemId !== itemId);
          }

          return {
              ...prev,
              [studentId]: { ...current, inventory: newInventory }
          };
      });
  };

  return (
    <AppContext.Provider value={{
      currentUser, login, logout, isLoading, refreshData,
      assignments, addAssignment, deleteAssignment,
      scores, updateScore, updateScoreBulk,
      students, getStudentScore, addStudent, updateStudent, deleteStudent,
      attendance, markAttendance, markAttendanceBulk, getStudentAttendanceStats, getDailyAttendance,
      healthRecords, updateHealthRecord, getLatestHealthRecord,
      announcements, addAnnouncement,
      quizzes, addQuiz, deleteQuiz, quizResults, submitQuiz,
      questProgress, updateQuestProgress, getTodayQuests,
      studentDataExtras, buyItem, consumeItem, addCoins,
      toasts, showToast, removeToast
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
