
import React, { useState } from 'react';
import { useApp } from '../services/AppContext';
import { Card } from '../components/Card';
import { Download, RefreshCw, FileText, Loader2, MoreVertical, CheckCheck, Calculator, LayoutList, Trophy, AlertTriangle, CloudDownload, BrainCircuit } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { utils, writeFile } from 'xlsx';
import { Score } from '../types';

export const ScoreRecording = () => {
  const { students, assignments, scores, quizzes, quizResults, updateScore, updateScoreBulk, getStudentScore, refreshData, isLoading, showToast } = useApp();
  const [filterGrade, setFilterGrade] = useState<5 | 6>(5);
  const [filterClass, setFilterClass] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null); // For header menu
  const [viewMode, setViewMode] = useState<'recording' | 'summary'>('recording'); // Toggle modes
  
  // Bulk Confirm State
  const [confirmBulk, setConfirmBulk] = useState<{assignmentId: string, val: number} | null>(null);

  // Import Quiz State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [targetAssignmentId, setTargetAssignmentId] = useState<string>('');
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');

  // Filter logic
  const filteredAssignments = assignments.filter(a => a.gradeLevel === filterGrade);
  const filteredStudents = students.filter(s => 
    s.gradeLevel === filterGrade && 
    (filterClass === 'all' || s.classroom === filterClass)
  );
  
  // Get unique classrooms for dropdown and sort naturally (numeric aware)
  const classrooms = Array.from(new Set(students.filter(s => s.gradeLevel === filterGrade).map(s => s.classroom)))
    .sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));

  // Helper: Calculate Grade from Total Score (0-100)
  const calculateGrade = (score: number) => {
    if (score >= 80) return 4;
    if (score >= 75) return 3.5;
    if (score >= 70) return 3;
    if (score >= 65) return 2.5;
    if (score >= 60) return 2;
    if (score >= 55) return 1.5;
    if (score >= 50) return 1;
    return 0;
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 4) return 'bg-green-100 text-green-700 ring-1 ring-green-200';
    if (grade >= 3) return 'bg-blue-100 text-blue-700 ring-1 ring-blue-200';
    if (grade >= 2) return 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200';
    if (grade >= 1) return 'bg-orange-100 text-orange-700 ring-1 ring-orange-200';
    return 'bg-red-100 text-red-700 ring-1 ring-red-200';
  };

  const getInputColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-600 font-bold';
    if (percentage < 50) return 'text-red-500 font-bold';
    return 'text-gray-800';
  };

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

  // --- Import Quiz Logic ---
  const openImportModal = (assignmentId?: string) => {
     if (assignmentId) {
        setTargetAssignmentId(assignmentId);
     } else if (filteredAssignments.length > 0) {
        setTargetAssignmentId(filteredAssignments[0].id);
     } else {
        setTargetAssignmentId('');
     }
     
     setSelectedQuizId('');
     setIsImportModalOpen(true);
     setActiveMenu(null);
  };

  const executeImportQuiz = async () => {
     if (!targetAssignmentId || !selectedQuizId) return;
     
     const targetAssignment = assignments.find(a => a.id === targetAssignmentId);
     if (!targetAssignment) return;

     const newScores: Score[] = [];
     let updatedCount = 0;

     // Iterate visible students
     filteredStudents.forEach(student => {
        // Find all results for this student and quiz
        const studentResults = quizResults.filter(r => r.studentId === student.id && r.quizId === selectedQuizId);
        
        if (studentResults.length > 0) {
            // Sort by submittedAt desc (Latest first)
            studentResults.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
            
            const latestResult = studentResults[0];
            let scoreToSave = latestResult.score;

            // Optional: Cap score if it exceeds assignment max score
            if (scoreToSave > targetAssignment.maxScore) {
                scoreToSave = targetAssignment.maxScore; 
            }

            newScores.push({
                assignmentId: targetAssignmentId,
                studentId: student.id,
                score: scoreToSave,
                status: 'submitted'
            });
            updatedCount++;
        }
     });

     if (newScores.length > 0) {
         await updateScoreBulk(newScores);
         showToast('สำเร็จ', `นำเข้าคะแนนเรียบร้อย (${updatedCount} คน)`, 'success');
     } else {
         showToast('แจ้งเตือน', 'ไม่พบประวัติการสอบของนักเรียนในกลุ่มนี้', 'info');
     }
     
     setIsImportModalOpen(false);
  };

  const handleRefresh = async () => {
    await refreshData();
  };

  const handleExportPDF = async () => {
    const input = document.getElementById('score-table-container');
    if (!input) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      
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
        row['เกรด'] = calculateGrade(totalScore);
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

  // Filter available quizzes for import modal
  const availableQuizzes = quizzes.filter(q => Number(q.gradeLevel) === filterGrade);

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col" onClick={() => setActiveMenu(null)}>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-['Mitr']">บันทึกคะแนน</h1>
          <p className="text-gray-500">กรอกคะแนนเก็บและประเมินผลการเรียน</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => openImportModal()}
                className="flex items-center gap-2 text-white bg-blue-500 hover:bg-blue-600 transition-colors px-4 py-2 rounded-lg shadow-sm"
            >
                <CloudDownload size={18} /> นำเข้าคะแนน
            </button>
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

      {/* Filters & View Toggle */}
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

        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-lg ml-auto">
            <button 
              onClick={() => setViewMode('recording')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode === 'recording' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutList size={16} /> บันทึกคะแนน
            </button>
            <button 
              onClick={() => setViewMode('summary')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode === 'summary' ? 'bg-white text-accent shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Calculator size={16} /> ประมวลผลเกรด
            </button>
        </div>

        <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-all disabled:opacity-50"
            title="อัปเดตข้อมูล"
        >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Spreadsheet Table */}
      <Card className="flex-1 overflow-hidden p-0 relative flex flex-col shadow-lg border-0 bg-white">
        <div className="overflow-auto custom-scrollbar h-full">
          <div id="score-table-container" className="bg-white min-w-full inline-block align-middle">
             <table className="w-full text-left border-collapse">
            <thead className="bg-[#f8fafc] sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
              <tr className="text-gray-600">
                <th className="sticky left-0 z-30 bg-[#f8fafc] p-4 min-w-[220px] text-left border-b border-r border-gray-200 font-bold text-gray-700 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center gap-2">
                     <span className="bg-gray-200 text-gray-500 w-6 h-6 rounded flex items-center justify-center text-xs">#</span>
                     <span>รายชื่อนักเรียน</span>
                  </div>
                </th>
                
                {viewMode === 'recording' ? (
                  // RECORDING HEADER
                  <>
                    {filteredAssignments.map(a => (
                      <th key={a.id} className="p-3 min-w-[140px] text-center border-b border-r border-dashed border-gray-200 font-semibold text-gray-600 relative group bg-[#f8fafc] hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div className="flex items-center justify-center gap-1 w-full">
                            <span className="text-sm text-gray-800 line-clamp-1 max-w-[100px] cursor-help" title={a.title}>{a.title}</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === a.id ? null : a.id); }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-accent transition-all p-1 rounded-full hover:bg-white"
                            >
                              <MoreVertical size={14} />
                            </button>
                          </div>
                          <span className="text-[10px] font-medium bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">
                            Max: {a.maxScore}
                          </span>
                        </div>

                        {/* Dropdown Menu */}
                        {activeMenu === a.id && (
                          <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3 text-left animate-fade-in-up transform origin-top-right" onClick={(e) => e.stopPropagation()}>
                            
                            {/* Option 1: Bulk Fill */}
                            <div className="mb-3 pb-3 border-b border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 mb-1 px-1 uppercase tracking-wider">ใส่คะแนนทั้งห้อง</p>
                                <div className="flex gap-1">
                                <input 
                                    type="number" 
                                    placeholder={String(a.maxScore)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleBulkScore(a.id, (e.target as HTMLInputElement).value);
                                    }}
                                />
                                <button className="bg-accent text-white p-1.5 rounded-lg hover:bg-orange-400 shadow-sm" title="ยืนยัน">
                                    <CheckCheck size={16} />
                                </button>
                                </div>
                            </div>
                            
                            {/* Option 2: Import from Quiz */}
                            <button 
                                onClick={() => openImportModal(a.id)}
                                className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg flex items-center gap-3 transition-colors"
                            >
                                <div className="p-1.5 bg-blue-100 text-blue-500 rounded-md"><CloudDownload size={14}/></div>
                                <span>ดึงคะแนนจากแบบทดสอบ</span>
                            </button>

                          </div>
                        )}
                      </th>
                    ))}
                    <th className="p-4 min-w-[100px] text-center border-b border-l border-gray-200 font-bold text-gray-800 bg-gray-50">รวม</th>
                  </>
                ) : (
                  // SUMMARY HEADER
                  <>
                    <th className="p-4 min-w-[100px] text-center border-b border-gray-200 font-bold text-gray-700">คะแนนเก็บ</th>
                    <th className="p-4 min-w-[150px] text-center border-b border-gray-200 font-bold text-gray-700">Progress</th>
                    <th className="p-4 min-w-[80px] text-center border-b border-gray-200 font-bold text-gray-700">เกรด</th>
                    <th className="p-4 min-w-[100px] text-center border-b border-gray-200 font-bold text-gray-700">สถานะ</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredStudents.map((s, idx) => {
                const totalScore = filteredAssignments.reduce((acc, a) => {
                  const sc = getStudentScore(s.id, a.id);
                  return acc + (typeof sc === 'number' ? sc : 0);
                }, 0);
                
                const currentMaxScore = filteredAssignments.reduce((acc, a) => acc + a.maxScore, 0);
                const grade = calculateGrade(totalScore);

                return (
                  <tr key={s.id} className="group hover:bg-blue-50/50 transition-colors even:bg-gray-50/30">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50/50 p-3 border-r border-gray-200 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)] transition-colors">
                       <div className="flex items-center gap-3">
                         <span className="text-xs font-mono text-gray-400 w-6 text-center shrink-0">{idx + 1}</span>
                         <div className="min-w-0">
                           <div className="font-bold text-gray-800 text-sm truncate">{s.name}</div>
                           <div className="text-[10px] text-gray-400 flex items-center gap-1">
                              <span className="bg-gray-100 px-1.5 rounded">{s.studentId}</span>
                              <span>ห้อง {s.classroom}</span>
                           </div>
                         </div>
                       </div>
                    </td>
                    
                    {viewMode === 'recording' ? (
                      // RECORDING ROW
                      <>
                        {filteredAssignments.map(a => {
                          const scoreVal = getStudentScore(s.id, a.id);
                          const isGraded = scoreVal !== '';
                          const numScore = typeof scoreVal === 'number' ? scoreVal : 0;
                          
                          return (
                            <td key={a.id} className="p-2 text-center border-r border-dashed border-gray-100 align-middle">
                              <div className="relative flex justify-center">
                                  <input 
                                    type="number"
                                    className={`
                                        w-16 text-center py-1.5 rounded-lg text-sm font-bold transition-all outline-none 
                                        focus:ring-2 focus:ring-accent focus:bg-white focus:shadow-md
                                        placeholder-gray-300
                                        ${isGraded 
                                            ? 'bg-white border border-gray-200 shadow-sm' 
                                            : 'bg-transparent border border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm focus:bg-white'
                                        } 
                                        ${getInputColor(numScore, a.maxScore)}
                                    `}
                                    value={scoreVal}
                                    placeholder="-"
                                    onChange={(e) => handleScoreChange(s.id, a.id, e.target.value)}
                                  />
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-3 text-center border-l border-gray-100 bg-gray-50/30 group-hover:bg-blue-100/30 transition-colors">
                          <span className="font-bold text-accent text-lg">{totalScore}</span>
                        </td>
                      </>
                    ) : (
                      // SUMMARY ROW
                      <>
                        <td className="p-3 text-center text-gray-600 font-medium">
                            <span className="text-lg">{totalScore}</span> <span className="text-xs text-gray-400">/ {currentMaxScore}</span>
                        </td>
                        <td className="p-3 align-middle">
                            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${grade >= 2 ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`} 
                                    style={{ width: `${Math.min(100, (totalScore / (currentMaxScore || 100)) * 100)}%` }}
                                ></div>
                            </div>
                        </td>
                        <td className="p-3 text-center align-middle">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black shadow-sm ${getGradeColor(grade)}`}>
                                {grade}
                            </span>
                        </td>
                        <td className="p-3 text-center align-middle">
                            {grade > 0 ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-green-700 bg-green-50 border border-green-100">
                                    <Trophy size={12}/> ผ่าน
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-red-700 bg-red-50 border border-red-100">
                                    <AlertTriangle size={12}/> ไม่ผ่าน
                                </span>
                            )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {/* Table Footer with Averages */}
            <tfoot className="sticky bottom-0 z-20 font-bold text-gray-600 bg-gray-50 shadow-[0_-1px_3px_rgba(0,0,0,0.1)] border-t-2 border-gray-200">
              <tr>
                <td className="sticky left-0 z-30 bg-gray-50 p-4 border-r border-gray-200 text-right shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)]">
                   ค่าเฉลี่ย (Average)
                </td>

                {viewMode === 'recording' ? (
                   <>
                     {filteredAssignments.map(a => {
                        const validScores = filteredStudents
                          .map(s => getStudentScore(s.id, a.id))
                          .filter((val): val is number => typeof val === 'number');

                        const avg = validScores.length > 0
                          ? (validScores.reduce((sum, val) => sum + val, 0) / validScores.length).toFixed(2)
                          : '-';

                        return (
                           <td key={a.id} className="p-3 text-center border-r border-dashed border-gray-200 text-blue-600">
                              {avg}
                              <span className="text-[10px] text-gray-400 font-normal block">/ {a.maxScore}</span>
                           </td>
                        );
                     })}
                     <td className="p-3 text-center bg-gray-100 text-accent">
                        {(() => {
                           const studentTotals = filteredStudents.map(s =>
                             filteredAssignments.reduce((acc, a) => acc + (Number(getStudentScore(s.id, a.id)) || 0), 0)
                           );
                           const avgTotal = studentTotals.length > 0
                             ? (studentTotals.reduce((a, b) => a + b, 0) / studentTotals.length).toFixed(2)
                             : '-';
                           return avgTotal;
                        })()}
                     </td>
                   </>
                ) : (
                   <>
                      <td className="p-3 text-center text-accent">
                         {(() => {
                            const studentTotals = filteredStudents.map(s =>
                              filteredAssignments.reduce((acc, a) => acc + (Number(getStudentScore(s.id, a.id)) || 0), 0)
                            );
                            const avgTotal = studentTotals.length > 0
                              ? (studentTotals.reduce((a, b) => a + b, 0) / studentTotals.length).toFixed(2)
                              : '-';
                            return avgTotal;
                         })()}
                      </td>
                      <td colSpan={3} className="p-3 text-center text-xs text-gray-400 font-normal">
                         (คะแนนเฉลี่ยรวมทั้งห้อง)
                      </td>
                   </>
                )}
              </tr>
            </tfoot>
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

      {/* Import Quiz Scores Modal */}
      {isImportModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)}></div>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 animate-fade-in-up">
                <div className="p-6 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                    <h3 className="text-xl font-bold font-['Mitr'] text-gray-800 flex items-center gap-2">
                        <CloudDownload className="text-blue-500" /> ดึงคะแนนจากแบบทดสอบ
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        ระบบจะดึงคะแนนสอบ <b>"ครั้งล่าสุด"</b> ของนักเรียนแต่ละคน มาใส่ในช่องคะแนนที่เลือก
                    </p>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">1. เลือกช่องคะแนน (ปลายทาง)</label>
                        <select 
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-accent bg-white shadow-sm"
                            value={targetAssignmentId}
                            onChange={(e) => setTargetAssignmentId(e.target.value)}
                        >
                            <option value="" disabled>-- กรุณาเลือกชิ้นงาน --</option>
                            {filteredAssignments.map(a => (
                                <option key={a.id} value={a.id}>{a.title} (เต็ม {a.maxScore})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">2. เลือกแบบทดสอบ (ต้นทาง)</label>
                        {availableQuizzes.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {availableQuizzes.map(quiz => (
                                    <label 
                                        key={quiz.id} 
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                            selectedQuizId === quiz.id 
                                            ? 'border-accent bg-orange-50 ring-1 ring-accent shadow-sm' 
                                            : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                        }`}
                                    >
                                        <input 
                                            type="radio" 
                                            name="quizSelection"
                                            value={quiz.id}
                                            checked={selectedQuizId === quiz.id}
                                            onChange={() => setSelectedQuizId(quiz.id)}
                                            className="accent-accent w-4 h-4"
                                        />
                                        <div>
                                            <p className="font-bold text-sm text-gray-800">{quiz.title}</p>
                                            <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                                                <span className="bg-gray-100 px-1.5 rounded text-gray-600">{quiz.unit}</span>
                                                <span>• {quiz.questions.length} ข้อ</span>
                                                <span>• {quiz.totalScore} คะแนน</span>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                                <BrainCircuit size={32} className="mx-auto mb-2 opacity-30"/>
                                <p>ไม่พบแบบทดสอบสำหรับ ป.{filterGrade}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button 
                        onClick={() => setIsImportModalOpen(false)} 
                        className="px-5 py-2 rounded-xl text-gray-500 hover:bg-white font-bold transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button 
                        onClick={executeImportQuiz}
                        disabled={!selectedQuizId || !targetAssignmentId}
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all transform active:scale-95"
                    >
                        <Download size={18} /> นำเข้าคะแนน
                    </button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};
