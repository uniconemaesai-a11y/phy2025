
import React, { useState } from 'react';
import { useApp } from '../services/AppContext';
import { Card } from '../components/Card';
import { Download, RefreshCw, FileText, Loader2, MoreVertical, CheckCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { utils, writeFile } from 'xlsx';
import { Score } from '../types';

export const ScoreRecording = () => {
  const { students, assignments, scores, updateScore, updateScoreBulk, getStudentScore, refreshData, isLoading, showToast } = useApp();
  const [filterGrade, setFilterGrade] = useState<5 | 6>(5);
  const [filterClass, setFilterClass] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null); // For header menu
  
  // Bulk Confirm State
  const [confirmBulk, setConfirmBulk] = useState<{assignmentId: string, val: number} | null>(null);

  // Filter logic
  const filteredAssignments = assignments.filter(a => a.gradeLevel === filterGrade);
  const filteredStudents = students.filter(s => 
    s.gradeLevel === filterGrade && 
    (filterClass === 'all' || s.classroom === filterClass)
  );
  
  // Get unique classrooms for dropdown and sort naturally (numeric aware)
  const classrooms = Array.from(new Set(students.filter(s => s.gradeLevel === filterGrade).map(s => s.classroom)))
    .sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));

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

  const handleBulkScore = (assignmentId: string, valStr: string) => {
    const val = Number(valStr);
    const max = assignments.find(a => a.id === assignmentId)?.maxScore || 100;
    
    if (isNaN(val) || val < 0 || val > max) return;
    setConfirmBulk({ assignmentId, val });
  };

  const executeBulkScore = async () => {
    if (!confirmBulk) return;
    const { assignmentId, val } = confirmBulk;
    
    const scoresToUpdate: Score[] = filteredStudents.map(s => ({
      studentId: s.id,
      assignmentId,
      score: val,
      status: 'submitted'
    }));
    
    await updateScoreBulk(scoresToUpdate);
    setConfirmBulk(null);
    setActiveMenu(null);
  };

  const handleRefresh = async () => {
    await refreshData();
  };

  const handleExportPDF = async () => {
    const input = document.getElementById('score-table-container');
    if (!input) return;

    setIsExporting(true);
    try {
      // Capture the table as an image (supports Thai fonts better than standard jspdf text)
      const canvas = await html2canvas(input, {
        scale: 2, // Higher resolution
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape, millimeters, A4
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`score_report_grade${filterGrade}.pdf`);
    } catch (error) {
      console.error('PDF Export failed', error);
      showToast('ผิดพลาด', 'เกิดข้อผิดพลาดในการสร้าง PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      showToast('แจ้งเตือน', 'ไม่มีข้อมูลนักเรียนสำหรับส่งออก', 'info');
      return;
    }

    try {
      const data = filteredStudents.map((student, index) => {
        const row: any = {
          'ลำดับ': index + 1,
          'รหัสนักเรียน': student.studentId,
          'ชื่อ-นามสกุล': student.name,
          'ห้อง': student.classroom,
        };

        let totalScore = 0;
        filteredAssignments.forEach(assignment => {
          const score = getStudentScore(student.id, assignment.id);
          row[assignment.title] = score === '' ? '-' : score;
          if (typeof score === 'number') totalScore += score;
        });

        row['รวมคะแนน'] = totalScore;
        return row;
      });

      const ws = utils.json_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, `Scores Grade ${filterGrade}`);

      const dateStr = new Date().toISOString().split('T')[0];
      writeFile(wb, `Score_Report_P${filterGrade}_${dateStr}.xlsx`);
      
    } catch (error) {
      console.error("Excel Export Error:", error);
      showToast('ผิดพลาด', 'เกิดข้อผิดพลาดในการส่งออก Excel', 'error');
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col" onClick={() => setActiveMenu(null)}>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-['Mitr']">บันทึกคะแนน</h1>
          <p className="text-gray-500">กรอกคะแนนเก็บและประเมินผล</p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 text-white bg-error hover:bg-red-600 transition-colors px-4 py-2 rounded-lg shadow-sm disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={18} className="animate-spin"/> : <FileText size={18} />}
              Export PDF
            </button>
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 text-white bg-green-600 hover:bg-green-700 transition-colors px-4 py-2 rounded-lg shadow-sm"
            >
              <Download size={18} /> Export Excel
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 items-center flex-wrap">
        <div className="flex gap-2">
           <button onClick={() => { setFilterGrade(5); setFilterClass('all'); }} className={`px-4 py-2 rounded-lg font-bold ${filterGrade === 5 ? 'bg-gr5 text-white' : 'bg-gray-100 text-gray-500'}`}>ป.5</button>
           <button onClick={() => { setFilterGrade(6); setFilterClass('all'); }} className={`px-4 py-2 rounded-lg font-bold ${filterGrade === 6 ? 'bg-gr6 text-white' : 'bg-gray-100 text-gray-500'}`}>ป.6</button>
        </div>
        <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
        <select 
          value={filterClass} 
          onChange={(e) => setFilterClass(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="all">ทุกห้องเรียน</option>
          {classrooms.map(c => <option key={c} value={c}>ห้อง {c}</option>)}
        </select>

        <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="ml-auto flex items-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
        >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            อัปเดตคะแนน
        </button>
      </div>

      {/* Spreadsheet Table */}
      <Card className="flex-1 overflow-hidden p-0 relative flex flex-col">
        <div className="overflow-auto scrollbar-hide">
          <div id="score-table-container" className="bg-white min-w-full inline-block">
             <table className="w-full border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="sticky left-0 z-30 bg-gray-50 p-4 min-w-[200px] text-left border-b border-r border-gray-200 font-bold text-gray-700 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  รายชื่อนักเรียน
                </th>
                {filteredAssignments.map(a => (
                  <th key={a.id} className="p-4 min-w-[120px] text-center border-b border-gray-200 font-medium text-gray-600 relative group">
                    <div className="flex items-center justify-center gap-1">
                      <div className="text-sm font-bold text-gray-800">{a.title}</div>
                      <button 
                         onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === a.id ? null : a.id); }}
                         className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                      >
                         <MoreVertical size={14} />
                      </button>
                    </div>
                    <div className="text-xs text-gray-400">เต็ม {a.maxScore}</div>

                    {/* Dropdown Menu for Bulk Actions */}
                    {activeMenu === a.id && (
                      <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-2 text-left" onClick={(e) => e.stopPropagation()}>
                         <p className="text-xs font-bold text-gray-500 mb-2 px-2">ใส่คะแนนทั้งห้อง</p>
                         <div className="flex gap-1">
                           <input 
                              type="number" 
                              placeholder={String(a.maxScore)}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-accent"
                              onKeyDown={(e) => {
                                 if (e.key === 'Enter') handleBulkScore(a.id, (e.target as HTMLInputElement).value);
                              }}
                           />
                           <button className="bg-accent text-white p-1 rounded-lg">
                             <CheckCheck size={16} />
                           </button>
                         </div>
                         <p className="text-[10px] text-gray-400 mt-1 px-2">กด Enter เพื่อยืนยัน</p>
                      </div>
                    )}
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
        </div>
      </Card>

      {/* Bulk Confirm Modal */}
      {confirmBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmBulk(null)}></div>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm relative z-10 text-center animate-fade-in-up">
                <h3 className="text-lg font-bold font-['Mitr'] mb-2">ยืนยันคะแนนหมู่</h3>
                <p className="text-gray-500 mb-6">
                    ให้คะแนน <b>{confirmBulk.val}</b> แก่นักเรียนทั้งหมด <b>{filteredStudents.length}</b> คน?
                </p>
                <div className="flex gap-3 justify-center">
                    <button onClick={() => setConfirmBulk(null)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl font-bold">ยกเลิก</button>
                    <button onClick={executeBulkScore} className="px-6 py-2 bg-accent text-white font-bold rounded-xl shadow-lg hover:bg-orange-400">ยืนยัน</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
