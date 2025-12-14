import React, { useState } from 'react';
import { useApp } from '../services/AppContext';
import { Card } from '../components/Card';
import { Users, Plus, Upload, Edit2, Trash2, Search, X, Check, Loader2, FileText, Printer } from 'lucide-react';
import { StudentData } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const StudentManagement = () => {
  const { students, addStudent, updateStudent, deleteStudent, getStudentScore, assignments, getStudentAttendanceStats, getLatestHealthRecord } = useApp();
  
  // Filtering
  const [filterGrade, setFilterGrade] = useState<5 | 6>(5);
  const [filterClass, setFilterClass] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [reportStudent, setReportStudent] = useState<StudentData | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentData | null>(null);

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
        alert('รหัสประจำตัวนักเรียนนี้มีอยู่ในระบบแล้ว');
        setIsSubmitting(false);
        return;
      }
      await addStudent({
        id: `S${Date.now()}`,
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
             id: `S${Date.now() + Math.random()}`,
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
    alert(`เพิ่มนักเรียนสำเร็จ ${addedCount} คน`);
    closeModals();
  };

  const handleDelete = async (id: string) => {
    if (confirm('ยืนยันการลบนักเรียน? ข้อมูลคะแนนจะถูกลบด้วย')) {
      await deleteStudent(id);
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
    const input = document.getElementById('student-report-card');
    if (!input) return;
    try {
        const canvas = await html2canvas(input, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Report_${reportStudent?.studentId}.pdf`);
    } catch (e) {
        alert('เกิดข้อผิดพลาดในการพิมพ์');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-['Mitr']">จัดการนักเรียน</h1>
          <p className="text-gray-500">เพิ่ม แก้ไข และลบข้อมูลนักเรียน (เชื่อมต่อฐานข้อมูล)</p>
        </div>
        <div className="flex gap-2">
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

      {/* Report Card Modal */}
      {reportStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setReportStudent(null)}></div>
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 flex flex-col max-h-[90vh]">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-3xl">
                 <h3 className="font-bold text-gray-700">รายงานผลรายบุคคล (Report Card)</h3>
                 <div className="flex gap-2">
                    <button onClick={handlePrintReport} className="bg-accent text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-orange-400"><Printer size={16}/> พิมพ์ PDF</button>
                    <button onClick={() => setReportStudent(null)} className="p-1.5 hover:bg-gray-200 rounded-lg"><X size={20}/></button>
                 </div>
              </div>
              
              <div className="overflow-y-auto p-8 bg-white" id="student-report-card">
                 {/* Report Header */}
                 <div className="text-center mb-6 border-b-2 border-accent pb-4">
                    <img src="https://img5.pic.in.th/file/secure-sv1/-21d5e37cfa61c42627.png" className="w-16 mx-auto mb-2"/>
                    <h2 className="text-xl font-bold font-['Mitr'] text-gray-800">แบบรายงานผลการเรียนรายวิชา สุขศึกษาและพลศึกษา</h2>
                    <p className="text-sm text-gray-500">ภาคเรียนที่ 2 ปีการศึกษา 2567</p>
                 </div>

                 {/* Student Info */}
                 <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div>
                       <p className="text-xs text-gray-500">ชื่อ - นามสกุล</p>
                       <p className="font-bold text-gray-800">{reportStudent.name}</p>
                    </div>
                    <div>
                       <p className="text-xs text-gray-500">รหัสประจำตัว</p>
                       <p className="font-mono font-bold text-gray-800">{reportStudent.studentId}</p>
                    </div>
                    <div>
                       <p className="text-xs text-gray-500">ระดับชั้น</p>
                       <p className="font-bold text-gray-800">ประถมศึกษาปีที่ {reportStudent.gradeLevel}</p>
                    </div>
                    <div>
                       <p className="text-xs text-gray-500">ห้องเรียน</p>
                       <p className="font-bold text-gray-800">{reportStudent.classroom}</p>
                    </div>
                 </div>

                 {/* Academic Performance */}
                 <h4 className="font-bold text-gray-800 mb-2 border-l-4 border-blue-500 pl-2">ผลสัมฤทธิ์ทางการเรียน</h4>
                 <table className="w-full border-collapse mb-6 text-sm">
                    <thead>
                       <tr className="bg-gray-100">
                          <th className="border p-2 text-left">รายการประเมิน</th>
                          <th className="border p-2 text-center w-24">คะแนนเต็ม</th>
                          <th className="border p-2 text-center w-24">คะแนนที่ได้</th>
                       </tr>
                    </thead>
                    <tbody>
                       {assignments.filter(a => a.gradeLevel === reportStudent.gradeLevel).map(a => {
                          const score = getStudentScore(reportStudent.id, a.id);
                          return (
                             <tr key={a.id}>
                                <td className="border p-2">{a.title}</td>
                                <td className="border p-2 text-center">{a.maxScore}</td>
                                <td className="border p-2 text-center font-bold">{score === '' ? '-' : score}</td>
                             </tr>
                          )
                       })}
                       <tr className="bg-gray-50 font-bold">
                          <td className="border p-2 text-right">รวมคะแนนทั้งหมด</td>
                          <td className="border p-2 text-center">
                             {assignments.filter(a => a.gradeLevel === reportStudent.gradeLevel).reduce((a,b) => a + b.maxScore, 0)}
                          </td>
                          <td className="border p-2 text-center text-blue-600">
                             {assignments.filter(a => a.gradeLevel === reportStudent.gradeLevel).reduce((acc, curr) => {
                                const s = getStudentScore(reportStudent.id, curr.id);
                                return acc + (typeof s === 'number' ? s : 0);
                             }, 0)}
                          </td>
                       </tr>
                    </tbody>
                 </table>

                 <div className="grid grid-cols-2 gap-6">
                    {/* Attendance */}
                    <div>
                       <h4 className="font-bold text-gray-800 mb-2 border-l-4 border-yellow-500 pl-2">การเข้าเรียน</h4>
                       <div className="bg-white border rounded-lg p-3 text-sm">
                          <div className="flex justify-between mb-1"><span>มาเรียน:</span> <b>{getStudentAttendanceStats(reportStudent.id).present} วัน</b></div>
                          <div className="flex justify-between mb-1"><span>สาย:</span> <b>{getStudentAttendanceStats(reportStudent.id).late} วัน</b></div>
                          <div className="flex justify-between"><span>ขาด/ลา:</span> <b>{getStudentAttendanceStats(reportStudent.id).missing + getStudentAttendanceStats(reportStudent.id).leave} วัน</b></div>
                          <div className="border-t mt-2 pt-2 text-center">
                             <span className="text-xs text-gray-500">อัตราการเข้าเรียน</span><br/>
                             <span className="text-xl font-bold text-accent">{getStudentAttendanceStats(reportStudent.id).attendanceRate}%</span>
                          </div>
                       </div>
                    </div>
                    {/* Health */}
                    <div>
                       <h4 className="font-bold text-gray-800 mb-2 border-l-4 border-green-500 pl-2">สุขภาพ (ล่าสุด)</h4>
                       {(() => {
                          const h = getLatestHealthRecord(reportStudent.id);
                          return h ? (
                             <div className="bg-white border rounded-lg p-3 text-sm">
                                <div className="flex justify-between mb-1"><span>น้ำหนัก:</span> <b>{h.weight} กก.</b></div>
                                <div className="flex justify-between mb-1"><span>ส่วนสูง:</span> <b>{h.height} ซม.</b></div>
                                <div className="flex justify-between mb-1"><span>BMI:</span> <b>{h.bmi}</b></div>
                                <div className="mt-2 text-center">
                                   <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">{h.interpretation}</span>
                                </div>
                             </div>
                          ) : <div className="text-gray-400 text-sm border rounded-lg p-4 text-center">ไม่มีข้อมูลสุขภาพ</div>
                       })()}
                    </div>
                 </div>
                 
                 <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between text-center">
                    <div className="w-40">
                       <div className="h-16"></div>
                       <p className="text-sm">ลงชื่อครูประจำวิชา</p>
                       <p className="text-xs text-gray-400">(..........................................)</p>
                    </div>
                    <div className="w-40">
                        <div className="h-16"></div>
                        <p className="text-sm">ลงชื่อผู้ปกครอง</p>
                        <p className="text-xs text-gray-400">รับทราบผลการเรียน</p>
                    </div>
                 </div>
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
    </div>
  );
};