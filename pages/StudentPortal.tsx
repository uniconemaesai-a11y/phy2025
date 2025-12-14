
import React, { useState } from 'react';
import { useApp } from '../services/AppContext';
import { Card } from '../components/Card';
import { CheckCircle2, Clock, BarChart3, AlertCircle, ChevronRight, Check, Award, Flame, Heart, Megaphone, BrainCircuit, Play, History, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';

export const StudentPortal = () => {
  const { currentUser, assignments, scores, getStudentScore, getStudentAttendanceStats, getLatestHealthRecord, announcements, quizzes, quizResults, refreshData, isLoading } = useApp();
  const [confirmed, setConfirmed] = useState(false);
  const navigate = useNavigate();

  if (!currentUser || currentUser.role !== 'STUDENT') return <div>Access Denied</div>;

  const myAssignments = assignments.filter(a => a.gradeLevel === currentUser.gradeLevel);
  const myScores = myAssignments.map(a => ({
    ...a,
    score: getStudentScore(currentUser.id, a.id)
  }));

  const submittedCount = myScores.filter(s => typeof s.score === 'number').length;
  const pendingCount = myScores.length - submittedCount;
  
  const totalScore = myScores.reduce((acc, curr) => acc + (typeof curr.score === 'number' ? curr.score : 0), 0);
  const maxTotal = myAssignments.reduce((acc, curr) => acc + curr.maxScore, 0);

  const chartData = myScores.filter(s => typeof s.score === 'number').map(s => ({
    name: s.title,
    score: s.score
  }));

  const gradeColor = currentUser.gradeLevel === 5 ? 'text-gr5' : 'text-gr6';
  const gradeBg = currentUser.gradeLevel === 5 ? 'bg-gr5' : 'bg-gr6';
  const buttonBg = currentUser.gradeLevel === 5 ? 'bg-gr5' : 'bg-gr6';
  
  // Announcements
  const myAnnouncements = announcements
     .filter(a => a.gradeLevel === currentUser.gradeLevel)
     .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
     .slice(0, 3);

  // Quizzes Logic
  // Fallback to empty array if quizzes is undefined
  const safeQuizzes = quizzes || [];
  const allQuizzes = safeQuizzes.filter(q => Number(q.gradeLevel) === Number(currentUser.gradeLevel) && q.status === 'published');
  const todoQuizzes = allQuizzes.filter(q => !quizResults.some(r => r.quizId === q.id && r.studentId === currentUser.id));
  const doneQuizzes = allQuizzes.filter(q => quizResults.some(r => r.quizId === q.id && r.studentId === currentUser.id));

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 3000);
  };

  const handleRefresh = async () => {
      await refreshData();
  };

  // Gamification
  const attendanceStats = getStudentAttendanceStats(currentUser.id);
  const healthRecord = getLatestHealthRecord(currentUser.id);
  const badges = [
      { id: 'perfect', name: 'มาเรียนดีเยี่ยม', icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-100', unlocked: attendanceStats.attendanceRate >= 95, desc: 'เข้าเรียนเกิน 95%' },
      { id: 'task', name: 'ส่งงานครบ', icon: Flame, color: 'text-red-500', bg: 'bg-red-100', unlocked: pendingCount === 0 && myAssignments.length > 0, desc: 'ไม่มีงานค้าง' },
      { id: 'health', name: 'หุ่นดี สุขภาพดี', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-100', unlocked: healthRecord?.interpretation === 'สมส่วน', desc: 'BMI สมส่วน' }
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col items-center justify-center py-6">
           <div className="p-2 bg-blue-50 text-blue-500 rounded-full mb-1"><BarChart3 size={20} /></div>
           <p className="text-gray-400 text-xs">คะแนนรวม</p>
           <p className="text-xl font-bold text-gray-800">{totalScore}</p>
        </Card>
        <Card className="flex flex-col items-center justify-center py-6">
           <div className="p-2 bg-red-50 text-red-500 rounded-full mb-1"><AlertCircle size={20} /></div>
           <p className="text-gray-400 text-xs">งานค้าง</p>
           <p className="text-xl font-bold text-gray-800">{pendingCount}</p>
        </Card>
        <Card className="flex flex-col items-center justify-center py-6">
           <div className="p-2 bg-purple-50 text-purple-500 rounded-full mb-1"><BrainCircuit size={20} /></div>
           <p className="text-gray-400 text-xs">แบบทดสอบ</p>
           <p className="text-xl font-bold text-gray-800">{todoQuizzes.length} <span className="text-xs font-normal">รอทำ</span></p>
        </Card>
        <Card className="flex flex-col items-center justify-center py-6">
           <div className="p-2 bg-green-50 text-green-500 rounded-full mb-1"><CheckCircle2 size={20} /></div>
           <p className="text-gray-400 text-xs">ส่งแล้ว</p>
           <p className="text-xl font-bold text-gray-800">{submittedCount}</p>
        </Card>
      </div>
      
      {/* Badges */}
      <Card title="เหรียญรางวัลของฉัน">
          <div className="flex flex-wrap gap-4">
              {badges.map(badge => (
                  <div key={badge.id} className={`flex items-center gap-3 p-3 rounded-xl border w-full sm:w-auto ${badge.unlocked ? 'border-gray-100 bg-white shadow-sm' : 'border-dashed border-gray-200 bg-gray-50 opacity-60'}`}>
                      <div className={`p-3 rounded-full ${badge.unlocked ? badge.bg + ' ' + badge.color : 'bg-gray-200 text-gray-400'}`}>
                          <badge.icon size={24} />
                      </div>
                      <div>
                          <p className={`font-bold text-sm ${badge.unlocked ? 'text-gray-800' : 'text-gray-400'}`}>{badge.name}</p>
                          <p className="text-xs text-gray-400">{badge.desc}</p>
                      </div>
                  </div>
              ))}
          </div>
      </Card>

      {/* Online Quizzes */}
      <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
             <div className={`p-2 rounded-lg ${gradeBg} text-white`}><BrainCircuit size={20} /></div>
             <h3 className="text-xl font-bold font-['Mitr'] text-gray-800">แบบทดสอบออนไลน์</h3>
             <button onClick={handleRefresh} className="ml-auto text-sm text-blue-500 hover:bg-blue-50 px-3 py-1 rounded-lg flex items-center gap-1 transition-all">
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''}/> รีเฟรชข้อมูล
             </button>
          </div>
          
          <div className="space-y-6">
             {/* To Do List */}
             {todoQuizzes.length > 0 && (
                 <div>
                    <h4 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2"><Clock size={16}/> รอทำ ({todoQuizzes.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {todoQuizzes.map(quiz => (
                            <div key={quiz.id} className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl transition-all relative overflow-hidden group">
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${gradeBg}`}></div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">{quiz.unit}</span>
                                <h4 className="font-bold text-lg text-gray-800 mb-3">{quiz.title}</h4>
                                <div className="flex gap-4 text-sm text-gray-500 mb-4">
                                    <span className="flex items-center gap-1"><Clock size={14}/> {quiz.timeLimit} นาที</span>
                                    <span className="flex items-center gap-1"><Award size={14}/> {quiz.totalScore} คะแนน</span>
                                </div>
                                <button 
                                onClick={() => navigate(`/student/quiz/${quiz.id}`)}
                                className={`w-full py-2.5 rounded-xl font-bold text-white shadow-md ${buttonBg} group-hover:opacity-90 transition-all flex items-center justify-center gap-2`}
                                >
                                    <Play size={16} fill="currentColor" /> เริ่มทำข้อสอบ
                                </button>
                            </div>
                        ))}
                    </div>
                 </div>
             )}

             {/* Completed List */}
             {doneQuizzes.length > 0 && (
                 <div>
                    <h4 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2"><History size={16}/> ทำเสร็จแล้ว ({doneQuizzes.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {doneQuizzes.map(quiz => {
                            const result = quizResults.find(r => r.quizId === quiz.id && r.studentId === currentUser.id);
                            return (
                                <div key={quiz.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 relative overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{quiz.unit}</span>
                                        <span className="bg-green-100 text-green-600 text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1"><Check size={10}/> DONE</span>
                                    </div>
                                    <h4 className="font-bold text-gray-700 mb-3">{quiz.title}</h4>
                                    <div className="bg-white rounded-xl p-3 flex justify-between items-center border border-gray-100">
                                        <span className="text-xs text-gray-400">คะแนนที่ได้</span>
                                        <div className={`text-xl font-bold ${gradeColor}`}>{result?.score} <span className="text-sm text-gray-400">/ {quiz.totalScore}</span></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                 </div>
             )}

             {allQuizzes.length === 0 && (
                <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                   <BrainCircuit size={32} className="mx-auto mb-2 opacity-30" />
                   <p className="font-bold text-gray-500">ยังไม่มีแบบทดสอบในขณะนี้</p>
                   <p className="text-xs mt-1">คุณอาจทำครบแล้ว หรือครูยังไม่ได้มอบหมายงาน</p>
                   <button onClick={handleRefresh} className="mt-4 text-accent text-sm font-bold hover:underline">ลองรีเฟรชข้อมูล</button>
                </div>
             )}
          </div>
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
              {confirmed ? <><CheckCircle2 /> ยืนยันเรียบร้อยแล้ว</> : <><CheckCircle2 /> ยืนยันตรวจสอบคะแนน</>}
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
                   <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                   <Line type="monotone" dataKey="score" stroke={currentUser.gradeLevel === 5 ? '#A8D8FF' : '#7FE5D8'} strokeWidth={4} dot={{r: 4}} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
           </Card>

           <div className={`p-6 rounded-2xl text-white ${gradeBg} shadow-lg flex flex-col h-fit`}>
              <div className="flex items-center gap-2 mb-3">
                 <Megaphone size={20} />
                 <h3 className="text-lg font-bold font-['Mitr']">ข่าวประชาสัมพันธ์</h3>
              </div>
              <ul className="space-y-4 text-sm text-white/90">
                {myAnnouncements.length > 0 ? myAnnouncements.map(a => (
                    <li key={a.id} className="flex gap-2 items-start border-b border-white/20 pb-2 last:border-0 last:pb-0">
                        <span className="mt-1 bg-white/30 p-1 rounded-full text-[10px] flex-shrink-0"><ChevronRight size={10} /></span>
                        <div>
                            <span className="font-bold block text-white">{a.title}</span>
                            <span className="text-xs opacity-90 block">{a.content}</span>
                        </div>
                    </li>
                )) : (
                    <li className="text-center py-4 opacity-70">ไม่มีประกาศใหม่</li>
                )}
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
};
