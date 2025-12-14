
import React, { useState, useEffect } from 'react';
import { useApp } from '../services/AppContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, Trophy, ArrowRight, Loader2, AlertCircle, RotateCcw, History, Star, Play, Check, HelpCircle } from 'lucide-react';
import { QuizResult } from '../types';

export const TakeQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { quizzes, currentUser, submitQuiz, quizResults } = useApp();
  
  const quiz = quizzes.find(q => q.id === quizId);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  
  // Initialize timeLeft as null to distinguish between "not started" and "0 seconds left"
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'result'>('intro');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{score: number, total: number} | null>(null);
  
  // Custom Confirm Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Get History
  const history = quizResults
    .filter(r => r.quizId === quizId && r.studentId === currentUser?.id)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  
  const bestScore = history.length > 0 ? Math.max(...history.map(h => h.score)) : 0;

  // Initialize Timer when switching to 'playing'
  useEffect(() => {
    if (gameState === 'playing' && quiz && timeLeft === null) {
        setTimeLeft(quiz.timeLimit * 60);
    }
  }, [gameState, quiz, timeLeft]);

  // Countdown Logic
  useEffect(() => {
    if (gameState !== 'playing' || timeLeft === null) return;

    if (timeLeft > 0 && !isSubmitting) {
        const timer = setInterval(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000);
        return () => clearInterval(timer);
    } else if (timeLeft === 0 && !isSubmitting && quiz) {
        // Auto submit when time runs out
        onConfirmSubmit();
    }
  }, [timeLeft, isSubmitting, gameState]);

  if (!quiz || !currentUser) return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-accent" size={48} />
              <p className="text-gray-500 font-['Sarabun']">กำลังโหลดข้อสอบ...</p>
          </div>
      </div>
  );

  const currentQuestion = quiz.questions[currentQIndex];
  const progress = ((Object.keys(answers).length) / quiz.questions.length) * 100;
  
  const gradeColor = quiz.gradeLevel === 5 ? 'bg-gr5' : 'bg-gr6';
  const gradeText = quiz.gradeLevel === 5 ? 'text-gr5' : 'text-gr6';
  const gradeBorder = quiz.gradeLevel === 5 ? 'border-gr5' : 'border-gr6';

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleStartQuiz = () => {
     setGameState('playing');
     setTimeLeft(quiz.timeLimit * 60);
     setAnswers({});
     setCurrentQIndex(0);
  };

  const handleSelectAnswer = (ans: any) => {
     if (isSubmitting || gameState !== 'playing') return;
     setAnswers(prev => ({
         ...prev,
         [currentQuestion.id]: ans
     }));
  };

  const handleSubmit = async () => {
     if (isSubmitting) return;
     setShowConfirmModal(true);
  };

  const onConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    
    // Calculate Score
    let score = 0;
    quiz.questions.forEach(q => {
        const userAns = answers[q.id];
        // Loose equality check for string/number match (e.g. "0" == 0)
        if (String(userAns) === String(q.correctAnswer)) {
            score += q.points;
        }
    });

    const result: QuizResult = {
        id: `R-${Date.now()}`,
        studentId: currentUser.id,
        quizId: quiz.id,
        score,
        totalScore: quiz.totalScore,
        submittedAt: new Date().toISOString(),
        answers
    };
    
    await submitQuiz(result);
    setSubmittedResult({ score, total: quiz.totalScore });
    setIsSubmitting(false);
    setGameState('result');
    setTimeLeft(null);
  };

  // --- VIEW: INTRO & HISTORY ---
  if (gameState === 'intro') {
     return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-['Sarabun'] animate-fade-in">
            <div className="bg-white max-w-lg w-full rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                {/* Header Image/Color */}
                <div className={`h-40 ${gradeColor} relative flex flex-col justify-end p-8 overflow-hidden`}>
                   {/* Decorative Circles */}
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                   <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-8 -mb-8"></div>
                   
                   <button onClick={() => navigate('/student')} className="absolute top-4 left-4 bg-white/20 p-2 rounded-full text-white hover:bg-white/30 transition-all backdrop-blur-sm z-10"><ChevronLeft size={20}/></button>
                   
                   <span className="text-white/90 text-xs font-bold uppercase tracking-wider mb-2 bg-black/10 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">{quiz.unit}</span>
                   <h1 className="text-white text-3xl font-bold font-['Mitr'] shadow-black/5 drop-shadow-sm leading-tight relative z-10">{quiz.title}</h1>
                </div>

                <div className="p-8">
                    {/* Stats Summary */}
                    <div className="flex gap-4 mb-8">
                        <div className="flex-1 bg-gray-50 p-4 rounded-2xl text-center border border-gray-100 flex flex-col items-center justify-center gap-1 group hover:border-gray-200 transition-all">
                             <div className="bg-white p-2 rounded-full shadow-sm text-gray-500 mb-1"><Clock size={18}/></div>
                             <p className="text-xs text-gray-400 font-medium">เวลาทำข้อสอบ</p>
                             <p className="font-bold text-gray-800 text-lg">{quiz.timeLimit} <span className="text-xs font-normal text-gray-400">นาที</span></p>
                        </div>
                        <div className="flex-1 bg-yellow-50 p-4 rounded-2xl text-center border border-yellow-100 flex flex-col items-center justify-center gap-1 group hover:border-yellow-200 transition-all">
                             <div className="bg-white p-2 rounded-full shadow-sm text-yellow-500 mb-1"><Trophy size={18}/></div>
                             <p className="text-xs text-yellow-600/70 font-medium">คะแนนสูงสุด</p>
                             <p className="font-bold text-yellow-700 text-lg">{bestScore} <span className="text-xs font-normal text-yellow-600/70">/ {quiz.totalScore}</span></p>
                        </div>
                    </div>

                    {/* Start Button */}
                    <button 
                       onClick={handleStartQuiz}
                       className={`w-full py-4 rounded-2xl ${gradeColor} text-white font-bold shadow-lg shadow-blue-200/50 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3 mb-8 text-lg group`}
                    >
                       <div className="bg-white/20 p-1 rounded-full group-hover:scale-110 transition-transform">
                          <Play size={20} fill="currentColor" /> 
                       </div>
                       {history.length > 0 ? 'เริ่มทำข้อสอบใหม่' : 'เริ่มทำข้อสอบ'}
                    </button>

                    {/* History List */}
                    {history.length > 0 && (
                        <div className="animate-slide-in">
                            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide opacity-70"><History size={16}/> ประวัติการสอบ</h3>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {history.map((h, idx) => (
                                    <div key={h.id} className="flex justify-between items-center p-4 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 hover:shadow-sm transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-white group-hover:shadow-inner flex items-center justify-center text-xs font-bold text-gray-400 transition-all">#{history.length - idx}</div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-700">{new Date(h.submittedAt).toLocaleDateString('th-TH')}</p>
                                                <p className="text-xs text-gray-400">{new Date(h.submittedAt).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</p>
                                            </div>
                                        </div>
                                        <div className={`font-bold text-lg ${h.score === bestScore ? 'text-green-600' : 'text-gray-600'}`}>
                                            {h.score} <span className="text-xs text-gray-400 font-medium">/ {h.totalScore}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
     );
  }

  // --- VIEW: RESULT ---
  if (gameState === 'result' && submittedResult) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-['Sarabun'] animate-fade-in">
             <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-md w-full text-center relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 ${gradeColor}`}></div>
                <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-500 shadow-sm border border-yellow-100 animate-bounce-slow">
                    <Trophy size={48} />
                </div>
                <h2 className="text-3xl font-bold font-['Mitr'] text-gray-800 mb-2">ส่งคำตอบเรียบร้อย!</h2>
                <p className="text-gray-500 mb-8">ระบบได้บันทึกคะแนนของคุณแล้ว</p>
                
                <div className="bg-gray-50 rounded-3xl p-8 mb-8 border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 opacity-5">
                       <Trophy size={100} />
                    </div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-2">คะแนนรอบนี้</p>
                    <div className="flex items-baseline justify-center gap-2 relative z-10">
                        <span className={`text-6xl font-bold font-['Mitr'] ${gradeText}`}>{submittedResult.score}</span>
                        <span className="text-xl text-gray-400 font-bold">/ {submittedResult.total}</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                    onClick={() => navigate('/student')}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 hover:text-gray-800 transition-all"
                    >
                        กลับหน้าหลัก
                    </button>
                    <button 
                    onClick={() => setGameState('intro')}
                    className={`flex-1 py-3 rounded-xl text-white font-bold shadow-lg ${gradeColor} hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2`}
                    >
                        <RotateCcw size={20} /> ทำอีกครั้ง
                    </button>
                </div>
             </div>
          </div>
      )
  }

  // --- VIEW: PLAYING ---
  const isLowTime = timeLeft !== null && timeLeft < 60;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-['Sarabun']">
       {/* Top Bar */}
       <div className="bg-white shadow-sm border-b border-gray-100 px-4 py-3 sticky top-0 z-30 backdrop-blur-md bg-white/90">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
             <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${gradeColor} text-white flex items-center justify-center shadow-sm`}>
                   <HelpCircle size={20}/>
                </div>
                <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${gradeText} opacity-80`}>{quiz.unit}</p>
                    <h1 className="font-bold text-gray-800 text-sm md:text-base line-clamp-1 max-w-[150px] md:max-w-xs">{quiz.title}</h1>
                </div>
             </div>
             <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-lg border transition-all ${isLowTime ? 'bg-red-50 text-red-600 border-red-100 animate-pulse shadow-red-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                <Clock size={18} className={isLowTime ? 'text-red-500' : 'text-gray-400'} />
                {formatTime(timeLeft)}
             </div>
          </div>
       </div>

       {/* Progress Bar */}
       <div className="h-1.5 w-full bg-gray-200 fixed top-[65px] z-20 md:top-[73px]">
          <div className={`h-full transition-all duration-500 ease-out ${gradeColor}`} style={{ width: `${progress}%` }}></div>
       </div>

       {/* Main Content */}
       <div className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-6 flex flex-col justify-center mt-4 mb-20">
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 md:p-10 border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden animate-slide-up">
             
             {/* Question Header */}
             <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                 <div className="flex items-center gap-3">
                     <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-bold text-sm">
                        ข้อที่ {currentQIndex + 1}
                     </span>
                     <span className="text-gray-300">/</span>
                     <span className="text-gray-400 font-bold text-sm">{quiz.questions.length}</span>
                 </div>
                 <span className="text-xs text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full font-bold border border-orange-100 flex items-center gap-1">
                    <Star size={12} fill="currentColor"/> {currentQuestion.points} คะแนน
                 </span>
             </div>

             <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-8 leading-relaxed">
                   {currentQuestion.text}
                </h2>

                <div className="space-y-4">
                   {currentQuestion.type === 'multiple_choice' && currentQuestion.choices?.map((choice, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectAnswer(idx)}
                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 font-medium flex items-center gap-4 group relative overflow-hidden ${
                            answers[currentQuestion.id] === idx 
                            ? `border-blue-500 bg-blue-50/50 text-blue-800 shadow-md transform scale-[1.01]` 
                            : 'border-gray-100 hover:border-blue-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                         <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                             answers[currentQuestion.id] === idx 
                             ? 'border-blue-500 bg-blue-500 text-white scale-110' 
                             : 'border-gray-300 group-hover:border-blue-300 text-transparent'
                         }`}>
                            <Check size={16} strokeWidth={4} />
                         </div>
                         
                         <span className="text-lg relative z-10">{choice}</span>

                         {answers[currentQuestion.id] === idx && (
                             <div className="absolute inset-0 bg-blue-500/5 z-0"></div>
                         )}
                      </button>
                   ))}

                   {currentQuestion.type === 'true_false' && (
                       <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => handleSelectAnswer('true')}
                            className={`p-8 rounded-3xl border-2 text-xl font-bold transition-all flex flex-col items-center gap-3 relative overflow-hidden ${
                                answers[currentQuestion.id] === 'true' 
                                ? 'border-green-500 bg-green-50 text-green-700 shadow-lg scale-[1.02]' 
                                : 'border-gray-100 hover:border-green-200 text-gray-500 hover:bg-gray-50 hover:text-green-600'
                            }`}
                          >
                             <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${answers[currentQuestion.id] === 'true' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                <CheckCircle2 size={32} />
                             </div>
                             <span>ถูก (True)</span>
                             {answers[currentQuestion.id] === 'true' && <div className="absolute top-3 right-3 text-green-500"><CheckCircle2 size={24} fill="currentColor" className="text-white"/></div>}
                          </button>
                          
                          <button
                            onClick={() => handleSelectAnswer('false')}
                            className={`p-8 rounded-3xl border-2 text-xl font-bold transition-all flex flex-col items-center gap-3 relative overflow-hidden ${
                                answers[currentQuestion.id] === 'false' 
                                ? 'border-red-500 bg-red-50 text-red-700 shadow-lg scale-[1.02]' 
                                : 'border-gray-100 hover:border-red-200 text-gray-500 hover:bg-gray-50 hover:text-red-600'
                            }`}
                          >
                             <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${answers[currentQuestion.id] === 'false' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                                <CheckCircle2 size={32} className="rotate-45" />
                             </div>
                             <span>ผิด (False)</span>
                             {answers[currentQuestion.id] === 'false' && <div className="absolute top-3 right-3 text-red-500"><CheckCircle2 size={24} fill="currentColor" className="text-white"/></div>}
                          </button>
                       </div>
                   )}
                </div>
             </div>
             
             {/* Navigation */}
             <div className="flex justify-between items-center mt-12 pt-6 border-t border-gray-100">
                <button 
                   onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                   disabled={currentQIndex === 0}
                   className="flex items-center gap-2 text-gray-400 font-bold hover:text-gray-700 disabled:opacity-30 px-4 py-2 transition-colors rounded-lg hover:bg-gray-50"
                >
                   <ChevronLeft /> ย้อนกลับ
                </button>

                {currentQIndex === quiz.questions.length - 1 ? (
                    <button 
                       onClick={handleSubmit}
                       disabled={isSubmitting}
                       className="bg-accent text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-200 hover:shadow-xl hover:bg-orange-400 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                       {isSubmitting ? <Loader2 className="animate-spin"/> : <><CheckCircle2 /> ส่งคำตอบ</>}
                    </button>
                ) : (
                    <button 
                       onClick={() => setCurrentQIndex(prev => Math.min(quiz.questions.length - 1, prev + 1))}
                       className={`px-8 py-3 rounded-xl font-bold shadow-lg text-white transition-all flex items-center gap-2 ${gradeColor} hover:opacity-90 hover:shadow-xl`}
                    >
                       ข้อถัดไป <ChevronRight />
                    </button>
                )}
             </div>
          </div>
       </div>

       {/* Confirm Submit Modal */}
       {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}></div>
             <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm relative z-10 flex flex-col items-center text-center animate-fade-in-up">
                 <div className="w-20 h-20 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center mb-6 border border-yellow-100 shadow-sm animate-pulse-slow">
                     <AlertCircle size={40} />
                 </div>
                 <h3 className="text-xl font-bold font-['Mitr'] text-gray-800 mb-2">ยืนยันการส่งคำตอบ?</h3>
                 <p className="text-gray-500 mb-8 text-sm leading-relaxed">เมื่อส่งแล้วจะไม่สามารถแก้ไขคำตอบได้อีก<br/>คุณแน่ใจหรือไม่ที่จะส่งข้อสอบนี้</p>
                 <div className="flex gap-3 w-full">
                     <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 rounded-xl text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 transition-colors">ตรวจสอบอีกครั้ง</button>
                     <button onClick={onConfirmSubmit} className="flex-1 py-3 rounded-xl bg-accent text-white font-bold shadow-lg hover:shadow-xl hover:bg-orange-400 transition-all">ยืนยันส่ง</button>
                 </div>
             </div>
          </div>
       )}
    </div>
  );
};
