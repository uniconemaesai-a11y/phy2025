
import React, { useState, useEffect } from 'react';
import { useApp } from '../services/AppContext';
import { Card } from '../components/Card';
import { Users, AlertTriangle, PieChart as PieChartIcon, X, Loader2, Check, Save } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const AttendanceRecording = () => {
  const { students, attendance, markAttendanceBulk, getStudentAttendanceStats, isLoading } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedGrade, setSelectedGrade] = useState<5 | 6>(5);
  const [selectedClassroom, setSelectedClassroom] = useState('5/1');
  const [showStatsModal, setShowStatsModal] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, 'present' | 'late' | 'leave' | 'missing'>>({});

  // Reset pending updates when context changes (date/class)
  useEffect(() => {
    setPendingUpdates({});
  }, [selectedDate, selectedGrade, selectedClassroom]);

  // Filter students based on selection with Type Coercion for safety
  const currentStudents = students.filter(s => 
    Number(s.gradeLevel) === Number(selectedGrade) && 
    String(s.classroom).trim() === selectedClassroom
  );

  // Status Colors
  const COLORS = {
    present: '#6BA87D', // Green
    late: '#FFD166',    // Yellow
    leave: '#5DA5DA',   // Blue
    missing: '#E07856'  // Red
  };

  const getStatus = (studentId: string) => {
    // Check pending first
    if (pendingUpdates[studentId]) return pendingUpdates[studentId];
    // Then check database
    const record = attendance.find(a => String(a.studentId) === String(studentId) && a.date === selectedDate);
    return record?.status || 'unmarked';
  };

  const handleMark = (studentId: string, status: 'present' | 'late' | 'leave' | 'missing') => {
    setPendingUpdates(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const markAll = (status: 'present' | 'late' | 'leave' | 'missing') => {
    if (currentStudents.length === 0) return;
    const updates: Record<string, 'present' | 'late' | 'leave' | 'missing'> = {};
    currentStudents.forEach(s => {
      updates[s.id] = status;
    });
    setPendingUpdates(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    const updates = Object.entries(pendingUpdates);
    if (updates.length === 0) return;

    setIsSaving(true);
    const records = updates.map(([studentId, status]) => ({
        studentId,
        date: selectedDate,
        status,
        reason: ''
    }));
    
    await markAttendanceBulk(records);
    setPendingUpdates({}); // Clear pending as they are now saved in context
    setIsSaving(false);
  };

  // Warning List (< 80%)
  const riskStudents = students.filter(s => {
    const stats = getStudentAttendanceStats(s.id);
    return stats.attendanceRate < 80 && stats.totalDays > 0;
  });

  // Calculate today's stats for the selected class (including pending)
  const dailyStats = {
    present: currentStudents.filter(s => getStatus(s.id) === 'present').length,
    late: currentStudents.filter(s => getStatus(s.id) === 'late').length,
    leave: currentStudents.filter(s => getStatus(s.id) === 'leave').length,
    missing: currentStudents.filter(s => getStatus(s.id) === 'missing').length,
    total: currentStudents.length
  };

  const hasUnsavedChanges = Object.keys(pendingUpdates).length > 0;

  // Data for individual donut chart
  const getChartData = (studentId: string) => {
    const stats = getStudentAttendanceStats(studentId);
    return [
      { name: 'มา', value: stats.present, color: COLORS.present },
      { name: 'สาย', value: stats.late, color: COLORS.late },
      { name: 'ลา', value: stats.leave, color: COLORS.leave },
      { name: 'ขาด', value: stats.missing, color: COLORS.missing },
    ].filter(d => d.value > 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-['Mitr']">บันทึกเวลาเรียน</h1>
          <p className="text-gray-500">เช็คชื่อและตรวจสอบสถิติการเข้าเรียน</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
           <span className="text-sm font-bold text-gray-500 pl-2">เลือกวันที่:</span>
           <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border-none bg-gray-50 rounded-lg px-4 py-1.5 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
      </div>

      {/* Controls & Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls and Risk Dashboard */}
        <div className="space-y-6">
           {/* Class Selector */}
           <Card className="space-y-4">
              <h3 className="font-bold text-gray-700 flex items-center gap-2"><Users size={20}/> เลือกห้องเรียน</h3>
              <div className="flex gap-2">
                 <button 
                   onClick={() => { setSelectedGrade(5); setSelectedClassroom('5/1'); }}
                   className={`flex-1 py-2 rounded-lg font-bold transition-all ${selectedGrade === 5 ? 'bg-gr5 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}
                 >
                   ป.5
                 </button>
                 <button 
                   onClick={() => { setSelectedGrade(6); setSelectedClassroom('6/1'); }}
                   className={`flex-1 py-2 rounded-lg font-bold transition-all ${selectedGrade === 6 ? 'bg-gr6 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}
                 >
                   ป.6
                 </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                 {[1, 2, 3, 4].map(room => {
                   const roomName = `${selectedGrade}/${room}`;
                   return (
                     <button
                       key={room}
                       onClick={() => setSelectedClassroom(roomName)}
                       className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                         selectedClassroom === roomName 
                           ? 'border-accent text-accent bg-accent/10' 
                           : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                       }`}
                     >
                       {roomName}
                     </button>
                   );
                 })}
              </div>
           </Card>

           {/* Daily Stats Card */}
           <Card className="bg-white">
              <h3 className="font-bold text-gray-700 mb-3">สรุปวันนี้ ({selectedClassroom})</h3>
              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                    <div className="text-xs text-green-600 font-bold mb-1">มาเรียน</div>
                    <div className="text-2xl font-bold text-green-700">{dailyStats.present} <span className="text-sm text-green-500 font-normal">/ {dailyStats.total}</span></div>
                 </div>
                 <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                    <div className="text-xs text-orange-600 font-bold mb-1">ขาด/ลา/สาย</div>
                    <div className="text-2xl font-bold text-orange-700">{dailyStats.late + dailyStats.leave + dailyStats.missing}</div>
                 </div>
              </div>
              <div className="mt-3 flex gap-2">
                 {dailyStats.total > 0 && (
                   <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                      <div style={{width: `${(dailyStats.present/dailyStats.total)*100}%`}} className="bg-[#6BA87D]" />
                      <div style={{width: `${(dailyStats.late/dailyStats.total)*100}%`}} className="bg-[#FFD166]" />
                      <div style={{width: `${(dailyStats.leave/dailyStats.total)*100}%`}} className="bg-[#5DA5DA]" />
                      <div style={{width: `${(dailyStats.missing/dailyStats.total)*100}%`}} className="bg-[#E07856]" />
                   </div>
                 )}
              </div>
           </Card>

           {/* Warning Card */}
           <Card className="bg-red-50 border-red-100">
             <div className="flex items-center gap-2 text-error font-bold mb-3">
               <AlertTriangle size={20} />
               <span>เฝ้าระวัง (เวลาเรียน &lt; 80%)</span>
             </div>
             {riskStudents.length > 0 ? (
               <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                 {riskStudents.map(s => {
                   const stats = getStudentAttendanceStats(s.id);
                   return (
                     <div key={s.id} className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center">
                       <div>
                         <p className="text-sm font-bold text-gray-800">{s.name}</p>
                         <p className="text-xs text-gray-500">ห้อง {s.classroom}</p>
                       </div>
                       <span className="text-error font-bold text-sm">{stats.attendanceRate}%</span>
                     </div>
                   );
                 })}
               </div>
             ) : (
               <p className="text-sm text-gray-500 text-center py-4">ไม่มีนักเรียนในกลุ่มเสี่ยง</p>
             )}
           </Card>
        </div>

        {/* Right: Check-in List */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col min-h-[600px]">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
               <div>
                  <h3 className="font-bold text-lg text-gray-800">รายชื่อนักเรียน</h3>
                  <p className="text-xs text-gray-500">วันที่ {new Date(selectedDate).toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
               </div>
               
               <div className="flex gap-2">
                 <button 
                   onClick={() => markAll('present')}
                   disabled={isSaving || currentStudents.length === 0}
                   className="flex items-center gap-2 bg-gray-50 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-xl transition-all font-bold border border-gray-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                 >
                   <Check size={16} /> มาทั้งหมด
                 </button>
                 
                 <button 
                   onClick={handleSave}
                   disabled={isSaving || !hasUnsavedChanges}
                   className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 ${
                     hasUnsavedChanges 
                       ? 'bg-accent text-white hover:bg-orange-400 animate-pulse' 
                       : 'bg-gray-200 text-gray-400'
                   }`}
                 >
                   {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
                   {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                 </button>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {isLoading && currentStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                   <Loader2 size={48} className="animate-spin mb-3 text-accent" />
                   <p>กำลังโหลดข้อมูลนักเรียน...</p>
                </div>
              ) : (
                <>
                  {currentStudents.map(student => {
                    const currentStatus = getStatus(student.id);
                    // Check if modified locally
                    const isPending = !!pendingUpdates[student.id];

                    return (
                      <div key={student.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all gap-4 ${isPending ? 'bg-orange-50/30 border-orange-200' : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-md'}`}>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setShowStatsModal(student.id)}
                            className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center border border-gray-200 hover:border-accent hover:text-accent hover:bg-white transition-all"
                            title="ดูสถิติ"
                          >
                             <PieChartIcon size={18} />
                          </button>
                          <div>
                            <p className="font-bold text-gray-800">{student.name}</p>
                            <p className="text-xs text-gray-400 font-mono flex items-center gap-2">
                               {student.studentId}
                               {isPending && <span className="text-[10px] text-orange-500 font-bold bg-orange-100 px-1 rounded">แก้ไข</span>}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                          <button 
                            onClick={() => handleMark(student.id, 'present')}
                            className={`flex-1 sm:flex-none w-14 h-10 rounded-lg font-bold text-sm transition-all border-b-4 active:border-b-0 active:translate-y-1 ${
                              currentStatus === 'present' 
                                ? 'bg-[#6BA87D] border-[#4A855A] text-white shadow-sm' 
                                : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                            }`}
                          >
                            มา
                          </button>
                          <button 
                            onClick={() => handleMark(student.id, 'late')}
                            className={`flex-1 sm:flex-none w-14 h-10 rounded-lg font-bold text-sm transition-all border-b-4 active:border-b-0 active:translate-y-1 ${
                              currentStatus === 'late' 
                                ? 'bg-[#FFD166] border-[#D4AA40] text-white shadow-sm' 
                                : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                            }`}
                          >
                            สาย
                          </button>
                          <button 
                            onClick={() => handleMark(student.id, 'leave')}
                            className={`flex-1 sm:flex-none w-14 h-10 rounded-lg font-bold text-sm transition-all border-b-4 active:border-b-0 active:translate-y-1 ${
                              currentStatus === 'leave' 
                                ? 'bg-[#5DA5DA] border-[#3B7CA8] text-white shadow-sm' 
                                : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                            }`}
                          >
                            ลา
                          </button>
                          <button 
                            onClick={() => handleMark(student.id, 'missing')}
                            className={`flex-1 sm:flex-none w-14 h-10 rounded-lg font-bold text-sm transition-all border-b-4 active:border-b-0 active:translate-y-1 ${
                              currentStatus === 'missing' 
                                ? 'bg-[#E07856] border-[#B85636] text-white shadow-sm' 
                                : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                            }`}
                          >
                            ขาด
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {!isLoading && currentStudents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                       <Users size={48} className="mb-2" />
                       <p>ไม่พบนักเรียนในห้อง {selectedClassroom}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal for Individual Stats */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowStatsModal(null)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative z-10 p-6 animate-fade-in-up">
             <button onClick={() => setShowStatsModal(null)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"><X /></button>
             
             <div className="text-center mb-6">
               <h3 className="text-xl font-bold font-['Mitr'] text-gray-800">
                 {students.find(s => s.id === showStatsModal)?.name}
               </h3>
               <p className="text-gray-500 text-sm">สถิติการมาเรียนทั้งหมด</p>
             </div>

             <div className="h-64 w-full relative min-w-0">
               {getStudentAttendanceStats(showStatsModal).totalDays > 0 ? (
                   <>
                       <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                         <PieChart>
                           <Pie
                             data={getChartData(showStatsModal)}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={80}
                             paddingAngle={5}
                             dataKey="value"
                           >
                             {getChartData(showStatsModal).map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                             ))}
                           </Pie>
                           <Tooltip />
                           <Legend verticalAlign="bottom" height={36}/>
                         </PieChart>
                       </ResponsiveContainer>
                       {/* Center Text */}
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                         <div className="text-center">
                            <p className="text-3xl font-bold text-gray-800">
                              {getStudentAttendanceStats(showStatsModal).attendanceRate}%
                            </p>
                            <p className="text-[10px] text-gray-400">ATTENDANCE</p>
                         </div>
                       </div>
                   </>
               ) : (
                   <div className="flex items-center justify-center h-full text-gray-400 flex-col">
                       <PieChartIcon size={48} className="mb-2 opacity-50" />
                       <p>ยังไม่มีประวัติการเข้าเรียน</p>
                   </div>
               )}
             </div>
             
             {getStudentAttendanceStats(showStatsModal).totalDays > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="bg-green-50 p-2 rounded-lg text-center">
                    <p className="text-xs text-green-600 font-bold">มาเรียน</p>
                    <p className="text-lg font-bold text-green-700">{getStudentAttendanceStats(showStatsModal).present} วัน</p>
                    </div>
                    <div className="bg-red-50 p-2 rounded-lg text-center">
                    <p className="text-xs text-red-600 font-bold">ขาดเรียน</p>
                    <p className="text-lg font-bold text-red-700">{getStudentAttendanceStats(showStatsModal).missing} วัน</p>
                    </div>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};
