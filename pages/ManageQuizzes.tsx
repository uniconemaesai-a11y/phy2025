
import React, { useState } from 'react';
import { useApp } from '../services/AppContext';
import { Card } from '../components/Card';
import { Quiz, Question, QuestionType } from '../types';
import { Plus, Trash2, Edit, Save, BrainCircuit, X, Check, Eye, FileText, ClipboardList, HelpCircle } from 'lucide-react';

export const ManageQuizzes = () => {
  const { quizzes, addQuiz, deleteQuiz } = useApp();
  const [filterGrade, setFilterGrade] = useState<5 | 6>(5);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingQuiz, setViewingQuiz] = useState<Quiz | null>(null);

  // New Quiz Form State
  const [quizForm, setQuizForm] = useState<Partial<Quiz>>({
    gradeLevel: 5,
    unit: '',
    title: '',
    timeLimit: 10,
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    text: '',
    type: 'multiple_choice',
    choices: ['', '', '', ''],
    correctAnswer: 0,
    points: 1
  });

  // Bulk Import State
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const filteredQuizzes = quizzes.filter(q => q.gradeLevel === filterGrade);

  const handleAddQuestion = () => {
    if (!currentQuestion.text) return;
    
    const newQ: Question = {
      id: `q${Date.now()}`,
      text: currentQuestion.text!,
      type: currentQuestion.type as QuestionType,
      choices: currentQuestion.type === 'multiple_choice' ? [...(currentQuestion.choices || [])] : undefined,
      correctAnswer: currentQuestion.correctAnswer!,
      points: Number(currentQuestion.points)
    };

    setQuizForm(prev => ({
      ...prev,
      questions: [...(prev.questions || []), newQ]
    }));

    // Reset question form
    setCurrentQuestion({
      text: '',
      type: 'multiple_choice',
      choices: ['', '', '', ''],
      correctAnswer: 0,
      points: 1
    });
  };

  const handleBulkAdd = () => {
    const questions: Question[] = [];
    // Split by double newlines or at least 2 newlines to separate questions
    const blocks = bulkText.split(/\n\s*\n/);
    
    blocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 2) return; // Need at least question and answer logic

        let text = lines[0];
        // Clean leading numbering (e.g. "1. ", "1)")
        text = text.replace(/^\d+[\.|)]\s*/, '');

        let type: QuestionType = 'multiple_choice';
        let choices: string[] = ['', '', '', ''];
        let correctAnswer: string | number = 0;
        let points = 1;

        // Try to find Answer line
        const ansLineIndex = lines.findIndex(l => l.match(/^(Ans|Answer|เฉลย|Correct|ตอบ):/i));
        if (ansLineIndex > -1) {
             const ansStr = lines[ansLineIndex].split(':')[1].trim().toUpperCase();
             if (['T', 'TRUE', 'ถูก', 'T (ถูก)'].some(v => ansStr.includes(v))) {
                 type = 'true_false';
                 correctAnswer = 'true';
             } else if (['F', 'FALSE', 'ผิด', 'F (ผิด)'].some(v => ansStr.includes(v))) {
                 type = 'true_false';
                 correctAnswer = 'false';
             } else {
                 // Assume A, B, C, D
                 const map: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, '1': 0, '2': 1, '3': 2, '4': 3, 'ก': 0, 'ข': 1, 'ค': 2, 'ง': 3 };
                 // Extract just the first valid character
                 const match = ansStr.match(/[A-D1-4ก-ง]/);
                 if (match) {
                    correctAnswer = map[match[0]] ?? 0;
                 }
             }
        }

        // Try to find choices
        if (type === 'multiple_choice') {
            const choiceLines = lines.filter(l => l.match(/^[A-D1-4ก-ง][\.|)]/i));
            if (choiceLines.length > 0) {
                // Map based on letter
                const tempChoices = ['','','',''];
                choiceLines.forEach(l => {
                    if (l.match(/^(A|1|ก)[\.|)]/i)) tempChoices[0] = l.replace(/^(A|1|ก)[\.|)]\s*/i, '');
                    if (l.match(/^(B|2|ข)[\.|)]/i)) tempChoices[1] = l.replace(/^(B|2|ข)[\.|)]\s*/i, '');
                    if (l.match(/^(C|3|ค)[\.|)]/i)) tempChoices[2] = l.replace(/^(C|3|ค)[\.|)]\s*/i, '');
                    if (l.match(/^(D|4|ง)[\.|)]/i)) tempChoices[3] = l.replace(/^(D|4|ง)[\.|)]\s*/i, '');
                });
                choices = tempChoices;
            } else {
                // If no prefixes found but lines exist between Q and Ans
                // This is a loose fallback: take lines 1 to 4
                if (lines.length >= 5 && ansLineIndex >= 5) {
                     choices = lines.slice(1, 5);
                }
            }
        }
        
        // Points
        const pointLine = lines.find(l => l.match(/^(Point|Score|คะแนน):/i));
        if (pointLine) {
            const ptMatch = pointLine.match(/\d+/);
            if (ptMatch) points = Number(ptMatch[0]);
        }

        if (text) {
             questions.push({
                 id: `q${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
                 text,
                 type,
                 choices: type === 'multiple_choice' ? choices : undefined,
                 correctAnswer,
                 points
             });
        }
    });

    if (questions.length > 0) {
        setQuizForm(prev => ({
            ...prev,
            questions: [...(prev.questions || []), ...questions]
        }));
        setBulkText('');
        setIsBulkMode(false);
        alert(`เพิ่มข้อสอบสำเร็จ ${questions.length} ข้อ`);
    } else {
        alert('ไม่พบรูปแบบข้อสอบที่ถูกต้อง กรุณาตรวจสอบรูปแบบข้อความ');
    }
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuizForm(prev => ({
        ...prev,
        questions: prev.questions?.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!quizForm.title || !quizForm.unit || !quizForm.questions?.length) {
        alert("กรุณากรอกข้อมูลให้ครบและเพิ่มคำถามอย่างน้อย 1 ข้อ");
        return;
    }

    const totalScore = quizForm.questions.reduce((acc, q) => acc + q.points, 0);

    const newQuiz: Quiz = {
        id: `Q${Date.now()}`,
        title: quizForm.title!,
        unit: quizForm.unit!,
        gradeLevel: quizForm.gradeLevel as 5 | 6,
        questions: quizForm.questions!,
        timeLimit: Number(quizForm.timeLimit),
        totalScore,
        status: 'published',
        createdDate: new Date().toISOString().split('T')[0]
    };

    await addQuiz(newQuiz);
    setIsModalOpen(false);
    setQuizForm({ gradeLevel: filterGrade, unit: '', title: '', timeLimit: 10, questions: [] });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
            <h1 className="text-2xl font-bold font-['Mitr']">คลังข้อสอบออนไลน์</h1>
            <p className="text-gray-500">สร้างแบบทดสอบและจัดการคลังข้อสอบ</p>
         </div>
         <button 
           onClick={() => { setQuizForm(prev => ({...prev, gradeLevel: filterGrade})); setIsModalOpen(true); }}
           className="bg-accent text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-orange-400 transition-all flex items-center gap-2"
         >
           <Plus size={20} /> สร้างแบบทดสอบ
         </button>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button onClick={() => setFilterGrade(5)} className={`pb-3 px-4 font-bold border-b-2 transition-colors ${filterGrade === 5 ? 'border-gr5 text-gr5' : 'border-transparent text-gray-400'}`}>ป.5</button>
        <button onClick={() => setFilterGrade(6)} className={`pb-3 px-4 font-bold border-b-2 transition-colors ${filterGrade === 6 ? 'border-gr6 text-gr6' : 'border-transparent text-gray-400'}`}>ป.6</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredQuizzes.map(quiz => (
            <Card key={quiz.id} className="relative group hover:shadow-lg transition-all border-l-4 border-l-gray-300">
               <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => deleteQuiz(quiz.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><Trash2 size={16}/></button>
               </div>
               
               <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${filterGrade === 5 ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'}`}>
                     <BrainCircuit size={24} />
                  </div>
                  <div>
                     <h3 className="font-bold text-gray-800 line-clamp-1">{quiz.title}</h3>
                     <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{quiz.unit}</span>
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-4 bg-gray-50 p-3 rounded-xl">
                  <div>
                     <span className="block text-xs text-gray-400">จำนวนข้อ</span>
                     <span className="font-bold">{quiz.questions.length} ข้อ</span>
                  </div>
                  <div>
                     <span className="block text-xs text-gray-400">เวลา</span>
                     <span className="font-bold">{quiz.timeLimit} นาที</span>
                  </div>
                  <div>
                     <span className="block text-xs text-gray-400">คะแนนเต็ม</span>
                     <span className="font-bold">{quiz.totalScore} คะแนน</span>
                  </div>
               </div>
            </Card>
         ))}
         {filteredQuizzes.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
               <div className="bg-white p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-sm">
                 <BrainCircuit size={40} className="text-gray-300" />
               </div>
               <h3 className="text-lg font-bold text-gray-600">ยังไม่มีแบบทดสอบ</h3>
               <p className="text-sm text-gray-400 mt-1 mb-4">เริ่มสร้างแบบทดสอบจริงชุดแรกของคุณได้เลย</p>
               <button 
                 onClick={() => { setQuizForm(prev => ({...prev, gradeLevel: filterGrade})); setIsModalOpen(true); }}
                 className="text-accent font-bold hover:underline"
               >
                 + สร้างแบบทดสอบใหม่
               </button>
            </div>
         )}
      </div>

      {/* Create Quiz Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                 <h3 className="text-xl font-bold font-['Mitr']">สร้างแบบทดสอบใหม่</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 {/* Quiz Info */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อแบบทดสอบ</label>
                       <input 
                          type="text" 
                          className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-accent"
                          placeholder="เช่น ทดสอบหลังเรียนเรื่อง..."
                          value={quizForm.title}
                          onChange={e => setQuizForm({...quizForm, title: e.target.value})}
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">หน่วยการเรียนรู้</label>
                       <input 
                          type="text" 
                          className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-accent"
                          placeholder="เช่น ระบบร่างกาย"
                          value={quizForm.unit}
                          onChange={e => setQuizForm({...quizForm, unit: e.target.value})}
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ระดับชั้น</label>
                          <select 
                             className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none"
                             value={quizForm.gradeLevel}
                             onChange={e => setQuizForm({...quizForm, gradeLevel: Number(e.target.value) as 5 | 6})}
                          >
                             <option value={5}>ป.5</option>
                             <option value={6}>ป.6</option>
                          </select>
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">เวลา (นาที)</label>
                          <input 
                             type="number" 
                             className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none"
                             value={quizForm.timeLimit}
                             onChange={e => setQuizForm({...quizForm, timeLimit: Number(e.target.value)})}
                          />
                       </div>
                    </div>
                 </div>

                 <hr className="border-gray-100" />

                 {/* Questions List */}
                 <div>
                    <h4 className="font-bold text-gray-700 mb-3">รายการคำถาม ({quizForm.questions?.length})</h4>
                    <div className="space-y-3 mb-6">
                       {quizForm.questions?.map((q, idx) => (
                          <div key={idx} className="bg-gray-50 p-4 rounded-xl flex justify-between items-start border border-gray-100">
                             <div>
                                <span className="font-bold text-accent mr-2">{idx + 1}.</span>
                                <span className="font-medium">{q.text}</span>
                                <div className="text-xs text-gray-400 mt-1 ml-5">
                                   {q.type === 'multiple_choice' ? 'ปรนัย 4 ตัวเลือก' : 'ถูก-ผิด'} • {q.points} คะแนน
                                </div>
                             </div>
                             <button onClick={() => handleRemoveQuestion(idx)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                          </div>
                       ))}
                       {quizForm.questions?.length === 0 && <p className="text-gray-400 text-sm text-center">ยังไม่มีคำถาม</p>}
                    </div>

                    {/* Add Question Box */}
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                       <div className="flex gap-2 mb-4 border-b border-blue-200 pb-2">
                          <button 
                            onClick={() => setIsBulkMode(false)}
                            className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${!isBulkMode ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-600 hover:bg-blue-100'}`}
                          >
                            เพิ่มทีละข้อ
                          </button>
                          <button 
                            onClick={() => setIsBulkMode(true)}
                            className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${isBulkMode ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-600 hover:bg-blue-100'}`}
                          >
                            <ClipboardList size={14} className="inline mr-1"/> เพิ่มหลายข้อ (Bulk Import)
                          </button>
                       </div>

                       {!isBulkMode ? (
                           <div className="space-y-3 animate-fade-in">
                              <input 
                                 type="text" 
                                 className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none" 
                                 placeholder="โจทย์คำถาม..."
                                 value={currentQuestion.text}
                                 onChange={e => setCurrentQuestion({...currentQuestion, text: e.target.value})}
                              />
                              <div className="flex gap-4">
                                 <select 
                                    className="border border-gray-300 rounded-xl px-4 py-2 outline-none text-sm"
                                    value={currentQuestion.type}
                                    onChange={e => setCurrentQuestion({...currentQuestion, type: e.target.value as any})}
                                 >
                                    <option value="multiple_choice">ปรนัย (4 ตัวเลือก)</option>
                                    <option value="true_false">ถูก / ผิด</option>
                                 </select>
                                 <input 
                                    type="number" 
                                    className="w-24 border border-gray-300 rounded-xl px-4 py-2 outline-none text-sm" 
                                    placeholder="คะแนน"
                                    value={currentQuestion.points}
                                    onChange={e => setCurrentQuestion({...currentQuestion, points: Number(e.target.value)})}
                                 />
                              </div>

                              {currentQuestion.type === 'multiple_choice' && (
                                 <div className="grid grid-cols-2 gap-2">
                                    {[0, 1, 2, 3].map(i => (
                                       <div key={i} className="flex items-center gap-2">
                                          <input 
                                             type="radio" 
                                             name="correct" 
                                             checked={currentQuestion.correctAnswer === i}
                                             onChange={() => setCurrentQuestion({...currentQuestion, correctAnswer: i})}
                                          />
                                          <input 
                                             type="text" 
                                             className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none"
                                             placeholder={`ตัวเลือก ${i+1}`}
                                             value={currentQuestion.choices?.[i] || ''}
                                             onChange={e => {
                                                const newChoices = [...(currentQuestion.choices || [])];
                                                newChoices[i] = e.target.value;
                                                setCurrentQuestion({...currentQuestion, choices: newChoices});
                                             }}
                                          />
                                       </div>
                                    ))}
                                 </div>
                              )}

                              {currentQuestion.type === 'true_false' && (
                                 <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border">
                                       <input 
                                          type="radio" 
                                          name="tf" 
                                          value="true"
                                          checked={String(currentQuestion.correctAnswer) === 'true'}
                                          onChange={() => setCurrentQuestion({...currentQuestion, correctAnswer: 'true'})}
                                       /> ถูก
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border">
                                       <input 
                                          type="radio" 
                                          name="tf" 
                                          value="false"
                                          checked={String(currentQuestion.correctAnswer) === 'false'}
                                          onChange={() => setCurrentQuestion({...currentQuestion, correctAnswer: 'false'})}
                                       /> ผิด
                                    </label>
                                 </div>
                              )}

                              <button 
                                 onClick={handleAddQuestion}
                                 disabled={!currentQuestion.text}
                                 className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                              >
                                 + เพิ่มข้อสอบ
                              </button>
                           </div>
                       ) : (
                           <div className="animate-fade-in space-y-3">
                              <div className="text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                                 <div className="font-bold flex items-center gap-1 mb-1"><HelpCircle size={12}/> รูปแบบที่รองรับ:</div>
                                 <pre className="text-[10px] whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded">
{`1. โจทย์คำถาม...
A. ตัวเลือก 1
B. ตัวเลือก 2
C. ตัวเลือก 3
D. ตัวเลือก 4
Answer: A

2. ข้อต่อไป (True/False)
Answer: True
`}
                                 </pre>
                                 <p className="mt-1 text-[10px] text-gray-400">* คั่นข้อด้วยการเว้นบรรทัด</p>
                              </div>
                              <textarea 
                                 className="w-full h-40 border border-gray-300 rounded-xl p-3 text-sm font-mono outline-none focus:ring-2 focus:ring-accent"
                                 placeholder="วางข้อสอบที่นี่..."
                                 value={bulkText}
                                 onChange={e => setBulkText(e.target.value)}
                              />
                              <button 
                                 onClick={handleBulkAdd}
                                 disabled={!bulkText.trim()}
                                 className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                 <FileText size={16} /> ประมวลผลและเพิ่มข้อสอบ
                              </button>
                           </div>
                       )}
                    </div>
                 </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl flex justify-end gap-3">
                 <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-xl text-gray-500 hover:bg-gray-100">ยกเลิก</button>
                 <button onClick={handleSubmitQuiz} className="px-6 py-2 rounded-xl bg-accent text-white font-bold shadow-md hover:bg-orange-400">บันทึกแบบทดสอบ</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
