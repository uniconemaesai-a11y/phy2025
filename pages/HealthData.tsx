import React, { useState } from 'react';
import { useApp } from '../services/AppContext';
import { Card } from '../components/Card';
import { HeartPulse, Search, Save, Loader2, Activity } from 'lucide-react';

export const HealthData = () => {
  const { students, updateHealthRecord, getLatestHealthRecord } = useApp();
  
  // Selection State
  const [selectedGrade, setSelectedGrade] = useState<5 | 6>(5);
  const [selectedClassroom, setSelectedClassroom] = useState('5/1');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState<string | null>(null); // saving specific student id

  // Filter Logic
  const filteredStudents = students.filter(s => {
    return Number(s.gradeLevel) === Number(selectedGrade) && 
           String(s.classroom).trim() === selectedClassroom &&
           (s.name.includes(searchTerm) || s.studentId.includes(searchTerm));
  });

  // Calculate BMI and Interpretation
  const calculateBMI = (weight: number, height: number) => {
    if (!weight || !height) return 0;
    const hInM = height / 100;
    return Number((weight / (hInM * hInM)).toFixed(2));
  };

  const interpretBMI = (bmi: number): 'ผอม' | 'สมส่วน' | 'ท้วม' | 'เริ่มอ้วน' | 'อ้วน' => {
    // Criteria for Thai Children (Simplified for demo)
    if (bmi < 16) return 'ผอม';
    if (bmi >= 16 && bmi < 21) return 'สมส่วน';
    if (bmi >= 21 && bmi < 24) return 'ท้วม';
    if (bmi >= 24 && bmi < 28) return 'เริ่มอ้วน';
    return 'อ้วน';
  };

  const getInterpretationColor = (result: string) => {
    switch (result) {
      case 'ผอม': return 'bg-blue-100 text-blue-700';
      case 'สมส่วน': return 'bg-green-100 text-green-700';
      case 'ท้วม': return 'bg-yellow-100 text-yellow-700';
      case 'เริ่มอ้วน': return 'bg-orange-100 text-orange-700';
      case 'อ้วน': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  // Inline Editing
  const handleSave = async (studentId: string, weightStr: string, heightStr: string) => {
    const weight = Number(weightStr);
    const height = Number(heightStr);
    
    if (weight > 0 && height > 0) {
      setIsSaving(studentId);
      const bmi = calculateBMI(weight, height);
      const interpretation = interpretBMI(bmi);

      await updateHealthRecord({
        id: `H-${studentId}`,
        studentId,
        date: new Date().toISOString().split('T')[0],
        weight,
        height,
        bmi,
        interpretation
      });
      setIsSaving(null);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-['Mitr']">ข้อมูลสุขภาพ</h1>
          <p className="text-gray-500">บันทึกน้ำหนัก ส่วนสูง และคำนวณ BMI</p>
        </div>
        
        <Card className="flex items-center gap-4 p-2 pl-4">
           <Activity className="text-accent" />
           <div className="flex gap-2">
             <button onClick={() => {setSelectedGrade(5); setSelectedClassroom('5/1')}} className={`px-4 py-1.5 rounded-lg font-bold text-sm ${selectedGrade === 5 ? 'bg-gr5 text-white' : 'bg-gray-100 text-gray-500'}`}>ป.5</button>
             <button onClick={() => {setSelectedGrade(6); setSelectedClassroom('6/1')}} className={`px-4 py-1.5 rounded-lg font-bold text-sm ${selectedGrade === 6 ? 'bg-gr6 text-white' : 'bg-gray-100 text-gray-500'}`}>ป.6</button>
           </div>
           <div className="w-px h-6 bg-gray-200"></div>
           <select 
             value={selectedClassroom}
             onChange={e => setSelectedClassroom(e.target.value)}
             className="bg-transparent font-bold text-gray-700 outline-none cursor-pointer"
           >
             {[1,2,3,4].map(r => <option key={r} value={`${selectedGrade}/${r}`}>{selectedGrade}/{r}</option>)}
           </select>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Stats Summary */}
        <div className="md:col-span-1 space-y-4">
           <Card className="bg-white">
             <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><HeartPulse size={20}/> แปลผล (ห้อง {selectedClassroom})</h3>
             <div className="space-y-3">
               {['ผอม', 'สมส่วน', 'ท้วม', 'เริ่มอ้วน', 'อ้วน'].map(status => {
                 const count = filteredStudents.filter(s => {
                    const r = getLatestHealthRecord(s.id);
                    return r && r.interpretation === status;
                 }).length;
                 const percent = filteredStudents.length ? Math.round((count/filteredStudents.length)*100) : 0;
                 
                 return (
                   <div key={status} className="flex items-center justify-between text-sm">
                      <span className={`px-2 py-0.5 rounded ${getInterpretationColor(status)}`}>{status}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-700">{count}</span>
                        <span className="text-gray-400 text-xs">({percent}%)</span>
                      </div>
                   </div>
                 )
               })}
             </div>
           </Card>

           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               type="text" 
               className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-accent/50 outline-none"
               placeholder="ค้นหานักเรียน..."
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
           </div>
        </div>

        {/* Data Entry Table */}
        <Card className="md:col-span-3 p-0 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead className="bg-gray-50 text-gray-600 text-sm">
                 <tr>
                   <th className="p-4 font-bold">เลขที่ / ชื่อ</th>
                   <th className="p-4 font-bold text-center w-32">น้ำหนัก (กก.)</th>
                   <th className="p-4 font-bold text-center w-32">ส่วนสูง (ซม.)</th>
                   <th className="p-4 font-bold text-center">BMI</th>
                   <th className="p-4 font-bold text-center">แปลผล</th>
                   <th className="p-4 font-bold text-right">บันทึก</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {filteredStudents.map((s, idx) => (
                   <HealthRow 
                     key={s.id} 
                     student={s} 
                     idx={idx} 
                     record={getLatestHealthRecord(s.id)}
                     onSave={handleSave}
                     isSaving={isSaving === s.id}
                     colorFunc={getInterpretationColor}
                   />
                 ))}
                 {filteredStudents.length === 0 && (
                   <tr>
                     <td colSpan={6} className="p-8 text-center text-gray-400">ไม่พบรายชื่อนักเรียน</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </Card>
      </div>
    </div>
  );
};

const HealthRow = ({ student, idx, record, onSave, isSaving, colorFunc }: any) => {
  const [weight, setWeight] = useState(record?.weight?.toString() || '');
  const [height, setHeight] = useState(record?.height?.toString() || '');
  
  // Calculate display values
  const currentBMI = record?.bmi || (weight && height ? (Number(weight) / Math.pow(Number(height)/100, 2)).toFixed(2) : '-');
  const currentInterp = record?.interpretation || '-';
  const hasChanges = weight !== (record?.weight?.toString() || '') || height !== (record?.height?.toString() || '');

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="p-4">
        <div className="flex items-center gap-3">
           <span className="text-gray-400 font-mono text-sm w-6">{idx+1}</span>
           <div>
             <div className="font-bold text-gray-800">{student.name}</div>
             <div className="text-xs text-gray-400">{student.studentId}</div>
           </div>
        </div>
      </td>
      <td className="p-2 text-center">
        <input 
          type="number" 
          className="w-20 text-center bg-gray-50 border border-gray-200 rounded-lg py-1 focus:ring-2 focus:ring-accent outline-none"
          placeholder="0"
          value={weight}
          onChange={e => setWeight(e.target.value)}
        />
      </td>
      <td className="p-2 text-center">
        <input 
          type="number" 
          className="w-20 text-center bg-gray-50 border border-gray-200 rounded-lg py-1 focus:ring-2 focus:ring-accent outline-none"
          placeholder="0"
          value={height}
          onChange={e => setHeight(e.target.value)}
        />
      </td>
      <td className="p-4 text-center font-mono font-bold text-gray-600">
        {currentBMI}
      </td>
      <td className="p-4 text-center">
         {currentInterp !== '-' && (
           <span className={`px-3 py-1 rounded-full text-xs font-bold ${colorFunc(currentInterp)}`}>
             {currentInterp}
           </span>
         )}
      </td>
      <td className="p-4 text-right">
        <button 
          onClick={() => onSave(student.id, weight, height)}
          disabled={!hasChanges || isSaving}
          className={`p-2 rounded-lg transition-all ${
            hasChanges 
             ? 'bg-accent text-white shadow-md hover:bg-orange-400' 
             : 'text-gray-300'
          }`}
        >
          {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
        </button>
      </td>
    </tr>
  );
};