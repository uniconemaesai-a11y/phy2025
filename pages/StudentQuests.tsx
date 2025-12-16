
import React, { useState, useEffect } from 'react';
import { useApp } from '../services/AppContext';
import { Card } from '../components/Card';
import { Trophy, CheckCircle2, Flame, Calendar, Award, Plus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const StudentQuests = () => {
  const { currentUser, getTodayQuests, updateQuestProgress } = useApp();
  const navigate = useNavigate();
  const [animateId, setAnimateId] = useState<string | null>(null);

  if (!currentUser) return null;

  const quests = getTodayQuests(currentUser.id);
  const completedCount = quests.filter(q => q.progress.isCompleted).length;
  const totalXp = quests.reduce((acc, q) => acc + (q.progress.current / q.quest.target) * q.quest.xpReward, 0);

  const handleIncrement = (questId: string) => {
    setAnimateId(questId);
    setTimeout(() => setAnimateId(null), 500);
    updateQuestProgress(currentUser.id, questId, 1);
  };

  const todayStr = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-violet-500 to-purple-600 rounded-3xl p-6 md:p-10 text-white overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-10 -translate-y-10">
              <Trophy size={150} />
          </div>
          
          <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2 opacity-90">
                  <Calendar size={18} />
                  <span className="font-bold">{todayStr}</span>
              </div>
              <h1 className="text-3xl font-bold font-['Mitr'] mb-2">ภารกิจสุขภาพประจำวัน</h1>
              <p className="opacity-90 max-w-lg">ทำภารกิจให้ครบเพื่อรักษาสุขภาพให้แข็งแรงและสะสม XP สำหรับเกม Card Battle!</p>
              
              <div className="mt-6 flex items-center gap-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
                      <CheckCircle2 className="text-green-300" />
                      <span className="font-bold">{completedCount} / {quests.length} สำเร็จ</span>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
                      <Flame className="text-orange-300" />
                      <span className="font-bold">ได้รับ {Math.floor(totalXp)} XP</span>
                  </div>
              </div>
          </div>
      </div>

      {/* Quest Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quests.map(({ quest, progress }) => {
              const percent = Math.min(100, (progress.current / quest.target) * 100);
              const isDone = progress.isCompleted;

              return (
                  <div 
                    key={quest.id} 
                    className={`relative bg-white rounded-2xl p-5 border-2 transition-all duration-300 ${isDone ? 'border-green-400 shadow-md bg-green-50/30' : 'border-gray-100 shadow-sm hover:border-purple-200'} ${animateId === quest.id ? 'scale-105' : ''}`}
                  >
                      {isDone && (
                          <div className="absolute -top-3 -right-3 bg-green-500 text-white p-1.5 rounded-full shadow-md animate-bounce-slow">
                              <Check strokeWidth={4} size={16} />
                          </div>
                      )}

                      <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-4">
                              <div className="text-4xl bg-gray-50 w-16 h-16 flex items-center justify-center rounded-2xl shadow-inner">
                                  {quest.icon}
                              </div>
                              <div>
                                  <h3 className="font-bold text-gray-800 text-lg">{quest.title}</h3>
                                  <p className="text-sm text-gray-400">เป้าหมาย: {quest.target} {quest.unit}</p>
                              </div>
                          </div>
                          <div className="text-right">
                              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">+{quest.xpReward} XP</span>
                          </div>
                      </div>

                      <div className="mb-4">
                          <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                              <span>ความคืบหน้า</span>
                              <span className={isDone ? 'text-green-600' : ''}>{progress.current} / {quest.target}</span>
                          </div>
                          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 rounded-full ${isDone ? 'bg-green-500' : 'bg-purple-500'}`}
                                style={{ width: `${percent}%` }}
                              ></div>
                          </div>
                      </div>

                      <button 
                        onClick={() => handleIncrement(quest.id)}
                        disabled={isDone}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                            isDone 
                            ? 'bg-green-100 text-green-600 cursor-default' 
                            : 'bg-gray-900 text-white hover:bg-purple-600 shadow-lg hover:shadow-xl'
                        }`}
                      >
                          {isDone ? (
                              <>สำเร็จแล้ว <Award size={18}/></>
                          ) : (
                              <><Plus size={18}/> บันทึก ({progress.current + 1})</>
                          )}
                      </button>
                  </div>
              );
          })}
      </div>

      {/* Connection to Game */}
      <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
          <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-full">
                  <Award size={32} className="animate-pulse" />
              </div>
              <div>
                  <h3 className="text-xl font-bold font-['Mitr']">สะสม XP ไปสู้กับปีศาจ!</h3>
                  <p className="text-white/90 text-sm">ยิ่งทำภารกิจเยอะ ตัวละครในเกมยิ่งเก่งขึ้น</p>
              </div>
          </div>
          <button 
            onClick={() => navigate('/student/game')}
            className="bg-white text-orange-600 px-6 py-3 rounded-xl font-bold shadow-md hover:bg-orange-50 transition-all whitespace-nowrap"
          >
             เข้าสู่เกม Card Battle
          </button>
      </div>
    </div>
  );
};
