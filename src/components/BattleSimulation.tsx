import React, { useState } from 'react';
import { PokemonInstance, Weather, Terrain, StatusCondition } from '../types';
import { calculateDamage } from '../utils/battle';
import { Swords, CloudRain, Sun, Wind, Snowflake, Zap, Leaf, Droplets, Eye } from 'lucide-react';

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
      <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/50 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-zinc-400 mb-3 uppercase tracking-wider">Atacante</h3>
          <select 
            value={attackerIdx} 
            onChange={e => setAttackerIdx(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm"
          >
            {playerTeam.map((p, i) => (
              <option key={p.id} value={i}>{p.name} (Nv. {p.level})</option>
            ))}
          </select>
        </div>

        <div>
          <h3 className="text-sm font-bold text-zinc-400 mb-3 uppercase tracking-wider">Defensor</h3>
          <select 
            value={defenderIdx} 
            onChange={e => setDefenderIdx(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm"
          >
            {playerTeam.map((p, i) => (
              <option key={p.id} value={i}>{p.name} (Nv. {p.level})</option>
            ))}
          </select>
        </div>

        <div>
          <h3 className="text-sm font-bold text-zinc-400 mb-3 uppercase tracking-wider">Clima</h3>
          <div className="flex flex-wrap gap-2">
            {['Clear', 'Rain', 'Sun', 'Sandstorm', 'Hail'].map((w) => (
              <button
                key={w}
                onClick={() => setWeather(w as Weather)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  weather === w 
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' 
                    : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
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
        <div className="grid grid-cols-2 gap-4">
          {/* Attacker Card */}
          <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 text-xs font-bold text-zinc-500 uppercase">Atacante</div>
            <div className="flex items-center gap-4 mb-4">
              <img src={attacker.sprite} alt={attacker.name} className="w-16 h-16 object-contain" style={{ imageRendering: 'pixelated' }} />
              <div>
                <div className="font-bold text-lg">{attacker.name}</div>
                <div className="text-xs text-zinc-400">ATK: {attacker.currentStats.atk} | SPA: {attacker.currentStats.spa}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {attacker.moves.map((move, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAttack(idx)}
                  className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg p-2 text-left transition-colors"
                >
                  <div className="font-bold text-sm">{move.name}</div>
                  <div className="text-xs text-zinc-400 flex justify-between">
                    <span>{move.type}</span>
                    <span>Pwr: {move.power}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Defender Card */}
          <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 text-xs font-bold text-zinc-500 uppercase">Defensor</div>
            <div className="flex items-center gap-4 mb-4">
              <img src={defender.sprite} alt={defender.name} className="w-16 h-16 object-contain" style={{ imageRendering: 'pixelated' }} />
              <div>
                <div className="font-bold text-lg">{defender.name}</div>
                <div className="text-xs text-zinc-400">DEF: {defender.currentStats.def} | SPD: {defender.currentStats.spd}</div>
              </div>
            </div>
            <div className="flex gap-2 mb-2">
              {defender.types.map(t => (
                <span key={t} className="px-2 py-0.5 bg-zinc-800 rounded text-xs font-bold border border-zinc-700">{t}</span>
              ))}
            </div>
            <div className="text-xs text-zinc-400 bg-zinc-800/50 p-2 rounded-lg">
              Habilidad: <span className="font-bold text-zinc-300">{defender.ability.name}</span>
            </div>
          </div>
        </div>

        {/* Battle Log */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 h-48 overflow-y-auto font-mono text-sm">
          {battleLog.length === 0 ? (
            <div className="text-zinc-500 text-center mt-16">El registro de batalla aparecerá aquí...</div>
          ) : (
            <div className="space-y-2">
              {battleLog.map((log, i) => (
                <div key={i} className={`${i === 0 ? 'text-zinc-100' : 'text-zinc-500'}`}>
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
