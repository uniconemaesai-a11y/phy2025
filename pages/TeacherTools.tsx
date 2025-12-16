
import React, { useState } from 'react';
import { useApp } from '../services/AppContext';
import { Card } from '../components/Card';
import { Users, Shuffle, Award, CheckCircle2, RotateCcw, Coins, Gift } from 'lucide-react';
import { StudentData } from '../types';

export const TeacherTools = () => {
  const { students, addCoins, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'TEAMS' | 'RANDOM' | 'REWARDS'>('TEAMS');
  
  // State for Selection
  const [selectedGrade, setSelectedGrade] = useState<5 | 6>(5);
  const [selectedClassroom, setSelectedClassroom] = useState('5/1');

  // Filter Students
  const classStudents = students.filter(s => 
    s.gradeLevel === selectedGrade && 
    s.classroom === selectedClassroom
  );

  // --- Team Generator State ---
  const [teamCount, setTeamCount] = useState(4);
  const [teams, setTeams] = useState<StudentData[][]>([]);

  // --- Random Picker State ---
  const [pickedStudent, setPickedStudent] = useState<StudentData | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // --- Rewards State ---
  const [rewardAmount, setRewardAmount] = useState(10);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // Handlers
  const generateTeams = () => {
      const shuffled = [...classStudents].sort(() => 0.5 - Math.random());
      const newTeams: StudentData[][] = Array.from({ length: teamCount }, () => []);
      
      shuffled.forEach((student, index) => {
          newTeams[index % teamCount].push(student);
      });
      setTeams(newTeams);
  };

  const pickRandom = () => {
      if (classStudents.length === 0) return;
      setIsAnimating(true);
      setPickedStudent(null);
      
      let count = 0;
      const interval = setInterval(() => {
          const rand = Math.floor(Math.random() * classStudents.length);
          setPickedStudent(classStudents[rand]);
          count++;
          if (count > 20) {
              clearInterval(interval);
              setIsAnimating(false);
          }
      }, 100);
  };

  const handleGiveReward = () => {
      if (selectedStudents.length === 0) return;
      selectedStudents.forEach(id => {
          addCoins(id, rewardAmount);
      });
      showToast('สำเร็จ', `มอบ ${rewardAmount} เหรียญ ให้ ${selectedStudents.length} คนแล้ว`, 'success');
      setSelectedStudents([]);
  };

  const toggleSelectStudent = (id: string) => {
      if (selectedStudents.includes(id)) {
          setSelectedStudents(prev => prev.filter(s => s !== id));
      } else {
          setSelectedStudents(prev => [...prev, id]);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Header & Filter */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold font-['Mitr']">เครื่องมือช่วยสอนอัจฉริยะ</h1>
                <p className="text-gray-500">จัดการชั้นเรียน จัดทีม และเสริมแรงบวก</p>
            </div>
            <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                <button onClick={() => { setSelectedGrade(5); setSelectedClassroom('5/1'); setTeams([]); setPickedStudent(null); }} className={`px-4 py-2 rounded-lg font-bold transition-all ${selectedGrade === 5 ? 'bg-gr5 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>ป.5</button>
                <button onClick={() => { setSelectedGrade(6); setSelectedClassroom('6/1'); setTeams([]); setPickedStudent(null); }} className={`px-4 py-2 rounded-lg font-bold transition-all ${selectedGrade === 6 ? 'bg-gr6 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>ป.6</button>
                <div className="w-px bg-gray-200 mx-1"></div>
                <select 
                    value={selectedClassroom}
                    onChange={e => { setSelectedClassroom(e.target.value); setTeams([]); setPickedStudent(null); }}
                    className="bg-transparent font-bold text-gray-700 outline-none px-2 cursor-pointer"
                >
                    {[1,2,3,4].map(r => <option key={r} value={`${selectedGrade}/${r}`}>ห้อง {selectedGrade}/{r}</option>)}
                </select>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200">
            <button onClick={() => setActiveTab('TEAMS')} className={`pb-3 px-2 flex items-center gap-2 font-bold border-b-2 transition-all ${activeTab === 'TEAMS' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                <Users size={20}/> จัดทีมแข่งขัน
            </button>
            <button onClick={() => setActiveTab('RANDOM')} className={`pb-3 px-2 flex items-center gap-2 font-bold border-b-2 transition-all ${activeTab === 'RANDOM' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                <Shuffle size={20}/> สุ่มเลขที่
            </button>
            <button onClick={() => setActiveTab('REWARDS')} className={`pb-3 px-2 flex items-center gap-2 font-bold border-b-2 transition-all ${activeTab === 'REWARDS' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                <Gift size={20}/> แจกรางวัล
            </button>
        </div>

        {/* --- TAB CONTENT --- */}
        
        {/* 1. Team Generator */}
        {activeTab === 'TEAMS' && (
            <div className="space-y-6 animate-fade-in-up">
                <Card>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="font-bold text-gray-700">จำนวนทีม:</div>
                        <div className="flex gap-2">
                            {[2, 3, 4, 5, 6].map(n => (
                                <button 
                                    key={n} 
                                    onClick={() => setTeamCount(n)}
                                    className={`w-10 h-10 rounded-lg font-bold border transition-all ${teamCount === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={generateTeams}
                            className="ml-auto bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Shuffle size={18}/> สุ่มจัดทีม
                        </button>
                    </div>

                    {teams.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {teams.map((team, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">{idx + 1}</div>
                                        ทีมที่ {idx + 1}
                                    </h3>
                                    <ul className="space-y-2">
                                        {team.map(s => (
                                            <li key={s.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-100 shadow-sm text-sm">
                                                <span className="font-mono text-gray-400 text-xs">{s.studentId}</span>
                                                <span className="font-medium text-gray-700">{s.name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <Users size={48} className="mx-auto mb-3 opacity-20" />
                            <p>กดปุ่ม "สุ่มจัดทีม" เพื่อเริ่มแบ่งกลุ่มนักเรียน</p>
                        </div>
                    )}
                </Card>
            </div>
        )}

        {/* 2. Random Picker */}
        {activeTab === 'RANDOM' && (
            <div className="flex justify-center animate-fade-in-up">
                <Card className="w-full max-w-lg text-center py-12">
                    <div className="mb-8 relative h-40 flex items-center justify-center">
                        {pickedStudent ? (
                            <div className={`transition-all duration-300 ${isAnimating ? 'scale-90 opacity-70 blur-sm' : 'scale-110 opacity-100'}`}>
                                <div className="text-6xl mb-4">🎓</div>
                                <h2 className="text-3xl font-bold font-['Mitr'] text-purple-700">{pickedStudent.name}</h2>
                                <p className="text-gray-500 text-xl mt-2 font-mono">{pickedStudent.studentId}</p>
                            </div>
                        ) : (
                            <div className="text-gray-300">
                                <div className="text-6xl mb-4 opacity-50">❓</div>
                                <p className="text-xl">พร้อมแล้วกดสุ่มเลย!</p>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={pickRandom}
                        disabled={isAnimating}
                        className="bg-purple-600 text-white px-12 py-4 rounded-2xl font-bold text-xl shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 mx-auto disabled:opacity-70 disabled:cursor-wait"
                    >
                        <RotateCcw size={24} className={isAnimating ? 'animate-spin' : ''} />
                        {isAnimating ? 'กำลังสุ่ม...' : 'สุ่มผู้โชคดี'}
                    </button>
                </Card>
            </div>
        )}

        {/* 3. Rewards */}
        {activeTab === 'REWARDS' && (
            <div className="space-y-4 animate-fade-in-up">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-full shadow-sm text-yellow-500"><Coins size={24}/></div>
                        <div>
                            <h3 className="font-bold text-yellow-800">แจกเหรียญรางวัล (Coins)</h3>
                            <p className="text-yellow-600 text-sm">เลือกนักเรียนที่ต้องการ แล้วกดมอบรางวัล</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-yellow-100">
                        <span className="text-sm font-bold text-gray-500 pl-2">จำนวน:</span>
                        {[5, 10, 20, 50].map(amt => (
                            <button 
                                key={amt}
                                onClick={() => setRewardAmount(amt)}
                                className={`w-10 h-8 rounded-lg font-bold text-sm transition-all ${rewardAmount === amt ? 'bg-yellow-400 text-yellow-900 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                                {amt}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={handleGiveReward}
                        disabled={selectedStudents.length === 0}
                        className="bg-yellow-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Award size={18} /> มอบรางวัล ({selectedStudents.length})
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {classStudents.map(student => (
                        <div 
                            key={student.id}
                            onClick={() => toggleSelectStudent(student.id)}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center text-center select-none ${selectedStudents.includes(student.id) ? 'border-yellow-400 bg-yellow-50 shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-all ${selectedStudents.includes(student.id) ? 'bg-yellow-400 text-white scale-110' : 'bg-gray-100 text-gray-500'}`}>
                                {selectedStudents.includes(student.id) ? <CheckCircle2 size={24}/> : student.name[0]}
                            </div>
                            <p className="font-bold text-sm text-gray-800 line-clamp-1">{student.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{student.studentId}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};
