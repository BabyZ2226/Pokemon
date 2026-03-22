
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { PokemonInstance, Weather, StatusCondition } from '../types';
import { Swords, Users, Loader2, Trophy, Shield, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { calculateDamage } from '../utils/battleLogic';

// We'll use the same logic as BattleScreen but synced via socket
export default function MultiplayerTab() {
  const { roster, activeTeamIds, addCoins } = useGameStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<'idle' | 'searching' | 'battling' | 'finished'>('idle');
  const [opponent, setOpponent] = useState<{ userId: string; userName: string; team: PokemonInstance[] } | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerIndex, setPlayerIndex] = useState<number>(0);
  const playerIndexRef = useRef(0);

  useEffect(() => {
    playerIndexRef.current = playerIndex;
  }, [playerIndex]);

  const [isWaiting, setIsWaiting] = useState(false);
  
  const [log, setLog] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [weather, setWeather] = useState<Weather>('Clear');
  
  const [pHP, setPHP] = useState<number[]>([]);
  const [oHP, setOHP] = useState<number[]>([]);
  const [pIdx, setPIdx] = useState(0);
  const [oIdx, setOIdx] = useState(0);

  const logEndRef = useRef<HTMLDivElement>(null);
  const playerTeam = React.useMemo(() => roster.filter(p => activeTeamIds.includes(p.id)), [roster, activeTeamIds]);
  const playerTeamRef = useRef(playerTeam);

  useEffect(() => {
    playerTeamRef.current = playerTeam;
  }, [playerTeam]);

  const [isAttacking, setIsAttacking] = useState(false);
  const [isBeingHit, setIsBeingHit] = useState(false);
  const [isOpponentAttacking, setIsOpponentAttacking] = useState(false);
  const [isOpponentBeingHit, setIsOpponentBeingHit] = useState(false);

  const pIdxRef = useRef(0);
  const oIdxRef = useRef(0);

  useEffect(() => {
    pIdxRef.current = pIdx;
  }, [pIdx]);

  useEffect(() => {
    oIdxRef.current = oIdx;
  }, [oIdx]);

  const [chatMessage, setChatMessage] = useState('');
  const [opponentMessage, setOpponentMessage] = useState<string | null>(null);

  useEffect(() => {
    if (opponentMessage) {
      const timer = setTimeout(() => setOpponentMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [opponentMessage]);

  const addCoinsRef = useRef(addCoins);
  useEffect(() => {
    addCoinsRef.current = addCoins;
  }, [addCoins]);

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    newSocket.on('opponent-message', (msg) => {
      setOpponentMessage(msg);
    });

    newSocket.on('match-found', (data) => {
      setOpponent(data.opponent);
      setRoomId(data.roomId);
      setPlayerIndex(data.playerIndex);
      
      const s = data.initialState;
      if (data.playerIndex === 0) {
        setPHP(s.p1.hp);
        setOHP(s.p2.hp);
        setPIdx(s.p1.activeIdx);
        setOIdx(s.p2.activeIdx);
      } else {
        setPHP(s.p2.hp);
        setOHP(s.p1.hp);
        setPIdx(s.p2.activeIdx);
        setOIdx(s.p1.activeIdx);
      }
      
      setStatus('battling');
      setLog(['¡Combate Multijugador Iniciado! Elige tu primer movimiento.']);
      newSocket.emit('join-battle', data.roomId);
    });

    newSocket.on('turn-resolved', async (data) => {
      const { state, logs, gameOver, winnerIndex } = data;
      
      setIsWaiting(false);
      
      for (const message of logs) {
        setLog(prev => [...prev, message]);
        
        if (message.includes('usó')) {
          // Use the name of the pokemon that was active at the START of the turn
          // This is still a bit simplified but better
          const myPokeName = playerTeamRef.current[pIdxRef.current]?.name;
          if (message.includes(myPokeName)) {
            setIsAttacking(true);
            setIsOpponentBeingHit(true);
            await new Promise(r => setTimeout(r, 600));
            setIsAttacking(false);
            setIsOpponentBeingHit(false);
          } else {
            setIsOpponentAttacking(true);
            setIsBeingHit(true);
            await new Promise(r => setTimeout(r, 600));
            setIsOpponentAttacking(false);
            setIsBeingHit(false);
          }
        }
        await new Promise(r => setTimeout(r, 400));
      }

      if (playerIndexRef.current === 0) {
        setPHP(state.p1.hp);
        setOHP(state.p2.hp);
        setPIdx(state.p1.activeIdx);
        setOIdx(state.p2.activeIdx);
      } else {
        setPHP(state.p2.hp);
        setOHP(state.p1.hp);
        setPIdx(state.p2.activeIdx);
        setOIdx(state.p1.activeIdx);
      }

      if (gameOver) {
        await new Promise(r => setTimeout(r, 1000));
        setWinner(winnerIndex === playerIndexRef.current ? 'player' : 'enemy');
        setStatus('finished');
        if (winnerIndex === playerIndexRef.current) {
          addCoinsRef.current(5000);
        }
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const submitMove = (move: any) => {
    if (!socket || !roomId || isWaiting) return;
    setIsWaiting(true);
    socket.emit('submit-move', { roomId, move, playerIndex });
  };

  const [privateRoomId, setPrivateRoomId] = useState('');

  const createRoom = () => {
    if (!socket || playerTeam.length === 0) return;
    const roomId = Math.random().toString(36).substr(2, 9);
    setPrivateRoomId(roomId);
    setStatus('searching');
    socket.emit('create-room', {
      roomId,
      userId: Math.random().toString(36).substr(2, 9),
      userName: 'Entrenador ' + Math.floor(Math.random() * 1000),
      team: playerTeam
    });
  };

  const joinRoom = () => {
    if (!socket || playerTeam.length === 0 || !privateRoomId) return;
    setStatus('searching');
    socket.emit('join-room', {
      roomId: privateRoomId,
      userId: Math.random().toString(36).substr(2, 9),
      userName: 'Entrenador ' + Math.floor(Math.random() * 1000),
      team: playerTeam
    });
  };

  const startSearch = () => {
    if (!socket || playerTeam.length === 0) return;
    setStatus('searching');
    socket.emit('join-queue', {
      userId: Math.random().toString(36).substr(2, 9),
      userName: 'Entrenador ' + Math.floor(Math.random() * 1000),
      team: playerTeam
    });
  };

  const cancelSearch = () => {
    if (!socket) return;
    socket.emit('leave-queue');
    setStatus('idle');
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !roomId || !chatMessage.trim()) return;
    socket.emit('battle-message', { roomId, message: chatMessage });
    setLog(prev => [...prev, `Tú: ${chatMessage}`]);
    setChatMessage('');
  };

  if (status === 'battling' || status === 'finished') {
    const activeP = playerTeam[pIdx];
    const activeO = opponent?.team[oIdx];

    return (
      <div className="max-w-4xl mx-auto bg-zinc-900 rounded-[32px] border border-white/10 overflow-hidden flex flex-col h-[85vh] shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 z-20" />
        
        <div className="bg-zinc-950/50 backdrop-blur-md p-6 border-b border-white/5 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-600/20 rounded-xl flex items-center justify-center text-rose-400">
              <Swords size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Arena Real</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Vs {opponent?.userName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
            <div className={`w-2 h-2 rounded-full ${isWaiting ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="text-xs font-black text-white uppercase tracking-widest">
              {isWaiting ? 'Esperando Oponente...' : 'Tu Turno'}
            </span>
          </div>
        </div>

        {/* Battle Visuals */}
        <div className="grid grid-cols-2 gap-4 p-6 bg-gradient-to-b from-zinc-900 to-black/40">
          {/* Opponent Side */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-full bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black text-white uppercase italic">{activeO?.name}</span>
                <span className="text-[10px] text-zinc-500 font-bold">LVL {activeO?.level}</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: `${(oHP[oIdx] / (activeO?.baseStats.hp * 3)) * 100}%` }}
                  className="h-full bg-rose-500"
                />
              </div>
            </div>
            <motion.div 
              animate={{ 
                x: isOpponentAttacking ? -50 : 0,
                scale: isOpponentBeingHit ? [1, 1.2, 1] : 1,
                opacity: isOpponentBeingHit ? [1, 0.5, 1] : 1
              }}
              className="text-6xl"
            >
              {activeO?.sprite || '👾'}
            </motion.div>
          </div>

          {/* Player Side */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-full bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black text-white uppercase italic">{activeP?.name}</span>
                <span className="text-[10px] text-zinc-500 font-bold">LVL {activeP?.level}</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: `${(pHP[pIdx] / (activeP?.baseStats.hp * 3)) * 100}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>
            <motion.div 
              animate={{ 
                x: isAttacking ? 50 : 0,
                scale: isBeingHit ? [1, 1.2, 1] : 1,
                opacity: isBeingHit ? [1, 0.5, 1] : 1
              }}
              className="text-6xl scale-x-[-1] relative"
            >
              {activeP?.sprite || '👾'}
              <AnimatePresence>
                {opponentMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: -40, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap shadow-xl z-50"
                  >
                    {opponentMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Chat Input */}
        <form onSubmit={sendChat} className="px-6 py-2 bg-zinc-950/30 border-y border-white/5 flex gap-2">
          <input 
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Enviar mensaje..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
          />
          <button type="submit" className="bg-indigo-600 px-4 py-2 rounded-xl text-xs font-bold text-white uppercase tracking-widest">
            Enviar
          </button>
        </form>

        {/* Log */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2 font-mono text-xs custom-scrollbar bg-black/40">
          {log.map((entry, i) => (
            <div key={i} className="text-zinc-400 border-l-2 border-white/5 pl-3 py-1">
              {entry}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        {/* Controls */}
        <div className="p-6 bg-zinc-950/80 backdrop-blur-xl border-t border-white/5">
          {status === 'finished' ? (
            <div className="text-center space-y-4">
              <h3 className={`text-4xl font-black uppercase italic ${winner === 'player' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {winner === 'player' ? '¡VICTORIA!' : 'DERROTA'}
              </h3>
              <button 
                onClick={() => setStatus('idle')}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all"
              >
                Volver al Lobby
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {activeP?.moves.map((move, i) => (
                <button
                  key={i}
                  disabled={isWaiting}
                  onClick={() => submitMove(move)}
                  className={`p-4 rounded-2xl border font-black uppercase tracking-widest text-xs transition-all flex flex-col items-center gap-1 ${
                    isWaiting 
                      ? 'bg-zinc-800 border-white/5 text-zinc-600' 
                      : 'bg-white/5 border-white/10 text-white hover:bg-indigo-600/20 hover:border-indigo-500/50'
                  }`}
                >
                  <span>{move.name}</span>
                  <span className="text-[8px] opacity-50">PWR: {move.power}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="relative overflow-hidden rounded-[40px] bg-zinc-900 border border-white/10 p-8 md:p-12">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-600/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-indigo-600/20 rounded-[32px] flex items-center justify-center text-indigo-400 shadow-inner">
            <Users size={48} className="md:size-64" />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-white mb-4">
              Arena <span className="text-indigo-500">Multijugador</span>
            </h1>
            <p className="text-zinc-400 text-lg max-w-xl">
              Enfréntate a otros entrenadores en tiempo real. Pon a prueba tu equipo y sube en el ranking global.
            </p>
            <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {isConnected ? 'Conectado' : 'Desconectado'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-zinc-900 rounded-[32px] border border-white/10 p-8 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent" />
          
          <AnimatePresence mode="wait">
            {status === 'idle' ? (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-8 relative z-10"
              >
                <div className="flex justify-center gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-12 h-12 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-zinc-500">
                      <Shield size={20} />
                    </div>
                  ))}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white uppercase italic">¿Listo para el desafío?</h3>
                  <p className="text-zinc-500 font-medium">Se buscará un oponente con un nivel similar al tuyo.</p>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest bg-indigo-500/10 py-2 px-4 rounded-full inline-block">
                    Tip: Abre el juego en otra pestaña para jugar contra ti mismo
                  </p>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={startSearch}
                    disabled={playerTeam.length === 0 || !isConnected}
                    className="group relative w-full px-12 py-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-indigo-600/20 overflow-hidden"
                  >
                    <span className="relative flex items-center justify-center gap-3 text-lg">
                      <Swords size={24} />
                      Buscar Partida Pública
                    </span>
                  </button>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="ID de Sala" 
                      value={privateRoomId} 
                      onChange={(e) => setPrivateRoomId(e.target.value)}
                      className="flex-1 bg-zinc-800 text-white p-4 rounded-2xl border border-white/10"
                    />
                    <button 
                      onClick={joinRoom}
                      disabled={!isConnected}
                      className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl"
                    >
                      Unirse
                    </button>
                    <button 
                      onClick={createRoom}
                      disabled={!isConnected}
                      className="px-6 py-4 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-widest rounded-2xl"
                    >
                      Crear
                    </button>
                  </div>
                  
                  {privateRoomId && (
                    <div className="flex items-center gap-2 bg-zinc-800 p-4 rounded-2xl border border-white/5">
                      <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest flex-1">ID: {privateRoomId}</span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(privateRoomId)}
                        className="text-indigo-400 hover:text-indigo-300 text-xs font-bold uppercase tracking-widest"
                      >
                        Copiar
                      </button>
                    </div>
                  )}
                </div>
                
                {playerTeam.length === 0 && (
                  <p className="text-rose-500 text-xs font-bold uppercase tracking-widest">
                    Debes tener al menos un Pokémon en tu equipo activo
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="searching"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="text-center space-y-8 relative z-10"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
                  <Loader2 size={80} className="text-indigo-500 animate-spin mx-auto relative z-10" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-white uppercase italic animate-pulse">Buscando Oponente...</h3>
                  <p className="text-zinc-500 font-medium tracking-widest uppercase text-xs">Tiempo estimado: <span className="text-white">0:15</span></p>
                </div>

                <button 
                  onClick={cancelSearch}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-black uppercase tracking-widest rounded-xl border border-white/10 transition-all"
                >
                  Cancelar Búsqueda
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 rounded-[32px] border border-white/10 p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <Trophy className="text-amber-500" size={20} />
              <h3 className="font-black text-white uppercase italic tracking-tighter">Tu Rango</h3>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Zap size={32} />
              </div>
              <div>
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Bronce III</p>
                <h4 className="text-xl font-black text-white uppercase italic">1,240 LP</h4>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-zinc-500">Progreso al siguiente rango</span>
                <span className="text-white">80%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-indigo-500 w-[80%]" />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-[32px] border border-white/10 p-6 space-y-4">
            <h3 className="font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
              <Users size={16} className="text-zinc-500" />
              Actividad Reciente
            </h3>
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
                    <div>
                      <p className="text-xs font-bold text-white">Entrenador_{i}42</p>
                      <p className="text-[10px] text-emerald-500 font-bold uppercase">Victoria</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-zinc-600 uppercase">Hace 2h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
