import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState, PokemonInstance, Facilities, Staff, MultiplayerRoom } from '../types';
import { doc, onSnapshot, updateDoc, getFirestore, addDoc, collection, query, where, getDocs, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { calculateDamage, calculateActualStat } from '../utils/battleLogic';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
import { Tournament, TournamentMatch, MultiplayerPlayer } from '../types';

const INITIAL_FACILITIES: Facilities = {
  stadiumLevel: 1,
  medicalCenterLevel: 1,
  academyLevel: 1,
};

const INITIAL_STAFF: Staff = {
  tacticalCoach: false,
  physiotherapist: false,
  scout: false,
};

const INITIAL_LEAGUE = [
  { name: 'Player Team', points: 0, played: 0, won: 0, drawn: 0, lost: 0, isPlayer: true },
  { name: 'Kanto Kings', points: 0, played: 0, won: 0, drawn: 0, lost: 0, isPlayer: false },
  { name: 'Johto Juggernauts', points: 0, played: 0, won: 0, drawn: 0, lost: 0, isPlayer: false },
  { name: 'Hoenn Heroes', points: 0, played: 0, won: 0, drawn: 0, lost: 0, isPlayer: false },
  { name: 'Sinnoh Stars', points: 0, played: 0, won: 0, drawn: 0, lost: 0, isPlayer: false },
  { name: 'Unova United', points: 0, played: 0, won: 0, drawn: 0, lost: 0, isPlayer: false },
  { name: 'Kalos Knights', points: 0, played: 0, won: 0, drawn: 0, lost: 0, isPlayer: false },
  { name: 'Alola Aces', points: 0, played: 0, won: 0, drawn: 0, lost: 0, isPlayer: false },
];

// Añadimos las variables de desarrollador al tipo del store para que TypeScript las reconozca
type DevGameState = GameState & {
  isDevMode: boolean;
  activateDevMode: (password: string) => boolean;
  loadState: (newState: Partial<DevGameState>) => void;
};

export const useGameStore = create<DevGameState>()(
  persist(
    (set, get) => ({
      coins: 5000,
      stardust: 2000,
      energy: 100,
      trainingPoints: 2000,
      bandages: 5,
      inventory: [],

      roster: [],
      activeTeamIds: [],

      userId: Math.random().toString(36).substring(2, 15),
      uid: '',
      userName: 'Entrenador ' + Math.floor(Math.random() * 1000),
      setUserId: (id) => set({ userId: id }),
      setUid: (uid) => set({ uid: uid }),
      setUserName: (name) => set({ userName: name }),
      currentRoom: null,
      currentTournament: null,
      unsubscribeRoom: null,
      unsubscribeTournament: null,
      isSearchingMatch: false,

      subscribeToRoom: (roomId, userId) => {
        const unsub = onSnapshot(doc(getFirestore(), 'rooms', roomId), (docSnap) => {
          if (docSnap.exists()) {
            set({ currentRoom: { id: docSnap.id, ...docSnap.data() } as MultiplayerRoom });
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`);
        });
        set({ unsubscribeRoom: unsub });
      },

      subscribeToTournament: (tournamentId) => {
        const unsub = onSnapshot(doc(getFirestore(), 'tournaments', tournamentId), (docSnap) => {
          if (docSnap.exists()) {
            set({ currentTournament: { id: docSnap.id, ...docSnap.data() } as Tournament });
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `tournaments/${tournamentId}`);
        });
        set({ unsubscribeTournament: unsub });
      },

      leaveRoom: () => {
        const state = get();
        if (state.unsubscribeRoom) state.unsubscribeRoom();
        set({ currentRoom: null, unsubscribeRoom: null });
      },

      leaveTournament: async () => {
        const state = get();
        const t = state.currentTournament;
        if (t && t.status === 'waiting' && t.hostId !== state.userId) {
          const db = getFirestore();
          const docRef = doc(db, 'tournaments', t.id);
          const newPlayers = t.players.filter(p => p.id !== state.userId);
          try {
            await updateDoc(docRef, { players: newPlayers });
          } catch (error) {
            console.error('Error leaving tournament:', error);
          }
        }
        if (state.unsubscribeTournament) state.unsubscribeTournament();
        set({ currentTournament: null, unsubscribeTournament: null });
      },

      createMultiplayerRoom: async (isPrivate = false, targetPlayerId = '', team, hp) => {
        const state = get();
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const finalTeam = team || state.activeTeamIds.map(id => state.roster.find(p => p.id === id)!).filter(Boolean);
        const finalHp = hp || (team ? team.map(p => calculateActualStat(p, 'hp')) : state.activeTeamIds.map(id => {
          const p = state.roster.find(p => p.id === id);
          return p ? calculateActualStat(p, 'hp') : 100;
        }));

        const newRoom: Omit<MultiplayerRoom, 'id'> = {
          roomCode,
          status: 'waiting',
          player1: {
            id: state.userId,
            uid: state.uid,
            name: state.userName,
            team: finalTeam,
            activeIdx: 0,
            hp: finalHp
          },
          player2: null,
          currentTurnId: state.userId,
          logs: [`${state.userName} ha creado la sala.`],
          winnerId: null,
          updatedAt: Date.now(),
          isPrivate,
          targetPlayerId
        };

        try {
          const docRef = await addDoc(collection(getFirestore(), 'rooms'), newRoom);
          state.subscribeToRoom(docRef.id, state.userId);
          return docRef.id;
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'rooms');
          return '';
        }
      },

      joinMultiplayerRoomByCode: async (code) => {
        const state = get();
        const q = query(
          collection(getFirestore(), 'rooms'), 
          where('roomCode', '==', code.toUpperCase()), 
          where('status', '==', 'waiting')
        );
        
        try {
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const roomDoc = querySnapshot.docs[0];
            const roomData = roomDoc.data() as MultiplayerRoom;
            
            if (roomData.player2) {
              throw new Error('La sala ya está llena.');
            }

            const roomId = roomDoc.id;
            
            // Al unirse, el jugador 2 se registra en la sala
            await updateDoc(doc(getFirestore(), 'rooms', roomId), {
              player2: {
                id: state.userId,
                uid: state.uid,
                name: state.userName,
                team: [], // Se llenará al elegir modo o estar listo
                activeIdx: 0,
                hp: []
              },
              updatedAt: Date.now(),
              logs: [...roomData.logs, `${state.userName} se ha unido a la sala.`]
            });

            state.subscribeToRoom(roomId, state.userId);
          } else {
            throw new Error('Sala no encontrada o ya no está disponible.');
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'rooms');
        }
      },

      updateMultiplayerTeam: async (team, hp) => {
        const state = get();
        const room = state.currentRoom;
        if (!room) return;

        const isPlayer1 = room.player1.id === state.userId;
        const updates: any = {};
        if (isPlayer1) {
          updates.player1 = { ...room.player1, team, hp };
        } else {
          updates.player2 = { ...room.player2!, team, hp };
        }
        updates.updatedAt = Date.now();

        try {
          await updateDoc(doc(getFirestore(), 'rooms', room.id!), updates);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
        }
      },

      setRoomMode: async (mode) => {
        const state = get();
        const room = state.currentRoom;
        if (!room || room.status !== 'waiting') return;

        try {
          await updateDoc(doc(getFirestore(), 'rooms', room.id!), { mode, updatedAt: Date.now() });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
        }
      },

      startMultiplayerGame: async (player2Data) => {
        const state = get();
        const room = state.currentRoom;
        if (!room || room.status !== 'waiting') return;

        const isPlayer1 = room.player1.id === state.userId;
        
        const updates: Partial<MultiplayerRoom> = {
          status: 'playing',
          currentTurnId: room.player1.id,
          updatedAt: Date.now(),
          logs: [...room.logs, `¡Comienza el combate!`]
        };

        // Si el jugador 2 es quien inicia (o si se inicia con sus datos)
        if (!isPlayer1) {
          updates.player2 = {
            id: state.userId,
            uid: state.uid,
            name: state.userName,
            team: player2Data.team || [],
            activeIdx: 0,
            hp: player2Data.hp || []
          };
        }

        try {
          await updateDoc(doc(getFirestore(), 'rooms', room.id!), updates);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
        }
      },

      submitMultiplayerMove: async (move) => {
        const state = get();
        const room = state.currentRoom;
        if (!room || room.status !== 'playing' || room.currentTurnId !== state.userId) return;

        const isPlayer1 = room.player1.id === state.userId;
        const me = isPlayer1 ? room.player1 : room.player2!;
        const opponent = isPlayer1 ? room.player2! : room.player1;

        const myActive = me.team[me.activeIdx];
        const oppActive = opponent.team[opponent.activeIdx];

        const result = calculateDamage({
          attacker: myActive,
          defender: oppActive,
          move,
          weather: 'Clear',
          isCritical: Math.random() < 0.05
        });

        const newOppHp = [...opponent.hp];
        newOppHp[opponent.activeIdx] = Math.max(0, newOppHp[opponent.activeIdx] - result.damage);

        const logs = [...room.logs];
        if (newOppHp[opponent.activeIdx] > 0) {
          logs.push(`${me.name}: ¡${myActive.name}, usa ${move.name}!`);
          logs.push(`¡Causó ${result.damage} de daño a ${oppActive.name}!`);
        }
        
        let winnerId: string | null = null;
        let status: 'waiting' | 'playing' | 'finished' = room.status;
        let nextTurnId = opponent.id;
        let newOppActiveIdx = opponent.activeIdx;

        if (newOppHp[opponent.activeIdx] <= 0) {
          logs.push(`${me.name}: ¡${myActive.name}, usa ${move.name}!`);
          logs.push(`¡Causó ${result.damage} de daño a ${oppActive.name}!`);
          logs.push(`¡${oppActive.name} se ha debilitado!`);
          
          const nextAliveIdx = newOppHp.findIndex(hp => hp > 0);
          if (nextAliveIdx === -1) {
            winnerId = me.id;
            status = 'finished';
            logs.push(`¡${me.name} ha ganado el combate!`);
          } else {
            logs.push(`¡${opponent.name} debe elegir otro Pokémon!`);
          }
        }

        const updates: Partial<MultiplayerRoom> = {
          logs,
          currentTurnId: nextTurnId,
          status,
          winnerId,
          updatedAt: Date.now()
        };

        if (isPlayer1) {
          updates.player2 = { ...opponent, hp: newOppHp, activeIdx: newOppActiveIdx };
        } else {
          updates.player1 = { ...opponent, hp: newOppHp, activeIdx: newOppActiveIdx };
        }

        try {
          await updateDoc(doc(getFirestore(), 'rooms', room.id!), updates);
          
          if (status === 'finished' && winnerId) {
            const t = state.currentTournament;
            if (t) {
              let matchId: 'semi1' | 'semi2' | 'final' | null = null;
              if (t.matches.semi1.roomId === room.id) matchId = 'semi1';
              else if (t.matches.semi2.roomId === room.id) matchId = 'semi2';
              else if (t.matches.final.roomId === room.id) matchId = 'final';
              
              if (matchId) {
                await state.updateTournamentMatch(matchId, winnerId);
              }
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
        }
      },

      switchMultiplayerPokemon: async (newIdx) => {
        const state = get();
        const room = state.currentRoom;
        if (!room || room.status !== 'playing' || room.currentTurnId !== state.userId) return;

        const isPlayer1 = room.player1.id === state.userId;
        const me = isPlayer1 ? room.player1 : room.player2!;
        const opponent = isPlayer1 ? room.player2! : room.player1;

        if (me.hp[newIdx] <= 0) return;

        const wasFainted = me.hp[me.activeIdx] <= 0;
        const logs = [...room.logs, `${me.name} retira a ${me.team[me.activeIdx].name}...`, `¡Adelante ${me.team[newIdx].name}!`];
        
        const updates: Partial<MultiplayerRoom> = {
          logs,
          currentTurnId: wasFainted ? me.id : opponent.id,
          updatedAt: Date.now()
        };

        if (isPlayer1) {
          updates.player1 = { ...me, activeIdx: newIdx };
        } else {
          updates.player2 = { ...me, activeIdx: newIdx };
        }

        try {
          await updateDoc(doc(getFirestore(), 'rooms', room.id!), updates);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
        }
      },

      useMultiplayerItem: async (itemId, targetIdx) => {
        const state = get();
        const room = state.currentRoom;
        if (!room || room.status !== 'playing' || room.currentTurnId !== state.userId) return;

        const isPlayer1 = room.player1.id === state.userId;
        const me = isPlayer1 ? room.player1 : room.player2!;
        const opponent = isPlayer1 ? room.player2! : room.player1;

        const item = state.inventory.find(i => i.id === itemId);
        if (!item || item.quantity <= 0) return;

        // Simple healing logic for now
        const healAmount = 100; // Increased heal amount for better balance
        const targetPokemon = me.team[targetIdx];
        const maxHp = calculateActualStat(targetPokemon, 'hp');
        const newHp = [...me.hp];
        newHp[targetIdx] = Math.min(maxHp, newHp[targetIdx] + healAmount);

        const logs = [...room.logs, `${me.name} usa ${item.name} en ${me.team[targetIdx].name}.`];
        
        const updates: Partial<MultiplayerRoom> = {
          logs,
          currentTurnId: opponent.id,
          updatedAt: Date.now()
        };

        if (isPlayer1) {
          updates.player1 = { ...me, hp: newHp };
        } else {
          updates.player2 = { ...me, hp: newHp };
        }

        try {
          await updateDoc(doc(getFirestore(), 'rooms', room.id!), updates);
          state.removeItem(itemId, 1);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
        }
      },

      fleeMultiplayerBattle: async () => {
        const state = get();
        const room = state.currentRoom;
        if (!room || room.status !== 'playing') return;

        const isPlayer1 = room.player1.id === state.userId;
        const me = isPlayer1 ? room.player1 : room.player2!;
        const opponent = isPlayer1 ? room.player2! : room.player1;

        const updates: Partial<MultiplayerRoom> = {
          status: 'finished',
          winnerId: opponent.id,
          logs: [...room.logs, `¡${me.name} ha huido del combate!`, `¡${opponent.name} gana por abandono!`],
          updatedAt: Date.now()
        };

        try {
          await updateDoc(doc(getFirestore(), 'rooms', room.id!), updates);
          
          const t = state.currentTournament;
          if (t) {
            let matchId: 'semi1' | 'semi2' | 'final' | null = null;
            if (t.matches.semi1.roomId === room.id) matchId = 'semi1';
            else if (t.matches.semi2.roomId === room.id) matchId = 'semi2';
            else if (t.matches.final.roomId === room.id) matchId = 'final';
            
            if (matchId) {
              await state.updateTournamentMatch(matchId, opponent.id);
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
        }
        // Sacar al jugador de la sala inmediatamente después de huir (incluso si falla el update)
        state.leaveRoom();
      },

      findQuickMatch: async () => {
        const state = get();
        if (state.isSearchingMatch) return;
        set({ isSearchingMatch: true });

        const db = getFirestore();
        const matchmakingRef = collection(db, 'matchmaking');
        
        try {
          // Look for someone else searching
          const q = query(matchmakingRef, where('userId', '!=', state.userId));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Found a match!
            const opponentDoc = querySnapshot.docs[0];
            const opponentData = opponentDoc.data();
            
            // Create room
            const team = state.activeTeamIds.map(id => state.roster.find(p => p.id === id)!).filter(Boolean);
            const hp = team.map(p => calculateActualStat(p, 'hp'));
            const roomId = await state.createMultiplayerRoom(false, '', team, hp);
            
            // Update the room with player 2
            const roomRef = doc(db, 'rooms', roomId);
            await updateDoc(roomRef, {
              player2: {
                id: opponentData.userId,
                uid: opponentData.uid,
                name: opponentData.userName,
                team: opponentData.team,
                activeIdx: 0,
                hp: opponentData.hp
              },
              status: 'playing',
              updatedAt: Date.now()
            });

            // Delete matchmaking docs
            await deleteDoc(opponentDoc.ref);
            
            set({ isSearchingMatch: false });
            state.subscribeToRoom(roomId, state.userId);
          } else {
            // No match found, add self to matchmaking
            const team = state.activeTeamIds.map(id => state.roster.find(p => p.id === id)!).filter(Boolean);
            const hp = team.map(p => calculateActualStat(p, 'hp'));

            await setDoc(doc(matchmakingRef, state.userId), {
              userId: state.userId,
              uid: state.uid,
              userName: state.userName,
              team,
              hp,
              createdAt: Date.now()
            });

            // Listen for room assignment
            const unsub = onSnapshot(doc(matchmakingRef, state.userId), async (docSnap) => {
              if (!docSnap.exists()) {
                // Match found and doc deleted by the other player
                const roomsRef = collection(db, 'rooms');
                const qRoom = query(roomsRef, where('player2.id', '==', state.userId), where('status', '==', 'playing'));
                const roomSnap = await getDocs(qRoom);
                if (!roomSnap.empty) {
                  const roomId = roomSnap.docs[0].id;
                  state.subscribeToRoom(roomId, state.userId);
                  set({ isSearchingMatch: false });
                  unsub();
                }
              }
            });
          }
        } catch (error) {
          console.error("Matchmaking error:", error);
          set({ isSearchingMatch: false });
        }
      },

      cancelQuickMatch: async () => {
        const state = get();
        const db = getFirestore();
        await deleteDoc(doc(db, 'matchmaking', state.userId));
        set({ isSearchingMatch: false });
      },

      resetRoomToWaiting: async () => {
        const state = get();
        const room = state.currentRoom;
        if (!room) return;

        const db = getFirestore();
        const roomRef = doc(db, 'rooms', room.id!);
        
        // Reset HP and status
        const p1Team = room.player1.team;
        const p1Hp = p1Team.map(p => calculateActualStat(p, 'hp'));
        
        const updates: Partial<MultiplayerRoom> = {
          status: 'waiting',
          winnerId: null,
          logs: [`La sala ha sido reiniciada por el anfitrión.`],
          player1: { ...room.player1, hp: p1Hp, activeIdx: 0 },
          updatedAt: Date.now()
        };

        if (room.player2) {
          const p2Team = room.player2.team;
          const p2Hp = p2Team.map(p => calculateActualStat(p, 'hp'));
          updates.player2 = { ...room.player2, hp: p2Hp, activeIdx: 0 };
        }

        await updateDoc(roomRef, updates);
      },

      createTournament: async (name, isPublic = true, mode = 'libre') => {
        const state = get();
        const db = getFirestore();
        const team = state.activeTeamIds.map(id => state.roster.find(p => p.id === id)!).filter(Boolean);
        
        const newTournament: Omit<Tournament, 'id'> = {
          name,
          hostId: state.userId,
          isPublic,
          mode,
          players: [{ id: state.userId, name: state.userName, team }],
          status: 'waiting',
          matches: {
            semi1: { id: 'semi1', player1Id: '', player2Id: '', winnerId: null, roomId: null },
            semi2: { id: 'semi2', player1Id: '', player2Id: '', winnerId: null, roomId: null },
            final: { id: 'final', player1Id: '', player2Id: '', winnerId: null, roomId: null },
          },
          winnerId: null,
          createdAt: Date.now()
        };

        const docRef = await addDoc(collection(db, 'tournaments'), newTournament);
        state.subscribeToTournament(docRef.id);
        return docRef.id;
      },

      joinTournament: async (tournamentId) => {
        const state = get();
        const db = getFirestore();
        const docRef = doc(db, 'tournaments', tournamentId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as Tournament;
          if (data.players.length >= 4) throw new Error('Torneo lleno');
          
          const team = state.activeTeamIds.map(id => state.roster.find(p => p.id === id)!).filter(Boolean);
          const newPlayers = [...data.players, { id: state.userId, name: state.userName, team }];
          
          const updates: Partial<Tournament> = { players: newPlayers };

          if (newPlayers.length === 4) {
            updates.status = 'semifinals';
            const shuffled = [...newPlayers].sort(() => Math.random() - 0.5);
            updates.matches = {
              semi1: { id: 'semi1', player1Id: shuffled[0].id, player2Id: shuffled[1].id, winnerId: null, roomId: null },
              semi2: { id: 'semi2', player1Id: shuffled[2].id, player2Id: shuffled[3].id, winnerId: null, roomId: null },
              final: { id: 'final', player1Id: '', player2Id: '', winnerId: null, roomId: null },
            };
          }

          await updateDoc(docRef, updates);
          state.subscribeToTournament(tournamentId);
        }
      },

      playTournamentMatch: async (matchId) => {
        const state = get();
        const tournament = state.currentTournament;
        if (!tournament) return;

        const match = tournament.matches[matchId];
        if (!match) return;

        const db = getFirestore();
        const docRef = doc(db, 'tournaments', tournament.id);

        if (match.player1Id === state.userId) {
          // Player 1 creates the room
          if (!match.roomId) {
            const team = state.activeTeamIds.map(id => state.roster.find(p => p.id === id)!).filter(Boolean);
            const hp = team.map(p => calculateActualStat(p, 'hp'));
            
            const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const newRoom: Omit<MultiplayerRoom, 'id'> = {
              roomCode,
              mode: tournament.mode === 'competitivo' ? 'Competitive' : 'Free',
              status: 'waiting',
              player1: {
                id: state.userId,
                uid: state.uid,
                name: state.userName,
                team,
                activeIdx: 0,
                hp
              },
              player2: null,
              currentTurnId: state.userId,
              logs: ['¡El combate de torneo ha comenzado!'],
              winnerId: null,
              updatedAt: Date.now()
            };

            const roomRef = await addDoc(collection(db, 'rooms'), newRoom);
            
            // Update tournament with roomId
            await updateDoc(docRef, {
              [`matches.${matchId}.roomId`]: roomRef.id
            });

            // Join the room locally
            state.subscribeToRoom(roomRef.id, state.userId);
          } else {
            // Room already exists, just join it locally
            state.subscribeToRoom(match.roomId, state.userId);
          }
        } else if (match.player2Id === state.userId) {
          // Player 2 joins the room
          if (match.roomId) {
            const team = state.activeTeamIds.map(id => state.roster.find(p => p.id === id)!).filter(Boolean);
            const hp = team.map(p => calculateActualStat(p, 'hp'));
            
            const roomRef = doc(db, 'rooms', match.roomId);
            await updateDoc(roomRef, {
              player2: {
                id: state.userId,
                uid: state.uid,
                name: state.userName,
                team,
                activeIdx: 0,
                hp
              },
              status: 'playing',
              updatedAt: Date.now()
            });
            
            state.subscribeToRoom(match.roomId, state.userId);
          } else {
            throw new Error('Esperando a que el oponente cree la sala...');
          }
        }
      },

      updateTournamentMatch: async (matchId, winnerId) => {
        const state = get();
        const t = state.currentTournament;
        if (!t) return;

        const db = getFirestore();
        const tRef = doc(db, 'tournaments', t.id);

        const updates: any = {};
        updates[`matches.${matchId}.winnerId`] = winnerId;

        // Si ambas semifinales terminaron, preparar la final
        if (matchId === 'semi1' || matchId === 'semi2') {
          const otherMatchId = matchId === 'semi1' ? 'semi2' : 'semi1';
          const otherWinnerId = t.matches[otherMatchId].winnerId;
          
          if (otherWinnerId) {
            updates.status = 'final';
            updates[`matches.final.player1Id`] = matchId === 'semi1' ? winnerId : otherWinnerId;
            updates[`matches.final.player2Id`] = matchId === 'semi2' ? winnerId : otherWinnerId;
          }
        } else if (matchId === 'final') {
          updates.status = 'finished';
          updates.winnerId = winnerId;
        }

        try {
          await updateDoc(tRef, updates);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `tournaments/${t.id}`);
        }
      },

      deleteTournament: async (tournamentId) => {
        const state = get();
        const db = getFirestore();
        try {
          await deleteDoc(doc(db, 'tournaments', tournamentId));
          if (state.currentTournament?.id === tournamentId) {
            state.leaveTournament();
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `tournaments/${tournamentId}`);
        }
      },

      facilities: INITIAL_FACILITIES,
      staff: INITIAL_STAFF,

      currentWeek: 1,
      season: 1,
      leagueStandings: INITIAL_LEAGUE,
      badges: [],
      missions: [
        { id: '1', title: 'Win 5 matches', description: 'Win 5 matches in the league', reward: 1000, completed: false, progress: 0, requirement: 5 },
        { id: '2', title: 'Collect 10 Pokémon', description: 'Collect 10 Pokémon in your roster', reward: 2000, completed: false, progress: 0, requirement: 10 },
      ],
      leagueLevel: 1,
      pokedex: [],

      loadState: (newState) => set((state) => ({ ...state, ...newState })),

      // --- FUNCIONES DEL MODO DESARROLLADOR ---
      isDevMode: false,
      activateDevMode: (password: string) => {
        if (password === "admin123" || password === "dev") {
          set({
            isDevMode: true,
            coins: 9999999,
            stardust: 9999999,
            energy: 9999,
            trainingPoints: 9999999,
            bandages: 999
          });
          return true;
        }
        return false;
      },
      // ----------------------------------------

      setCoins: (amount) => set({ coins: amount }),
      setEnergy: (amount) => set({ energy: amount }),
      updatePokemon: (id, updates) => set((state) => ({
        roster: state.roster.map(p => p.id === id ? { ...p, ...updates } : p)
      })),
      updateMissionProgress: (action, amount) => set((state) => {
        // Basic implementation for now
        return {
          missions: state.missions.map(m => {
            if (m.completed) return m;
            // This is a simplified version of the logic in App.tsx
            return { ...m, progress: Math.min(m.requirement, m.progress + amount) };
          })
        };
      }),

      evolvingPokemon: null,
      setEvolvingPokemon: (data) => set({ evolvingPokemon: data }),

      addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),
      spendCoins: (amount) => {
        const state = get();
        if (state.coins >= amount) {
          set({ coins: state.coins - amount });
          return true;
        }
        return false;
      },
      addPokemon: (pokemon) => set((state) => ({ roster: [...state.roster, pokemon] })),
      setActiveTeam: (ids) => set({ activeTeamIds: ids.slice(0, 6) }),
      
      upgradeFacility: (facility) => set((state) => {
        const cost = state.facilities[facility] * 2000;
        if (state.coins >= cost && state.facilities[facility] < 10) {
          return {
            coins: state.coins - cost,
            facilities: { ...state.facilities, [facility]: state.facilities[facility] + 1 }
          };
        }
        return state;
      }),

      hireStaff: (role) => set((state) => {
        const cost = 5000; // Flat cost for staff
        if (state.coins >= cost && !state.staff[role]) {
          return {
            coins: state.coins - cost,
            staff: { ...state.staff, [role]: true }
          };
        }
        return state;
      }),

      healPokemon: (id) => set((state) => {
        const cost = 500;
        if (state.coins >= cost) {
          return {
            coins: state.coins - cost,
            roster: state.roster.map(p => 
              p.id === id ? { ...p, fatigue: 0, injuryDaysRemaining: 0, morale: 'Good' } : p
            )
          };
        }
        return state;
      }),

      advanceWeek: () => set((state) => {
        // Simulate other matches, update standings, increase fatigue, etc.
        // For now, just increment week.
        let nextWeek = state.currentWeek + 1;
        let nextSeason = state.season;
        if (nextWeek > 14) { // 14 weeks in a 8-team double round-robin
          nextWeek = 1;
          nextSeason += 1;
        }
        return { currentWeek: nextWeek, season: nextSeason };
      }),
      completeMission: (id) => set((state) => {
        const mission = state.missions.find(m => m.id === id);
        if (mission && !mission.completed && mission.progress >= mission.requirement) {
          return {
            coins: state.coins + mission.reward,
            missions: state.missions.map(m => m.id === id ? { ...m, completed: true } : m)
          };
        }
        return state;
      }),
      addItem: (item) => set((state) => {
        const existingItem = state.inventory.find(i => i.id === item.id);
        if (existingItem) {
          return {
            inventory: state.inventory.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i)
          };
        }
        return { inventory: [...state.inventory, item] };
      }),
      removeItem: (itemId, quantity) => {
        const state = get();
        const item = state.inventory.find(i => i.id === itemId);
        if (item && item.quantity >= quantity) {
          set({
            inventory: state.inventory.map(i => i.id === itemId ? { ...i, quantity: i.quantity - quantity } : i).filter(i => i.quantity > 0)
          });
          return true;
        }
        return false;
      },
    }),
    {
      name: 'pokemon-league-manager-storage',
    }
  )
);