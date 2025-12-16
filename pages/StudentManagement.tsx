
import React, { useState, useRef } from 'react';
import { useApp } from '../services/AppContext';
import { Card } from '../components/Card';
import { Users, Plus, Upload, Edit2, Trash2, Search, X, Check, Loader2, FileText, Printer, AlertTriangle, Download, GraduationCap } from 'lucide-react';
import { StudentData, Assignment } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Helper: Calculate Grade
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

// Reusable Report Card Component
const OfficialReportCard = ({ 
    student, 
    assignments, 
    getStudentScore, 
    getStudentAttendanceStats, 
    getLatestHealthRecord 
}: { 
    student: StudentData, 
    assignments: Assignment[], 
    getStudentScore: Function, 
    getStudentAttendanceStats: Function, 
    getLatestHealthRecord: Function 
}) => {
    return (
        <div className="bg-white w-[210mm] min-h-[297mm] p-[15mm] shadow-none relative text-gray-800 font-['Sarabun'] mx-auto">
            {/* 1. Header */}
            <div className="flex flex-col items-center mb-8 border-b-2 border-gray-800 pb-4">
                <img src="https://img5.pic.in.th/file/secure-sv1/-21d5e37cfa61c42627.png" alt="Logo" className="w-20 h-20 mb-2 object-contain" />
                <h1 className="text-xl font-bold font-['Mitr']">แบบรายงานผลการพัฒนาคุณภาพผู้เรียนรายบุคคล (ปพ.6)</h1>
                <h2 className="text-lg font-bold">กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา</h2>
                <p className="text-base">ภาคเรียนที่ 2 ปีการศึกษา 2567</p>
            </div>

            {/* 2. Student Info */}
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-y-2 text-base">
                    <div className="flex">
                        <span className="font-bold w-32">ชื่อ-นามสกุล:</span>
                        <span>{student.name}</span>
                    </div>
                    <div className="flex">
                        <span className="font-bold w-32">เลขประจำตัว:</span>
                        <span className="font-mono">{student.studentId}</span>
                    </div>
                    <div className="flex">
                        <span className="font-bold w-32">ระดับชั้น:</span>
                        <span>ประถมศึกษาปีที่ {student.gradeLevel}</span>
                    </div>
                    <div className="flex">
                        <span className="font-bold w-32">ห้องเรียน:</span>
                        <span>{student.classroom}</span>
                    </div>
                    <div className="flex col-span-2">
                        <span className="font-bold w-32">ครูประจำวิชา:</span>
                        <span>นายประภาส พลาสัย</span>
                    </div>
                </div>
            </div>

            {/* 3. Academic Scores */}
            <h3 className="text-lg font-bold mb-2 font-['Mitr'] border-l-4 border-gray-800 pl-2">1. ผลสัมฤทธิ์ทางการเรียน</h3>
            <table className="w-full border-collapse border border-gray-400 mb-6 text-base">
                <thead>
                    <tr className="bg-gray-200 text-gray-800">
                        <th className="border border-gray-400 p-2 text-left w-12">ที่</th>
                        <th className="border border-gray-400 p-2 text-left">รายการประเมิน / ชิ้นงาน</th>
                        <th className="border border-gray-400 p-2 text-center w-24">คะแนนเต็ม</th>
                        <th className="border border-gray-400 p-2 text-center w-24">คะแนนที่ได้</th>
                    </tr>
                </thead>
                <tbody>
                    {assignments.filter(a => a.gradeLevel === student.gradeLevel).map((a, idx) => (
                        <tr key={a.id}>
                            <td className="border border-gray-400 p-2 text-center">{idx + 1}</td>
                            <td className="border border-gray-400 p-2">{a.title}</td>
                            <td className="border border-gray-400 p-2 text-center">{a.maxScore}</td>
                            <td className="border border-gray-400 p-2 text-center font-medium">
                                {getStudentScore(student.id, a.id) || '-'}
                            </td>
                        </tr>
                    ))}
                    
                    {/* Summary Rows */}
                    {(() => {
                        const myAssignments = assignments.filter(a => a.gradeLevel === student.gradeLevel);
                        const totalMax = myAssignments.reduce((acc, a) => acc + a.maxScore, 0);
                        const totalScore = myAssignments.reduce((acc, a) => {
                            const s = getStudentScore(student.id, a.id);
                            return acc + (typeof s === 'number' ? s : 0);
                        }, 0);
                        const grade = calculateGrade(totalScore);

                        return (
                            <>
                            <tr className="bg-gray-50 font-bold">
                                <td colSpan={2} className="border border-gray-400 p-2 text-right">รวมคะแนนทั้งหมด</td>
                                <td className="border border-gray-400 p-2 text-center">{totalMax}</td>
                                <td className="border border-gray-400 p-2 text-center">{totalScore}</td>
                            </tr>
                            <tr className="bg-gray-100 font-bold text-lg">
                                <td colSpan={3} className="border border-gray-400 p-3 text-right">ระดับผลการเรียน (เกรด)</td>
                                <td className="border border-gray-400 p-3 text-center">{grade}</td>
                            </tr>
                            </>
                        );
                    })()}
                </tbody>
            </table>

            <div className="grid grid-cols-2 gap-8 mb-8">
                {/* 4. Attendance */}
                <div>
                    <h3 className="text-lg font-bold mb-2 font-['Mitr'] border-l-4 border-gray-800 pl-2">2. สรุปเวลาเรียน</h3>
                    {(() => {
                        const stats = getStudentAttendanceStats(student.id);
                        return (
                            <table className="w-full border-collapse border border-gray-400 text-sm">
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-400 p-2 bg-gray-50 font-bold">มาเรียน</td>
                                        <td className="border border-gray-400 p-2 text-center">{stats.present} วัน</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-400 p-2 bg-gray-50 font-bold">สาย</td>
                                        <td className="border border-gray-400 p-2 text-center">{stats.late} วัน</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-400 p-2 bg-gray-50 font-bold">ลา / ขาด</td>
                                        <td className="border border-gray-400 p-2 text-center">{stats.leave + stats.missing} วัน</td>
                                    </tr>
                                    <tr className="bg-gray-100 font-bold">
                                        <td className="border border-gray-400 p-2">คิดเป็นร้อยละ</td>
                                        <td className="border border-gray-400 p-2 text-center">{stats.attendanceRate}%</td>
                                    </tr>
                                </tbody>
                            </table>
                        );
                    })()}
                </div>

                {/* 5. Health Data */}
                <div>
                    <h3 className="text-lg font-bold mb-2 font-['Mitr'] border-l-4 border-gray-800 pl-2">3. ข้อมูลสุขภาพ</h3>
                    {(() => {
                        const h = getLatestHealthRecord(student.id);
                        return (
                            <table className="w-full border-collapse border border-gray-400 text-sm">
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-400 p-2 bg-gray-50 font-bold">น้ำหนัก</td>
                                        <td className="border border-gray-400 p-2 text-center">{h ? h.weight : '-'} กก.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-400 p-2 bg-gray-50 font-bold">ส่วนสูง</td>
                                        <td className="border border-gray-400 p-2 text-center">{h ? h.height : '-'} ซม.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-400 p-2 bg-gray-50 font-bold">ดัชนีมวลกาย (BMI)</td>
                                        <td className="border border-gray-400 p-2 text-center">{h ? h.bmi : '-'}</td>
                                    </tr>
                                    <tr className="bg-gray-100 font-bold">
                                        <td className="border border-gray-400 p-2">แปลผล</td>
                                        <td className="border border-gray-400 p-2 text-center">{h ? h.interpretation : '-'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        );
                    })()}
                </div>
            </div>

            {/* 6. Signatures */}
            <div className="absolute bottom-[20mm] left-[15mm] right-[15mm]">
                <div className="flex justify-between items-end">
                    <div className="text-center w-5/12">
                        <div className="border-b border-dotted border-gray-400 mb-2 h-8"></div>
                        <p className="font-bold text-base">( นายประภาส พลาสัย )</p>
                        <p className="text-sm">ครูประจำวิชา</p>
                        <div className="flex justify-center items-center gap-1 mt-1 text-sm">
                            <span>วันที่</span>
                            <span className="border-b border-dotted border-gray-400 w-8 inline-block"></span>
                            <span>/</span>
                            <span className="border-b border-dotted border-gray-400 w-8 inline-block"></span>
                            <span>/</span>
                            <span className="border-b border-dotted border-gray-400 w-12 inline-block">2568</span>
                        </div>
                    </div>

                    <div className="text-center w-5/12">
                        <div className="border-b border-dotted border-gray-400 mb-2 h-8"></div>
                        <p className="font-bold text-base">(.......................................................)</p>
                        <p className="text-sm">ผู้ปกครอง</p>
                        <div className="flex justify-center items-center gap-1 mt-1 text-sm">
                            <span>วันที่</span>
                            <span className="border-b border-dotted border-gray-400 w-8 inline-block"></span>
                            <span>/</span>
                            <span className="border-b border-dotted border-gray-400 w-8 inline-block"></span>
                            <span>/</span>
                            <span className="border-b border-dotted border-gray-400 w-12 inline-block">2568</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const StudentManagement = () => {
  const { students, addStudent, updateStudent, deleteStudent, getStudentScore, assignments, getStudentAttendanceStats, getLatestHealthRecord, showToast } = useApp();
  
  // Filtering
  const [filterGrade, setFilterGrade] = useState<5 | 6>(5);
  const [filterClass, setFilterClass] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [reportStudent, setReportStudent] = useState<StudentData | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentData | null>(null);
  
  // Bulk Printing State
  const [isPrintingBulk, setIsPrintingBulk] = useState(false);
  
  // Delete Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Forms
  const [formData, setFormData] = useState<Partial<StudentData>>({ gradeLevel: 5, classroom: '5/1' });
  const [bulkText, setBulkText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter Logic
  const filteredStudents = students.filter(s => {
    const matchGrade = s.gradeLevel === Number(filterGrade); 
    const matchClass = filterClass === 'all' || s.classroom === filterClass;
    const matchSearch = String(s.name).includes(searchTerm) || String(s.studentId).includes(searchTerm);
    return matchGrade && matchClass && matchSearch;
  });

  // Handlers
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId || !formData.name || !formData.classroom) return;

    setIsSubmitting(true);
    if (editingStudent) {
      await updateStudent({ ...editingStudent, ...formData } as StudentData);
    } else {
      if (students.some(s => s.studentId === formData.studentId)) {
        showToast('แจ้งเตือน', 'รหัสประจำตัวนักเรียนนี้มีอยู่ในระบบแล้ว', 'error');
        setIsSubmitting(false);
        return;
      }
      await addStudent({
        id: formData.name, // Use Name as ID per request
        studentId: formData.studentId,
        name: formData.name,
        gradeLevel: formData.gradeLevel as 5 | 6,
        classroom: formData.classroom
      });
    }
    setIsSubmitting(false);
    closeModals();
  };

  const handleBulkSubmit = async () => {
    setIsSubmitting(true);
    const lines = bulkText.split('\n').filter(line => line.trim() !== '');
    let addedCount = 0;
    
    for (const line of lines) {
      const parts = line.trim().split(/[\t\s]+/);
      if (parts.length >= 3) {
        const sid = parts[1];
        const name = parts.slice(2).join(' ');
        if (!students.some(s => s.studentId === sid)) {
           await addStudent({
             id: name, // Use Name as ID per request
             studentId: sid,
             name: name,
             gradeLevel: filterGrade,
             classroom: filterClass !== 'all' ? filterClass : `${filterGrade}/1`
           });
           addedCount++;
        }
      }
    }
    setIsSubmitting(false);
    showToast('สำเร็จ', `เพิ่มนักเรียนสำเร็จ ${addedCount} คน`, 'success');
    closeModals();
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const executeDelete = async () => {
    if (deleteConfirmId) {
      await deleteStudent(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const openEdit = (s: StudentData) => {
    setEditingStudent(s);
    setFormData(s);
    setIsAddModalOpen(true);
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsBulkModalOpen(false);
    setEditingStudent(null);
    setReportStudent(null);
    setFormData({ gradeLevel: filterGrade, classroom: `${filterGrade}/1` });
    setBulkText('');
  };

  const handlePrintReport = async () => {
    const input = document.getElementById('official-report-card-view');
    if (!input) return;

    try {
        const canvas = await html2canvas(input, { 
            scale: 2, 
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true 
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Report_${reportStudent?.studentId}_${reportStudent?.name}.pdf`);
    } catch (e) {
        showToast('ผิดพลาด', 'เกิดข้อผิดพลาดในการพิมพ์', 'error');
    }
  };

  const handleBulkPrint = async () => {
    if (filteredStudents.length === 0) {
        showToast('แจ้งเตือน', 'ไม่มีรายชื่อนักเรียนให้พิมพ์', 'info');
        return;
    }

    setIsPrintingBulk(true);
    showToast('กำลังประมวลผล', 'กำลังสร้างไฟล์ PDF กรุณารอสักครู่...', 'info');

    // Slight delay to allow DOM to render the hidden container
    setTimeout(async () => {
        try {
            const container = document.getElementById('bulk-print-container');
            if (!container) throw new Error('Container not found');

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const cards = Array.from(container.children) as HTMLElement[];

            for (let i = 0; i < cards.length; i++) {
                const canvas = await html2canvas(cards[i], { 
                    scale: 2, 
                    backgroundColor: '#ffffff',
                    logging: false,
                    useCORS: true 
                });
                const imgData = canvas.toDataURL('image/png');
                
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            }

            // Generate Filename
            const filename = filterClass !== 'all' 
                ? `Report_Class_${filterClass.replace('/', '-')}.pdf`
                : `Report_Grade_${filterGrade}_All.pdf`;

            pdf.save(filename);
            showToast('สำเร็จ', 'สร้างไฟล์ PDF เรียบร้อยแล้ว', 'success');

        } catch (e) {
            console.error(e);
            showToast('ผิดพลาด', 'เกิดข้อผิดพลาดในการพิมพ์แบบกลุ่ม', 'error');
        } finally {
            setIsPrintingBulk(false);
        }
    }, 1000);
  };

  const handleExportCSV = () => {
    if (filteredStudents.length === 0) {
       showToast('แจ้งเตือน', 'ไม่พบข้อมูลนักเรียนสำหรับส่งออก', 'info');
       return;
    }

    // CSV Header
    const headers = ['ลำดับ,รหัสประจำตัว,ชื่อ-นามสกุล,ระดับชั้น,ห้องเรียน'];
    
    // CSV Rows
    const rows = filteredStudents.map((s, index) => 
      `${index + 1},"${s.studentId}","${s.name}",${s.gradeLevel},"${s.classroom}"`
    );

    // Combine with BOM for Excel Thai support
    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    
    // Create Blob and Download Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Student_List_Grade${filterGrade}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-['Mitr']">จัดการนักเรียน</h1>
          <p className="text-gray-500">เพิ่ม แก้ไข และลบข้อมูลนักเรียน (เชื่อมต่อฐานข้อมูล)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={handleBulkPrint}
            disabled={isPrintingBulk || filteredStudents.length === 0}
            className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isPrintingBulk ? <Loader2 className="animate-spin" size={18}/> : <Printer size={18} />} 
            {isPrintingBulk ? 'กำลังสร้าง PDF...' : 'พิมพ์ทั้งห้อง (PDF)'}
          </button>
          <button 
            onClick={handleExportCSV}
            className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Download size={18} /> Export CSV
          </button>
          <button 
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Upload size={18} /> เพิ่มหลายคน
          </button>
          <button 
            onClick={() => { setFormData({gradeLevel: filterGrade, classroom: filterClass !== 'all' ? filterClass : `${filterGrade}/1`}); setIsAddModalOpen(true); }}
            className="bg-accent text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-orange-100 hover:shadow-xl hover:bg-orange-400 transition-all flex items-center gap-2"
          >
            <Plus size={18} /> เพิ่มนักเรียน
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="flex flex-col md:flex-row gap-4 items-center p-4">
         <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => { setFilterGrade(5); setFilterClass('all'); }} className={`flex-1 md:flex-none px-6 py-2 rounded-xl font-bold transition-all ${filterGrade === 5 ? 'bg-gr5 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}>ป.5</button>
            <button onClick={() => { setFilterGrade(6); setFilterClass('all'); }} className={`flex-1 md:flex-none px-6 py-2 rounded-xl font-bold transition-all ${filterGrade === 6 ? 'bg-gr6 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}>ป.6</button>
         </div>
         <div className="w-px h-8 bg-gray-200 hidden md:block"></div>
         <div className="flex gap-4 w-full md:w-auto flex-1">
            <select 
              value={filterClass} 
              onChange={(e) => setFilterClass(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-accent/50 min-w-[120px]"
            >
              <option value="all">ทุกห้อง</option>
              {[1,2,3,4].map(r => (
                  <option key={r} value={`${filterGrade}/${r}`}>{filterGrade}/{r}</option>
              ))}
            </select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ หรือ รหัสนักเรียน..." 
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-accent/50"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
         </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden p-0">
         <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
             <thead className="bg-gray-50">
               <tr>
                 <th className="p-4 font-bold text-gray-600 text-sm w-20">ลำดับ</th>
                 <th className="p-4 font-bold text-gray-600 text-sm">รหัสประจำตัว</th>
                 <th className="p-4 font-bold text-gray-600 text-sm">ชื่อ - นามสกุล</th>
                 <th className="p-4 font-bold text-gray-600 text-sm">ระดับชั้น</th>
                 <th className="p-4 font-bold text-gray-600 text-sm text-right">จัดการ</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
               {filteredStudents.map((student, index) => (
                 <tr key={student.id} className="hover:bg-gray-50 transition-colors group">
                   <td className="p-4 text-gray-400 text-sm">{index + 1}</td>
                   <td className="p-4 font-mono text-gray-600 font-bold">{student.studentId}</td>
                   <td className="p-4 font-medium text-gray-800">{student.name}</td>
                   <td className="p-4">
                     <span className={`px-2 py-1 rounded-lg text-xs font-bold ${student.gradeLevel === 5 ? 'bg-blue-50 text-blue-600' : 'bg-teal-50 text-teal-600'}`}>
                       ป.{student.gradeLevel} / {String(student.classroom || '').split('/')[1]}
                     </span>
                   </td>
                   <td className="p-4 flex justify-end gap-2">
                     <button onClick={() => setReportStudent(student)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="ใบเกรด">
                       <FileText size={18} />
                     </button>
                     <button onClick={() => openEdit(student)} className="p-2 text-gray-400 hover:text-accent hover:bg-orange-50 rounded-lg transition-all">
                       <Edit2 size={18} />
                     </button>
                     <button onClick={() => handleDelete(student.id)} className="p-2 text-gray-400 hover:text-error hover:bg-red-50 rounded-lg transition-all">
                       <Trash2 size={18} />
                     </button>
                   </td>
                 </tr>
               ))}
               {filteredStudents.length === 0 && (
                 <tr>
                   <td colSpan={5} className="p-8 text-center text-gray-400">
                     {students.length === 0 ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูลนักเรียนตามตัวกรอง'}
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
      </Card>

      {/* Hidden Bulk Print Container */}
      {isPrintingBulk && (
          <div 
             id="bulk-print-container" 
             style={{ position: 'absolute', top: -10000, left: -10000, width: '210mm' }}
          >
              {filteredStudents.map(student => (
                  <div key={student.id} className="mb-4">
                      <OfficialReportCard 
                          student={student} 
                          assignments={assignments} 
                          getStudentScore={getStudentScore} 
                          getStudentAttendanceStats={getStudentAttendanceStats}
                          getLatestHealthRecord={getLatestHealthRecord}
                      />
                  </div>
              ))}
          </div>
      )}

      {/* Official Report Card Modal (Single View) */}
      {reportStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
           <div className="relative w-full max-w-[210mm] my-8 animate-fade-in-up">
              
              {/* Controls */}
              <div className="absolute top-0 right-0 -mt-12 flex gap-2">
                 <button onClick={handlePrintReport} className="bg-white text-accent px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-gray-50 flex items-center gap-2 transition-all">
                    <Printer size={18} /> พิมพ์รายงาน (PDF)
                 </button>
                 <button onClick={() => setReportStudent(null)} className="bg-white/20 text-white p-2 rounded-full hover:bg-white/30 transition-all">
                    <X size={24} />
                 </button>
              </div>

              {/* View Wrapper */}
              <div id="official-report-card-view" className="shadow-2xl">
                 <OfficialReportCard 
                    student={reportStudent} 
                    assignments={assignments} 
                    getStudentScore={getStudentScore} 
                    getStudentAttendanceStats={getStudentAttendanceStats}
                    getLatestHealthRecord={getLatestHealthRecord}
                 />
              </div>
           </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModals}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 animate-fade-in-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold font-['Mitr']">{editingStudent ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มนักเรียนใหม่'}</h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสประจำตัว</label>
                <input 
                  type="text" 
                  required
                  disabled={!!editingStudent}
                  className={`w-full border border-gray-300 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-accent ${editingStudent ? 'bg-gray-100 text-gray-500' : ''}`}
                  value={formData.studentId || ''}
                  onChange={e => setFormData({...formData, studentId: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ - นามสกุล</label>
                <input 
                  type="text" 
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-accent"
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">ระดับชั้น</label>
                   <select 
                     className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none"
                     value={formData.gradeLevel}
                     onChange={e => {
                        const newGrade = Number(e.target.value);
                        setFormData({
                            ...formData, 
                            gradeLevel: newGrade as 5 | 6,
                            classroom: `${newGrade}/1`
                        });
                     }}
                   >
                     <option value={5}>ป.5</option>
                     <option value={6}>ป.6</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">ห้อง</label>
                   <select 
                     className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none"
                     value={formData.classroom}
                     onChange={e => setFormData({...formData, classroom: e.target.value})}
                   >
                     {[1,2,3,4].map(r => {
                        const val = `${formData.gradeLevel}/${r}`;
                        return <option key={val} value={val}>{formData.gradeLevel}/{r}</option>;
                     })}
                   </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                 <button type="button" onClick={closeModals} className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-50">ยกเลิก</button>
                 <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-xl bg-accent text-white font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                   {isSubmitting && <Loader2 className="animate-spin" size={18} />} บันทึก
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModals}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 animate-fade-in-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold font-['Mitr']">เพิ่มนักเรียนหลายคน</h3>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800">
                <p className="font-bold mb-1">คำแนะนำ:</p>
                <p>วางข้อมูลรูปแบบ: <b>เลขที่ รหัสนักเรียน ชื่อ นามสกุล</b> (1 คนต่อ 1 บรรทัด)</p>
                <p className="mt-1 text-xs text-blue-600">ตัวอย่าง:<br/>1 1782 เด็กชาย กอไก่ ใจดี<br/>2 1788 เด็กหญิง ขอไข่ ใฝ่เรียน</p>
              </div>
              
              <div className="flex gap-4 items-center">
                 <span className="text-sm font-bold text-gray-700">จะเพิ่มลงใน:</span>
                 <span className={`px-2 py-1 rounded-lg text-xs font-bold ${filterGrade === 5 ? 'bg-blue-50 text-blue-600' : 'bg-teal-50 text-teal-600'}`}>
                   ป.{filterGrade} {filterClass !== 'all' ? `/ ห้อง ${filterClass.split('/')[1]}` : '(กรุณาเลือกห้องก่อน)'}
                 </span>
              </div>
              {filterClass === 'all' && (
                  <p className="text-xs text-error">* กรุณาเลือกห้องที่มุมซ้ายบนก่อนทำการเพิ่มหลายคน เพื่อระบุห้องเรียนที่ถูกต้อง</p>
              )}

              <textarea 
                className="w-full h-48 border border-gray-300 rounded-xl p-4 outline-none focus:ring-2 focus:ring-accent font-mono text-sm"
                placeholder="วางรายชื่อที่นี่..."
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
              ></textarea>

              <div className="pt-2 flex justify-end gap-3">
                 <button onClick={closeModals} className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-50">ยกเลิก</button>
                 <button 
                   onClick={handleBulkSubmit} 
                   disabled={filterClass === 'all' || !bulkText.trim() || isSubmitting}
                   className="px-6 py-2 rounded-xl bg-accent text-white font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                 >
                   {isSubmitting && <Loader2 className="animate-spin" size={18} />} ตรวจสอบและนำเข้า
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}></div>
             <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm relative z-10 flex flex-col items-center text-center animate-fade-in-up">
                 <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                     <AlertTriangle size={32} />
                 </div>
                 <h3 className="text-xl font-bold font-['Mitr'] text-gray-800 mb-2">ยืนยันการลบ?</h3>
                 <p className="text-gray-500 mb-6">ข้อมูลคะแนนและประวัติต่างๆ ของนักเรียนคนนี้จะถูกลบทั้งหมด</p>
                 <div className="flex gap-3 w-full">
                     <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 rounded-xl text-gray-500 font-bold hover:bg-gray-100 transition-colors">ยกเลิก</button>
                     <button onClick={executeDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold shadow-lg hover:shadow-xl hover:bg-red-600 transition-all">ยืนยันลบ</button>
                 </div>
             </div>
          </div>
      )}
    </div>
  );
};
