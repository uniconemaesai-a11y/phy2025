
import React, { useState, useEffect } from 'react';
import { useApp } from '../services/AppContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, Trophy, ArrowRight, Loader2 } from 'lucide-react';
import { QuizResult } from '../types';

export const TakeQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { quizzes, currentUser, submitQuiz, quizResults } = useApp();
  
  const quiz = quizzes.find(q => q.id === quizId);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{score: number, total: number} | null>(null);

  // Check if already taken
  useEffect(() => {
     if (currentUser && quiz) {
         const existing = quizResults.find(r => r.quizId === quiz.id && r.studentId === currentUser.id);
         if (existing) {
             setSubmittedResult({ score: existing.score, total: existing.totalScore });
         }
     }
  }, [quiz, currentUser, quizResults]);

  useEffect(() => {
    if (quiz && !submittedResult) {
        setTimeLeft(quiz.timeLimit * 60);
    }
  }, [quiz, submittedResult]);

  useEffect(() => {
    if (timeLeft > 0 && !submittedResult && !isSubmitting) {
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    } else if (timeLeft === 0 && !submittedResult && !isSubmitting && quiz) {
        handleSubmit();
    }
  }, [timeLeft, submittedResult, isSubmitting]);

  if (!quiz || !currentUser) return <div className="p-8 text-center">กำลังโหลดข้อสอบ...</div>;

  const currentQuestion = quiz.questions[currentQIndex];
  const progress = ((Object.keys(answers).length) / quiz.questions.length) * 100;
  
  const gradeColor = quiz.gradeLevel === 5 ? 'bg-gr5' : 'bg-gr6';
  const gradeText = quiz.gradeLevel === 5 ? 'text-gr5' : 'text-gr6';

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSelectAnswer = (ans: any) => {
     if (isSubmitting || submittedResult) return;
     setAnswers(prev => ({
         ...prev,
         [currentQuestion.id]: ans
     }));
  };

  const handleSubmit = async () => {
     if (isSubmitting || submittedResult) return;
     
     if (confirm('ยืนยันการส่งคำตอบ?')) {
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
     }
  };

  if (submittedResult) {
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
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-2">คะแนนที่ได้</p>
                    <div className="flex items-baseline justify-center gap-2">
                        <span className={`text-6xl font-bold font-['Mitr'] ${gradeText}`}>{submittedResult.score}</span>
                        <span className="text-xl text-gray-400 font-bold">/ {submittedResult.total}</span>
                    </div>
                </div>

                <button 
                  onClick={() => navigate('/student')}
                  className={`w-full py-3 rounded-xl text-white font-bold shadow-lg ${gradeColor} hover:opacity-90 transition-all flex items-center justify-center gap-2`}
                >
                    กลับสู่หน้าหลัก <ArrowRight size={20} />
                </button>
             </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-['Sarabun']">
       {/* Top Bar */}
       <div className="bg-white shadow-sm border-b px-4 py-4 sticky top-0 z-20">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
             <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${gradeText}`}>{quiz.unit}</p>
                <h1 className="font-bold text-gray-800 text-lg md:text-xl line-clamp-1">{quiz.title}</h1>
             </div>
             <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-lg border ${timeLeft < 60 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
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
    </div>
  );
};
