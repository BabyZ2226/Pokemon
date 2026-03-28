import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { calculateDamage } from '../utils/battleLogic';
import { PokemonInstance, Weather, StatusCondition } from '../types';
import { Swords, Heart, Shield, Zap, X, Trophy as TrophyIcon, CloudRain, Sun, Wind, CloudSnow } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPokemonImage } from '../App';

export default function BattleScreen({ onComplete }: { onComplete: () => void }) {
  const { roster, activeTeamIds, advanceWeek, addCoins, facilities } = useGameStore();
  const [log, setLog] = useState<{ text: string, type: 'player' | 'enemy' | 'system' }[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [winner, setWinner] = useState<'player' | 'enemy' | 'draw' | null>(null);
  const [weather, setWeather] = useState<Weather>('Clear');
  const [isAttacking, setIsAttacking] = useState<'player' | 'enemy' | null>(null);

  const playerTeam = roster.filter(p => activeTeamIds.includes(p.id));
  const [enemyTeam, setEnemyTeam] = useState<PokemonInstance[]>([]);
  
  const [pIndex, setPIndex] = useState(0);
  const [eIndex, setEIndex] = useState(0);
  const [pHP, setPHP] = useState(0);
  const [eHP, setEHP] = useState(0);
  const [pStatus, setPStatus] = useState<StatusCondition>('None');
  const [eStatus, setEStatus] = useState<StatusCondition>('None');
  const [battleBackground, setBattleBackground] = useState<string>('https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1920&q=80');

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  useEffect(() => {
    const mockEnemies = playerTeam.map(p => ({
      ...p,
      id: `enemy_${p.id}`,
      name: `Enemy ${p.name}`,
      currentOVR: p.currentOVR + Math.floor(Math.random() * 10 - 5),
    }));
    setEnemyTeam(mockEnemies);
    
    const weathers: Weather[] = ['Clear', 'Rain', 'Sun', 'Sandstorm', 'Hail'];
    setWeather(weathers[Math.floor(Math.random() * weathers.length)]);
    
    if (playerTeam.length > 0) {
      setPHP(playerTeam[0].baseStats.hp * 3);
    }
    if (mockEnemies.length > 0) {
      setEHP(mockEnemies[0].baseStats.hp * 3);
    }

    import('../utils/gemini').then(({ generateBattleBackground }) => {
      generateBattleBackground().then(setBattleBackground);
    });
  }, []);

  useEffect(() => {
    if (enemyTeam.length === 0 || playerTeam.length === 0 || isFinished) return;

    const interval = setInterval(() => {
      if (pIndex >= playerTeam.length || eIndex >= enemyTeam.length) {
        clearInterval(interval);
        return;
      }

      const p = { ...playerTeam[pIndex], status: pStatus };
      const e = { ...enemyTeam[eIndex], status: eStatus };

      if (!p || !e || !p.moves || !e.moves) return;
      
      const pMove = p.moves[Math.floor(Math.random() * p.moves.length)] || { name: 'Struggle', power: 50, type: 'normal', category: 'Physical' };
      const eMove = e.moves[Math.floor(Math.random() * e.moves.length)] || { name: 'Struggle', power: 50, type: 'normal', category: 'Physical' };

      const pResult = calculateDamage({ attacker: p, defender: e, move: pMove as any, weather, isCritical: Math.random() < 0.05 });
      const eResult = calculateDamage({ attacker: e, defender: p, move: eMove as any, weather, isCritical: Math.random() < 0.05 });

      const pDamage = pResult.damage;
      const eDamage = eResult.damage;

      const processTurn = async () => {
        if (p.baseStats.spe >= e.baseStats.spe) {
          // Player attacks first
          setIsAttacking('player');
          setEHP(prev => Math.max(0, prev - pDamage));
          setLog(prev => [...prev, { text: `${p.name} usó ${pMove.name}! Dealt ${pDamage} damage.`, type: 'player' }]);
          
          await new Promise(r => setTimeout(r, 500));
          setIsAttacking(null);

          if (eHP - pDamage <= 0) {
            setLog(prev => [...prev, { text: `${e.name} fainted!`, type: 'system' }]);
            setEIndex(prev => prev + 1);
            if (eIndex + 1 < enemyTeam.length) setEHP(enemyTeam[eIndex + 1].baseStats.hp * 3);
            else { setWinner('player'); setIsFinished(true); }
          } else {
            await new Promise(r => setTimeout(r, 500));
            setIsAttacking('enemy');
            setPHP(prev => Math.max(0, prev - eDamage));
            setLog(prev => [...prev, { text: `${e.name} usó ${eMove.name}! Dealt ${eDamage} damage.`, type: 'enemy' }]);
            
            await new Promise(r => setTimeout(r, 500));
            setIsAttacking(null);

            if (pHP - eDamage <= 0) {
              setLog(prev => [...prev, { text: `${p.name} fainted!`, type: 'system' }]);
              setPIndex(prev => prev + 1);
              if (pIndex + 1 < playerTeam.length) setPHP(playerTeam[pIndex + 1].baseStats.hp * 3);
              else { setWinner('enemy'); setIsFinished(true); }
            }
          }
        } else {
          // Enemy attacks first
          setIsAttacking('enemy');
          setPHP(prev => Math.max(0, prev - eDamage));
          setLog(prev => [...prev, { text: `${e.name} usó ${eMove.name}! Dealt ${eDamage} damage.`, type: 'enemy' }]);
          
          await new Promise(r => setTimeout(r, 500));
          setIsAttacking(null);

          if (pHP - eDamage <= 0) {
            setLog(prev => [...prev, { text: `${p.name} fainted!`, type: 'system' }]);
            setPIndex(prev => prev + 1);
            if (pIndex + 1 < playerTeam.length) setPHP(playerTeam[pIndex + 1].baseStats.hp * 3);
            else { setWinner('enemy'); setIsFinished(true); }
          } else {
            await new Promise(r => setTimeout(r, 500));
            setIsAttacking('player');
            setEHP(prev => Math.max(0, prev - pDamage));
            setLog(prev => [...prev, { text: `${p.name} usó ${pMove.name}! Dealt ${pDamage} damage.`, type: 'player' }]);
            
            await new Promise(r => setTimeout(r, 500));
            setIsAttacking(null);

            if (eHP - pDamage <= 0) {
              setLog(prev => [...prev, { text: `${e.name} fainted!`, type: 'system' }]);
              setEIndex(prev => prev + 1);
              if (eIndex + 1 < enemyTeam.length) setEHP(enemyTeam[eIndex + 1].baseStats.hp * 3);
              else { setWinner('player'); setIsFinished(true); }
            }
          }
        }
      };

      processTurn();
    }, 2000);

    return () => clearInterval(interval);
  }, [pIndex, eIndex, isFinished, pHP, eHP]);

  const handleFinish = () => {
    const income = 1000 + (facilities.stadiumLevel * 500);
    if (winner === 'player') addCoins(income);
    else if (winner === 'draw') addCoins(Math.floor(income / 2));
    else addCoins(Math.floor(income / 4));
    advanceWeek();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col overflow-hidden font-sans">
      {/* Global Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none z-[1000] overflow-hidden">
        <div className="absolute inset-0 scanline opacity-[0.03]" />
      </div>

      {/* Header */}
      <div className="bg-zinc-900/80 backdrop-blur-xl p-6 border-b border-white/10 flex justify-between items-center relative z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Swords size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Combate de Liga</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Semana {Math.floor(roster.length / 5) + 1}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
            <Zap size={14} className="text-amber-400" />
            <span className="text-xs font-black text-white uppercase tracking-widest">{weather}</span>
          </div>
          <button 
            onClick={onComplete}
            className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Weather Indicator */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
        <div className="flex flex-col items-center">
          <div className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Clima Actual</div>
          <div className="flex items-center gap-2">
            {weather === 'Rain' && <CloudRain size={16} className="text-blue-400" />}
            {weather === 'Sun' && <Sun size={16} className="text-amber-400" />}
            {weather === 'Sandstorm' && <Wind size={16} className="text-orange-400" />}
            {weather === 'Hail' && <CloudSnow size={16} className="text-indigo-300" />}
            {weather === 'Clear' && <Sun size={16} className="text-zinc-400" />}
            <span className="text-sm font-black italic uppercase text-white tracking-tighter">{weather}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        {/* Battle Arena */}
        <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-4 md:p-12">
          {/* Background */}
          <div className="absolute inset-0 z-0">
            <img 
              loading="lazy"
              src={battleBackground} 
              alt="Battle Background" 
              className="w-full h-full object-cover scale-110 blur-[2px] opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-transparent to-zinc-950/80" />
            
            {/* Weather Effects Overlay */}
            {weather === 'Rain' && (
              <div className="absolute inset-0 bg-blue-900/20 pointer-events-none z-10">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 animate-pulse" />
              </div>
            )}
            {weather === 'Sun' && (
              <div className="absolute inset-0 bg-amber-500/10 pointer-events-none z-10">
                <div className="absolute inset-0 bg-gradient-radial from-amber-500/20 to-transparent opacity-40 animate-pulse" />
              </div>
            )}
            {weather === 'Sandstorm' && (
              <div className="absolute inset-0 bg-orange-900/20 pointer-events-none z-10">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-30 animate-pulse" />
              </div>
            )}
            {weather === 'Hail' && (
              <div className="absolute inset-0 bg-indigo-100/10 pointer-events-none z-10">
                <div className="absolute inset-0 bg-white/5 animate-pulse" />
              </div>
            )}
          </div>

          {/* Arena Elements */}
          <div className="relative z-10 w-full max-w-5xl aspect-video flex items-center justify-center">
            {/* VS Divider */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-zinc-950 border border-white/10 rounded-full flex items-center justify-center shadow-2xl">
                <Swords size={40} className="text-white/20" />
              </div>
            </div>

            {/* Player Pokemon */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={playerTeam[pIndex]?.id}
                  initial={{ x: -100, opacity: 0, scale: 0.8 }}
                  animate={{ 
                    x: isAttacking === 'player' ? 50 : 0,
                    opacity: 1, 
                    scale: 1,
                    y: [0, -10, 0]
                  }}
                  exit={{ x: -100, opacity: 0, scale: 0.8 }}
                  transition={{ 
                    y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                    x: { type: "spring", stiffness: 300, damping: 20 }
                  }}
                  className="relative"
                >
                  {/* Base Platform */}
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-12 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-40 h-8 bg-gradient-to-b from-indigo-500/40 to-transparent rounded-[100%] border border-white/10" />
                  
                  <img 
                    loading="lazy"
                    src={getPokemonImage(playerTeam[pIndex], true)} 
                    alt={playerTeam[pIndex]?.name}
                    className="w-48 h-48 md:w-64 md:h-64 object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Player HP Bar */}
              <div className="mt-12 w-full max-w-xs bg-zinc-900/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl relative z-20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-black text-white uppercase italic">{playerTeam[pIndex]?.name}</span>
                  <span className="text-xs font-bold text-zinc-500">LVL {playerTeam[pIndex]?.level}</span>
                </div>
                <div className="h-3 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <motion.div 
                    className={`h-full rounded-full ${pHP / (playerTeam[pIndex]?.baseStats.hp * 3) > 0.5 ? 'bg-emerald-500' : pHP / (playerTeam[pIndex]?.baseStats.hp * 3) > 0.2 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    animate={{ width: `${(pHP / (playerTeam[pIndex]?.baseStats.hp * 3)) * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />
                </div>
                <div className="mt-1 text-[10px] font-black text-right text-zinc-500">{Math.ceil(pHP)} / {playerTeam[pIndex]?.baseStats.hp * 3} HP</div>
              </div>
            </div>

            {/* Enemy Pokemon */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={enemyTeam[eIndex]?.id}
                  initial={{ x: 100, opacity: 0, scale: 0.8 }}
                  animate={{ 
                    x: isAttacking === 'enemy' ? -50 : 0,
                    opacity: 1, 
                    scale: 1,
                    y: [0, -10, 0]
                  }}
                  exit={{ x: 100, opacity: 0, scale: 0.8 }}
                  transition={{ 
                    y: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                    x: { type: "spring", stiffness: 300, damping: 20 }
                  }}
                  className="relative"
                >
                  {/* Base Platform */}
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-12 bg-rose-500/20 rounded-full blur-xl animate-pulse" />
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-40 h-8 bg-gradient-to-b from-rose-500/40 to-transparent rounded-[100%] border border-white/10" />
                  
                  <img 
                    loading="lazy"
                    src={getPokemonImage(enemyTeam[eIndex])} 
                    alt={enemyTeam[eIndex]?.name}
                    className="w-48 h-48 md:w-64 md:h-64 object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Enemy HP Bar */}
              <div className="mt-12 w-full max-w-xs bg-zinc-900/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl relative z-20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-black text-white uppercase italic">{enemyTeam[eIndex]?.name}</span>
                  <span className="text-xs font-bold text-zinc-500">LVL {enemyTeam[eIndex]?.level}</span>
                </div>
                <div className="h-3 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <motion.div 
                    className={`h-full rounded-full ${eHP / (enemyTeam[eIndex]?.baseStats.hp * 3) > 0.5 ? 'bg-emerald-500' : eHP / (enemyTeam[eIndex]?.baseStats.hp * 3) > 0.2 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    animate={{ width: `${(eHP / (enemyTeam[eIndex]?.baseStats.hp * 3)) * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />
                </div>
                <div className="mt-1 text-[10px] font-black text-right text-zinc-500">{Math.ceil(eHP)} / {enemyTeam[eIndex]?.baseStats.hp * 3} HP</div>
              </div>
            </div>
          </div>
        </div>

        {/* Battle Log */}
        <div className="w-full md:w-96 bg-zinc-900/50 backdrop-blur-2xl border-l border-white/10 flex flex-col relative z-20">
          <div className="p-6 border-b border-white/10 bg-zinc-900/50">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Registro de Combate</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            <AnimatePresence>
              {log.map((entry, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 rounded-2xl border text-xs font-bold leading-relaxed ${
                    entry.type === 'player' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    entry.type === 'enemy' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                    'bg-white/5 border-white/10 text-zinc-400'
                  }`}
                >
                  {entry.text}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      {/* Victory/Defeat Overlay */}
      <AnimatePresence>
        {isFinished && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-[40px] p-12 text-center space-y-8 shadow-2xl"
            >
              <div className={`w-24 h-24 rounded-[32px] mx-auto flex items-center justify-center shadow-2xl ${winner === 'player' ? 'bg-emerald-500 shadow-emerald-500/40' : 'bg-rose-500 shadow-rose-500/40'}`}>
                {winner === 'player' ? <TrophyIcon size={48} className="text-white" /> : <X size={48} className="text-white" />}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-5xl font-black uppercase italic tracking-tighter text-white">
                  {winner === 'player' ? '¡Victoria!' : 'Derrota'}
                </h3>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
                  {winner === 'player' ? 'Has derrotado al equipo enemigo' : 'Tu equipo ha sido derrotado'}
                </p>
              </div>

              <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-4">Recompensas</div>
                <div className="flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                      <Zap size={16} />
                    </div>
                    <span className="text-xl font-black text-white">+{winner === 'player' ? 1000 : 250} 🪙</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleFinish}
                className="w-full py-6 bg-white text-black font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-zinc-200 transition-all shadow-xl active:scale-95"
              >
                Continuar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

