import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { POKEDEX_BASE } from '../App';
import { PokemonInstance, Move, PokemonType, StatName, StatusCondition, Tournament } from '../types';
import { calculateActualStat } from '../utils/battleLogic';
import { Users, Plus, Key, Play, Search, X, Check, Trophy, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MultiplayerBattle from './MultiplayerBattle';
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

interface MultiplayerTabProps {
  roster?: PokemonInstance[];
  activeTeamIds?: string[];
  onWin?: () => void;
}

const MultiplayerTab: React.FC<MultiplayerTabProps> = React.memo(({ roster: propsRoster, activeTeamIds: propsActiveTeamIds, onWin }) => {
  const { 
    userId, 
    userName, 
    currentRoom, 
    currentTournament,
    createMultiplayerRoom, 
    joinMultiplayerRoomByCode, 
    leaveRoom,
    leaveTournament,
    deleteTournament,
    setRoomMode,
    startMultiplayerGame,
    findQuickMatch,
    cancelQuickMatch,
    isSearchingMatch,
    createTournament,
    joinTournament,
    playTournamentMatch,
    roster: storeRoster,
    activeTeamIds: storeActiveTeamIds
  } = useGameStore();

  const roster = propsRoster || storeRoster;
  const activeTeamIds = propsActiveTeamIds || storeActiveTeamIds;

  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'Competitive' | 'Free' | null>(null);
  const [freeModeTeam, setFreeModeTeam] = useState<PokemonInstance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSelectingPokemon, setIsSelectingPokemon] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const handlePlayMatch = async (matchId: 'semi1' | 'semi2' | 'final') => {
    try {
      setMatchError(null);
      await playTournamentMatch(matchId);
    } catch (error: any) {
      setMatchError(error.message);
      setTimeout(() => setMatchError(null), 3000);
    }
  };

  // Sync team with store when mode is set or changed
  useEffect(() => {
    if (currentRoom && currentRoom.status === 'waiting') {
      const isPlayer1 = currentRoom.player1.id === userId;
      const me = isPlayer1 ? currentRoom.player1 : currentRoom.player2;
      
      if (me) {
        let teamToSync: PokemonInstance[] = [];
        if (currentRoom.mode === 'Competitive') {
          teamToSync = activeTeamIds.map(id => roster.find(p => p.id === id)!).filter(Boolean);
        } else if (currentRoom.mode === 'Free') {
          teamToSync = freeModeTeam;
        }

        if (teamToSync.length > 0) {
          const hp = teamToSync.map(p => calculateActualStat(p, 'hp'));
          // Only sync if the team is different to avoid infinite loops
          const currentTeamIds = me.team.map(p => p.id).join(',');
          const newTeamIds = teamToSync.map(p => p.id).join(',');
          
          if (currentTeamIds !== newTeamIds) {
            useGameStore.getState().updateMultiplayerTeam(teamToSync, hp);
          }
        }
      }
    }
  }, [currentRoom?.mode, freeModeTeam, activeTeamIds, currentRoom?.status, currentRoom?.id]);

  const [isCreatingTournament, setIsCreatingTournament] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentIsPublic, setTournamentIsPublic] = useState(true);
  const [tournamentMode, setTournamentMode] = useState<'libre' | 'competitivo'>('libre');
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    const db = getFirestore();
    const q = query(
      collection(db, 'tournaments'),
      where('status', '==', 'waiting'),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tournaments: Tournament[] = [];
      snapshot.forEach((doc) => {
        tournaments.push({ id: doc.id, ...doc.data() } as Tournament);
      });
      setActiveTournaments(tournaments);
    }, (error) => {
      console.error("Error fetching tournaments:", error);
    });

    return () => unsubscribe();
  }, []);

  // Tournament View
  if (currentTournament) {
    const isHost = currentTournament.hostId === userId;

    return (
      <div className="flex flex-col h-full bg-zinc-950 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">{currentTournament.name}</h2>
            <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Torneo de 4 Jugadores</p>
          </div>
          <div className="flex gap-4">
            {isHost && (
              <button 
                onClick={() => deleteTournament(currentTournament.id)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-bold uppercase italic text-xs"
              >
                Eliminar Torneo
              </button>
            )}
            <button 
              onClick={leaveTournament}
              className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/20 transition-all font-bold uppercase italic text-xs"
            >
              Salir del Torneo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8">
            <h3 className="text-xl font-bold text-white mb-6 uppercase italic tracking-tight">Participantes ({currentTournament.players.length}/4)</h3>
            <div className="space-y-4">
              {[0, 1, 2, 3].map(i => {
                const p = currentTournament.players[i];
                return (
                  <div key={i} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                    {p ? (
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                          <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{p.name}</p>
                          <p className="text-[10px] text-zinc-500 uppercase font-mono">{p.id === currentTournament.hostId ? 'Anfitrión' : 'Jugador'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 opacity-30">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                          <Users className="w-5 h-5 text-zinc-600" />
                        </div>
                        <p className="font-bold text-zinc-600 italic">Esperando...</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">Bracket</h3>
              {matchError && <p className="text-red-400 text-xs font-bold animate-pulse">{matchError}</p>}
            </div>
            <div className="space-y-8 relative">
              {/* Semi Finals */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-center flex flex-col items-center justify-center">
                  <p className="text-[10px] text-zinc-500 uppercase font-mono mb-2">Semi 1</p>
                  <p className="text-xs font-bold text-white truncate mb-2">
                    {currentTournament.matches.semi1.player1Id ? currentTournament.players.find(x => x.id === currentTournament.matches.semi1.player1Id)?.name : '?'} vs {currentTournament.matches.semi1.player2Id ? currentTournament.players.find(x => x.id === currentTournament.matches.semi1.player2Id)?.name : '?'}
                  </p>
                  {currentTournament.status === 'semifinals' && !currentTournament.matches.semi1.winnerId && (currentTournament.matches.semi1.player1Id === userId || currentTournament.matches.semi1.player2Id === userId) && (
                    <button 
                      onClick={() => handlePlayMatch('semi1')}
                      className="px-4 py-1 bg-blue-500 text-white rounded-lg text-xs font-bold uppercase italic hover:bg-blue-600 transition-all"
                    >
                      Jugar
                    </button>
                  )}
                  {currentTournament.matches.semi1.winnerId && (
                    <p className="text-xs font-bold text-green-400">Ganador: {currentTournament.players.find(x => x.id === currentTournament.matches.semi1.winnerId)?.name}</p>
                  )}
                </div>
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-center flex flex-col items-center justify-center">
                  <p className="text-[10px] text-zinc-500 uppercase font-mono mb-2">Semi 2</p>
                  <p className="text-xs font-bold text-white truncate mb-2">
                    {currentTournament.matches.semi2.player1Id ? currentTournament.players.find(x => x.id === currentTournament.matches.semi2.player1Id)?.name : '?'} vs {currentTournament.matches.semi2.player2Id ? currentTournament.players.find(x => x.id === currentTournament.matches.semi2.player2Id)?.name : '?'}
                  </p>
                  {currentTournament.status === 'semifinals' && !currentTournament.matches.semi2.winnerId && (currentTournament.matches.semi2.player1Id === userId || currentTournament.matches.semi2.player2Id === userId) && (
                    <button 
                      onClick={() => handlePlayMatch('semi2')}
                      className="px-4 py-1 bg-blue-500 text-white rounded-lg text-xs font-bold uppercase italic hover:bg-blue-600 transition-all"
                    >
                      Jugar
                    </button>
                  )}
                  {currentTournament.matches.semi2.winnerId && (
                    <p className="text-xs font-bold text-green-400">Ganador: {currentTournament.players.find(x => x.id === currentTournament.matches.semi2.winnerId)?.name}</p>
                  )}
                </div>
              </div>
              {/* Final */}
              <div className="max-w-[200px] mx-auto p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-center flex flex-col items-center justify-center">
                <p className="text-[10px] text-blue-400 uppercase font-mono mb-2">Gran Final</p>
                <p className="text-xs font-bold text-white mb-2">
                  {currentTournament.matches.final.player1Id ? currentTournament.players.find(x => x.id === currentTournament.matches.final.player1Id)?.name : 'TBD'} vs {currentTournament.matches.final.player2Id ? currentTournament.players.find(x => x.id === currentTournament.matches.final.player2Id)?.name : 'TBD'}
                </p>
                {currentTournament.status === 'final' && !currentTournament.matches.final.winnerId && (currentTournament.matches.final.player1Id === userId || currentTournament.matches.final.player2Id === userId) && (
                  <button 
                    onClick={() => handlePlayMatch('final')}
                    className="px-4 py-1 bg-blue-500 text-white rounded-lg text-xs font-bold uppercase italic hover:bg-blue-600 transition-all"
                  >
                    Jugar
                  </button>
                )}
                {currentTournament.matches.final.winnerId && (
                  <p className="text-xs font-bold text-green-400">Campeón: {currentTournament.players.find(x => x.id === currentTournament.matches.final.winnerId)?.name}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {currentTournament.status === 'waiting' && (
          <div className="flex justify-center">
            <div className="px-12 py-4 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-full font-black italic uppercase tracking-tighter text-xl">
              Esperando Jugadores ({currentTournament.players.length}/4)...
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentRoom?.status === 'playing' || currentRoom?.status === 'finished') {
    return <MultiplayerBattle />;
  }

  const handleCreateRoom = async () => {
    setIsCreating(true);
    const team = activeTeamIds.map(id => roster.find(p => p.id === id)!).filter(Boolean);
    const hp = team.map(p => calculateActualStat(p, 'hp'));
    await createMultiplayerRoom(false, '', team, hp);
    setIsCreating(false);
  };

  const handleJoinRoom = async () => {
    if (!roomCode) return;
    setIsJoining(true);
    await joinMultiplayerRoomByCode(roomCode);
    setIsJoining(false);
  };

  const handleSelectMode = async (mode: 'Competitive' | 'Free') => {
    setSelectedMode(mode);
    if (currentRoom && currentRoom.player1.id === userId) {
      await setRoomMode(mode);
    }
  };

  const generateFreeModePokemon = (base: any): PokemonInstance => {
    const level = 50;
    const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    
    // Mock moves for now, in a real app we'd have a move list
    const mockMoves: Move[] = [
      { id: '1', name: 'Ataque Rápido', type: 'Normal', category: 'Physical', power: 40, accuracy: 100 },
      { id: '2', name: 'Golpe Cuerpo', type: 'Normal', category: 'Physical', power: 85, accuracy: 100 },
      { id: '3', name: 'Protección', type: 'Normal', category: 'Status', power: 0, accuracy: 100 },
      { id: '4', name: 'Sustituto', type: 'Normal', category: 'Status', power: 0, accuracy: 100 },
    ];

    const instance: PokemonInstance = {
      id: Math.random().toString(36).substring(2, 9),
      pokedexNumber: base.id,
      name: base.name,
      sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${base.id}.png`,
      types: base.types,
      level,
      exp: 0,
      rarity: base.rarity || 'Common',
      isShiny: false,
      baseStats: base.stats || { hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 },
      currentStats: base.stats || { hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 },
      ivs,
      evs,
      nature: 'Adamant',
      ability: { name: 'Habilidad Especial', description: 'Mejor habilidad para este Pokémon.' },
      moves: mockMoves,
      fatigue: 0,
      morale: 'Excellent',
      isInjured: false,
      injuryDaysRemaining: 0,
      currentHp: 100, // Will be calculated
      currentOVR: 0,
      happiness: 255,
      megaEvolved: false
    };

    instance.currentHp = calculateActualStat(instance, 'hp');
    return instance;
  };

  const handleAddPokemonToFreeTeam = (base: any) => {
    if (freeModeTeam.length >= 6) return;
    const newPokemon = generateFreeModePokemon(base);
    setFreeModeTeam([...freeModeTeam, newPokemon]);
  };

  const handleRemovePokemonFromFreeTeam = (id: string) => {
    setFreeModeTeam(freeModeTeam.filter(p => p.id !== id));
  };

  const handleStartGame = async () => {
    if (!currentRoom) return;

    let team: PokemonInstance[] = [];
    if (currentRoom.mode === 'Competitive') {
      team = activeTeamIds.map(id => roster.find(p => p.id === id)!).filter(Boolean);
    } else {
      team = freeModeTeam;
    }

    if (team.length === 0) {
      alert('Debes tener al menos un Pokémon en tu equipo.');
      return;
    }

    const hp = team.map(p => calculateActualStat(p, 'hp'));

    await startMultiplayerGame({
      team,
      hp
    });
  };

  const filteredPokedex = POKEDEX_BASE.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 20);

  if (currentRoom) {
    const isPlayer1 = currentRoom.player1.id === userId;
    const isWaitingForPlayer2 = !currentRoom.player2;
    const mode = currentRoom.mode;

    const isReadyToStart = !isWaitingForPlayer2 && 
      currentRoom.player1.team.length > 0 && 
      currentRoom.player2?.team.length > 0;

    return (
      <div className="flex flex-col h-full bg-zinc-950 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Sala de Combate</h2>
            <p className="text-zinc-500 font-mono text-sm">CÓDIGO: <span className="text-blue-400 font-bold">{currentRoom.roomCode}</span></p>
          </div>
          <button 
            onClick={leaveRoom}
            className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/20 transition-all font-bold uppercase italic text-xs"
          >
            Abandonar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Player 1 */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded-bl-lg">Anfitrión</div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{currentRoom.player1.name}</h3>
                <p className="text-zinc-500 text-xs uppercase font-mono">Jugador 1</p>
              </div>
            </div>
            <div className="flex gap-2">
              {currentRoom.player1.team.map((p, i) => (
                <div key={i} className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                  <img loading="lazy" src={p.sprite} alt={p.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          </div>

          {/* Player 2 */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
            {currentRoom.player2 ? (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                    <Users className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{currentRoom.player2.name}</h3>
                    <p className="text-zinc-500 text-xs uppercase font-mono">Jugador 2</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {currentRoom.player2.team.map((p, i) => (
                    <div key={i} className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                      <img loading="lazy" src={p.sprite} alt={p.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4 animate-pulse">
                  <Users className="w-6 h-6 text-zinc-600" />
                </div>
                <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Esperando oponente...</p>
                <p className="text-zinc-600 text-[10px] mt-2">Comparte el código con un amigo</p>
              </div>
            )}
          </div>
        </div>

        {/* Mode Selection & Team Prep */}
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8">
          {!mode ? (
            isPlayer1 ? (
              <div className="text-center">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-6">Selecciona el Modo de Juego</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <button 
                    onClick={() => handleSelectMode('Competitive')}
                    className="group relative h-40 rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Trophy className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                    <span className="block text-xl font-black italic uppercase text-white">Competitivo</span>
                    <span className="block text-zinc-500 text-[10px] uppercase font-mono mt-1">Usa tu propio equipo</span>
                  </button>
                  <button 
                    onClick={() => handleSelectMode('Free')}
                    className="group relative h-40 rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Zap className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                    <span className="block text-xl font-black italic uppercase text-white">Libre</span>
                    <span className="block text-zinc-500 text-[10px] uppercase font-mono mt-1">Elige 6 Pokémon (Nivel 50)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">El anfitrión está seleccionando el modo...</p>
              </div>
            )
          ) : (
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mode === 'Competitive' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {mode === 'Competitive' ? <Trophy className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  </div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Modo {mode === 'Competitive' ? 'Competitivo' : 'Libre'}</h3>
                </div>
                {isPlayer1 && (
                  <button 
                    onClick={() => handleSelectMode(mode === 'Competitive' ? 'Free' : 'Competitive')}
                    className="text-zinc-500 hover:text-white text-xs uppercase font-mono underline underline-offset-4"
                  >
                    Cambiar Modo
                  </button>
                )}
              </div>

              {mode === 'Free' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-4">
                    {freeModeTeam.map((p) => (
                      <div key={p.id} className="relative group w-24 h-24 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <img loading="lazy" src={p.sprite} alt={p.name} className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => handleRemovePokemonFromFreeTeam(p.id)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-zinc-800 rounded text-[8px] font-bold text-zinc-400 uppercase">LVL 50</div>
                      </div>
                    ))}
                    {freeModeTeam.length < 6 && (
                      <button 
                        onClick={() => setIsSelectingPokemon(true)}
                        className="w-24 h-24 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 flex flex-col items-center justify-center transition-all"
                      >
                        <Plus className="w-6 h-6 text-zinc-600" />
                        <span className="text-[10px] text-zinc-600 font-bold uppercase mt-1">Añadir</span>
                      </button>
                    )}
                  </div>

                  {isSelectingPokemon && (
                    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-white">Seleccionar Pokémon</h4>
                        <button onClick={() => setIsSelectingPokemon(false)}><X className="w-5 h-5 text-zinc-500" /></button>
                      </div>
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input 
                          type="text" 
                          placeholder="Buscar por nombre..." 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {filteredPokedex.map(p => (
                          <button 
                            key={p.id}
                            onClick={() => handleAddPokemonToFreeTeam(p)}
                            className="flex items-center gap-3 p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 transition-all"
                          >
                            <img 
                              loading="lazy"
                              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`} 
                              alt={p.name} 
                              className="w-10 h-10 object-contain" 
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-xs font-bold text-white truncate">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mode === 'Competitive' && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">
                  <p className="text-blue-400 text-sm font-medium mb-4">Se usará tu equipo activo actual:</p>
                  <div className="flex flex-wrap gap-4">
                    {activeTeamIds.map(id => {
                      const p = roster.find(x => x.id === id);
                      if (!p) return null;
                      return (
                        <div key={id} className="w-20 h-20 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center relative">
                          <img loading="lazy" src={p.sprite} alt={p.name} className="w-14 h-14 object-contain" referrerPolicy="no-referrer" />
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-zinc-800 rounded text-[8px] font-bold text-zinc-400 uppercase">LVL {p.level}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-center pt-8">
                {isPlayer1 ? (
                  <button 
                    onClick={handleStartGame}
                    disabled={!isReadyToStart}
                    className="group relative px-12 py-4 bg-white text-black rounded-full font-black italic uppercase tracking-tighter text-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    {isWaitingForPlayer2 ? 'Esperando Oponente...' : 
                     (mode === 'Free' && (!currentRoom.player1.team.length || !currentRoom.player2?.team.length)) ? 'Esperando Equipos...' :
                     '¡Comenzar Batalla!'}
                  </button>
                ) : (
                  <div className="text-center">
                    <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">
                      {isReadyToStart ? '¡Listo! Esperando al anfitrión...' : 'Prepara tu equipo para comenzar...'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-12">
          <h2 className="text-6xl font-black italic uppercase tracking-tighter text-white leading-none">Multijugador</h2>
          <p className="text-zinc-500 font-mono text-sm mt-2 uppercase tracking-widest">Desafía a otros entrenadores en tiempo real</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Create Room */}
          <div className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-blue-500/50 transition-all overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 border border-blue-500/30">
                <Plus className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">Crear Sala</h3>
              <p className="text-zinc-500 text-sm mb-8">Genera un código único e invita a un amigo a combatir.</p>
              <button 
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold uppercase italic tracking-tight hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isCreating ? 'Creando...' : 'Crear Nueva Sala'}
              </button>
            </div>
          </div>

          {/* Join Room */}
          <div className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-emerald-500/50 transition-all overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/30">
                <Key className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">Unirse a Sala</h3>
              <p className="text-zinc-500 text-sm mb-8">Introduce el código de la sala de tu amigo para entrar.</p>
              
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="CÓDIGO DE SALA" 
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-6 text-center text-2xl font-black tracking-[0.5em] text-white focus:outline-none focus:border-emerald-500/50 placeholder:text-zinc-800 placeholder:tracking-normal placeholder:font-bold"
                />
                <button 
                  onClick={handleJoinRoom}
                  disabled={isJoining || !roomCode}
                  className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold uppercase italic tracking-tight hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {isJoining ? 'Uniéndose...' : 'Entrar a la Sala'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Match / Info */}
        <div className="mt-12 p-8 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
              <Play className="w-6 h-6 text-zinc-400 fill-zinc-400" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">Partida Rápida</h4>
              <p className="text-zinc-500 text-sm">Busca oponentes aleatorios en línea.</p>
            </div>
          </div>
          <button 
            onClick={isSearchingMatch ? cancelQuickMatch : findQuickMatch}
            className={`px-8 py-3 rounded-full font-bold uppercase italic text-sm transition-all ${
              isSearchingMatch 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            {isSearchingMatch ? 'Buscando... (Cancelar)' : 'Buscar Partida'}
          </button>
        </div>

        {/* Tournament Section */}
        <div className="mt-8 p-8 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                <Trophy className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white">Torneos</h4>
                <p className="text-zinc-500 text-sm">Crea o únete a un torneo de 4 jugadores.</p>
              </div>
            </div>
            {!isCreatingTournament && (
              <button 
                onClick={() => setIsCreatingTournament(true)}
                className="px-6 py-2 bg-yellow-500 text-black rounded-full font-bold uppercase italic text-xs hover:bg-yellow-400 transition-colors"
              >
                Crear Torneo
              </button>
            )}
          </div>

          {isCreatingTournament ? (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
              <h5 className="text-white font-bold mb-4 uppercase italic">Configurar Torneo</h5>
              <div className="flex flex-col gap-4">
                <input 
                  type="text" 
                  placeholder="Nombre del Torneo" 
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-yellow-500/50"
                />
                
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-sm font-bold uppercase">Visibilidad:</span>
                    <button
                      onClick={() => setTournamentIsPublic(true)}
                      className={`px-4 py-1 rounded-full text-xs font-bold uppercase transition-colors ${tournamentIsPublic ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}
                    >
                      Público
                    </button>
                    <button
                      onClick={() => setTournamentIsPublic(false)}
                      className={`px-4 py-1 rounded-full text-xs font-bold uppercase transition-colors ${!tournamentIsPublic ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}
                    >
                      Privado
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-sm font-bold uppercase">Modo:</span>
                    <button
                      onClick={() => setTournamentMode('libre')}
                      className={`px-4 py-1 rounded-full text-xs font-bold uppercase transition-colors ${tournamentMode === 'libre' ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}
                    >
                      Libre
                    </button>
                    <button
                      onClick={() => setTournamentMode('competitivo')}
                      className={`px-4 py-1 rounded-full text-xs font-bold uppercase transition-colors ${tournamentMode === 'competitivo' ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}
                    >
                      Competitivo
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 mt-2">
                  <button 
                    onClick={async () => {
                      if (!tournamentName) return;
                      await createTournament(tournamentName, tournamentIsPublic, tournamentMode);
                      setIsCreatingTournament(false);
                    }}
                    className="flex-1 px-6 py-2 bg-yellow-500 text-black rounded-xl font-bold uppercase italic text-sm"
                  >
                    Confirmar
                  </button>
                  <button 
                    onClick={() => setIsCreatingTournament(false)}
                    className="flex-1 px-6 py-2 bg-zinc-800 text-white rounded-xl font-bold uppercase italic text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeTournaments.length > 0 ? (
                activeTournaments.map(t => (
                  <div key={t.id} className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col justify-between">
                    <div>
                      <h6 className="text-white font-bold uppercase italic">{t.name}</h6>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-1 bg-zinc-900 rounded text-[10px] text-zinc-400 font-bold uppercase">
                          {t.players.length}/4 Jugadores
                        </span>
                        <span className="px-2 py-1 bg-zinc-900 rounded text-[10px] text-zinc-400 font-bold uppercase">
                          {t.mode}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => joinTournament(t.id)}
                      className="mt-4 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold uppercase italic text-xs transition-colors"
                    >
                      Unirse
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center opacity-50 col-span-full">
                  <Search className="w-8 h-8 text-zinc-700 mb-2" />
                  <p className="text-zinc-600 text-xs font-bold uppercase">No hay torneos públicos</p>
                  <p className="text-zinc-700 text-[10px] mt-1">Crea uno para invitar a tus amigos</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default MultiplayerTab;
