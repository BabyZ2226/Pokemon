import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Trophy, Play, CalendarDays } from 'lucide-react';
import BattleScreen from './BattleScreen';
import { motion } from 'framer-motion';

export default function LeagueTab() {
  const { currentWeek, season, leagueStandings, activeTeamIds, roster, missions, completeMission } = useGameStore();
  const [showBattle, setShowBattle] = useState(false);

  const activeTeam = activeTeamIds.map(id => roster.find(p => p.id === id)).filter(Boolean);

  if (showBattle) {
    return <BattleScreen onComplete={() => setShowBattle(false)} />;
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white italic tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            LIGA POKÉMON
          </h2>
          <p className="text-zinc-400 text-sm font-medium">Temporada {season} • Semana {currentWeek}/38</p>
        </div>
        
        <button 
          onClick={() => setShowBattle(true)}
          disabled={activeTeam.length === 0}
          className="group relative px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black italic rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Play className="w-5 h-5 fill-current" />
          JUGAR PRÓXIMO PARTIDO
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Clasificación
              </h3>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Primera División</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50">
                    <th className="px-4 py-3">Pos</th>
                    <th className="px-4 py-3">Equipo</th>
                    <th className="px-4 py-3 text-center">PJ</th>
                    <th className="px-4 py-3 text-center">G</th>
                    <th className="px-4 py-3 text-center">E</th>
                    <th className="px-4 py-3 text-center">P</th>
                    <th className="px-4 py-3 text-center text-white">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30">
                  {leagueStandings.map((team, idx) => (
                    <tr 
                      key={team.name}
                      className={`group transition-colors ${team.isPlayer ? 'bg-amber-500/5' : 'hover:bg-white/5'}`}
                    >
                      <td className="px-4 py-4">
                        <span className={`text-xs font-black ${
                          idx < 3 ? 'text-amber-400' : 
                          idx > 17 ? 'text-rose-400' : 'text-zinc-400'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-black text-xs ${team.isPlayer ? 'text-amber-400 border border-amber-500/30' : 'text-zinc-500'}`}>
                            {team.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className={`text-sm font-bold ${team.isPlayer ? 'text-white' : 'text-zinc-300'}`}>
                            {team.name}
                            {team.isPlayer && <span className="ml-2 text-[10px] bg-amber-500 text-black px-1 rounded">TÚ</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-xs font-medium text-zinc-400">{team.played}</td>
                      <td className="px-4 py-4 text-center text-xs font-medium text-emerald-400">{team.won}</td>
                      <td className="px-4 py-4 text-center text-xs font-medium text-zinc-400">{team.drawn}</td>
                      <td className="px-4 py-4 text-center text-xs font-medium text-rose-400">{team.lost}</td>
                      <td className="px-4 py-4 text-center text-sm font-black text-white">{team.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <h3 className="font-bold text-white flex items-center gap-2 mb-4">
              <CalendarDays className="w-4 h-4 text-indigo-400" />
              Misiones de Temporada
            </h3>
            <div className="space-y-3">
              {missions.map(mission => (
                <div 
                  key={mission.id}
                  className={`p-3 rounded-xl border transition-all ${
                    mission.completed 
                      ? 'bg-emerald-500/10 border-emerald-500/30 opacity-60' 
                      : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className={`text-xs font-bold ${mission.completed ? 'text-emerald-400' : 'text-white'}`}>
                      {mission.title}
                    </p>
                    {mission.completed && (
                      <span className="text-[8px] font-black bg-emerald-500 text-black px-1 rounded">COMPLETA</span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden mb-2">
                    <div 
                      className={`h-full transition-all duration-500 ${mission.completed ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${(mission.progress / mission.requirement) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-medium text-zinc-500">
                      {mission.progress} / {mission.requirement}
                    </span>
                    <span className="text-[10px] font-black text-amber-400">
                      +{mission.reward} Monedas
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-800 rounded-2xl p-5 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10">
              <h4 className="text-lg font-black italic mb-1">PRÓXIMO RIVAL</h4>
              <div className="flex items-center gap-4 mt-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl">
                  MT
                </div>
                <div>
                  <p className="font-bold text-white">Misty Trainers</p>
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Semana {currentWeek}</p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-white/20 flex justify-between items-center">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full bg-white/20 border-2 border-indigo-700" />
                  ))}
                </div>
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">OVR: 85</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
