
import React, { useState, useEffect } from 'react';
import { useApp } from '../services/AppContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, Trophy, ArrowRight, Loader2, AlertCircle, RotateCcw, History, Star, Play } from 'lucide-react';
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

  if (!quiz || !currentUser) return <div className="p-8 text-center">กำลังโหลดข้อสอบ...</div>;

  const currentQuestion = quiz.questions[currentQIndex];
  const progress = ((Object.keys(answers).length) / quiz.questions.length) * 100;
  
  const gradeColor = quiz.gradeLevel === 5 ? 'bg-gr5' : 'bg-gr6';
  const gradeText = quiz.gradeLevel === 5 ? 'text-gr5' : 'text-gr6';

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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-['Sarabun']">
            <div className="bg-white max-w-lg w-full rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                {/* Header Image/Color */}
                <div className={`h-32 ${gradeColor} relative flex flex-col justify-end p-6`}>
                   <button onClick={() => navigate('/student')} className="absolute top-4 left-4 bg-white/20 p-2 rounded-full text-white hover:bg-white/30 transition-all"><ChevronLeft /></button>
                   <span className="text-white/80 text-sm font-bold uppercase tracking-wider mb-1">{quiz.unit}</span>
                   <h1 className="text-white text-2xl font-bold font-['Mitr'] shadow-black/10 drop-shadow-md">{quiz.title}</h1>
                </div>

                <div className="p-6">
                    {/* Stats Summary */}
                    <div className="flex gap-4 mb-6">
                        <div className="flex-1 bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
                             <p className="text-xs text-gray-500 mb-1">เวลาทำข้อสอบ</p>
                             <p className="font-bold text-gray-800 flex items-center justify-center gap-1"><Clock size={16}/> {quiz.timeLimit} นาที</p>
                        </div>
                        <div className="flex-1 bg-yellow-50 p-4 rounded-2xl text-center border border-yellow-100">
                             <p className="text-xs text-yellow-600 mb-1">คะแนนสูงสุด</p>
                             <p className="font-bold text-yellow-700 flex items-center justify-center gap-1"><Trophy size={16}/> {bestScore} / {quiz.totalScore}</p>
                        </div>
                    </div>

                    {/* Start Button */}
                    <button 
                       onClick={handleStartQuiz}
                       className={`w-full py-4 rounded-2xl ${gradeColor} text-white font-bold shadow-lg hover:shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 mb-8 text-lg`}
                    >
                       <Play size={24} fill="currentColor" /> 
                       {history.length > 0 ? 'เริ่มทำข้อสอบใหม่' : 'เริ่มทำข้อสอบ'}
                    </button>

                    {/* History List */}
                    {history.length > 0 && (
                        <div>
                            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><History size={18}/> ประวัติการสอบ</h3>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                {history.map((h, idx) => (
                                    <div key={h.id} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">#{history.length - idx}</div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-700">{new Date(h.submittedAt).toLocaleDateString('th-TH')}</p>
                                                <p className="text-xs text-gray-400">{new Date(h.submittedAt).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</p>
                                            </div>
                                        </div>
                                        <div className={`font-bold ${h.score === bestScore ? 'text-green-600' : 'text-gray-600'}`}>
                                            {h.score} <span className="text-xs text-gray-400">/ {h.totalScore}</span>
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
             <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 ${gradeColor}`}></div>
                <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-500 shadow-sm border border-yellow-100">
                    <Trophy size={48} />
                </div>
                <h2 className="text-2xl font-bold font-['Mitr'] text-gray-800 mb-2">ส่งคำตอบเรียบร้อย!</h2>
                <p className="text-gray-500 mb-6">ระบบได้บันทึกคะแนนของคุณแล้ว</p>
                
                <div className="bg-gray-50 rounded-2xl p-8 mb-8 border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-2">คะแนนรอบนี้</p>
                    <div className="flex items-baseline justify-center gap-2">
                        <span className={`text-6xl font-bold font-['Mitr'] ${gradeText}`}>{submittedResult.score}</span>
                        <span className="text-xl text-gray-400 font-bold">/ {submittedResult.total}</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                    onClick={() => navigate('/student')}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
                    >
                        กลับหน้าหลัก
                    </button>
                    <button 
                    onClick={() => setGameState('intro')}
                    className={`flex-1 py-3 rounded-xl text-white font-bold shadow-lg ${gradeColor} hover:opacity-90 transition-all flex items-center justify-center gap-2`}
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
       <div className="bg-white shadow-sm border-b px-4 py-4 sticky top-0 z-20">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
             <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${gradeText}`}>{quiz.unit}</p>
                <h1 className="font-bold text-gray-800 text-lg md:text-xl line-clamp-1">{quiz.title}</h1>
             </div>
             <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-lg border ${isLowTime ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                <Clock size={20} />
                {formatTime(timeLeft)}
             </div>
          </div>
       </div>

       {/* Progress Bar */}
       <div className="h-1.5 w-full bg-gray-200">
          <div className={`h-full transition-all duration-500 ${gradeColor}`} style={{ width: `${progress}%` }}></div>
       </div>

       {/* Main Content */}
       <div className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-8 flex flex-col justify-center">
          <div className="bg-white rounded-3xl shadow-lg p-6 md:p-10 border border-gray-100 min-h-[400px] flex flex-col relative overflow-hidden">
             
             {/* Question Number */}
             <div className="flex justify-between items-start mb-6">
                 <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-lg font-bold text-sm">
                    ข้อที่ {currentQIndex + 1} / {quiz.questions.length}
                 </span>
                 <span className="text-xs text-gray-400 font-bold">{currentQuestion.points} คะแนน</span>
             </div>

             <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-8 leading-relaxed">
                   {currentQuestion.text}
                </h2>

                <div className="space-y-3">
                   {currentQuestion.type === 'multiple_choice' && currentQuestion.choices?.map((choice, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectAnswer(idx)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium flex items-center gap-4 group ${
                            answers[currentQuestion.id] === idx 
                            ? `border-blue-500 bg-blue-50 text-blue-700` 
                            : 'border-gray-100 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                         <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${answers[currentQuestion.id] === idx ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 group-hover:border-gray-400 text-gray-400'}`}>
                            {answers[currentQuestion.id] === idx && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                         </div>
                         <span className="text-lg">{choice}</span>
                      </button>
                   ))}

                   {currentQuestion.type === 'true_false' && (
                       <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => handleSelectAnswer('true')}
                            className={`p-6 rounded-2xl border-2 text-xl font-bold transition-all flex flex-col items-center gap-2 ${
                                answers[currentQuestion.id] === 'true' 
                                ? 'border-green-500 bg-green-50 text-green-600' 
                                : 'border-gray-100 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                             <CheckCircle2 size={32} /> ถูก (True)
                          </button>
                          <button
                            onClick={() => handleSelectAnswer('false')}
                            className={`p-6 rounded-2xl border-2 text-xl font-bold transition-all flex flex-col items-center gap-2 ${
                                answers[currentQuestion.id] === 'false' 
                                ? 'border-red-500 bg-red-50 text-red-600' 
                                : 'border-gray-100 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                             <CheckCircle2 size={32} className="rotate-45" /> ผิด (False)
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
                   className="flex items-center gap-2 text-gray-400 font-bold hover:text-gray-700 disabled:opacity-30 px-4 py-2 transition-colors"
                >
                   <ChevronLeft /> ย้อนกลับ
                </button>

                {currentQIndex === quiz.questions.length - 1 ? (
                    <button 
                       onClick={handleSubmit}
                       disabled={isSubmitting}
                       className="bg-accent text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-orange-400 transition-all flex items-center gap-2 disabled:opacity-70"
                    >
                       {isSubmitting ? <Loader2 className="animate-spin"/> : <><CheckCircle2 /> ส่งคำตอบ</>}
                    </button>
                ) : (
                    <button 
                       onClick={() => setCurrentQIndex(prev => Math.min(quiz.questions.length - 1, prev + 1))}
                       className={`px-8 py-3 rounded-xl font-bold shadow-lg text-white transition-all flex items-center gap-2 ${gradeColor} hover:opacity-90`}
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
             <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm relative z-10 flex flex-col items-center text-center animate-fade-in-up">
                 <div className="w-16 h-16 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center mb-4">
                     <AlertCircle size={32} />
                 </div>
                 <h3 className="text-xl font-bold font-['Mitr'] text-gray-800 mb-2">ยืนยันการส่งคำตอบ?</h3>
                 <p className="text-gray-500 mb-6">เมื่อส่งแล้วจะไม่สามารถแก้ไขคำตอบได้อีก คุณแน่ใจหรือไม่ที่จะส่งข้อสอบนี้</p>
                 <div className="flex gap-3 w-full">
                     <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-2.5 rounded-xl text-gray-500 font-bold hover:bg-gray-100 transition-colors">ยกเลิก</button>
                     <button onClick={onConfirmSubmit} className="flex-1 py-2.5 rounded-xl bg-accent text-white font-bold shadow-lg hover:shadow-xl hover:bg-orange-400 transition-all">ยืนยันส่ง</button>
                 </div>
             </div>
          </div>
       )}
    </div>
  );
};
