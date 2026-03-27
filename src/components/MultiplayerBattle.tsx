import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Swords, Shield, Zap, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { calculateActualStat } from '../utils/battleLogic';

export default function MultiplayerBattle() {
  const { userId, currentRoom, currentTournament, submitMultiplayerMove, switchMultiplayerPokemon, leaveRoom, fleeMultiplayerBattle, resetRoomToWaiting } = useGameStore();
  const [showFleeConfirm, setShowFleeConfirm] = React.useState(false);
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

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden relative">
      {/* Battle Arena */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-red-900/20 pointer-events-none" />
        
        {/* Opponent Side */}
        <div className="flex-1 flex items-center justify-end px-12 relative">
          <div className="flex flex-col items-center">
            <AnimatePresence mode="wait">
              <motion.div 
                initial={{ x: 100, opacity: 0, scale: 0.8 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: 100, opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                key={oppActive.id}
                className="relative"
              >
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-black/40 rounded-[100%] blur-md" />
                <img 
                  src={oppActive.sprite} 
                  alt={oppActive.name} 
                  className="w-48 h-48 object-contain relative z-10" 
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </AnimatePresence>
            
            <div className="mt-4 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-3 rounded-2xl w-64">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-black uppercase italic text-white">{oppActive.name}</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono">LVL {oppActive.level}</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-1">
                <motion.div 
                  className={`h-full ${oppCurrentHp / oppMaxHp > 0.5 ? 'bg-emerald-500' : oppCurrentHp / oppMaxHp > 0.2 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${(oppCurrentHp / oppMaxHp) * 100}%` }}
                />
              </div>
              <div className="flex justify-end">
                <span className="text-[10px] font-bold text-zinc-400 font-mono">{Math.ceil(oppCurrentHp)} / {oppMaxHp} HP</span>
              </div>
            </div>
          </div>
        </div>

        {/* VS Divider */}
        <div className="h-px bg-zinc-800 w-full relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-950 px-4 py-1 border border-zinc-800 rounded-full text-[10px] font-black italic uppercase tracking-widest text-zinc-500">
            VS
          </div>
        </div>

        {/* My Side */}
        <div className="flex-1 flex items-center justify-start px-12 relative">
          <div className="flex flex-col items-center">
            <div className="mb-4 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-3 rounded-2xl w-64">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-black uppercase italic text-white">{myActive.name}</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono">LVL {myActive.level}</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-1">
                <motion.div 
                  className={`h-full ${myCurrentHp / myMaxHp > 0.5 ? 'bg-emerald-500' : myCurrentHp / myMaxHp > 0.2 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${(myCurrentHp / myMaxHp) * 100}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-1">
                  {me.team.map((p, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${me.hp[i] > 0 ? 'bg-blue-500' : 'bg-zinc-800'}`} />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-zinc-400 font-mono">{Math.ceil(myCurrentHp)} / {myMaxHp} HP</span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div 
                initial={{ x: -100, opacity: 0, scale: 0.8 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: -100, opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                key={myActive.id}
                className="relative"
              >
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-black/40 rounded-[100%] blur-md" />
                <img 
                  src={myActive.sprite} 
                  alt={myActive.name} 
                  className="w-48 h-48 object-contain relative z-10" 
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Controls & Logs */}
      <div className="h-72 bg-zinc-900 border-t border-zinc-800 flex">
        {/* Logs */}
        <div className="flex-1 p-6 border-r border-zinc-800 overflow-y-auto custom-scrollbar bg-black/20">
          <div className="space-y-2">
            {currentRoom.logs.map((log, i) => (
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={i} 
                className="text-zinc-400 font-mono text-xs leading-relaxed"
              >
                <span className="text-zinc-600 mr-2">[{i + 1}]</span>
                {log}
              </motion.p>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Actions */}
        <div className="w-96 p-6 flex flex-col gap-4">
          {currentRoom.status === 'finished' ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4 border border-yellow-500/30">
                <Swords className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-2xl font-black italic uppercase text-white mb-2">
                {currentRoom.winnerId === userId ? '¡VICTORIA!' : 'DERROTA'}
              </h3>
              <div className="flex flex-col gap-2 mt-4">
                {currentTournament ? (
                  <button 
                    onClick={leaveRoom}
                    className="px-8 py-2 bg-blue-600 text-white rounded-full font-bold uppercase italic text-sm hover:scale-105 transition-all"
                  >
                    Volver al Torneo
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={resetRoomToWaiting}
                      className="px-8 py-2 bg-blue-600 text-white rounded-full font-bold uppercase italic text-sm hover:scale-105 transition-all"
                    >
                      Volver a la Sala
                    </button>
                    <button 
                      onClick={leaveRoom}
                      className="px-8 py-2 bg-white text-black rounded-full font-bold uppercase italic text-sm hover:scale-105 transition-all"
                    >
                      Salir al Lobby
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 italic">Tus Movimientos</h3>
                {isMyTurn ? (
                  myCurrentHp <= 0 ? (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded uppercase animate-bounce">¡Cambia de Pokémon!</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-[8px] font-bold rounded uppercase animate-pulse">Tu Turno</span>
                  )
                ) : (
                  <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-[8px] font-bold rounded uppercase">Turno Rival</span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {myActive.moves.map((move, i) => (
                  <button
                    key={i}
                    disabled={!isMyTurn || myCurrentHp <= 0}
                    onClick={() => submitMultiplayerMove(move)}
                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                      isMyTurn && myCurrentHp > 0
                        ? 'bg-zinc-800 border-zinc-700 hover:border-blue-500/50 hover:bg-zinc-700' 
                        : 'bg-zinc-950 border-zinc-900 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <span className="block text-[10px] font-black italic uppercase text-white truncate">{move.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[8px] font-bold text-zinc-500 uppercase">{move.type}</span>
                      <span className="text-[8px] font-bold text-blue-400 uppercase">PWR {move.power}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-auto">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Cambiar Pokémon</h3>
                  {!showFleeConfirm ? (
                    <button
                      onClick={() => setShowFleeConfirm(true)}
                      className="text-[8px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors border border-red-500/30 px-2 py-0.5 rounded bg-red-500/10"
                    >
                      Huir del Combate
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold text-red-400 uppercase animate-pulse">¿Seguro?</span>
                      <button
                        onClick={fleeMultiplayerBattle}
                        className="text-[8px] font-black uppercase tracking-widest text-white bg-red-600 px-2 py-0.5 rounded hover:bg-red-500 transition-colors"
                      >
                        Sí, huir
                      </button>
                      <button
                        onClick={() => setShowFleeConfirm(false)}
                        className="text-[8px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {me.team.map((p, i) => (
                    <button
                      key={i}
                      disabled={!isMyTurn || i === me.activeIdx || me.hp[i] <= 0}
                      onClick={() => switchMultiplayerPokemon(i)}
                      className={`w-10 h-10 rounded-lg border flex items-center justify-center overflow-hidden transition-all ${
                        i === me.activeIdx 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : me.hp[i] <= 0 
                            ? 'border-zinc-900 bg-zinc-950 opacity-30 cursor-not-allowed'
                            : isMyTurn 
                              ? 'border-zinc-800 bg-zinc-900 hover:border-zinc-600' 
                              : 'border-zinc-900 bg-zinc-950 opacity-50'
                      }`}
                    >
                      <img src={p.sprite} alt={p.name} className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
