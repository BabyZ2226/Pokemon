import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState, PokemonInstance, Facilities, Staff, MultiplayerRoom } from '../types';
import { doc, onSnapshot, updateDoc, getFirestore } from 'firebase/firestore';
import { calculateDamage, calculateActualStat } from '../utils/battleLogic';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';

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
      unsubscribeRoom: null,

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

      leaveRoom: () => {
        const state = get();
        if (state.unsubscribeRoom) state.unsubscribeRoom();
        set({ currentRoom: null, unsubscribeRoom: null });
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

        const logs = [...room.logs, `${me.name} retira a ${me.team[me.activeIdx].name}...`, `¡Adelante ${me.team[newIdx].name}!`];
        
        const updates: Partial<MultiplayerRoom> = {
          logs,
          currentTurnId: opponent.id,
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