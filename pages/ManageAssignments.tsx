import React, { useState } from 'react';
import { useApp } from '../services/AppContext';
import { Card } from '../components/Card';
import { Assignment } from '../types';
import { Plus, Trash2, Calendar, FileText, X } from 'lucide-react';

export const ManageAssignments = () => {
  const { assignments, addAssignment, deleteAssignment } = useApp();
  const [filterGrade, setFilterGrade] = useState<5 | 6>(5);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [newAssignment, setNewAssignment] = useState<Partial<Assignment>>({
    gradeLevel: 5,
    type: 'Assignment',
    classrooms: [],
    status: 'Active'
  });

  const filteredAssignments = assignments.filter(a => a.gradeLevel === filterGrade);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignment.title || !newAssignment.dueDate || !newAssignment.maxScore) return;

    const assignment: Assignment = {
      id: `A${Date.now()}`,
      title: newAssignment.title!,
      type: newAssignment.type as any,
      gradeLevel: newAssignment.gradeLevel as 5 | 6,
      maxScore: Number(newAssignment.maxScore),
      dueDate: newAssignment.dueDate!,
      classrooms: newAssignment.classrooms || [],
      status: 'Active'
    };

    addAssignment(assignment);
    setIsModalOpen(false);
    setNewAssignment({ gradeLevel: filterGrade, type: 'Assignment', classrooms: [], status: 'Active' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold font-['Mitr']">จัดการชิ้นงาน</h1>
           <p className="text-gray-500">สร้างและแก้ไขงานสำหรับนักเรียน</p>
        </div>
        <button 
          onClick={() => {
            setNewAssignment(prev => ({ ...prev, gradeLevel: filterGrade }));
            setIsModalOpen(true);
          }}
          className="bg-accent text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-100 hover:shadow-xl hover:bg-orange-400 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> เพิ่มชิ้นงาน
        </button>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button 
          onClick={() => setFilterGrade(5)} 
          className={`pb-3 px-4 font-bold border-b-2 transition-colors ${filterGrade === 5 ? 'border-gr5 text-gr5' : 'border-transparent text-gray-400'}`}
        >
          ประถมศึกษาปีที่ 5
        </button>
        <button 
          onClick={() => setFilterGrade(6)} 
          className={`pb-3 px-4 font-bold border-b-2 transition-colors ${filterGrade === 6 ? 'border-gr6 text-gr6' : 'border-transparent text-gray-400'}`}
        >
          ประถมศึกษาปีที่ 6
        </button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 font-bold text-gray-600 text-sm">ชื่องาน</th>
                <th className="p-4 font-bold text-gray-600 text-sm">ประเภท</th>
                <th className="p-4 font-bold text-gray-600 text-sm">วันครบกำหนด</th>
                <th className="p-4 font-bold text-gray-600 text-sm">คะแนนเต็ม</th>
                <th className="p-4 font-bold text-gray-600 text-sm">สถานะ</th>
                <th className="p-4 font-bold text-gray-600 text-sm text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssignments.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="p-4">
                    <div className="font-medium text-gray-800">{a.title}</div>
                    <div className="text-xs text-gray-400 flex gap-1 mt-1">
                       {a.classrooms.map(c => <span key={c} className="bg-gray-100 px-1.5 rounded">{c}</span>)}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{a.type}</td>
                  <td className="p-4 text-sm text-gray-600">{new Date(a.dueDate).toLocaleDateString('th-TH')}</td>
                  <td className="p-4 text-sm text-gray-600">{a.maxScore}</td>
                  <td className="p-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${a.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => deleteAssignment(a.id)}
                      className="text-gray-300 hover:text-error transition-colors p-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAssignments.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">ยังไม่มีชิ้นงานในระดับชั้นนี้</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 animate-fade-in-up overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-20">
              <h3 className="text-xl font-bold font-['Mitr']">สร้างชิ้นงานใหม่</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Level Selector */}
              <div className="flex gap-4 mb-4">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="radio" 
                     name="grade" 
                     checked={newAssignment.gradeLevel === 5}
                     onChange={() => setNewAssignment({...newAssignment, gradeLevel: 5, classrooms: []})}
                     className="text-gr5 focus:ring-gr5"
                   />
                   <span className={newAssignment.gradeLevel === 5 ? 'font-bold text-gr5' : ''}>ป.5</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="radio" 
                     name="grade" 
                     checked={newAssignment.gradeLevel === 6}
                     onChange={() => setNewAssignment({...newAssignment, gradeLevel: 6, classrooms: []})}
                     className="text-gr6 focus:ring-gr6"
                   />
                   <span className={newAssignment.gradeLevel === 6 ? 'font-bold text-gr6' : ''}>ป.6</span>
                 </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่องาน</label>
                <input 
                  required
                  type="text" 
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                  value={newAssignment.title || ''}
                  onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
                  placeholder="เช่น งานเขียนเรื่องสุขภาพ"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                    <select 
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none"
                      value={newAssignment.type}
                      onChange={e => setNewAssignment({...newAssignment, type: e.target.value as any})}
                    >
                      <option value="Assignment">Assignment</option>
                      <option value="Quiz">Quiz</option>
                      <option value="Project">Project</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">คะแนนเต็ม</label>
                    <input 
                      required
                      type="number" 
                      className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none"
                      value={newAssignment.maxScore || ''}
                      onChange={e => setNewAssignment({...newAssignment, maxScore: Number(e.target.value)})}
                    />
                 </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">เลือกห้องเรียน</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(newAssignment.gradeLevel === 5 
                    ? ['5/1', '5/2', '5/3', '5/4'] 
                    : ['6/1', '6/2', '6/3', '6/4']
                  ).map((room) => (
                    <label key={room} className={`
                      cursor-pointer border rounded-xl px-3 py-2 flex items-center justify-center gap-2 transition-all select-none
                      ${newAssignment.classrooms?.includes(room) 
                        ? 'bg-accent/10 border-accent text-accent font-bold shadow-sm' 
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}
                    `}>
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={newAssignment.classrooms?.includes(room)}
                        onChange={(e) => {
                          const current = newAssignment.classrooms || [];
                          if (e.target.checked) {
                            setNewAssignment({...newAssignment, classrooms: [...current, room].sort()});
                          } else {
                            setNewAssignment({...newAssignment, classrooms: current.filter(c => c !== room)});
                          }
                        }}
                      />
                      {room}
                    </label>
                  ))}
                </div>
                {(!newAssignment.classrooms || newAssignment.classrooms.length === 0) && (
                   <p className="text-xs text-orange-400 mt-1">* กรุณาเลือกอย่างน้อย 1 ห้อง</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันครบกำหนด</label>
                <input 
                  required
                  type="date" 
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none"
                  value={newAssignment.dueDate || ''}
                  onChange={e => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white py-4 border-t border-gray-100 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  disabled={!newAssignment.classrooms || newAssignment.classrooms.length === 0}
                  className="px-6 py-2 rounded-xl bg-accent text-white font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  สร้างงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};