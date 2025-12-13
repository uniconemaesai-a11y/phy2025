import React, { useState } from 'react';
import { useApp } from '../services/AppContext';
import { Card } from '../components/Card';
import { CheckCircle2, Clock, BarChart3, AlertCircle, ChevronRight, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const StudentPortal = () => {
  const { currentUser, assignments, scores, getStudentScore } = useApp();
  const [confirmed, setConfirmed] = useState(false);

  if (!currentUser || currentUser.role !== 'STUDENT') return <div>Access Denied</div>;

  const myAssignments = assignments.filter(a => a.gradeLevel === currentUser.gradeLevel);
  const myScores = myAssignments.map(a => ({
    ...a,
    score: getStudentScore(currentUser.id, a.id)
  }));

  const submittedCount = myScores.filter(s => typeof s.score === 'number').length;
  const pendingCount = myScores.length - submittedCount;
  
  // Calculate total grade
  const totalScore = myScores.reduce((acc, curr) => acc + (typeof curr.score === 'number' ? curr.score : 0), 0);
  const maxTotal = myAssignments.reduce((acc, curr) => acc + curr.maxScore, 0);

  // Chart Data
  const chartData = myScores.filter(s => typeof s.score === 'number').map(s => ({
    name: s.title,
    score: s.score
  }));

  const gradeColor = currentUser.gradeLevel === 5 ? 'text-gr5' : 'text-gr6';
  const gradeBg = currentUser.gradeLevel === 5 ? 'bg-gr5' : 'bg-gr6';

  const handleConfirm = () => {
    // Show confirmation animation
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 3000);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           <div className={`w-16 h-16 rounded-full ${gradeBg} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
             {currentUser.name[0]}
           </div>
           <div>
             <h1 className="text-2xl font-bold font-['Mitr'] text-gray-800">สวัสดี, {currentUser.name}</h1>
             <p className="text-gray-500">นักเรียนชั้นประถมศึกษาปีที่ {currentUser.gradeLevel} ห้อง {currentUser.classroom}</p>
           </div>
        </div>
        <div className="text-right hidden md:block">
           <p className="text-sm text-gray-400">คะแนนรวมปัจจุบัน</p>
           <p className={`text-4xl font-bold font-['Mitr'] ${gradeColor}`}>{totalScore} <span className="text-lg text-gray-300">/ {maxTotal}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col items-center justify-center py-8">
           <div className="p-3 bg-blue-50 text-blue-500 rounded-full mb-2"><BarChart3 /></div>
           <p className="text-gray-400 text-xs">คะแนนรวม</p>
           <p className="text-2xl font-bold text-gray-800">{totalScore}</p>
        </Card>
        <Card className="flex flex-col items-center justify-center py-8">
           <div className="p-3 bg-red-50 text-red-500 rounded-full mb-2"><AlertCircle /></div>
           <p className="text-gray-400 text-xs">งานค้าง</p>
           <p className="text-2xl font-bold text-gray-800">{pendingCount}</p>
        </Card>
        <Card className="flex flex-col items-center justify-center py-8">
           <div className="p-3 bg-yellow-50 text-yellow-500 rounded-full mb-2"><Clock /></div>
           <p className="text-gray-400 text-xs">รอตรวจ</p>
           <p className="text-2xl font-bold text-gray-800">0</p>
        </Card>
        <Card className="flex flex-col items-center justify-center py-8">
           <div className="p-3 bg-green-50 text-green-500 rounded-full mb-2"><CheckCircle2 /></div>
           <p className="text-gray-400 text-xs">ส่งแล้ว</p>
           <p className="text-2xl font-bold text-gray-800">{submittedCount}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="รายการงานทั้งหมด">
            <div className="space-y-4">
              {myScores.map((item) => {
                const isDone = typeof item.score === 'number';
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${isDone ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                        {isDone ? <Check size={20} /> : <Clock size={20} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{item.title}</h4>
                        <p className="text-xs text-gray-500">กำหนดส่ง: {new Date(item.dueDate).toLocaleDateString('th-TH')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       {isDone ? (
                         <div className="font-bold text-lg text-gray-800">{item.score} <span className="text-xs text-gray-400">/ {item.maxScore}</span></div>
                       ) : (
                         <span className="text-xs font-bold text-orange-500 bg-orange-50 px-3 py-1 rounded-full">ยังไม่มีคะแนน</span>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          
          <div className="flex justify-center">
            <button 
              onClick={handleConfirm}
              disabled={confirmed}
              className={`w-full md:w-auto px-8 py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 ${confirmed ? 'bg-success text-white' : 'bg-white text-gray-800 border border-success/30 hover:border-success text-success'}`}
            >
              {confirmed ? (
                <>
                  <CheckCircle2 /> ยืนยันเรียบร้อยแล้ว
                </>
              ) : (
                <>
                  <CheckCircle2 /> ยืนยันตรวจสอบคะแนน
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-6">
           <Card title="พัฒนาการเรียนรู้">
             <div className="h-48 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={chartData}>
                   <XAxis dataKey="name" hide />
                   <YAxis hide domain={[0, 100]} />
                   <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                   />
                   <Line type="monotone" dataKey="score" stroke={currentUser.gradeLevel === 5 ? '#A8D8FF' : '#7FE5D8'} strokeWidth={4} dot={{r: 4}} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
           </Card>

           <div className={`p-6 rounded-2xl text-white ${gradeBg} shadow-lg`}>
              <h3 className="text-lg font-bold font-['Mitr'] mb-2">ข่าวประชาสัมพันธ์</h3>
              <ul className="space-y-3 text-sm text-white/90">
                <li className="flex gap-2 items-start">
                  <span className="mt-1 bg-white/30 p-1 rounded-full text-[10px]"><ChevronRight size={10} /></span>
                  อย่าลืมเตรียมชุดพละสำหรับสัปดาห์หน้า
                </li>
                <li className="flex gap-2 items-start">
                  <span className="mt-1 bg-white/30 p-1 rounded-full text-[10px]"><ChevronRight size={10} /></span>
                  ประกาศผลสอบกลางภาควันที่ 25 นี้
                </li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
};