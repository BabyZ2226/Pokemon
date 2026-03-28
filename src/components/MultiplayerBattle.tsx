import React, { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Swords, Shield, Zap, Heart, X, Trophy as TrophyIcon, CloudRain, Sun, Wind, CloudSnow } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getPokemonImage } from '../App';
import { calculateActualStat } from '../utils/battleLogic';

export default function MultiplayerBattle() {
  const { userId, currentRoom, currentTournament, submitMultiplayerMove, switchMultiplayerPokemon, leaveRoom, fleeMultiplayerBattle, resetRoomToWaiting } = useGameStore();
  const [showFleeConfirm, setShowFleeConfirm] = useState(false);
  const [isAttacking, setIsAttacking] = useState<'player' | 'enemy' | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentRoom?.logs]);

  if (!currentRoom || currentRoom.status === 'waiting') return null;

  const isPlayer1 = currentRoom.player1.id === userId;
  const me = isPlayer1 ? currentRoom.player1 : currentRoom.player2!;
  const opponent = isPlayer1 ? currentRoom.player2! : currentRoom.player1;

  const myActive = me.team[me.activeIdx];
  const oppActive = opponent.team[opponent.activeIdx];

  const myMaxHp = calculateActualStat(myActive, 'hp');
  const oppMaxHp = calculateActualStat(oppActive, 'hp');

  const myCurrentHp = me.hp[me.activeIdx];
  const oppCurrentHp = opponent.hp[opponent.activeIdx];

  const isMyTurn = currentRoom.currentTurnId === userId && currentRoom.status === 'playing';

  const handleMove = async (move: any) => {
    setIsAttacking('player');
    await new Promise(r => setTimeout(r, 500));
    submitMultiplayerMove(move);
    setIsAttacking(null);
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
            <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Combate Multijugador</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Sala: {currentRoom.roomCode}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
            <Zap size={14} className="text-amber-400" />
            <span className="text-xs font-black text-white uppercase tracking-widest">
              {isMyTurn ? 'Tu Turno' : 'Turno del Rival'}
            </span>
          </div>
          <button 
            onClick={leaveRoom}
            className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Weather Indicator */}
      {currentRoom.weather && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
          <div className="flex flex-col items-center">
            <div className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Clima Actual</div>
            <div className="flex items-center gap-2">
              {currentRoom.weather === 'Rain' && <CloudRain size={16} className="text-blue-400" />}
              {currentRoom.weather === 'Sun' && <Sun size={16} className="text-amber-400" />}
              {currentRoom.weather === 'Sandstorm' && <Wind size={16} className="text-orange-400" />}
              {currentRoom.weather === 'Hail' && <CloudSnow size={16} className="text-indigo-300" />}
              {currentRoom.weather === 'Clear' && <Sun size={16} className="text-zinc-400" />}
              <span className="text-sm font-black italic uppercase text-white tracking-tighter">{currentRoom.weather}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        {/* Battle Arena */}
        <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-4 md:p-12">
          {/* Background */}
          <div className="absolute inset-0 z-0">
            <img 
              loading="lazy"
              src="https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1920&q=80" 
              alt="Battle Background" 
              className="w-full h-full object-cover scale-110 blur-[2px] opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-transparent to-zinc-950/80" />
            
            {/* Weather Effects Overlay */}
            {currentRoom.weather === 'Rain' && (
              <div className="absolute inset-0 bg-blue-900/20 pointer-events-none z-10">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 animate-pulse" />
              </div>
            )}
            {currentRoom.weather === 'Sun' && (
              <div className="absolute inset-0 bg-amber-500/10 pointer-events-none z-10">
                <div className="absolute inset-0 bg-gradient-radial from-amber-500/20 to-transparent opacity-40 animate-pulse" />
              </div>
            )}
            {currentRoom.weather === 'Sandstorm' && (
              <div className="absolute inset-0 bg-orange-900/20 pointer-events-none z-10">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-30 animate-pulse" />
              </div>
            )}
            {currentRoom.weather === 'Hail' && (
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
                  key={myActive.id}
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
                    src={getPokemonImage(myActive, true)} 
                    alt={myActive.name}
                    className="w-48 h-48 md:w-64 md:h-64 object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Player HP Bar */}
              <div className="mt-12 w-full max-w-xs bg-zinc-900/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl relative z-20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-black text-white uppercase italic">{myActive.name}</span>
                  <span className="text-xs font-bold text-zinc-500">LVL {myActive.level}</span>
                </div>
                <div className="h-3 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <motion.div 
                    className={`h-full rounded-full ${myCurrentHp / myMaxHp > 0.5 ? 'bg-emerald-500' : myCurrentHp / myMaxHp > 0.2 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    animate={{ width: `${(myCurrentHp / myMaxHp) * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />
                </div>
                <div className="mt-1 text-[10px] font-black text-right text-zinc-500">{Math.ceil(myCurrentHp)} / {myMaxHp} HP</div>
              </div>
            </div>

            {/* Enemy Pokemon */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={oppActive.id}
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
                    src={getPokemonImage(oppActive)} 
                    alt={oppActive.name}
                    className="w-48 h-48 md:w-64 md:h-64 object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Enemy HP Bar */}
              <div className="mt-12 w-full max-w-xs bg-zinc-900/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl relative z-20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-black text-white uppercase italic">{oppActive.name}</span>
                  <span className="text-xs font-bold text-zinc-500">LVL {oppActive.level}</span>
                </div>
                <div className="h-3 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <motion.div 
                    className={`h-full rounded-full ${oppCurrentHp / oppMaxHp > 0.5 ? 'bg-emerald-500' : oppCurrentHp / oppMaxHp > 0.2 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    animate={{ width: `${(oppCurrentHp / oppMaxHp) * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />
                </div>
                <div className="mt-1 text-[10px] font-black text-right text-zinc-500">{Math.ceil(oppCurrentHp)} / {oppMaxHp} HP</div>
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
              {currentRoom.logs.map((log, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 rounded-2xl border text-xs font-bold leading-relaxed bg-white/5 border-white/10 text-zinc-400`}
                >
                  <span className="text-zinc-600 mr-2">[{i + 1}]</span>
                  {log}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-8 bg-zinc-900/80 backdrop-blur-2xl border-t border-white/10 relative z-30">
        {currentRoom.status === 'finished' ? (
          <div className="flex flex-col items-center justify-center text-center">
            <div className={`w-16 h-16 rounded-2xl mb-4 flex items-center justify-center shadow-2xl ${currentRoom.winnerId === userId ? 'bg-emerald-500 shadow-emerald-500/40' : 'bg-rose-500 shadow-rose-500/40'}`}>
              {currentRoom.winnerId === userId ? <TrophyIcon size={32} className="text-white" /> : <X size={32} className="text-white" />}
            </div>
            <h3 className="text-3xl font-black italic uppercase text-white mb-2">
              {currentRoom.winnerId === userId ? '¡VICTORIA!' : 'DERROTA'}
            </h3>
            <div className="flex gap-4 mt-6">
              {currentTournament ? (
                <button onClick={leaveRoom} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase italic text-sm hover:scale-105 transition-all shadow-xl shadow-indigo-500/20">Volver al Torneo</button>
              ) : (
                <>
                  <button onClick={resetRoomToWaiting} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase italic text-sm hover:scale-105 transition-all shadow-xl shadow-indigo-500/20">Volver a la Sala</button>
                  <button onClick={leaveRoom} className="px-10 py-4 bg-white text-black rounded-2xl font-black uppercase italic text-sm hover:scale-105 transition-all shadow-xl">Salir al Lobby</button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Moves */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              {myActive.moves.map((move, i) => (
                <button
                  key={i}
                  disabled={!isMyTurn || myCurrentHp <= 0}
                  onClick={() => handleMove(move)}
                  className={`group relative p-4 rounded-2xl border text-left transition-all overflow-hidden ${
                    isMyTurn && myCurrentHp > 0
                      ? 'bg-white/5 border-white/10 hover:border-indigo-500/50 hover:bg-white/10' 
                      : 'bg-zinc-950/50 border-white/5 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="relative z-10">
                    <span className="block text-sm font-black italic uppercase text-white truncate group-hover:text-indigo-400 transition-colors">{move.name}</span>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-[8px] font-black text-zinc-400 uppercase tracking-widest">{move.type}</span>
                      <span className="text-[10px] font-black text-indigo-400 uppercase">PWR {move.power}</span>
                    </div>
                  </div>
                  {isMyTurn && <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />}
                </button>
              ))}
            </div>

            {/* Team & Flee */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap gap-3">
                {me.team.map((p, i) => (
                  <button
                    key={i}
                    disabled={!isMyTurn || i === me.activeIdx || me.hp[i] <= 0}
                    onClick={() => switchMultiplayerPokemon(i)}
                    className={`w-14 h-14 rounded-2xl border flex items-center justify-center overflow-hidden transition-all relative group ${
                      i === me.activeIdx 
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20' 
                        : me.hp[i] <= 0 
                          ? 'border-white/5 bg-zinc-950 opacity-30 cursor-not-allowed grayscale'
                          : isMyTurn 
                            ? 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10' 
                            : 'border-white/5 bg-zinc-950 opacity-50'
                    }`}
                  >
                    <img loading="lazy" src={getPokemonImage(p)} alt={p.name} className="w-12 h-12 object-contain group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                    {me.hp[i] <= 0 && <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center"><X size={16} className="text-rose-500" /></div>}
                  </button>
                ))}
              </div>
              <button
                onClick={() => fleeMultiplayerBattle()}
                className="w-full py-4 bg-rose-600/10 hover:bg-rose-600 border border-rose-600/20 hover:border-rose-600 text-rose-500 hover:text-white rounded-2xl font-black uppercase italic text-xs transition-all shadow-lg active:scale-95"
              >
                Huir del Combate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
