import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Trophy, Play, CalendarDays } from 'lucide-react';
import BattleScreen from './BattleScreen';

export default function LeagueTab() {
  const { currentWeek, season, leagueStandings, activeTeamIds, roster, missions, completeMission } = useGameStore();
  const [isBattling, setIsBattling] = useState(false);

  const activeTeam = roster.filter(p => activeTeamIds.includes(p.id));

  if (isBattling) {
    return <BattleScreen onComplete={() => setIsBattling(false)} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "white" }}>League Overview</h2>
          <p style={{ color: "white" }}>Season {season} • Week {currentWeek}</p>
        </div>
        
        <button
          onClick={() => setIsBattling(true)}
          disabled={activeTeam.length === 0}
          style={{ color: "white" }}
          className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:cursor-not-allowed font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-green-900/20"
        >
          <Play size={20} fill="currentColor" />
          Play Next Match
        </button>
      </div>

      {/* Missions */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-bold mb-4" style={{ color: "white" }}>League Missions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(missions || []).map(mission => (
            <div key={mission.id} className="bg-slate-900 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
              <div>
                <h4 className="font-bold" style={{ color: "white" }}>{mission.title}</h4>
                <p className="text-sm" style={{ color: "white" }}>{mission.description}</p>
                <div className="text-xs mt-1" style={{ color: "white" }}>{mission.progress} / {mission.target}</div>
              </div>
              <button
                onClick={() => completeMission(mission.id)}
                disabled={mission.completed || mission.progress < mission.target}
                style={{ color: "white" }}
                className={`px-4 py-2 rounded-lg font-bold text-sm ${mission.completed ? 'bg-slate-700' : 'bg-blue-600 hover:bg-blue-500'}`}
              >
                {mission.completed ? 'Completed' : 'Claim Reward'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {activeTeam.length === 0 && (
        <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <p style={{ color: "white" }}>You need to set an active team in the Team tab before playing a match.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Standings Table */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center gap-2">
            <Trophy size={20} style={{ color: "white" }} />
            <h3 className="text-lg font-bold" style={{ color: "white" }}>Standings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="p-4 font-medium" style={{ color: "white" }}>Pos</th>
                  <th className="p-4 font-medium" style={{ color: "white" }}>Team</th>
                  <th className="p-4 font-medium text-center" style={{ color: "white" }}>P</th>
                  <th className="p-4 font-medium text-center" style={{ color: "white" }}>W</th>
                  <th className="p-4 font-medium text-center" style={{ color: "white" }}>D</th>
                  <th className="p-4 font-medium text-center" style={{ color: "white" }}>L</th>
                  <th className="p-4 font-medium text-right" style={{ color: "white" }}>Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {leagueStandings.sort((a, b) => b.points - a.points).map((team, index) => (
                  <tr key={team.teamName} className={team.teamName === 'Player Team' ? 'bg-blue-900/20' : 'hover:bg-slate-700/20'}>
                    <td className="p-4 font-bold" style={{ color: "white" }}>{index + 1}</td>
                    <td className="p-4 font-bold flex items-center gap-2">
                      {team.teamName === 'Player Team' && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                      {/* Forzando el color blanco directamente en el nombre del equipo */}
                      <span style={{ color: "white", textShadow: "0px 1px 2px rgba(0,0,0,0.8)" }}>{team.teamName}</span>
                    </td>
                    <td className="p-4 text-center" style={{ color: "white" }}>{team.played}</td>
                    <td className="p-4 text-center" style={{ color: "white" }}>{team.won}</td>
                    <td className="p-4 text-center" style={{ color: "white" }}>{team.drawn}</td>
                    <td className="p-4 text-center" style={{ color: "white" }}>{team.lost}</td>
                    <td className="p-4 text-right font-bold" style={{ color: "white" }}>{team.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Fixture */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <CalendarDays size={20} style={{ color: "white" }} />
            <h3 className="text-lg font-bold" style={{ color: "white" }}>Next Fixture</h3>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-blue-900/50 rounded-full flex items-center justify-center mb-3 border-2 border-blue-500/30">
                <span className="text-3xl">🛡️</span>
              </div>
              <h4 className="font-bold text-xl" style={{ color: "white" }}>Player Team</h4>
              <p className="text-sm" style={{ color: "white" }}>OVR: {Math.floor(activeTeam.reduce((acc, p) => acc + p.currentOVR, 0) / (activeTeam.length || 1))}</p>
            </div>
            
            <div className="text-2xl font-black" style={{ color: "white" }}>VS</div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-red-900/50 rounded-full flex items-center justify-center mb-3 border-2 border-red-500/30">
                <span className="text-3xl">🔥</span>
              </div>
              <h4 className="font-bold text-xl" style={{ color: "white" }}>Kanto Kings</h4>
              <p className="text-sm" style={{ color: "white" }}>OVR: 85</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}