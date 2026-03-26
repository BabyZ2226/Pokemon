import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { calculateDamage } from '../utils/battleLogic';
import { PokemonInstance, Weather, StatusCondition } from '../types';
import { Swords, Heart, Shield, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BattleScreen({ onComplete }: { onComplete: () => void }) {
  const { roster, activeTeamIds, advanceWeek, addCoins, facilities } = useGameStore();
  const [log, setLog] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [weather, setWeather] = useState<Weather>('Clear');

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

      let currentLog = [...log];
      
      const p = { ...playerTeam[pIndex], status: pStatus };
      const e = { ...enemyTeam[eIndex], status: eStatus };

      if (!p || !e || !p.moves || !e.moves) return;
      
      const pMove = p.moves[Math.floor(Math.random() * p.moves.length)] || { name: 'Struggle', power: 50, type: 'normal', category: 'Physical' };
      const eMove = e.moves[Math.floor(Math.random() * e.moves.length)] || { name: 'Struggle', power: 50, type: 'normal', category: 'Physical' };

      const pResult = calculateDamage({ attacker: p, defender: e, move: pMove as any, weather, isCritical: Math.random() < 0.05 });
      const eResult = calculateDamage({ attacker: e, defender: p, move: eMove as any, weather, isCritical: Math.random() < 0.05 });

      const pDamage = pResult.damage;
      const eDamage = eResult.damage;

      if (p.baseStats.spe >= e.baseStats.spe) {
        setEHP(prev => Math.max(0, prev - pDamage));
        currentLog.push(`${p.name} usó ${pMove.name}! Dealt ${pDamage} damage.`);
        if (eHP - pDamage <= 0) {
          currentLog.push(`${e.name} fainted!`);
          setEIndex(prev => prev + 1);
          if (eIndex + 1 < enemyTeam.length) setEHP(enemyTeam[eIndex + 1].baseStats.hp * 3);
          else { setWinner('player'); setIsFinished(true); }
        } else {
          setPHP(prev => Math.max(0, prev - eDamage));
          currentLog.push(`${e.name} usó ${eMove.name}! Dealt ${eDamage} damage.`);
          if (pHP - eDamage <= 0) {
            currentLog.push(`${p.name} fainted!`);
            setPIndex(prev => prev + 1);
            if (pIndex + 1 < playerTeam.length) setPHP(playerTeam[pIndex + 1].baseStats.hp * 3);
            else { setWinner('enemy'); setIsFinished(true); }
          }
        }
      } else {
        setPHP(prev => Math.max(0, prev - eDamage));
        currentLog.push(`${e.name} usó ${eMove.name}! Dealt ${eDamage} damage.`);
        if (pHP - eDamage <= 0) {
          currentLog.push(`${p.name} fainted!`);
          setPIndex(prev => prev + 1);
          if (pIndex + 1 < playerTeam.length) setPHP(playerTeam[pIndex + 1].baseStats.hp * 3);
          else { setWinner('enemy'); setIsFinished(true); }
        } else {
          setEHP(prev => Math.max(0, prev - pDamage));
          currentLog.push(`${p.name} usó ${pMove.name}! Dealt ${pDamage} damage.`);
          if (eHP - pDamage <= 0) {
            currentLog.push(`${e.name} fainted!`);
            setEIndex(prev => prev + 1);
            if (eIndex + 1 < enemyTeam.length) setEHP(enemyTeam[eIndex + 1].baseStats.hp * 3);
            else { setWinner('player'); setIsFinished(true); }
          }
        }
      }

      setLog(currentLog);
    }, 1000);

    return () => clearInterval(interval);
  }, [pIndex, eIndex, isFinished]);

  const handleFinish = () => {
    const income = 1000 + (facilities.stadiumLevel * 500);
    if (winner === 'player') addCoins(income);
    else if (winner === 'draw') addCoins(Math.floor(income / 2));
    else addCoins(Math.floor(income / 4));
    advanceWeek();
    onComplete();
  };

  return (
    <div className="max-w-4xl mx-auto bg-zinc-900 rounded-[32px] border border-white/10 overflow-hidden flex flex-col h-[85vh] md:h-[80vh] shadow-2xl relative">
      <div className="bg-zinc-950/50 p-4 md:p-6 border-b border-white/5 flex justify-between items-center">
        <h2 className="text-xl font-black uppercase italic text-white">Combate</h2>
        <div className="text-sm font-bold text-zinc-400">{weather}</div>
      </div>

      <div className="flex-1 p-4 md:p-8 flex flex-col gap-6 relative overflow-hidden">
        {/* Battle Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url('${battleBackground}')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        </div>

        {/* Battle Arena */}
        <div className="flex-1 relative z-10 flex flex-col justify-center">
          <div className="flex justify-between items-center gap-4 relative h-64">
            {/* Player */}
            <div className="absolute left-[5%] bottom-[10%] flex flex-col items-center">
              {/* Battle Base Platform */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-32 md:w-56 h-8 md:h-14 bg-gradient-to-b from-emerald-400/40 to-emerald-900/60 rounded-[100%] border-b-4 border-emerald-950/40 shadow-[0_10px_30px_rgba(0,0,0,0.4)]" />
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 md:w-44 h-6 md:h-10 bg-emerald-500/20 rounded-[100%] border border-white/10" />
              
              <motion.img 
                src={playerTeam[pIndex]?.sprite} 
                alt="Player" 
                className="w-24 h-24 md:w-32 md:h-32 object-contain relative z-10" 
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="mt-8 bg-black/60 backdrop-blur-md p-2 rounded-xl border border-white/10 w-32">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-white uppercase truncate">{playerTeam[pIndex]?.name}</span>
                  <span className="text-[8px] font-bold text-zinc-400">Lv{playerTeam[pIndex]?.level}</span>
                </div>
                <div className="w-full bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-emerald-500" 
                    animate={{ width: `${(pHP / (playerTeam[pIndex]?.baseStats.hp * 3)) * 100}%` }} 
                  />
                </div>
              </div>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Swords className="text-white/20" size={48} />
            </div>

            {/* Enemy */}
            <div className="absolute right-[5%] top-[5%] flex flex-col items-center">
              {/* Battle Base Platform */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 md:w-44 h-6 md:h-10 bg-gradient-to-b from-emerald-400/40 to-emerald-900/60 rounded-[100%] border-b-2 border-emerald-950/40 shadow-[0_5px_15px_rgba(0,0,0,0.4)]" />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-20 md:w-36 h-4 md:h-8 bg-emerald-500/20 rounded-[100%] border border-white/10" />

              <motion.img 
                src={enemyTeam[eIndex]?.sprite} 
                alt="Enemy" 
                className="w-20 h-20 md:w-28 md:h-28 object-contain relative z-10" 
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="mt-6 bg-black/60 backdrop-blur-md p-2 rounded-xl border border-white/10 w-32">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-white uppercase truncate">{enemyTeam[eIndex]?.name}</span>
                  <span className="text-[8px] font-bold text-zinc-400">Lv{enemyTeam[eIndex]?.level}</span>
                </div>
                <div className="w-full bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-rose-500" 
                    animate={{ width: `${(eHP / (enemyTeam[eIndex]?.baseStats.hp * 3)) * 100}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Log */}
        <div className="h-32 overflow-y-auto p-4 bg-black/40 backdrop-blur-md rounded-2xl font-mono text-[10px] md:text-xs custom-scrollbar border border-white/5 relative z-10">
          {log.map((entry, i) => <div key={i} className="text-zinc-300 mb-1">{entry}</div>)}
          <div ref={logEndRef} />
        </div>
      </div>

      {isFinished && (
        <button onClick={handleFinish} className="p-4 bg-indigo-600 text-white font-black uppercase">
          Continuar
        </button>
      )}
    </div>
  );
}

