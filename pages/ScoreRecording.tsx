import React, { useState } from 'react';
import { useApp } from '../services/AppContext';
import { Card } from '../components/Card';
import { Download } from 'lucide-react';

export const ScoreRecording = () => {
  const { students, assignments, scores, updateScore, getStudentScore } = useApp();
  const [filterGrade, setFilterGrade] = useState<5 | 6>(5);
  const [filterClass, setFilterClass] = useState<string>('all');

  // Filter logic
  const filteredAssignments = assignments.filter(a => a.gradeLevel === filterGrade);
  const filteredStudents = students.filter(s => 
    s.gradeLevel === filterGrade && 
    (filterClass === 'all' || s.classroom === filterClass)
  );
  
  // Get unique classrooms for dropdown
  const classrooms = Array.from(new Set(students.filter(s => s.gradeLevel === filterGrade).map(s => s.classroom))).sort();

  const handleScoreChange = (studentId: string, assignmentId: string, val: string) => {
    let numVal: number | null = null;
    if (val !== '') {
      numVal = Number(val);
      // Basic validation
      const max = assignments.find(a => a.id === assignmentId)?.maxScore || 100;
      if (numVal > max) numVal = max;
      if (numVal < 0) numVal = 0;
    }

    updateScore({
      studentId,
      assignmentId,
      score: numVal,
      status: numVal !== null ? 'submitted' : 'pending'
    });
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-['Mitr']">บันทึกคะแนน</h1>
          <p className="text-gray-500">กรอกคะแนนเก็บและประเมินผล</p>
        </div>
        <button className="flex items-center gap-2 text-gray-600 hover:text-accent transition-colors px-4 py-2 rounded-lg hover:bg-white">
          <Download size={18} /> Export Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-center">
        <div className="flex gap-2">
           <button onClick={() => { setFilterGrade(5); setFilterClass('all'); }} className={`px-4 py-2 rounded-lg font-bold ${filterGrade === 5 ? 'bg-gr5 text-white' : 'bg-gray-100 text-gray-500'}`}>ป.5</button>
           <button onClick={() => { setFilterGrade(6); setFilterClass('all'); }} className={`px-4 py-2 rounded-lg font-bold ${filterGrade === 6 ? 'bg-gr6 text-white' : 'bg-gray-100 text-gray-500'}`}>ป.6</button>
        </div>
        <div className="h-8 w-px bg-gray-200"></div>
        <select 
          value={filterClass} 
          onChange={(e) => setFilterClass(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="all">ทุกห้องเรียน</option>
          {classrooms.map(c => <option key={c} value={c}>ห้อง {c}</option>)}
        </select>
      </div>

      {/* Spreadsheet Table */}
      <Card className="flex-1 overflow-hidden p-0 relative flex flex-col">
        <div className="overflow-auto scrollbar-hide">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="sticky left-0 z-30 bg-gray-50 p-4 min-w-[200px] text-left border-b border-r border-gray-200 font-bold text-gray-700 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  รายชื่อนักเรียน
                </th>
                {filteredAssignments.map(a => (
                  <th key={a.id} className="p-4 min-w-[120px] text-center border-b border-gray-200 font-medium text-gray-600">
                    <div className="text-sm font-bold text-gray-800">{a.title}</div>
                    <div className="text-xs text-gray-400">เต็ม {a.maxScore}</div>
                  </th>
                ))}
                <th className="p-4 min-w-[100px] text-center border-b border-gray-200 font-bold text-gray-700 bg-gray-50">รวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map((s, idx) => {
                const totalScore = filteredAssignments.reduce((acc, a) => {
                  const sc = getStudentScore(s.id, a.id);
                  return acc + (typeof sc === 'number' ? sc : 0);
                }, 0);

                return (
                  <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="sticky left-0 z-10 bg-white p-3 border-r border-gray-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                       <div className="flex items-center gap-3">
                         <span className="text-xs text-gray-400 w-6 text-center">{idx + 1}</span>
                         <div>
                           <div className="font-bold text-gray-800 text-sm">{s.name}</div>
                           <div className="text-xs text-gray-400">{s.classroom}</div>
                         </div>
                       </div>
                    </td>
                    {filteredAssignments.map(a => {
                      const scoreVal = getStudentScore(s.id, a.id);
                      const isGraded = scoreVal !== '';
                      return (
                        <td key={a.id} className="p-2 text-center border-r border-gray-50">
                          <input 
                            type="number"
                            className={`w-16 text-center p-1 rounded border transition-all outline-none focus:ring-2 focus:ring-accent ${isGraded ? 'bg-white border-gray-200 text-gray-800' : 'bg-gray-50 border-transparent'}`}
                            value={scoreVal}
                            placeholder="-"
                            onChange={(e) => handleScoreChange(s.id, a.id, e.target.value)}
                          />
                        </td>
                      );
                    })}
                    <td className="p-3 text-center font-bold text-accent bg-gray-50/50">
                      {totalScore}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};