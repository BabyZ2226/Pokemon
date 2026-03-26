import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, CloudRain, Sun, Wind, Snowflake, Zap, Leaf, Droplets, Eye } from 'lucide-react';
import { PokemonInstance, Weather, Terrain, StatusCondition } from '../types';
import { calculateDamage } from '../utils/battle';

export default function BattleSimulation({ playerTeam }: { playerTeam: PokemonInstance[] }) {
  const [attackerIdx, setAttackerIdx] = useState<number>(0);
  const [defenderIdx, setDefenderIdx] = useState<number>(Math.min(1, playerTeam.length - 1));
  const [weather, setWeather] = useState<Weather>('Clear');
  const [terrain, setTerrain] = useState<Terrain>('Normal');
  const [battleLog, setBattleLog] = useState<string[]>([]);

  if (playerTeam.length < 2) {
    return (
      <div className="text-center py-12 text-zinc-500">
        Necesitas al menos 2 Pokémon en tu plantilla para simular una batalla.
      </div>
    );
  }

  const attacker = playerTeam[attackerIdx];
  const defender = playerTeam[defenderIdx];

  const handleAttack = (moveIdx: number) => {
    const move = attacker.moves[moveIdx];
    if (!move) return;

    const result = calculateDamage(attacker, defender, move, weather, terrain);
    
    let logMsg = `${attacker.name} usó ${move.name}! `;
    if (result.effectiveness > 1) logMsg += "¡Es súper efectivo! ";
    if (result.effectiveness < 1 && result.effectiveness > 0) logMsg += "No es muy efectivo... ";
    if (result.effectiveness === 0) logMsg += "No tuvo efecto. ";
    if (result.isCritical) logMsg += "¡Golpe Crítico! ";
    
    if (result.damage > 0) {
      logMsg += `Causó ${result.damage} de daño. `;
    }
    
    if (result.statusApplied) {
      logMsg += `¡${defender.name} ahora tiene ${result.statusApplied}! `;
    }

    setBattleLog(prev => [logMsg, ...prev].slice(0, 10));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Settings Panel */}
      <div className="bg-zinc-900/50 p-6 rounded-[32px] border border-white/10 space-y-8 h-fit">
        <div>
          <h3 className="text-[10px] font-black text-zinc-500 mb-4 uppercase tracking-[0.2em]">Configuración</h3>
          <div className="space-y-6">
            <div>
              <label className="text-[11px] font-bold text-zinc-400 mb-2 block uppercase tracking-wider">Atacante</label>
              <select 
                value={attackerIdx} 
                onChange={e => setAttackerIdx(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
              >
                {playerTeam.map((p, i) => (
                  <option key={p.id + '-atk-' + i} value={i}>{p.name} (Nv. {p.level})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-400 mb-2 block uppercase tracking-wider">Defensor</label>
              <select 
                value={defenderIdx} 
                onChange={e => setDefenderIdx(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
              >
                {playerTeam.map((p, i) => (
                  <option key={p.id + '-def-' + i} value={i}>{p.name} (Nv. {p.level})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-zinc-500 mb-4 uppercase tracking-[0.2em]">Condiciones</h3>
          <div className="flex flex-wrap gap-2">
            {['Clear', 'Rain', 'Sun', 'Sandstorm', 'Hail'].map((w) => (
              <button
                key={w}
                onClick={() => setWeather(w as Weather)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  weather === w 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' 
                    : 'bg-black/40 border-white/5 text-zinc-500 hover:border-white/20 hover:text-zinc-300'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Battle Arena */}
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Attacker Card */}
          <div className="bg-zinc-900/50 border border-white/10 rounded-[32px] p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Atacante</div>
            <div className="flex items-center gap-5 mb-6">
              <div className="w-20 h-20 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-indigo-500/30 transition-colors">
                <img src={attacker.sprite} alt={attacker.name} className="w-16 h-16 object-contain drop-shadow-xl" style={{ imageRendering: 'pixelated' }} />
              </div>
              <div>
                <div className="font-black text-2xl italic tracking-tighter text-white uppercase">{attacker.name}</div>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-md border border-indigo-400/20">ATK: {attacker.currentStats.atk}</span>
                  <span className="text-[10px] font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-md border border-purple-400/20">SPA: {attacker.currentStats.spa}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {attacker.moves.map((move, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAttack(idx)}
                  className="bg-black/40 hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/30 rounded-2xl p-3 text-left transition-all group/move"
                >
                  <div className="font-black text-xs text-white uppercase italic tracking-tight group-hover/move:text-indigo-300 transition-colors">{move.name}</div>
                  <div className="text-[10px] text-zinc-500 flex justify-between mt-1 font-bold">
                    <span className="uppercase tracking-widest">{move.type}</span>
                    <span className="text-zinc-400">PWR: {move.power}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Defender Card */}
          <div className="bg-zinc-900/50 border border-white/10 rounded-[32px] p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Defensor</div>
            <div className="flex items-center gap-5 mb-6">
              <div className="w-20 h-20 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-rose-500/30 transition-colors">
                <img src={defender.sprite} alt={defender.name} className="w-16 h-16 object-contain drop-shadow-xl" style={{ imageRendering: 'pixelated' }} />
              </div>
              <div>
                <div className="font-black text-2xl italic tracking-tighter text-white uppercase">{defender.name}</div>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">DEF: {defender.currentStats.def}</span>
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-md border border-blue-400/20">SPD: {defender.currentStats.spd}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {defender.types.map(t => (
                <span key={t} className="px-3 py-1 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-zinc-300">{t}</span>
              ))}
            </div>
            <div className="text-[10px] font-bold text-zinc-500 bg-black/40 p-3 rounded-2xl border border-white/5">
              HABILIDAD: <span className="text-zinc-200 uppercase tracking-wider">{defender.ability.name}</span>
            </div>
          </div>
        </div>

        {/* Battle Log */}
        <div className="bg-black/40 border border-white/10 rounded-[32px] p-6 h-64 overflow-y-auto font-mono text-xs custom-scrollbar">
          {battleLog.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-3">
              <Swords size={32} className="opacity-20" />
              <div className="font-black uppercase tracking-[0.2em] text-[10px]">Esperando acción...</div>
            </div>
          ) : (
            <div className="space-y-3">
              {battleLog.map((log, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-xl border transition-all ${
                    i === 0 
                      ? 'bg-indigo-500/10 text-indigo-200 border-indigo-500/20 shadow-lg shadow-indigo-500/5' 
                      : 'bg-white/5 text-zinc-500 border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${i === 0 ? 'bg-indigo-400 animate-pulse' : 'bg-zinc-800'}`} />
                    <span>{log}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
