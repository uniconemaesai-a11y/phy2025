import React from 'react';
import { useApp } from '../services/AppContext';
import { Card, StatCard } from '../components/Card';
import { BookOpen, AlertCircle, CheckCircle2, Clock, Plus, PenTool, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router-dom';

export const TeacherDashboard = () => {
  const { currentUser, assignments, students, scores } = useApp();
  const [selectedGrade, setSelectedGrade] = React.useState<5 | 6>(5);

  const gradeStudents = students.filter(s => s.gradeLevel === selectedGrade);
  const gradeAssignments = assignments.filter(a => a.gradeLevel === selectedGrade);

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
             <div className={`p-6 rounded-2xl text-white shadow-lg relative overflow-hidden ${selectedGrade === 5 ? 'bg-gr5' : 'bg-gr6'}`}>
                <h3 className="text-xl font-bold font-['Mitr'] relative z-10">ประกาศล่าสุด</h3>
                <p className="mt-2 text-white/90 relative z-10 text-sm">อย่าลืมแจ้งนักเรียนเรื่องการสอบเก็บคะแนนสัปดาห์หน้า</p>
                <div className="absolute -right-4 -bottom-4 opacity-20">
                  <BookOpen size={100} />
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
    </div>
  );
};