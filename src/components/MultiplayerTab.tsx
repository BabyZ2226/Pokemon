
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { PokemonInstance, Weather } from '../types';
import { Swords, Users, Loader2, Trophy, Shield, Zap, Heart, Play, Pause, FastForward, Sparkles, X, Coins, Dumbbell, LogOut, Briefcase, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, limit, getDocs, addDoc, updateDoc, doc, deleteDoc, getFirestore, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
import { calculateActualStat } from '../utils/battleLogic';

const getPokemonImage = (pokemon: any, isBack = false) => {
  if (!pokemon) return '';
  // Use pokedexNumber if available, fallback to id (which might be pokedex number in some cases)
  const pokedexId = pokemon.pokedexNumber || (pokemon.p ? pokemon.p.pokedexNumber : null) || (pokemon.p ? pokemon.p.id : pokemon.id);
  const isShiny = pokemon.p ? pokemon.p.isShiny : pokemon.isShiny;
  
  if (!pokedexId) return '';
  // Use animated sprites from Gen 5 for better polish where available (Gen 1-5)
  // For others, use high-quality official artwork for front and standard for back
  const shinyStr = isShiny ? 'shiny/' : '';
  
  if (isBack) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${shinyStr}${pokedexId}.png`;
  }
  
  // Official artwork is much better for the opponent view
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokedexId}.png`;
};

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    Fire: 'bg-orange-500',
    Water: 'bg-blue-500',
    Grass: 'bg-emerald-500',
    Electric: 'bg-yellow-400',
    Psychic: 'bg-purple-500',
    Fighting: 'bg-red-600',
    Dragon: 'bg-indigo-600',
    Normal: 'bg-zinc-400',
    Poison: 'bg-fuchsia-600',
    Ground: 'bg-amber-700',
    Rock: 'bg-stone-500',
    Bug: 'bg-lime-500',
    Ghost: 'bg-violet-800',
    Steel: 'bg-slate-400',
    Ice: 'bg-cyan-300',
    Fairy: 'bg-pink-300',
    Dark: 'bg-zinc-800',
  };
  return colors[type] || 'bg-zinc-400';
};

const getTypeGradient = (type: string) => {
  const colors: Record<string, string> = {
    Fire: 'from-orange-500 to-orange-600',
    Water: 'from-blue-500 to-blue-600',
    Grass: 'from-emerald-500 to-emerald-600',
    Electric: 'from-yellow-400 to-yellow-500',
    Psychic: 'from-purple-500 to-purple-600',
    Fighting: 'from-red-600 to-red-700',
    Dragon: 'from-indigo-600 to-indigo-700',
    Normal: 'from-zinc-400 to-zinc-500',
    Poison: 'from-fuchsia-600 to-fuchsia-700',
    Ground: 'from-amber-700 to-amber-800',
    Rock: 'from-stone-500 to-stone-600',
    Bug: 'from-lime-500 to-lime-600',
    Ghost: 'from-violet-800 to-violet-900',
    Steel: 'from-slate-400 to-slate-500',
    Ice: 'from-cyan-300 to-cyan-400',
    Fairy: 'from-pink-300 to-pink-400',
    Dark: 'from-zinc-800 to-zinc-900',
  };
  return colors[type] || 'from-zinc-400 to-zinc-500';
};

export default function MultiplayerTab({ roster: propRoster, activeTeamIds: propActiveTeamIds, onWin }: { roster?: any[], activeTeamIds?: string[], onWin?: () => void }) {
  const store = useGameStore();
  const roster = propRoster || store.roster;
  const activeTeamIds = propActiveTeamIds || store.activeTeamIds;
  const { addCoins, userId, uid, userName, currentRoom, subscribeToRoom, leaveRoom, submitMultiplayerMove, switchMultiplayerPokemon, useMultiplayerItem, inventory } = store;
  
  const [chatMessage, setChatMessage] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const [animState, setAnimState] = useState<{
    attacker: 'me' | 'opponent' | null;
    defender: 'me' | 'opponent' | null;
    lastMove: string | null;
  }>({ attacker: null, defender: null, lastMove: null });
  const [showVS, setShowVS] = useState(false);
  const [showMoves, setShowMoves] = useState(false);
  const [showPokemon, setShowPokemon] = useState(false);
  const [showBag, setShowBag] = useState(false);
  const [battleBackground, setBattleBackground] = useState<string>('https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1920&q=80');
  const prevStatus = useRef<string | null>(null);

  const prevLogsLength = useRef(currentRoom?.logs.length || 0);
  const hasInitializedLogs = useRef(false);
  const lastProcessedLogIdx = useRef(-1);
  const animTimeouts = useRef<NodeJS.Timeout[]>([]);
  const lastFaintedId = useRef<string | null>(null);

  const clearAnimTimeouts = () => {
    animTimeouts.current.forEach(clearTimeout);
    animTimeouts.current = [];
  };

  useEffect(() => {
    return () => clearAnimTimeouts();
  }, []);

  const playerTeam = React.useMemo(() => roster.filter(p => activeTeamIds.includes(p.id)), [roster, activeTeamIds]);

  const isPlayer1 = currentRoom?.player1?.id === userId;
  const me = isPlayer1 ? currentRoom?.player1 : currentRoom?.player2;
  const opponent = isPlayer1 ? currentRoom?.player2 : currentRoom?.player1;
  const activeP = me && me.team ? me.team[me.activeIdx] : null;
  const activeO = opponent && opponent.team ? opponent.team[opponent.activeIdx] : null;
  const isWaiting = currentRoom?.currentTurnId !== userId && currentRoom?.status !== 'finished';

  useEffect(() => {
    if (currentRoom?.status === 'playing' && !battleBackground.startsWith('data:')) {
      import('../utils/gemini').then(({ generateBattleBackground }) => {
        generateBattleBackground().then(setBattleBackground);
      });
    }
  }, [currentRoom?.status]);

  // Reset showMoves when it's no longer our turn
  useEffect(() => {
    if (isWaiting) {
      setShowMoves(false);
      setShowPokemon(false);
      setShowBag(false);
    }
  }, [isWaiting]);

  useEffect(() => {
    setAnimState({ attacker: null, defender: null, lastMove: null });
    clearAnimTimeouts();
  }, [activeP?.id, activeO?.id]);

  useEffect(() => {
    if (!currentRoom) return;

    // Initialize logs length on first room load to avoid playing old animations
    if (!hasInitializedLogs.current && currentRoom.logs.length > 0) {
      prevLogsLength.current = currentRoom.logs.length;
      lastProcessedLogIdx.current = currentRoom.logs.length - 1;
      hasInitializedLogs.current = true;
      return;
    }

    if (currentRoom.status === 'playing' && prevStatus.current !== 'playing') {
      setShowVS(true);
      setTimeout(() => setShowVS(false), 3000);
    }
    prevStatus.current = currentRoom.status;
    
    if (currentRoom.logs.length > 0 && lastProcessedLogIdx.current < currentRoom.logs.length - 1) {
      const lastLog = currentRoom.logs[currentRoom.logs.length - 1];
      lastProcessedLogIdx.current = currentRoom.logs.length - 1;
      
      if (lastLog.includes('usa')) {
        const parts = lastLog.split(': ¡');
        if (parts.length > 1) {
          const trainerName = parts[0];
          const movePart = parts[1].split(', usa ')[1].split('!')[0];
          
          const isMeAttacking = trainerName === userName;
          
          clearAnimTimeouts();
          setAnimState({
            attacker: isMeAttacking ? 'me' : 'opponent',
            defender: null,
            lastMove: movePart
          });

          // Sequence: Attack -> Damage -> Clear
          const t1 = setTimeout(() => {
            setAnimState(prev => ({ ...prev, attacker: null, defender: isMeAttacking ? 'opponent' : 'me' }));
            const t2 = setTimeout(() => {
              setAnimState({ attacker: null, defender: null, lastMove: null });
            }, 600);
            animTimeouts.current.push(t2);
          }, 500);
          animTimeouts.current.push(t1);
        }
      } else if (lastLog.includes('se ha debilitado')) {
        const pokemonName = lastLog.split('¡')[1].split(' se ha debilitado')[0];
        const isMeFainting = activeP && pokemonName === activeP.name;
        
        clearAnimTimeouts();
        setAnimState({
          attacker: null,
          defender: isMeFainting ? 'me' : 'opponent',
          lastMove: '¡DEBILITADO!'
        });
        
        const t3 = setTimeout(() => {
          setAnimState({ attacker: null, defender: null, lastMove: null });
        }, 1500);
        animTimeouts.current.push(t3);
      } else if (lastLog.includes('retira a') || lastLog.includes('Adelante')) {
        clearAnimTimeouts();
        setAnimState({ attacker: null, defender: null, lastMove: null });
      }
      
      prevLogsLength.current = currentRoom.logs.length;
    }
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentRoom?.logs, userName, activeP?.name, activeO?.name]);

  // Auto-open pokemon menu when active pokemon faints
  useEffect(() => {
    if (me && activeP && me.hp[me.activeIdx] <= 0 && currentRoom?.status === 'playing' && currentRoom.currentTurnId === userId) {
      if (lastFaintedId.current !== activeP.id) {
        setShowPokemon(true);
        lastFaintedId.current = activeP.id;
      }
    } else if (activeP && me && me.hp[me.activeIdx] > 0) {
      lastFaintedId.current = null;
    }
  }, [me?.hp[me?.activeIdx], activeP?.id, currentRoom?.status, currentRoom?.currentTurnId, userId]);

  const [gameMode, setGameMode] = useState<'competitive' | 'free'>('competitive');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleRoomAction = async () => {
    if (roomCode) {
      // Join existing room
      try {
        const roomDoc = await getDoc(doc(getFirestore(), 'rooms', roomCode));
        if (!roomDoc.exists()) {
          alert('Sala no encontrada');
          return;
        }
        const data = roomDoc.data();
        if (data.status !== 'waiting') {
          alert('La sala ya está llena o el combate ha comenzado');
          return;
        }
        
        const myPlayer = {
          id: userId,
          uid: uid || 'anonymous',
          name: userName,
          team: playerTeam,
          activeIdx: 0,
          hp: playerTeam.map(p => calculateActualStat(p, 'hp'))
        };

        await updateDoc(doc(getFirestore(), 'rooms', roomCode), {
          status: 'playing',
          player2: myPlayer,
          currentTurnId: data.player1.id,
          logs: [...data.logs, `¡Combate iniciado contra ${userName}!`],
          updatedAt: Date.now()
        });
        subscribeToRoom(roomCode, userId);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomCode}`);
      }
    } else {
      // Create new room
      try {
        const roomsRef = collection(getFirestore(), 'rooms');
        const newRoom = {
          status: 'waiting',
          player1: {
            id: userId,
            uid: uid || 'anonymous',
            name: userName,
            team: playerTeam,
            activeIdx: 0,
            hp: playerTeam.map(p => calculateActualStat(p, 'hp'))
          },
          player2: null,
          currentTurnId: userId,
          logs: ['¡Esperando oponente...'],
          winnerId: null,
          updatedAt: Date.now(),
          isPrivate: false,
          gameMode: gameMode
        };
        const docRef = await addDoc(roomsRef, newRoom);
        subscribeToRoom(docRef.id, userId);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'rooms');
      }
    }
  };

  // ... (dentro del JSX de MultiplayerTab)
  {!currentRoom && (
    <div className="flex flex-col gap-4 p-6 bg-zinc-900 rounded-3xl border border-white/10">
      <h3 className="text-xl font-black text-white uppercase">Nueva Partida</h3>
      <div className="flex gap-4">
        <button 
          onClick={() => setGameMode('competitive')}
          className={`flex-1 p-4 rounded-xl border ${gameMode === 'competitive' ? 'bg-indigo-600 border-indigo-500' : 'bg-zinc-800 border-white/5'}`}
        >
          Competitivo
        </button>
        <button 
          onClick={() => setGameMode('free')}
          className={`flex-1 p-4 rounded-xl border ${gameMode === 'free' ? 'bg-indigo-600 border-indigo-500' : 'bg-zinc-800 border-white/5'}`}
        >
          Libre
        </button>
      </div>
      <input 
        type="text" 
        placeholder="Código de sala (opcional)" 
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
        className="p-4 rounded-xl bg-black/40 border border-white/10 text-white"
      />
      <button 
        onClick={handleRoomAction}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase rounded-xl"
      >
        {roomCode ? 'Unirse a sala' : 'Crear sala'}
      </button>
    </div>
  )}


  const cancelSearch = async () => {
    try {
      if (currentRoom && currentRoom.status === 'waiting' && currentRoom.player1.id === userId) {
        await deleteDoc(doc(getFirestore(), 'rooms', currentRoom.id!));
      }
      leaveRoom();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rooms/${currentRoom?.id}`);
    }
  };

  const submitMove = (move: any) => {
    submitMultiplayerMove(move);
  };

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRoom || !chatMessage.trim()) return;
    try {
      const newLogs = [...currentRoom.logs, `${userName}: ${chatMessage}`];
      await updateDoc(doc(getFirestore(), 'rooms', currentRoom.id!), { logs: newLogs });
      setChatMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${currentRoom.id}`);
    }
  };

  const handleFinish = () => {
    if (currentRoom?.winnerId === userId) {
      if (onWin) onWin();
      addCoins(5000);
    }
    leaveRoom();
  };

  const handleSurrender = async () => {
    if (!currentRoom) return;
    const roomId = currentRoom.id;
    try {
      const opponentId = currentRoom.player1.id === userId ? currentRoom.player2?.id : currentRoom.player1.id;
      await updateDoc(doc(getFirestore(), 'rooms', roomId!), {
        status: 'finished',
        winnerId: opponentId,
        logs: [...currentRoom.logs, `¡${userName} ha huido del combate!`]
      });
    } catch (error) {
      console.error("Error surrendering:", error);
    } finally {
      leaveRoom();
    }
  };

  if (currentRoom && (currentRoom.status === 'playing' || currentRoom.status === 'finished') && me && opponent && activeP && activeO) {
    return (
      <motion.div
        key="multiplayer-battle"
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col"
      >
        {/* VS Screen Overlay */}
        <AnimatePresence>
          {showVS && opponent && activeP && activeO && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 overflow-hidden"
            >
              <motion.div
                initial={{ x: -500, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="absolute left-0 w-1/2 h-full flex flex-col items-center justify-center bg-blue-900/20"
              >
                <img 
                  src={getPokemonImage(activeP, true)} 
                  alt={activeP?.name || 'Pokemon'} 
                  className="w-64 h-64 object-contain drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]"
                  referrerPolicy="no-referrer"
                />
                <h2 className="text-4xl font-black text-blue-400 italic mt-4 uppercase tracking-tighter">{userName}</h2>
              </motion.div>

              <motion.div
                initial={{ scale: 5, opacity: 0, rotate: -45 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="z-10 bg-white text-black font-black text-8xl px-8 py-4 italic skew-x-[-12deg] shadow-[0_0_50px_rgba(255,255,255,0.5)]"
              >
                VS
              </motion.div>

              <motion.div
                initial={{ x: 500, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="absolute right-0 w-1/2 h-full flex flex-col items-center justify-center bg-red-900/20"
              >
                <img 
                  src={getPokemonImage(activeO, false)} 
                  alt={activeO?.name || 'Pokemon'} 
                  className="w-64 h-64 object-contain drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]"
                  referrerPolicy="no-referrer"
                />
                <h2 className="text-4xl font-black text-red-400 italic mt-4 uppercase tracking-tighter">{opponent?.name || 'Rival'}</h2>
              </motion.div>

              {/* Background elements */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ background: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* VS Screen Overlay */}
        <AnimatePresence>
          {showVS && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
            >
              <motion.div 
                initial={{ x: -500, skewX: -20 }}
                animate={{ x: 0, skewX: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute left-0 w-full h-full bg-indigo-600/20 border-r-8 border-indigo-500"
              />
              <motion.div 
                initial={{ x: 500, skewX: -20 }}
                animate={{ x: 0, skewX: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute right-0 w-full h-full bg-rose-600/20 border-l-8 border-rose-500"
              />
              
              <div className="relative flex flex-col items-center gap-8 md:gap-16 z-10">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-24 h-24 md:w-48 md:h-48 bg-indigo-500 rounded-full border-8 border-white shadow-[0_0_50px_rgba(99,102,241,0.5)] flex items-center justify-center">
                    <Users size={48} className="md:size-96 text-white" />
                  </div>
                  <span className="text-2xl md:text-5xl font-black text-white uppercase italic tracking-tighter drop-shadow-lg">{me?.name}</span>
                </motion.div>

                <motion.div
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-6xl md:text-9xl font-black text-white italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]"
                >
                  VS
                </motion.div>

                <motion.div
                  initial={{ scale: 0, rotate: 20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12, delay: 0.2 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-24 h-24 md:w-48 md:h-48 bg-rose-500 rounded-full border-8 border-white shadow-[0_0_50px_rgba(244,63,94,0.5)] flex items-center justify-center">
                    <Shield size={48} className="md:size-96 text-white" />
                  </div>
                  <span className="text-2xl md:text-5xl font-black text-white uppercase italic tracking-tighter drop-shadow-lg">{opponent?.name}</span>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Turn Banner */}
        <AnimatePresence>
          {!isWaiting && currentRoom.status === 'playing' && !showVS && (
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="absolute top-20 left-4 z-40 pointer-events-none"
            >
              <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 px-4 py-2 rounded-xl flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-black text-emerald-400 uppercase tracking-widest italic">Tu Turno</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Move Name Pop-up */}
        <AnimatePresence>
          {animState.lastMove && (
            <motion.div
              key={animState.lastMove}
              initial={{ scale: 0, opacity: 0, y: 50 }}
              animate={{ scale: 1.2, opacity: 1, y: 0 }}
              exit={{ scale: 1.5, opacity: 0, y: -50 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
            >
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 rounded-full border-4 border-white shadow-[0_0_50px_rgba(99,102,241,0.8)]">
                <span className="text-2xl md:text-4xl font-black text-white uppercase italic tracking-tighter whitespace-nowrap drop-shadow-lg">
                  {animState.lastMove}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Battle Header */}
        <div className="h-14 md:h-16 border-b border-white/5 bg-zinc-900 flex items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-lg md:text-xl">🏆</span>
              <span className="text-[10px] md:text-sm font-black italic uppercase hidden sm:block">{me?.name || 'Jugador'}</span>
            </div>
            <span className="text-zinc-600 font-black italic text-xs md:text-base">VS</span>
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-[10px] md:text-sm font-black italic uppercase hidden sm:block">{opponent?.name || 'Rival'}</span>
              <span className="text-lg md:text-xl">⚔️</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
              <div className={`w-2 h-2 rounded-full ${isWaiting ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="text-xs font-black text-white uppercase tracking-widest">
                {currentRoom.status === 'finished' ? 'Finalizado' : (isWaiting ? 'Esperando...' : 'Tu Turno')}
              </span>
            </div>
            <button 
              onClick={leaveRoom}
              className="p-2 bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 rounded-xl border border-white/10 transition-all"
              title="Forzar Salida"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Battle Arena */}
        <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
            style={{ 
              backgroundImage: `url('${battleBackground}')`,
              filter: animState.defender ? 'contrast(1.2) brightness(0.8)' : 'none'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
            
            {/* Dynamic Particles/Sparkles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(10)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ 
                    opacity: [0, 0.5, 0],
                    y: -100,
                    x: Math.random() * 200 - 100
                  }}
                  transition={{ 
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 5
                  }}
                  className="absolute bottom-0 left-1/2 w-1 h-1 bg-white rounded-full blur-[1px]"
                  style={{ left: `${Math.random() * 100}%` }}
                />
              ))}
            </div>
          </div>
          
          {/* Visual Effects Layer */}
          <AnimatePresence>
            {currentRoom.currentTurnId !== userId && currentRoom.status === 'playing' && opponent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 flex items-center gap-3"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-white font-bold text-sm uppercase tracking-widest">Esperando a {opponent?.name || 'Rival'}...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full h-full relative z-10 flex flex-col">
            {/* UI Layer - Top Row: Opponent Stats (Top Left) */}
            <div className="p-4 md:p-8 flex justify-start z-30">
              <AnimatePresence mode="wait">
                {activeO && (
                  <motion.div 
                    key={activeO.id}
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ 
                      x: 0, 
                      opacity: 1,
                      scale: animState.defender === 'opponent' ? [1, 1.05, 1] : 1,
                      rotate: animState.defender === 'opponent' ? [-1, 1, -1, 1, 0] : 0
                    }}
                    exit={{ x: -100, opacity: 0, transition: { duration: 0.3 } }}
                    className="bg-white/20 backdrop-blur-xl border border-white/20 p-2 md:p-3 w-56 md:w-80 shadow-2xl relative overflow-hidden rounded-r-3xl"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)' }}
                  >
                    <div className="pr-8">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1 md:gap-2">
                          <span className="text-sm md:text-xl font-black text-white uppercase tracking-tight truncate drop-shadow-md">{activeO?.name || 'Pokemon'}</span>
                          <span className="text-blue-400 font-bold text-xs md:text-sm">♂</span>
                        </div>
                        <span className="text-[10px] md:text-lg font-bold text-white/80 italic">Lv{activeO?.level || 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-orange-500 text-[8px] md:text-[10px] font-black text-white px-1 rounded-sm leading-none py-0.5 shadow-sm">HP</div>
                        <div className="flex-1 h-2 md:h-3 bg-black/40 rounded-full overflow-hidden p-[1px] md:p-[2px] border border-white/10 relative">
                          {/* Ghost Bar (Damage taken effect) */}
                          <motion.div 
                            animate={{ 
                              width: `${activeO ? (opponent.hp[opponent.activeIdx] / calculateActualStat(activeO, 'hp')) * 100 : 0}%`
                            }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                            className="absolute inset-0 bg-white/40 rounded-full"
                          />
                          {/* Main HP Bar */}
                          <motion.div 
                            animate={{ 
                              width: `${activeO ? (opponent.hp[opponent.activeIdx] / calculateActualStat(activeO, 'hp')) * 100 : 0}%`,
                              backgroundColor: activeO && (opponent.hp[opponent.activeIdx] / calculateActualStat(activeO, 'hp')) < 0.2 ? '#f43f5e' : 
                                             activeO && (opponent.hp[opponent.activeIdx] / calculateActualStat(activeO, 'hp')) < 0.5 ? '#f59e0b' : '#10b981'
                            }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] relative z-10"
                          />
                        </div>
                      </div>
                      <div className="text-left text-[10px] md:text-lg font-black text-white tabular-nums tracking-tighter drop-shadow-sm">
                        {Math.ceil(opponent.hp[opponent.activeIdx])} / {activeO ? calculateActualStat(activeO, 'hp') : 100}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Middle Row: Player Stats (Middle Right) */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 p-4 md:p-8 flex justify-end z-30 w-full pointer-events-none">
              <AnimatePresence mode="wait">
                {activeP && (
                  <motion.div 
                    key={activeP.id}
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ 
                      x: 0, 
                      opacity: 1,
                      scale: animState.defender === 'me' ? [1, 1.05, 1] : 1,
                      rotate: animState.defender === 'me' ? [-1, 1, -1, 1, 0] : 0
                    }}
                    exit={{ x: 100, opacity: 0, transition: { duration: 0.3 } }}
                    className="bg-white/20 backdrop-blur-xl border border-white/20 p-2 md:p-3 w-64 md:w-96 shadow-2xl relative overflow-hidden pointer-events-auto rounded-l-3xl"
                    style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)' }}
                  >
                    <div className="pl-10">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1 md:gap-2">
                          <span className="text-sm md:text-xl font-black text-white uppercase tracking-tight truncate drop-shadow-md">{activeP?.name || 'Pokemon'}</span>
                          <span className="text-blue-400 font-bold text-xs md:text-sm">♂</span>
                        </div>
                        <span className="text-[10px] md:text-lg font-bold text-white/80 italic">Lv{activeP?.level || 1}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="bg-orange-500 text-[8px] md:text-[10px] font-black text-white px-1 rounded-sm leading-none py-0.5 shadow-sm">HP</div>
                        <div className="flex-1 h-2 md:h-3 bg-black/40 rounded-full overflow-hidden p-[1px] md:p-[2px] border border-white/10 relative">
                          {/* Ghost Bar (Damage taken effect) */}
                          <motion.div 
                            animate={{ 
                              width: `${activeP ? (me.hp[me.activeIdx] / calculateActualStat(activeP, 'hp')) * 100 : 0}%`
                            }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                            className="absolute inset-0 bg-white/40 rounded-full"
                          />
                          {/* Main HP Bar */}
                          <motion.div 
                            animate={{ 
                              width: `${activeP ? (me.hp[me.activeIdx] / calculateActualStat(activeP, 'hp')) * 100 : 0}%`,
                              backgroundColor: activeP && (me.hp[me.activeIdx] / calculateActualStat(activeP, 'hp')) < 0.2 ? '#f43f5e' : 
                                             activeP && (me.hp[me.activeIdx] / calculateActualStat(activeP, 'hp')) < 0.5 ? '#f59e0b' : '#10b981'
                            }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] relative z-10"
                          />
                        </div>
                      </div>
                      <div className="text-right text-[10px] md:text-lg font-black text-white tabular-nums tracking-tighter drop-shadow-sm">
                        {Math.ceil(me.hp[me.activeIdx])} / {activeP ? calculateActualStat(activeP, 'hp') : 100}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sprites Area - Absolute positioned over everything */}
            <div className="absolute inset-0 pointer-events-none z-10">
              {/* Player Sprite - Bottom Left */}
              <div className="absolute left-[5%] md:left-[10%] bottom-[20%] md:bottom-[25%]">
                {/* Battle Base Platform */}
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-64 md:w-[500px] h-16 md:h-32 bg-gradient-to-b from-emerald-400/40 to-emerald-900/60 rounded-[100%] border-b-8 border-emerald-950/40 shadow-[0_20px_50px_rgba(0,0,0,0.4)]" />
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-56 md:w-[440px] h-14 md:h-28 bg-emerald-500/20 rounded-[100%] border border-white/10" />
                
              <AnimatePresence initial={false}>
                  {activeP && (
                    <motion.div
                      key={activeP.id}
                      initial={{ x: -300, opacity: 0, scale: 0.5 }}
                      animate={
                        animState.attacker === 'me' ? { x: [0, 150, 0], scale: [1, 1.1, 1], opacity: 1 } :
                        animState.defender === 'me' && animState.lastMove === '¡DEBILITADO!' ? { opacity: 0, scale: 0.5 } :
                        animState.defender === 'me' ? { x: [-10, 10, -10, 10, 0], filter: ["brightness(1)", "brightness(2)", "brightness(1)"], opacity: 1 } :
                        opponent.hp[opponent.activeIdx] <= 0 && currentRoom.winnerId === userId ? { scale: [1, 1.2, 1], opacity: 1 } :
                        { x: 0, opacity: 1, scale: 1 }
                      }
                      exit={{ x: -300, opacity: 0, scale: 0.5, transition: { duration: 0.3 } }}
                      transition={
                        animState.attacker === 'me' ? { duration: 0.5 } :
                        animState.defender === 'me' ? { duration: 0.4 } :
                        { 
                          x: { type: "spring", stiffness: 300, damping: 30 },
                          opacity: { duration: 0.3 },
                          scale: { duration: 0.3 }
                        }
                      }
                      className="relative"
                    >
                      <motion.div
                        animate={
                          animState.attacker === 'me' ? { y: [0, -20, 0] } :
                          animState.defender === 'me' && animState.lastMove === '¡DEBILITADO!' ? { y: 100 } :
                          opponent.hp[opponent.activeIdx] <= 0 && currentRoom.winnerId === userId ? { y: [0, -20, 0] } :
                          { y: [0, -8, 0] }
                        }
                        transition={
                          animState.attacker === 'me' ? { duration: 0.5 } :
                          animState.defender === 'me' && animState.lastMove === '¡DEBILITADO!' ? { duration: 0.4 } :
                          opponent.hp[opponent.activeIdx] <= 0 && currentRoom.winnerId === userId ? { duration: 0.5 } :
                          { y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" } }
                        }
                      >
                        <img 
                          src={getPokemonImage(activeP, true)}
                          className="w-[200px] md:w-[380px] h-[200px] md:h-[380px] object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] filter brightness-110 contrast-110"
                          referrerPolicy="no-referrer"
                        />
                        {/* Active Glow */}
                        {!isWaiting && (
                          <motion.div 
                            animate={{ opacity: [0.2, 0.4, 0.2] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"
                          />
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Opponent Sprite - Top Right */}
              <div className="absolute right-[10%] md:right-[15%] top-[15%] md:top-[20%]">
                {/* Battle Base Platform */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 md:w-80 h-12 md:h-20 bg-gradient-to-b from-emerald-400/40 to-emerald-900/60 rounded-[100%] border-b-4 border-emerald-950/40 shadow-[0_10px_30px_rgba(0,0,0,0.4)]" />
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-40 md:w-64 h-10 md:h-16 bg-emerald-500/20 rounded-[100%] border border-white/10" />
                
                <AnimatePresence initial={false}>
                  {activeO && (
                    <motion.div
                      key={activeO.id}
                      initial={{ x: 300, opacity: 0, scale: 0.5 }}
                      animate={
                        animState.attacker === 'opponent' ? { x: [0, -150, 0], scale: [1, 1.1, 1], opacity: 1 } :
                        animState.defender === 'opponent' && animState.lastMove === '¡DEBILITADO!' ? { opacity: 0, scale: 0.5 } :
                        animState.defender === 'opponent' ? { x: [10, -10, 10, -10, 0], filter: ["brightness(1)", "brightness(2)", "brightness(1)"], opacity: 1 } :
                        me.hp[me.activeIdx] <= 0 && currentRoom.winnerId === opponent.id ? { scale: [1, 1.2, 1], opacity: 1 } :
                        { x: 0, opacity: 1, scale: 1 }
                      }
                      exit={{ x: 300, opacity: 0, scale: 0.5, transition: { duration: 0.3 } }}
                      transition={
                        animState.attacker === 'opponent' ? { duration: 0.5 } :
                        animState.defender === 'opponent' ? { duration: 0.4 } :
                        { 
                          x: { type: "spring", stiffness: 300, damping: 30 },
                          opacity: { duration: 0.3 },
                          scale: { duration: 0.3 }
                        }
                      }
                      className="relative"
                    >
                      <motion.div
                        animate={
                          animState.attacker === 'opponent' ? { y: [0, 20, 0] } :
                          animState.defender === 'opponent' && animState.lastMove === '¡DEBILITADO!' ? { y: 100 } :
                          me.hp[me.activeIdx] <= 0 && currentRoom.winnerId === opponent.id ? { y: [0, -20, 0] } :
                          { y: [0, 8, 0] }
                        }
                        transition={
                          animState.attacker === 'opponent' ? { duration: 0.5 } :
                          animState.defender === 'opponent' && animState.lastMove === '¡DEBILITADO!' ? { duration: 0.4 } :
                          me.hp[me.activeIdx] <= 0 && currentRoom.winnerId === opponent.id ? { duration: 0.5 } :
                          { y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" } }
                        }
                      >
                        <img 
                          src={getPokemonImage(activeO, false)}
                          className="w-[140px] md:w-[260px] h-[140px] md:h-[260px] object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]"
                          referrerPolicy="no-referrer"
                        />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Battle Log Overlay removed - now using message box */}
            </div>

            <div className="flex-1" />

            {/* Bottom Row: Classic Pokémon Battle Menu */}
            <div className="h-32 md:h-48 bg-black/40 backdrop-blur-xl border-t border-white/10 z-20 flex w-full">
              {/* Left: Message Box */}
              <div className="flex-1 bg-white/10 m-1 md:m-2 border border-white/20 rounded-lg md:rounded-xl p-3 md:p-6 flex items-center shadow-inner">
                <p className="text-white font-black text-sm md:text-2xl uppercase tracking-tight drop-shadow-md">
                  {isWaiting ? `Esperando a ${opponent?.name}...` : (currentRoom.logs.length > 0 ? currentRoom.logs[currentRoom.logs.length - 1] : `¿Qué hará ${activeP?.name}?`)}
                </p>
              </div>

              {/* Right: Action Grid */}
              <div className="w-1/2 md:w-1/3 p-1 md:p-2 bg-white/5 backdrop-blur-md rounded-l-3xl border-l border-white/10">
                {currentRoom.status === 'finished' ? (
                  <div className="h-full flex items-center justify-center">
                    <button 
                      onClick={handleFinish}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest py-4 px-8 rounded-2xl transition-all shadow-lg"
                    >
                      Finalizar
                    </button>
                  </div>
                ) : (
                  <div className="h-full grid grid-cols-2 gap-1 md:gap-2">
                    <button 
                      disabled={isWaiting}
                      onClick={() => setShowMoves(true)}
                      className="bg-gradient-to-br from-rose-500 to-rose-700 border-b-4 border-rose-900 rounded-lg md:rounded-xl flex items-center justify-center text-white font-black text-xs md:text-xl uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-lg"
                    >
                      LUCHA
                    </button>
                    <button 
                      disabled={isWaiting}
                      onClick={() => setShowBag(true)}
                      className="bg-gradient-to-br from-amber-500 to-amber-700 border-b-4 border-amber-900 rounded-lg md:rounded-xl flex items-center justify-center text-white font-black text-xs md:text-xl uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-lg"
                    >
                      MOCHILA
                    </button>
                    <button 
                      disabled={isWaiting}
                      onClick={() => setShowPokemon(true)}
                      className="bg-gradient-to-br from-emerald-500 to-emerald-700 border-b-4 border-emerald-900 rounded-lg md:rounded-xl flex items-center justify-center text-white font-black text-xs md:text-xl uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-lg"
                    >
                      POKÉMON
                    </button>
                    <button 
                      onClick={handleSurrender}
                      className="bg-gradient-to-br from-zinc-700 to-zinc-900 border-b-4 border-black rounded-lg md:rounded-xl flex items-center justify-center text-white font-black text-xs md:text-xl uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg"
                    >
                      HUIR
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Pokémon Selection Overlay */}
            <AnimatePresence>
              {showPokemon && !isWaiting && currentRoom.status === 'playing' && (
                <motion.div
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  exit={{ y: 100 }}
                  className="absolute bottom-0 left-0 w-full h-48 md:h-64 bg-[#303030] border-t-4 border-zinc-900 z-40 flex flex-col"
                >
                  <div className="p-2 md:p-4 border-b border-white/10 flex justify-between items-center">
                    <span className="text-white font-black uppercase tracking-widest text-sm md:text-xl">Seleccionar Pokémon</span>
                    <button onClick={() => setShowPokemon(false)} className="text-zinc-400 hover:text-white">
                      <X size={24} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-x-auto p-2 md:p-4 flex gap-2 md:gap-4 items-center">
                    {me.team.map((p, i) => (
                      <button
                        key={i}
                        disabled={i === me.activeIdx || me.hp[i] <= 0}
                        onClick={() => {
                          switchMultiplayerPokemon(i);
                          setShowPokemon(false);
                        }}
                        className={`flex-shrink-0 w-24 md:w-40 h-full rounded-xl p-2 md:p-4 flex flex-col items-center justify-center transition-all ${
                          i === me.activeIdx ? 'bg-indigo-600/40 border-2 border-indigo-500' : 
                          me.hp[i] <= 0 ? 'opacity-50 grayscale bg-zinc-800' : 'bg-zinc-800 hover:bg-zinc-700'
                        }`}
                      >
                        <img src={getPokemonImage(p)} className="w-12 md:w-20 h-12 md:h-20 object-contain" />
                        <span className="text-white font-bold text-[10px] md:text-sm uppercase mt-1 md:mt-2 truncate w-full text-center">{p.name}</span>
                        <div className="w-full h-1 bg-zinc-900 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${(me.hp[i] / 100) * 100}%` }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bag Overlay */}
            <AnimatePresence>
              {showBag && !isWaiting && currentRoom.status === 'playing' && (
                <motion.div
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  exit={{ y: 100 }}
                  className="absolute bottom-0 left-0 w-full h-48 md:h-64 bg-[#303030] border-t-4 border-zinc-900 z-40 flex flex-col"
                >
                  <div className="p-2 md:p-4 border-b border-white/10 flex justify-between items-center">
                    <span className="text-white font-black uppercase tracking-widest text-sm md:text-xl">Mochila</span>
                    <button onClick={() => setShowBag(false)} className="text-zinc-400 hover:text-white">
                      <X size={24} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 md:p-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {inventory.length > 0 ? inventory.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          useMultiplayerItem(item.id, me.activeIdx);
                          setShowBag(false);
                        }}
                        className="bg-zinc-800 hover:bg-zinc-700 rounded-xl p-2 md:p-4 flex items-center gap-2 md:gap-4 transition-all border border-white/5"
                      >
                        <div className="w-8 md:w-12 h-8 md:h-12 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-500">
                          <Briefcase size={20} />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-white font-bold text-[10px] md:text-sm uppercase">{item.name}</span>
                          <span className="text-zinc-500 text-[8px] md:text-xs font-bold">CANT: {item.quantity}</span>
                        </div>
                      </button>
                    )) : (
                      <div className="col-span-full flex flex-col items-center justify-center text-zinc-500 py-8">
                        <Briefcase size={32} className="mb-2 opacity-20" />
                        <span className="font-bold uppercase text-xs">No tienes objetos</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {showMoves && !isWaiting && currentRoom.status === 'playing' && (
                <motion.div
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  exit={{ y: 100 }}
                  className="absolute bottom-0 left-0 w-full h-32 md:h-48 bg-[#303030] border-t-4 border-zinc-900 z-30 flex"
                >
                  <div className="flex-[2] grid grid-cols-2 gap-1 md:gap-2 p-1 md:p-2">
                    {activeP.moves.map((move, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          submitMove(move);
                          setShowMoves(false);
                        }}
                        className={`rounded-lg md:rounded-xl ${getTypeColor(move.type)} border-b-4 border-black/20 flex flex-col items-start justify-center px-4 md:px-8 hover:brightness-110 active:scale-95 transition-all`}
                      >
                        <span className="text-black font-black text-xs md:text-2xl uppercase tracking-tight">{move.name}</span>
                        <span className="text-black/60 font-bold text-[8px] md:text-xs uppercase">{move.type}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 bg-white/10 backdrop-blur-xl m-1 md:m-2 border border-white/20 rounded-lg md:rounded-xl p-3 md:p-6 flex flex-col justify-center relative shadow-inner">
                    <button 
                      onClick={() => setShowMoves(false)}
                      className="absolute top-2 right-2 text-white/40 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white/60 font-bold text-xs md:text-xl uppercase">PP</span>
                      <span className="text-white font-black text-xs md:text-2xl">15/15</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 font-bold text-xs md:text-xl uppercase">TIPO</span>
                      <span className="text-white font-black text-xs md:text-2xl uppercase">NORMAL</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

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
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-zinc-900 rounded-[32px] border border-white/10 p-8 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent" />
          
          <AnimatePresence mode="wait">
            {!currentRoom ? (
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
                    onClick={handleRoomAction}
                    disabled={playerTeam.length === 0}
                    className="group relative w-full px-12 py-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-indigo-600/20 overflow-hidden"
                  >
                    <span className="relative flex items-center justify-center gap-3 text-lg">
                      <Swords size={24} />
                      Buscar Partida Pública
                    </span>
                  </button>
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
        </div>
      </div>
    </div>
  );
}
