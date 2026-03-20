import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { calculateDamage } from '../utils/battleLogic';
import { PokemonInstance, Weather, StatusCondition } from '../types';

export default function BattleScreen({ onComplete }: { onComplete: () => void }) {
  const { roster, activeTeamIds, advanceWeek, addCoins, facilities } = useGameStore();
  const [log, setLog] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [weather, setWeather] = useState<Weather>('Clear');

  const playerTeam = roster.filter(p => activeTeamIds.includes(p.id));
  const [enemyTeam, setEnemyTeam] = useState<PokemonInstance[]>([]);
  
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  useEffect(() => {
    // Generate mock enemy team
    const mockEnemies = playerTeam.map(p => ({
      ...p,
      id: `enemy_${p.id}`,
      name: `Enemy ${p.name}`,
      currentOVR: p.currentOVR + Math.floor(Math.random() * 10 - 5),
    }));
    setEnemyTeam(mockEnemies);
    
    const weathers: Weather[] = ['Clear', 'Rain', 'Sun', 'Sandstorm', 'Hail'];
    setWeather(weathers[Math.floor(Math.random() * weathers.length)]);
  }, []);

  useEffect(() => {
    if (enemyTeam.length === 0 || playerTeam.length === 0) return;

    let currentLog: string[] = [`Match started! Weather is ${weather}.`];
    let pIndex = 0;
    let eIndex = 0;
    
    let pHP = playerTeam[0].baseStats.hp * 3; 
    let eHP = enemyTeam[0].baseStats.hp * 3;
    let pStatus: StatusCondition = 'None';
    let eStatus: StatusCondition = 'None';

    let turnCount = 0;
    const maxTurns = 100; // Safety limit

    const interval = setInterval(() => {
      if (isFinished || turnCount > maxTurns) {
        clearInterval(interval);
        if (turnCount > maxTurns && !isFinished) {
          currentLog.push("Match ended in a draw (turn limit reached).");
          setWinner('draw');
          setIsFinished(true);
          setLog([...currentLog]);
        }
        return;
      }

      if (pIndex >= playerTeam.length) {
        currentLog.push("You have no Pokémon left. You LOST!");
        setWinner('enemy');
        setIsFinished(true);
        setLog([...currentLog]);
        clearInterval(interval);
        return;
      }
      if (eIndex >= enemyTeam.length) {
        currentLog.push("Enemy has no Pokémon left. You WON!");
        setWinner('player');
        setIsFinished(true);
        setLog([...currentLog]);
        clearInterval(interval);
        return;
      }

      const p = { ...playerTeam[pIndex], status: pStatus };
      const e = { ...enemyTeam[eIndex], status: eStatus };

      const pSpe = p.baseStats.spe;
      const eSpe = e.baseStats.spe;

      const pMove = p.moves[Math.floor(Math.random() * p.moves.length)] || { name: 'Struggle', power: 50, type: 'normal', category: 'Physical' };
      const eMove = e.moves[Math.floor(Math.random() * e.moves.length)] || { name: 'Struggle', power: 50, type: 'normal', category: 'Physical' };

      const pResult = calculateDamage({ attacker: p, defender: e, move: pMove as any, weather, isCritical: Math.random() < 0.05 });
      const eResult = calculateDamage({ attacker: e, defender: p, move: eMove as any, weather, isCritical: Math.random() < 0.05 });

      const pDamage = pResult.damage;
      const eDamage = eResult.damage;

      if (pSpe >= eSpe) {
        // Player attacks first
        eHP -= pDamage;
        if (pResult.statusApplied && eStatus === 'None') eStatus = pResult.statusApplied;
        
        let pLogMsg = `${p.name} used ${pMove.name}!`;
        if (pDamage > 0) pLogMsg += ` Dealt ${pDamage} damage.`;
        if (pResult.statusApplied) pLogMsg += ` Applied ${pResult.statusApplied}!`;
        currentLog.push(pLogMsg);

        if (eHP <= 0) {
          currentLog.push(`${e.name} fainted!`);
          eIndex++;
          eStatus = 'None';
          if (eIndex < enemyTeam.length) eHP = enemyTeam[eIndex].baseStats.hp * 3;
        } else {
          // Enemy attacks second
          pHP -= eDamage;
          if (eResult.statusApplied && pStatus === 'None') pStatus = eResult.statusApplied;

          let eLogMsg = `${e.name} used ${eMove.name}!`;
          if (eDamage > 0) eLogMsg += ` Dealt ${eDamage} damage.`;
          if (eResult.statusApplied) eLogMsg += ` Applied ${eResult.statusApplied}!`;
          currentLog.push(eLogMsg);

          if (pHP <= 0) {
            currentLog.push(`${p.name} fainted!`);
            pIndex++;
            pStatus = 'None';
            if (pIndex < playerTeam.length) pHP = playerTeam[pIndex].baseStats.hp * 3;
          }
        }
      } else {
        // Enemy attacks first
        pHP -= eDamage;
        if (eResult.statusApplied && pStatus === 'None') pStatus = eResult.statusApplied;

        let eLogMsg = `${e.name} used ${eMove.name}!`;
        if (eDamage > 0) eLogMsg += ` Dealt ${eDamage} damage.`;
        if (eResult.statusApplied) eLogMsg += ` Applied ${eResult.statusApplied}!`;
        currentLog.push(eLogMsg);

        if (pHP <= 0) {
          currentLog.push(`${p.name} fainted!`);
          pIndex++;
          pStatus = 'None';
          if (pIndex < playerTeam.length) pHP = playerTeam[pIndex].baseStats.hp * 3;
        } else {
          // Player attacks second
          eHP -= pDamage;
          if (pResult.statusApplied && eStatus === 'None') eStatus = pResult.statusApplied;

          let pLogMsg = `${p.name} used ${pMove.name}!`;
          if (pDamage > 0) pLogMsg += ` Dealt ${pDamage} damage.`;
          if (pResult.statusApplied) pLogMsg += ` Applied ${pResult.statusApplied}!`;
          currentLog.push(pLogMsg);

          if (eHP <= 0) {
            currentLog.push(`${e.name} fainted!`);
            eIndex++;
            eStatus = 'None';
            if (eIndex < enemyTeam.length) eHP = enemyTeam[eIndex].baseStats.hp * 3;
          }
        }
      }

      // Apply periodic damage from status
      if (pStatus === 'Burn' || pStatus === 'Poison') {
        const dot = Math.floor(playerTeam[pIndex].baseStats.hp * 0.1);
        pHP -= dot;
        currentLog.push(`${p.name} suffered ${dot} damage from ${pStatus}.`);
      }
      if (eStatus === 'Burn' || eStatus === 'Poison') {
        const dot = Math.floor(enemyTeam[eIndex].baseStats.hp * 0.1);
        eHP -= dot;
        currentLog.push(`${e.name} suffered ${dot} damage from ${eStatus}.`);
      }

      turnCount++;
      setLog([...currentLog]);
    }, 800);

    return () => clearInterval(interval);
  }, [enemyTeam, weather]);

  const handleFinish = () => {
    const income = 1000 + (facilities.stadiumLevel * 500);
    if (winner === 'player') {
      addCoins(income);
    } else if (winner === 'draw') {
      addCoins(Math.floor(income / 2));
    } else {
      addCoins(Math.floor(income / 4));
    }
    
    advanceWeek();
    onComplete();
  };

  return (
    <div className="max-w-4xl mx-auto bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex flex-col h-[80vh]">
      <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Match Simulation</h2>
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-600">
          <span className="text-xl">
            {weather === 'Clear' ? '☀️' : weather === 'Rain' ? '🌧️' : weather === 'Sun' ? '🔥' : weather === 'Sandstorm' ? '🌪️' : '❄️'}
          </span>
          <span className="text-sm font-bold text-white">{weather}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-2 font-mono text-sm">
        {log.map((entry, i) => (
          <div key={i} className={`p-2 rounded ${
            entry.includes('fainted') ? 'bg-red-950/40 text-red-50 border border-red-800/50' :
            entry.includes('WON') ? 'bg-green-950/50 text-green-50 font-bold text-lg text-center py-4' :
            entry.includes('LOST') ? 'bg-red-950/50 text-red-50 font-bold text-lg text-center py-4' :
            'text-white'
          }`}>
            {entry}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {isFinished && (
        <div className="p-6 bg-slate-900 border-t border-slate-700">
          <button 
            onClick={handleFinish}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-colors text-lg shadow-lg shadow-blue-900/20"
          >
            Continue to Next Week
          </button>
        </div>
      )}
    </div>
  );
}
