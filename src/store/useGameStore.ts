import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState, PokemonInstance, Facilities, Staff } from '../types';

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