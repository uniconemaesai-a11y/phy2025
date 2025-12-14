import React, { useState, useEffect } from 'react';
import { useApp } from '../services/AppContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { QuizResult } from '../types';

export const TakeQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { quizzes, currentUser, submitQuiz } = useApp();
  
  const quiz = quizzes.find(q => q.id === quizId);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resultData, setResultData] = useState<{score: number, total: number} | null>(null);

  useEffect(() => {
    if (quiz) {
        setTimeLeft(quiz.timeLimit * 60);
    }
  }, [quiz]);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    } else if (timeLeft === 0 && !isSubmitted && quiz) {
        handleSubmit();
    }
  }, [timeLeft, isSubmitted]);

  if (!quiz || !currentUser) return <div>Quiz not found</div>;

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
     setAnswers(prev => ({
         ...prev,
         [currentQuestion.id]: ans
     }));
  };

  const handleSubmit = async () => {
     if (!isSubmitted) {
        setIsSubmitted(true);
        // Calculate Score
        let score = 0;
        quiz.questions.forEach(q => {
            if (String(answers[q.id]) === String(q.correctAnswer)) {
                score += q.points;
            }
        });

        setResultData({ score, total: quiz.totalScore });

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
     }
  };

  if (isSubmitted && resultData) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-['Sarabun'] animate-fade-in">
             <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                    <CheckCircle2 size={48} />
                </div>
                <h2 className="text-2xl font-bold font-['Mitr'] text-gray-800 mb-2">ส่งคำตอบเรียบร้อย!</h2>
                <p className="text-gray-500 mb-6">บันทึกคะแนนลงในระบบแล้ว</p>
                
                <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
                    <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">คะแนนของคุณ</p>
                    <p className={`text-6xl font-bold font-['Mitr'] ${gradeText} my-2`}>{resultData.score}</p>
                    <p className="text-gray-400">เต็ม {resultData.total} คะแนน</p>
                </div>

                <button 
                  onClick={() => navigate('/student')}
                  className={`w-full py-3 rounded-xl text-white font-bold shadow-lg ${gradeColor} hover:opacity-90 transition-all`}
                >
                    กลับหน้าหลัก
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
             <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-lg ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
                <Clock size={20} />
                {formatTime(timeLeft)}
             </div>
          </div>
       </div>

       {/* Progress Bar */}
       <div className="h-2 w-full bg-gray-200">
          <div className={`h-full transition-all duration-500 ${gradeColor}`} style={{ width: `${progress}%` }}></div>
       </div>

       {/* Main Content */}
       <div className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-8 flex flex-col justify-center">
          <div className="bg-white rounded-3xl shadow-lg p-6 md:p-10 border border-gray-100 min-h-[400px] flex flex-col">
             <div className="flex-1">
                <span className="text-gray-400 font-bold text-sm">คำถามที่ {currentQIndex + 1} / {quiz.questions.length}</span>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-4 mb-8 leading-relaxed">
                   {currentQuestion.text}
                </h2>

                <div className="space-y-4">
                   {currentQuestion.type === 'multiple_choice' && currentQuestion.choices?.map((choice, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectAnswer(idx)}
                        className={`w-full text-left p-4 md:p-6 rounded-2xl border-2 transition-all text-lg font-medium flex items-center gap-4 ${
                            answers[currentQuestion.id] === idx 
                            ? `border-current ${gradeText} bg-opacity-10 bg-current` 
                            : 'border-gray-100 hover:border-gray-300 text-gray-600 bg-gray-50'
                        }`}
                      >
                         <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${answers[currentQuestion.id] === idx ? 'border-current bg-current text-white' : 'border-gray-300'}`}>
                            {answers[currentQuestion.id] === idx && <div className="w-3 h-3 bg-white rounded-full"></div>}
                         </div>
                         {choice}
                      </button>
                   ))}

                   {currentQuestion.type === 'true_false' && (
                       <div className="grid grid-cols-2 gap-4 h-32">
                          <button
                            onClick={() => handleSelectAnswer('true')}
                            className={`rounded-2xl border-2 text-xl font-bold transition-all ${
                                answers[currentQuestion.id] === 'true' 
                                ? 'border-green-500 bg-green-50 text-green-600' 
                                : 'border-gray-100 hover:border-gray-300 text-gray-600 bg-gray-50'
                            }`}
                          >
                             ถูก
                          </button>
                          <button
                            onClick={() => handleSelectAnswer('false')}
                            className={`rounded-2xl border-2 text-xl font-bold transition-all ${
                                answers[currentQuestion.id] === 'false' 
                                ? 'border-red-500 bg-red-50 text-red-600' 
                                : 'border-gray-100 hover:border-gray-300 text-gray-600 bg-gray-50'
                            }`}
                          >
                             ผิด
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
                   className="flex items-center gap-2 text-gray-500 font-bold hover:text-gray-800 disabled:opacity-30 disabled:hover:text-gray-500 px-4 py-2"
                >
                   <ChevronLeft /> ย้อนกลับ
                </button>

                {currentQIndex === quiz.questions.length - 1 ? (
                    <button 
                       onClick={handleSubmit}
                       className="bg-accent text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-orange-400 transition-all flex items-center gap-2"
                    >
                       ส่งคำตอบ <CheckCircle2 />
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