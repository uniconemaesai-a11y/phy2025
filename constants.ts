import { User, Role, StudentData, Assignment, Score, Attendance } from './types';

export const MOCK_USERS: User[] = [
  { id: 'T001', username: 'teacher1', name: 'Krukai', role: Role.TEACHER },
  { id: 'S001', username: 'student1', name: 'ด.ช. รักเรียน เพียรศึกษา', role: Role.STUDENT, gradeLevel: 5, classroom: '5/1' },
  { id: 'S121', username: 'student2', name: 'ด.ญ. ใจดี มีสุข', role: Role.STUDENT, gradeLevel: 6, classroom: '6/1' },
];

export const MOCK_STUDENTS: StudentData[] = [
  // Grade 5 (4 Classrooms)
  { id: 'S001', studentId: 'S001', name: 'ด.ช. รักเรียน เพียรศึกษา', gradeLevel: 5, classroom: '5/1' },
  { id: 'S002', studentId: 'S002', name: 'ด.ญ. มานี มีตา', gradeLevel: 5, classroom: '5/1' },
  { id: 'S003', studentId: 'S003', name: 'ด.ช. ปิติ ยิ้มแย้ม', gradeLevel: 5, classroom: '5/2' },
  { id: 'S004', studentId: 'S004', name: 'ด.ญ. ชูใจ ใส่ใจ', gradeLevel: 5, classroom: '5/3' },
  { id: 'S005', studentId: 'S005', name: 'ด.ช. วีระ กล้าหาญ', gradeLevel: 5, classroom: '5/4' },
  { id: 'S006', studentId: 'S006', name: 'ด.ญ. แก้วตา ดวงใจ', gradeLevel: 5, classroom: '5/2' },
  { id: 'S007', studentId: 'S007', name: 'ด.ช. กล้าหาญ ชาญชัย', gradeLevel: 5, classroom: '5/3' },
  { id: 'S008', studentId: 'S008', name: 'ด.ญ. เรียบร้อย น่ารัก', gradeLevel: 5, classroom: '5/4' },
  
  // Grade 6 (4 Classrooms)
  { id: 'S121', studentId: 'S121', name: 'ด.ญ. ใจดี มีสุข', gradeLevel: 6, classroom: '6/1' },
  { id: 'S122', studentId: 'S122', name: 'ด.ช. กล้า เก่ง', gradeLevel: 6, classroom: '6/2' },
  { id: 'S123', studentId: 'S123', name: 'ด.ช. มั่นคง ทรงพลัง', gradeLevel: 6, classroom: '6/3' },
  { id: 'S124', studentId: 'S124', name: 'ด.ญ. สดใส ร่าเริง', gradeLevel: 6, classroom: '6/4' },
  { id: 'S125', studentId: 'S125', name: 'ด.ช. ปัญญา ดี', gradeLevel: 6, classroom: '6/1' },
  { id: 'S126', studentId: 'S126', name: 'ด.ญ. เมตตา ปราณี', gradeLevel: 6, classroom: '6/2' },
];

export const INITIAL_ASSIGNMENTS: Assignment[] = [
  { id: 'A001', title: 'สมุดบันทึกสุขภาพ', type: 'Assignment', gradeLevel: 5, maxScore: 20, dueDate: '2024-12-20', classrooms: ['5/1', '5/2', '5/3', '5/4'], status: 'Active' },
  { id: 'A002', title: 'ทดสอบสมรรถภาพ', type: 'Quiz', gradeLevel: 5, maxScore: 50, dueDate: '2024-12-25', classrooms: ['5/1', '5/2'], status: 'Active' },
  { id: 'A003', title: 'โครงงานกีฬา', type: 'Project', gradeLevel: 6, maxScore: 100, dueDate: '2024-12-30', classrooms: ['6/1', '6/2', '6/3', '6/4'], status: 'Active' },
];

export const INITIAL_SCORES: Score[] = [
  { assignmentId: 'A001', studentId: 'S001', score: 18, status: 'submitted' },
  { assignmentId: 'A001', studentId: 'S002', score: 15, status: 'submitted' },
  { assignmentId: 'A002', studentId: 'S001', score: 42, status: 'submitted' },
  // S121 Grade 6
  { assignmentId: 'A003', studentId: 'S121', score: null, status: 'pending' },
];

// Generate some mock attendance history
const generateMockAttendance = (): Attendance[] => {
  const records: Attendance[] = [];
  const students = MOCK_STUDENTS;
  const days = 10; // 10 days of history
  const today = new Date();

  students.forEach(student => {
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      let status: 'present' | 'late' | 'leave' | 'missing' = 'present';
      const rand = Math.random();

      // Make S002 have bad attendance for testing warning
      if (student.studentId === 'S002') {
         if (rand > 0.6) status = 'missing';
         else if (rand > 0.4) status = 'leave';
      } else {
         if (rand > 0.95) status = 'missing';
         else if (rand > 0.9) status = 'leave';
         else if (rand > 0.85) status = 'late';
      }

      records.push({
        id: `ATT-${student.studentId}-${dateStr}`,
        studentId: student.studentId,
        date: dateStr,
        status: status
      });
    }
  });
  return records;
};

export const INITIAL_ATTENDANCE: Attendance[] = generateMockAttendance();