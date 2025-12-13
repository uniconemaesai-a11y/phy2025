import { User, Role, StudentData, Assignment, Score, Attendance } from './types';

export const MOCK_USERS: User[] = [
  { id: 'T001', username: 'kai', name: 'Krukai', role: Role.TEACHER },
  // Updated usernames to numeric strings (Student IDs)
  { id: 'S001', username: '1782', name: 'ด.ช. รักเรียน เพียรศึกษา', role: Role.STUDENT, gradeLevel: 5, classroom: '5/1' },
  { id: 'S121', username: '2045', name: 'ด.ญ. ใจดี มีสุข', role: Role.STUDENT, gradeLevel: 6, classroom: '6/1' },
];

export const MOCK_STUDENTS: StudentData[] = [
  // Grade 5 (4 Classrooms) - Using numeric Student IDs
  { id: 'S001', studentId: '1782', name: 'ด.ช. รักเรียน เพียรศึกษา', gradeLevel: 5, classroom: '5/1' },
  { id: 'S002', studentId: '1788', name: 'ด.ญ. มานี มีตา', gradeLevel: 5, classroom: '5/1' },
  { id: 'S003', studentId: '1793', name: 'ด.ช. ปิติ ยิ้มแย้ม', gradeLevel: 5, classroom: '5/2' },
  { id: 'S004', studentId: '1803', name: 'ด.ญ. ชูใจ ใส่ใจ', gradeLevel: 5, classroom: '5/3' },
  { id: 'S005', studentId: '1820', name: 'ด.ช. วีระ กล้าหาญ', gradeLevel: 5, classroom: '5/4' },
  { id: 'S006', studentId: '1822', name: 'ด.ญ. แก้วตา ดวงใจ', gradeLevel: 5, classroom: '5/2' },
  { id: 'S007', studentId: '1824', name: 'ด.ช. กล้าหาญ ชาญชัย', gradeLevel: 5, classroom: '5/3' },
  { id: 'S008', studentId: '1830', name: 'ด.ญ. เรียบร้อย น่ารัก', gradeLevel: 5, classroom: '5/4' },
  
  // Grade 6 (4 Classrooms)
  { id: 'S121', studentId: '2045', name: 'ด.ญ. ใจดี มีสุข', gradeLevel: 6, classroom: '6/1' },
  { id: 'S122', studentId: '2064', name: 'ด.ช. กล้า เก่ง', gradeLevel: 6, classroom: '6/2' },
  { id: 'S123', studentId: '2074', name: 'ด.ช. มั่นคง ทรงพลัง', gradeLevel: 6, classroom: '6/3' },
  { id: 'S124', studentId: '2082', name: 'ด.ญ. สดใส ร่าเริง', gradeLevel: 6, classroom: '6/4' },
  { id: 'S125', studentId: '2198', name: 'ด.ช. ปัญญา ดี', gradeLevel: 6, classroom: '6/1' },
  { id: 'S126', studentId: '2262', name: 'ด.ญ. เมตตา ปราณี', gradeLevel: 6, classroom: '6/2' },
];

export const INITIAL_ASSIGNMENTS: Assignment[] = [
  { id: 'A001', title: 'สมุดบันทึกสุขภาพ', type: 'Assignment', gradeLevel: 5, maxScore: 20, dueDate: '2024-12-20', classrooms: ['5/1', '5/2', '5/3', '5/4'], status: 'Active' },
  { id: 'A002', title: 'ทดสอบสมรรถภาพ', type: 'Quiz', gradeLevel: 5, maxScore: 50, dueDate: '2024-12-25', classrooms: ['5/1', '5/2'], status: 'Active' },
  { id: 'A003', title: 'โครงงานกีฬา', type: 'Project', gradeLevel: 6, maxScore: 100, dueDate: '2024-12-30', classrooms: ['6/1', '6/2', '6/3', '6/4'], status: 'Active' },
];

export const INITIAL_SCORES: Score[] = [
  // Linked via internal ID (S001, etc.)
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

      // Make S002 (1788) have bad attendance for testing warning
      if (student.studentId === '1788') {
         if (rand > 0.6) status = 'missing';
         else if (rand > 0.4) status = 'leave';
      } else {
         if (rand > 0.95) status = 'missing';
         else if (rand > 0.9) status = 'leave';
         else if (rand > 0.85) status = 'late';
      }

      records.push({
        id: `ATT-${student.id}-${dateStr}`, // Use Internal ID for FK
        studentId: student.id, // Use Internal ID for FK
        date: dateStr,
        status: status
      });
    }
  });
  return records;
};

export const INITIAL_ATTENDANCE: Attendance[] = generateMockAttendance();