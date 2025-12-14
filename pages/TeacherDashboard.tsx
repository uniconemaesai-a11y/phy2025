
import React, { useState, useEffect } from 'react';
import { useApp } from '../services/AppContext';
import { Card, StatCard } from '../components/Card';
import { BookOpen, AlertCircle, CheckCircle2, Clock, Plus, PenTool, Users, Megaphone, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import { Announcement } from '../types';

export const TeacherDashboard = () => {
  const { currentUser, assignments, students, scores, announcements, addAnnouncement, refreshData } = useApp();
  const [selectedGrade, setSelectedGrade] = useState<5 | 6>(5);
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', type: 'general' });

  // Polling for updates (Simulate Real-time Notifications)
  useEffect(() => {
    const intervalId = setInterval(() => {
        // This background refresh will trigger the toast logic in AppContext 
        // if new submissions are found
        refreshData(); 
    }, 15000); // Check every 15 seconds

    return () => clearInterval(intervalId);
  }, [refreshData]);

  const gradeStudents = students.filter(s => s.gradeLevel === selectedGrade);
  const gradeAssignments = assignments.filter(a => a.gradeLevel === selectedGrade);
  
  // Get Latest Announcement for this grade
  const latestAnnouncement = announcements
      .filter(a => a.gradeLevel === selectedGrade)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  // Calculate simple stats
  const totalSubmissions = scores.filter(s => s.status === 'submitted' && gradeAssignments.some(a => a.id === s.assignmentId)).length;
  const totalExpected = gradeStudents.length * gradeAssignments.length;
  const submissionRate = totalExpected > 0 ? Math.round((totalSubmissions / totalExpected) * 100) : 0;
  
  const unGraded = scores.filter(s => s.status === 'submitted' && s.score === null).length;

  const chartData = gradeAssignments.slice(0, 5).map(a => ({
    name: a.title.substring(0, 10) + '...',
    fullTitle: a.title,
    sent: scores.filter(s => s.assignmentId === a.id && s.status === 'submitted').length,
    total: gradeStudents.length
  }));

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.content) return;

    const announcement: Announcement = {
      id: `AN-${Date.now()}`,
      title: newAnnouncement.title,
      content: newAnnouncement.content,
      gradeLevel: selectedGrade,
      date: new Date().toISOString().split('T')[0],
      type: newAnnouncement.type as any
    };

    await addAnnouncement(announcement);
    setIsAnnounceModalOpen(false);
    setNewAnnouncement({ title: '', content: '', type: 'general' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Mitr'] text-gray-800">
            สวัสดี, คุณครู{currentUser?.name.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">ภาพรวมการเรียนการสอนวันนี้</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-gray-100 shadow-sm">
           <button 
             onClick={() => setSelectedGrade(5)}
             className={`px-4 py-2 rounded-lg font-bold transition-colors ${selectedGrade === 5 ? 'bg-gr5 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
           >
             ป.5
           </button>
           <button 
             onClick={() => setSelectedGrade(6)}
             className={`px-4 py-2 rounded-lg font-bold transition-colors ${selectedGrade === 6 ? 'bg-gr6 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
           >
             ป.6
           </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="จำนวนชิ้นงาน" 
          value={gradeAssignments.length} 
          icon={BookOpen} 
          colorClass="bg-gr5 text-gr5" 
        />
        <StatCard 
          title="งานรอตรวจ" 
          value={unGraded} 
          icon={AlertCircle} 
          colorClass="bg-warning text-warning" 
        />
        <StatCard 
          title="ส่งงานครบ" 
          value={`${submissionRate}%`} 
          icon={CheckCircle2} 
          colorClass="bg-success text-success" 
        />
        <StatCard 
          title="เวลาเรียนเฉลี่ย" 
          value="92%" 
          icon={Clock} 
          colorClass="bg-accent text-accent" 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Charts */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="สถิติการส่งงานล่าสุด">
             <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="sent" name="ส่งแล้ว" radius={[4, 4, 0, 0]} barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={selectedGrade === 5 ? '#A8D8FF' : '#7FE5D8'} />
                      ))}
                    </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Dynamic Announcement Card */}
             <div className={`p-6 rounded-2xl text-white shadow-lg relative overflow-hidden flex flex-col justify-between group ${selectedGrade === 5 ? 'bg-gr5' : 'bg-gr6'}`}>
                <div className="relative z-10">
                   <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold font-['Mitr']">ประกาศล่าสุด</h3>
                      <button 
                        onClick={() => setIsAnnounceModalOpen(true)}
                        className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                        title="สร้างประกาศใหม่"
                      >
                         <Plus size={16} />
                      </button>
                   </div>
                   {latestAnnouncement ? (
                       <>
                          <p className="font-bold text-lg mb-1">{latestAnnouncement.title}</p>
                          <p className="text-white/90 text-sm line-clamp-2">{latestAnnouncement.content}</p>
                          <p className="text-xs text-white/60 mt-3">{new Date(latestAnnouncement.date).toLocaleDateString('th-TH')}</p>
                       </>
                   ) : (
                       <p className="text-white/80 text-sm py-4">ยังไม่มีประกาศสำหรับระดับชั้นนี้</p>
                   )}
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-20">
                  <Megaphone size={100} />
                </div>
             </div>

             <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-3">
                  <Clock size={24} />
                </div>
                <h3 className="font-bold text-gray-800">งานใกล้ครบกำหนด</h3>
                <p className="text-sm text-gray-500 mt-1">3 งานในสัปดาห์นี้</p>
             </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Recent */}
        <div className="space-y-6">
          <Card title="เมนูด่วน">
            <div className="grid grid-cols-2 gap-3">
              <Link to="/teacher/assignments" className="p-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex flex-col items-center justify-center gap-2 transition-colors">
                <Plus size={24} />
                <span className="text-sm font-bold">เพิ่มงาน</span>
              </Link>
              <Link to="/teacher/scores" className="p-4 rounded-xl bg-green-50 hover:bg-green-100 text-green-600 flex flex-col items-center justify-center gap-2 transition-colors">
                <PenTool size={24} />
                <span className="text-sm font-bold">ลงคะแนน</span>
              </Link>
              <button className="p-4 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 flex flex-col items-center justify-center gap-2 transition-colors">
                <Clock size={24} />
                <span className="text-sm font-bold">เช็คชื่อ</span>
              </button>
              <button className="p-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-600 flex flex-col items-center justify-center gap-2 transition-colors">
                <Users size={24} />
                <span className="text-sm font-bold">นักเรียน</span>
              </button>
            </div>
          </Card>
          
          <Card title="งานล่าสุด">
             <div className="space-y-3">
               {gradeAssignments.slice(0, 3).map(a => (
                 <div key={a.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all">
                    <div>
                      <p className="font-medium text-sm text-gray-800">{a.title}</p>
                      <p className="text-xs text-gray-400">ครบกำหนด: {new Date(a.dueDate).toLocaleDateString('th-TH')}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${a.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {a.status}
                    </span>
                 </div>
               ))}
               {gradeAssignments.length === 0 && (
                 <p className="text-center text-gray-400 py-4 text-sm">ยังไม่มีงานในระดับชั้นนี้</p>
               )}
             </div>
          </Card>
        </div>
      </div>

      {/* Create Announcement Modal */}
      {isAnnounceModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAnnounceModalOpen(false)}></div>
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 animate-fade-in-up">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="text-xl font-bold font-['Mitr']">สร้างประกาศใหม่ (ป.{selectedGrade})</h3>
                 <button onClick={() => setIsAnnounceModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
              </div>
              <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">หัวข้อประกาศ</label>
                    <input 
                       type="text" 
                       required
                       className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-accent"
                       value={newAnnouncement.title}
                       onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                       placeholder="เช่น เตรียมสอบกลางภาค"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                    <select
                       className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none"
                       value={newAnnouncement.type}
                       onChange={e => setNewAnnouncement({...newAnnouncement, type: e.target.value})}
                    >
                       <option value="general">ทั่วไป</option>
                       <option value="urgent">ด่วน</option>
                       <option value="event">กิจกรรม</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                    <textarea 
                       required
                       className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-accent h-32"
                       value={newAnnouncement.content}
                       onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                       placeholder="รายละเอียดของประกาศ..."
                    ></textarea>
                 </div>
                 <div className="pt-2 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsAnnounceModalOpen(false)} className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-50">ยกเลิก</button>
                    <button type="submit" className="px-6 py-2 rounded-xl bg-accent text-white font-bold shadow-lg hover:shadow-xl hover:bg-orange-400 transition-all">ประกาศ</button>
                 </div>
              </form>
           </div>
         </div>
      )}
    </div>
  );
};
