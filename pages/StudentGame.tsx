
import React, { useState, useEffect, useRef } from 'react';
import { useApp, SHOP_ITEMS } from '../services/AppContext';
import { ArrowLeft, Heart, Zap, Shield, Trophy, RefreshCw, ChevronRight, Layers, Hand, Flame, BrainCircuit, X, Check, Activity, Dumbbell, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- Types & Constants ---
type StatusType = 'BURN' | 'WEAK' | 'POWER_UP' | 'REGEN';

interface StatusEffect {
  type: StatusType;
  duration: number; // Turns left
  value: number; // Magnitude
}

interface FighterStats {
  hp: number;
  maxHp: number;
  energy: number; 
  maxEnergy: number;
  block: number;
  level: number;
  xp: number;
  maxXp: number;
  statuses: StatusEffect[];
}

interface CardData {
  id: string;
  name: string;
  type: 'ATTACK' | 'DEFENSE' | 'HEAL' | 'SPECIAL';
  cost: number;
  value: number;
  description: string;
  emoji: string;
  color: string;
  effect?: StatusType; // Side effect
  effectValue?: number;
}

interface Enemy {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  atk: number;
  xpReward: number;
  statuses: StatusEffect[];
  intent: 'ATTACK' | 'DEFEND' | 'WAIT';
}

interface MiniQuiz {
  question: string;
  options: string[];
  correct: number;
}

// --- Databases ---

const CARD_LIBRARY: CardData[] = [
  { id: 'c1', name: 'หมัดตรง', type: 'ATTACK', cost: 1, value: 6, description: 'โจมตี 6', emoji: '👊', color: 'bg-red-50 border-red-200 text-red-800' },
  { id: 'c2', name: 'ส้มตำเผ็ด', type: 'ATTACK', cost: 1, value: 3, description: 'โจมตี 3 + เผาผลาญ 2 (3 เทิร์น)', emoji: '🌶️', color: 'bg-orange-50 border-orange-200 text-orange-800', effect: 'BURN', effectValue: 2 },
  { id: 'c3', name: 'ยกเวท', type: 'SPECIAL', cost: 1, value: 0, description: 'เพิ่มพลังโจมตี +3 (2 เทิร์น)', emoji: '💪', color: 'bg-yellow-50 border-yellow-200 text-yellow-800', effect: 'POWER_UP', effectValue: 3 },
  { id: 'c4', name: 'ท่าสควอท', type: 'ATTACK', cost: 2, value: 12, description: 'โจมตีหนัก 12', emoji: '🏋️', color: 'bg-red-100 border-red-300 text-red-900' },
  { id: 'c5', name: 'การ์ดสูง', type: 'DEFENSE', cost: 1, value: 6, description: 'เกราะ 6', emoji: '🛡️', color: 'bg-blue-50 border-blue-200 text-blue-800' },
  { id: 'c6', name: 'โยคะ', type: 'DEFENSE', cost: 2, value: 10, description: 'เกราะ 10 + รีเจนเลือด 2', emoji: '🧘', color: 'bg-blue-100 border-blue-300 text-blue-900', effect: 'REGEN', effectValue: 2 },
  { id: 'c7', name: 'สลัดผัก', type: 'HEAL', cost: 1, value: 6, description: 'ฟื้นฟู 6 HP', emoji: '🥗', color: 'bg-green-50 border-green-200 text-green-800' },
  { id: 'c8', name: 'วิตามินซี', type: 'HEAL', cost: 0, value: 3, description: 'ฟื้นฟู 3 HP ฟรี', emoji: '🍊', color: 'bg-green-100 border-green-300 text-green-900' },
];

const ENEMIES_DB = [
  { name: 'Slime Soda', emoji: '🥤', maxHp: 40, atk: 6, xpReward: 25 },
  { name: 'Fries Minion', emoji: '🍟', maxHp: 55, atk: 8, xpReward: 40 },
  { name: 'Burger Boss', emoji: '🍔', maxHp: 90, atk: 12, xpReward: 70 },
  { name: 'Donut Lord', emoji: '🍩', maxHp: 130, atk: 15, xpReward: 120 },
  { name: 'Virus King', emoji: '🦠', maxHp: 220, atk: 20, xpReward: 250 },
];

const QUIZ_POOL: MiniQuiz[] = [
  { question: "อาหารหมู่ใดให้พลังงานหลัก?", options: ["โปรตีน", "คาร์โบไฮเดรต", "เกลือแร่", "วิตามิน"], correct: 1 },
  { question: "ควรดื่มน้ำวันละกี่แก้ว?", options: ["1-2 แก้ว", "3-4 แก้ว", "6-8 แก้ว", "10 แก้วขึ้นไป"], correct: 2 },
  { question: "ก่อนออกกำลังกายควรทำอะไร?", options: ["กินให้อิ่ม", "นอนหลับ", "วอร์มอัพ", "อาบน้ำ"], correct: 2 },
  { question: "อวัยวะใดใช้ฟอกเลือด?", options: ["หัวใจ", "ปอด", "ไต", "ตับ"], correct: 2 },
];

export const StudentGame = () => {
  const navigate = useNavigate();
  const { currentUser, studentDataExtras, consumeItem } = useApp();

  // --- Game State ---
  const [player, setPlayer] = useState<FighterStats>({
    hp: 80, maxHp: 80, energy: 3, maxEnergy: 3, block: 0, level: 1, xp: 0, maxXp: 100, statuses: []
  });

  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [turn, setTurn] = useState<'PLAYER' | 'ENEMY' | 'WIN' | 'LOSE'>('PLAYER');
  
  // Cards
  const [drawPile, setDrawPile] = useState<CardData[]>([]);
  const [hand, setHand] = useState<CardData[]>([]);
  const [discardPile, setDiscardPile] = useState<CardData[]>([]);

  // System
  const [shake, setShake] = useState(false); 
  const [damageText, setDamageText] = useState<{val: string, type: string, x: number, y: number} | null>(null);
  const [notification, setNotification] = useState('');
  
  // Quiz Mechanic
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<MiniQuiz | null>(null);
  const [canUseSkill, setCanUseSkill] = useState(true);

  // Inventory Modal
  const [isBagOpen, setIsBagOpen] = useState(false);

  // --- Helpers ---
  const showNotif = (msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(''), 2000);
  };

  const triggerFloatText = (val: string, type: 'dmg' | 'heal' | 'block' | 'buff') => {
      setDamageText({ val, type, x: Math.random() * 40 - 20, y: Math.random() * 20 });
      setTimeout(() => setDamageText(null), 1000);
  };

  const getStatusIcon = (type: StatusType) => {
      switch(type) {
          case 'BURN': return <Flame size={12} className="text-orange-500 fill-orange-500"/>;
          case 'WEAK': return <Activity size={12} className="text-purple-500"/>;
          case 'POWER_UP': return <Dumbbell size={12} className="text-red-600 fill-red-600"/>;
          case 'REGEN': return <Heart size={12} className="text-green-500 fill-green-500"/>;
          default: return null;
      }
  };

  const shuffle = (array: CardData[]) => array.sort(() => Math.random() - 0.5);

  const initDeck = () => {
    const starterDeck = [
        CARD_LIBRARY[0], CARD_LIBRARY[0], CARD_LIBRARY[0], 
        CARD_LIBRARY[4], CARD_LIBRARY[4], 
        CARD_LIBRARY[6], 
        CARD_LIBRARY[1], 
        CARD_LIBRARY[2], 
    ];
    setDrawPile(shuffle([...starterDeck]));
    setDiscardPile([]);
    setHand([]);
  };

  const drawCards = (count: number) => {
    setDrawPile(prevDraw => {
        let newDraw = [...prevDraw];
        let newHand = [...hand];
        let newDiscard = [...discardPile];

        for (let i = 0; i < count; i++) {
            if (newDraw.length === 0) {
                if (newDiscard.length === 0) break;
                newDraw = shuffle([...newDiscard]);
                newDiscard = [];
                setDiscardPile([]);
            }
            if (newDraw.length > 0) {
                const card = newDraw.pop()!;
                newHand.push({ ...card, id: `${card.id}-${Date.now()}-${i}` });
            }
        }
        setHand(newHand);
        return newDraw;
    });
  };

  const spawnEnemy = () => {
    const tier = Math.min(Math.floor((player.level - 1) / 2), ENEMIES_DB.length - 1); 
    const template = ENEMIES_DB[Math.min(tier + Math.floor(Math.random() * 2), ENEMIES_DB.length - 1)];
    
    setEnemy({
      ...template,
      id: Date.now().toString(),
      hp: template.maxHp + (player.level * 5),
      maxHp: template.maxHp + (player.level * 5),
      atk: template.atk + player.level,
      statuses: [],
      intent: 'ATTACK'
    });
    
    setTurn('PLAYER');
    setPlayer(p => ({ ...p, energy: p.maxEnergy, block: 0, statuses: [] }));
    setCanUseSkill(true);
    initDeck();
    setTimeout(() => drawCards(4), 100); 
    showNotif(`Battle Start!`);
  };

  // --- Status Logic ---
  const applyStatus = (target: 'PLAYER' | 'ENEMY', type: StatusType, duration: number, value: number) => {
      const setter = target === 'PLAYER' ? setPlayer : setEnemy;
      
      setter((prev: any) => {
          if (!prev) return null;
          const existing = prev.statuses.find((s: StatusEffect) => s.type === type);
          let newStatuses;
          
          if (existing) {
              newStatuses = prev.statuses.map((s: StatusEffect) => s.type === type ? { ...s, duration: s.duration + duration } : s);
          } else {
              newStatuses = [...prev.statuses, { type, duration, value }];
          }
          return { ...prev, statuses: newStatuses };
      });
      
      triggerFloatText(`+${type}`, 'buff');
  };

  const processTurnStartStatuses = (target: 'PLAYER' | 'ENEMY') => {
      const isPlayer = target === 'PLAYER';
      const entity = isPlayer ? player : enemy;
      if (!entity) return;

      let newHp = entity.hp;
      let statusLog: string[] = [];
      
      // Process Effects
      entity.statuses.forEach(s => {
          if (s.type === 'BURN') {
              newHp -= s.value;
              triggerFloatText(`-${s.value} 🔥`, 'dmg');
              statusLog.push('Burn');
          }
          if (s.type === 'REGEN') {
              newHp = Math.min(entity.maxHp, newHp + s.value);
              triggerFloatText(`+${s.value} 💚`, 'heal');
          }
      });

      // Reduce duration
      const newStatuses = entity.statuses
          .map(s => ({ ...s, duration: s.duration - 1 }))
          .filter(s => s.duration > 0);

      if (isPlayer) {
          setPlayer(p => ({ ...p, hp: newHp, statuses: newStatuses }));
          if (newHp <= 0) setTurn('LOSE');
      } else {
          setEnemy(e => e ? { ...e, hp: newHp, statuses: newStatuses } : null);
          if (newHp <= 0) handleWin();
      }
  };

  // --- Card Actions ---
  const playCard = (cardIndex: number) => {
    if (turn !== 'PLAYER' || !enemy) return;
    const card = hand[cardIndex];

    if (player.energy < card.cost) {
        showNotif("พลังงานไม่พอ! ⚡");
        return;
    }

    // Cost
    setPlayer(p => ({ ...p, energy: p.energy - card.cost }));

    // Calculate Buffs
    const powerUp = player.statuses.find(s => s.type === 'POWER_UP');
    const bonusDmg = powerUp ? powerUp.value : 0;

    // Effect
    if (card.type === 'ATTACK') {
        const dmg = card.value + bonusDmg;
        setEnemy(e => e ? { ...e, hp: Math.max(0, e.hp - dmg) } : null);
        triggerFloatText(`-${dmg}`, 'dmg');
        setShake(true);
        setTimeout(() => setShake(false), 300);

        if (card.effect === 'BURN') applyStatus('ENEMY', 'BURN', 3, card.effectValue || 2);
    } 
    else if (card.type === 'DEFENSE') {
        setPlayer(p => ({ ...p, block: p.block + card.value }));
        triggerFloatText(`+${card.value} 🛡️`, 'block');
        if (card.effect === 'REGEN') applyStatus('PLAYER', 'REGEN', 3, card.effectValue || 2);
    }
    else if (card.type === 'HEAL') {
        setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + card.value) }));
        triggerFloatText(`+${card.value} ❤️`, 'heal');
    }
    else if (card.type === 'SPECIAL') {
        if (card.effect === 'POWER_UP') applyStatus('PLAYER', 'POWER_UP', 2, card.effectValue || 2);
    }

    // Discard
    const newHand = [...hand];
    newHand.splice(cardIndex, 1);
    setHand(newHand);
    setDiscardPile(prev => [...prev, card]);

    // Win Check
    if (enemy && enemy.hp - (card.type === 'ATTACK' ? (card.value + bonusDmg) : 0) <= 0) {
        handleWin();
    }
  };

  const startQuiz = () => {
      if (!canUseSkill || turn !== 'PLAYER') return;
      const q = QUIZ_POOL[Math.floor(Math.random() * QUIZ_POOL.length)];
      setCurrentQuiz(q);
      setIsQuizOpen(true);
  };

  const handleQuizAnswer = (idx: number) => {
      if (!currentQuiz) return;
      setIsQuizOpen(false);
      setCanUseSkill(false); // Cooldown for battle

      if (idx === currentQuiz.correct) {
          setPlayer(p => ({ ...p, energy: Math.min(p.maxEnergy, p.energy + 2) }));
          drawCards(1);
          showNotif("ถูกต้อง! +2 Energy ⚡ +1 Card");
          triggerFloatText("+2⚡", "buff");
      } else {
          setEnemy(e => e ? { ...e, hp: Math.max(0, e.hp - 5) } : null); // Small damage on fail? or nothing. Let's do nothing but notify.
          showNotif("ผิด! พลาดโอกาสไป");
      }
  };

  const useInventoryItem = (itemId: string) => {
      if (!currentUser) return;
      const itemDef = SHOP_ITEMS.find(i => i.id === itemId);
      if (!itemDef) return;

      consumeItem(currentUser.id, itemId);
      
      if (itemDef.type === 'POTION') {
          setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + (itemDef.effectValue || 0)) }));
          triggerFloatText(`+${itemDef.effectValue} HP`, 'heal');
      } else if (itemDef.type === 'BUFF') {
          setPlayer(p => ({ ...p, energy: Math.min(p.maxEnergy, p.energy + (itemDef.effectValue || 0)) }));
          triggerFloatText(`+${itemDef.effectValue}⚡`, 'buff');
      }

      showNotif(`ใช้ไอเทม ${itemDef.name}`);
      setIsBagOpen(false);
  };

  const endTurn = () => {
     if (turn !== 'PLAYER') return;
     setTurn('ENEMY');
     setDiscardPile(prev => [...prev, ...hand]);
     setHand([]);
     processTurnStartStatuses('ENEMY'); // Burn damages enemy
  };

  const handleEnemyTurn = () => {
    if (!enemy) return;

    // Check if enemy died from burn
    if (enemy.hp <= 0) {
        handleWin();
        return;
    }

    setTimeout(() => {
        let dmg = enemy.atk;
        // Weak check
        const weak = enemy.statuses.find(s => s.type === 'WEAK');
        if (weak) dmg = Math.floor(dmg * 0.7);

        // Block
        if (player.block > 0) {
            const blocked = Math.min(player.block, dmg);
            dmg -= blocked;
            triggerFloatText(`Blocked ${blocked}!`, 'block');
        }

        if (dmg > 0) {
            setPlayer(p => ({ ...p, hp: Math.max(0, p.hp - dmg) }));
            triggerFloatText(`-${dmg}`, 'dmg');
            setShake(true);
            setTimeout(() => setShake(false), 300);
        } else {
            showNotif("ป้องกันสมบูรณ์แบบ!");
        }

        // Check Lose
        setPlayer(p => {
             if (p.hp - dmg <= 0) {
                 setTurn('LOSE');
                 return { ...p, hp: 0, block: 0 };
             }
             return { ...p, energy: p.maxEnergy, block: 0 };
        });

        if (player.hp - dmg > 0) {
            setTurn('PLAYER');
            processTurnStartStatuses('PLAYER'); // Regen / Burn on player
            drawCards(4);
            setCanUseSkill(true); // Refresh skill usage
        }

    }, 1200);
  };

  const handleWin = () => {
      setTurn('WIN');
      if (!enemy) return;
      const xpGain = enemy.xpReward;
      let newXp = player.xp + xpGain;
      let newLevel = player.level;
      let newMaxXp = player.maxXp;
      let newMaxHp = player.maxHp;
      let newEnergy = player.maxEnergy;

      if (newXp >= player.maxXp) {
          newLevel++;
          newXp -= player.maxXp;
          newMaxXp = Math.floor(newMaxXp * 1.5);
          newMaxHp += 5;
          if (newLevel % 3 === 0) newEnergy++; // Gain max energy every 3 levels
      }

      setPlayer(prev => ({
          ...prev, level: newLevel, xp: newXp, maxXp: newMaxXp, maxHp: newMaxHp, hp: newMaxHp, maxEnergy: newEnergy, block: 0, statuses: []
      }));
      showNotif(`Victory! +${xpGain} XP`);
  };

  // --- Effects ---
  useEffect(() => {
     if (turn === 'ENEMY') handleEnemyTurn();
  }, [turn]);

  useEffect(() => {
     if (!enemy) spawnEnemy();
  }, []);

  const inventory = currentUser ? (studentDataExtras[currentUser.id]?.inventory || []) : [];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2 font-['Mitr'] bg-slate-900 overflow-hidden">
        
        {/* Top Navbar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
            <button onClick={() => navigate('/student')} className="bg-white/10 p-2 rounded-full hover:bg-white/20 text-white transition-all backdrop-blur">
                <ArrowLeft />
            </button>
            <div className="bg-black/40 text-white px-3 py-1 rounded-full text-sm border border-white/10 backdrop-blur">
                Lv. {player.level} | XP {player.xp}/{player.maxXp}
            </div>
        </div>

        {/* --- GAME AREA --- */}
        <div className={`relative w-full max-w-lg h-[85vh] bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-700 flex flex-col ${shake ? 'animate-pulse' : ''}`}>
            
            {/* 1. ENEMY SECTION */}
            <div className="flex-1 bg-gradient-to-b from-slate-700 to-slate-800 relative flex flex-col items-center justify-center pt-8">
                {enemy && (
                    <div className="flex flex-col items-center animate-fade-in-up w-full">
                        {/* Status Bar */}
                        <div className="flex gap-1 mb-2 h-6">
                            {enemy.statuses.map((s, i) => (
                                <div key={i} className="bg-black/40 px-2 rounded-full flex items-center gap-1 text-xs text-white border border-white/10">
                                    {getStatusIcon(s.type)} <span>{s.duration}</span>
                                </div>
                            ))}
                        </div>

                        {/* Enemy Sprite */}
                        <div className={`text-8xl drop-shadow-2xl filter transition-transform duration-500 ${turn === 'ENEMY' ? 'scale-125' : 'animate-bounce-slow'}`}>
                            {enemy.emoji}
                        </div>

                        {/* Enemy Info */}
                        <div className="mt-4 flex flex-col items-center gap-1 w-2/3">
                            <div className="flex justify-between w-full text-white text-xs font-bold px-2">
                                <span>{enemy.name}</span>
                                <span className="text-red-400">⚔️ {enemy.atk}</span>
                            </div>
                            <div className="w-full h-3 bg-gray-700 rounded-full border border-gray-600 overflow-hidden relative">
                                <div className="h-full bg-red-500 transition-all duration-300" style={{width: `${(enemy.hp/enemy.maxHp)*100}%`}}></div>
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white shadow-sm">{Math.floor(enemy.hp)}/{enemy.maxHp}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Floating Damage Text */}
                {damageText && damageText.type === 'dmg' && (
                     <div className="absolute top-20 left-1/2 -translate-x-1/2 text-4xl font-black text-white stroke-red-600 animate-fade-in-up" style={{textShadow: '0 0 10px red'}}>
                         {damageText.val}
                     </div>
                )}
            </div>

            {/* 2. PLAYER STATS (Middle) */}
            <div className="h-20 bg-slate-900 border-y border-slate-600 flex items-center justify-between px-4 z-10 relative">
                 {/* HP & Status */}
                 <div className="flex flex-col gap-1">
                     <div className="flex items-center gap-2">
                        <div className="bg-red-500/20 p-1.5 rounded-lg border border-red-500/50">
                            <Heart size={16} className="text-red-500 fill-current" />
                        </div>
                        <div>
                            <div className="text-white font-bold text-lg leading-none">{Math.floor(player.hp)} <span className="text-xs text-gray-500">/ {player.maxHp}</span></div>
                        </div>
                     </div>
                     <div className="flex gap-1">
                        {player.statuses.map((s, i) => (
                            <div key={i} className="bg-white/10 px-1.5 rounded flex items-center gap-1 text-[10px] text-white">
                                {getStatusIcon(s.type)} {s.duration}
                            </div>
                        ))}
                     </div>
                 </div>

                 {/* Block */}
                 {player.block > 0 && (
                     <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-bounce-slow">
                         <Shield size={28} className="text-blue-400 fill-current" />
                         <span className="text-white font-bold text-sm bg-black/50 px-2 rounded-full -mt-2">{player.block}</span>
                     </div>
                 )}

                 {/* Energy */}
                 <div className="flex items-center gap-2">
                     <div className="text-right">
                         <div className="text-xs text-yellow-300 font-bold">ENERGY</div>
                         <div className="text-white font-bold text-lg leading-none">{player.energy} <span className="text-xs text-gray-500">/ {player.maxEnergy}</span></div>
                     </div>
                     <div className="bg-yellow-500/20 p-1.5 rounded-lg border border-yellow-500/50">
                         <Zap size={20} className="text-yellow-400 fill-current" />
                     </div>
                 </div>

                 {/* Floating Text Player */}
                 {damageText && (damageText.type !== 'dmg') && (
                     <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 text-2xl font-bold text-green-400 animate-fade-in-up z-50">
                         {damageText.val}
                     </div>
                 )}
            </div>

            {/* 3. CARD HAND & ACTIONS */}
            <div className="h-[300px] bg-slate-800 relative flex flex-col">
                {/* Notification */}
                {notification && (
                    <div className="absolute top-0 left-0 w-full bg-black/60 text-white text-center py-1 text-sm font-bold z-20 animate-fade-in">
                        {notification}
                    </div>
                )}

                {/* Cards */}
                <div className="flex-1 flex items-center justify-center gap-2 px-4 overflow-x-auto overflow-y-visible py-4 perspective-500">
                    {hand.map((card, index) => (
                        <div 
                            key={card.id}
                            onClick={() => playCard(index)}
                            className={`
                                relative w-24 h-36 bg-white rounded-xl shadow-xl border-b-4 border-r-2 
                                flex flex-col flex-shrink-0 cursor-pointer transition-all duration-200 
                                hover:-translate-y-4 hover:scale-105 hover:z-10 select-none group
                                ${card.color} ${turn !== 'PLAYER' || player.energy < card.cost ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                            `}
                        >
                            <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-md border-2 border-white z-10 text-xs">
                                {card.cost}
                            </div>
                            <div className="p-2 flex flex-col h-full items-center text-center">
                                <div className="text-3xl mt-2 mb-1 group-hover:scale-110 transition-transform">{card.emoji}</div>
                                <div className="font-bold text-xs leading-tight mb-1 line-clamp-2 min-h-[2.5em] flex items-center">{card.name}</div>
                                <div className="text-[9px] text-gray-500 leading-tight bg-white/50 p-1 rounded w-full flex-1 flex items-center justify-center border border-black/5">
                                    {card.description}
                                </div>
                            </div>
                        </div>
                    ))}
                    {hand.length === 0 && turn === 'PLAYER' && (
                         <div className="text-gray-500 text-sm flex flex-col items-center opacity-50">
                             <Hand size={32} className="mb-2"/>
                             <span>การ์ดหมด!</span>
                         </div>
                    )}
                </div>

                {/* Bottom Bar */}
                <div className="h-16 bg-slate-900 border-t border-slate-700 flex items-center justify-between px-4">
                     <div className="flex items-center gap-3">
                         <div className="text-gray-400 text-xs font-bold flex flex-col">
                            <span className="flex items-center gap-1"><Layers size={12}/> Deck: {drawPile.length}</span>
                            <span className="flex items-center gap-1"><RefreshCw size={12}/> Drop: {discardPile.length}</span>
                         </div>
                         
                         {/* Action Buttons */}
                         <div className="flex gap-2">
                             <button 
                                onClick={() => setIsBagOpen(true)}
                                disabled={turn !== 'PLAYER'}
                                className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-md hover:bg-teal-500 disabled:opacity-50"
                             >
                                 <Briefcase size={16} />
                             </button>
                             <button 
                                onClick={startQuiz}
                                disabled={!canUseSkill || turn !== 'PLAYER'}
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-md text-white
                                    ${canUseSkill && turn === 'PLAYER' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-gray-700 cursor-not-allowed'}
                                `}
                             >
                                 <BrainCircuit size={16} />
                             </button>
                         </div>
                     </div>

                     <button 
                        onClick={endTurn}
                        disabled={turn !== 'PLAYER'}
                        className={`
                            px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2
                            ${turn === 'PLAYER' 
                                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg hover:brightness-110 active:scale-95' 
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
                        `}
                     >
                        จบเทิร์น <ChevronRight size={16}/>
                     </button>
                </div>
            </div>

            {/* --- BAG MODAL --- */}
            {isBagOpen && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl relative">
                        <button onClick={() => setIsBagOpen(false)} className="absolute top-3 right-3 text-gray-400"><X size={20}/></button>
                        <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2"><Briefcase size={20}/> กระเป๋า</h3>
                        
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {inventory.length > 0 ? inventory.map((inv, idx) => {
                                const item = SHOP_ITEMS.find(i => i.id === inv.itemId);
                                if (!item || item.type === 'COSMETIC') return null; // Only usable items
                                return (
                                    <button 
                                        key={idx}
                                        onClick={() => useInventoryItem(item.id)}
                                        className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-teal-50 hover:border-teal-200 transition-all text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="text-2xl">{item.icon}</div>
                                            <div>
                                                <div className="font-bold text-sm text-gray-800">{item.name}</div>
                                                <div className="text-[10px] text-gray-500">{item.description}</div>
                                            </div>
                                        </div>
                                        <span className="font-bold text-teal-600 bg-teal-100 px-2 py-0.5 rounded text-xs">x{inv.count}</span>
                                    </button>
                                )
                            }) : (
                                <p className="text-center text-gray-400 py-4">ไม่มีไอเทมใช้งาน</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- QUIZ MODAL --- */}
            {isQuizOpen && currentQuiz && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl relative">
                        <button onClick={() => setIsQuizOpen(false)} className="absolute top-3 right-3 text-gray-400"><X size={20}/></button>
                        <div className="text-center mb-4">
                            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                <BrainCircuit size={24} />
                            </div>
                            <h3 className="font-bold text-gray-800 text-lg">Knowledge Burst!</h3>
                            <p className="text-gray-500 text-sm">{currentQuiz.question}</p>
                        </div>
                        <div className="space-y-2">
                            {currentQuiz.options.map((opt, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => handleQuizAnswer(idx)}
                                    className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all text-left"
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Win Screen */}
            {turn === 'WIN' && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
                    <div className="bg-white p-8 rounded-3xl text-center max-w-xs w-full shadow-2xl border-4 border-yellow-400">
                        <Trophy size={64} className="mx-auto text-yellow-400 mb-4" />
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">VICTORY!</h2>
                        <button onClick={spawnEnemy} className="w-full bg-accent text-white font-bold py-3 rounded-xl shadow-lg mt-4 flex items-center justify-center gap-2">
                            ด่านต่อไป <ChevronRight size={20}/>
                        </button>
                    </div>
                </div>
            )}

             {/* Lose Screen */}
             {turn === 'LOSE' && (
                <div className="absolute inset-0 z-50 bg-red-900/90 backdrop-blur-sm flex items-center justify-center animate-fade-in">
                    <div className="text-center text-white p-6">
                        <div className="text-6xl mb-4">💀</div>
                        <h2 className="text-4xl font-bold mb-2">GAME OVER</h2>
                        <button onClick={() => { setPlayer(p => ({...p, hp: p.maxHp, energy: p.maxEnergy})); spawnEnemy(); }} className="bg-white text-red-600 font-bold px-8 py-3 rounded-full shadow-lg mt-4 flex items-center gap-2 mx-auto">
                            <RefreshCw size={20}/> ลองใหม่อีกครั้ง
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
