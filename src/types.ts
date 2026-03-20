export type PokemonType = 'Normal' | 'Fire' | 'Water' | 'Grass' | 'Electric' | 'Ice' | 'Fighting' | 'Poison' | 'Ground' | 'Flying' | 'Psychic' | 'Bug' | 'Rock' | 'Ghost' | 'Dragon' | 'Dark' | 'Steel' | 'Fairy';
export type StatName = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
export type Rarity = 'Common' | 'Rare' | 'Mythical' | 'Legendary';
export type Weather = 'Clear' | 'Rain' | 'Sun' | 'Sandstorm' | 'Hail';
export type Terrain = 'Normal' | 'Electric' | 'Grassy' | 'Misty' | 'Psychic';
export type Morale = 'Excellent' | 'Good' | 'Normal' | 'Low' | 'Terrible';

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export type IVs = BaseStats;
export type EVs = BaseStats;

export type Nature = 'Adamant' | 'Bold' | 'Brave' | 'Calm' | 'Careful' | 'Gentle' | 'Hasty' | 'Impish' | 'Jolly' | 'Lax' | 'Lonely' | 'Mild' | 'Modest' | 'Naive' | 'Naughty' | 'Quiet' | 'Quirky' | 'Rash' | 'Relaxed' | 'Sassy' | 'Serious' | 'Timid';

export interface PassiveAbility {
  name: string;
  description: string;
}

export interface HeldItem {
  id: string;
  name: string;
  description: string;
  effectType: 'stat_boost' | 'healing' | 'utility';
  value: number;
}

export type StatusCondition = 'None' | 'Burn' | 'Sleep' | 'Poison' | 'Paralysis' | 'Freeze';

export interface Move {
  id: string;
  name: string;
  type: PokemonType;
  category: 'Physical' | 'Special' | 'Status';
  power: number;
  accuracy: number;
  pp?: number;
  description?: string;
  statusEffect?: StatusCondition;
  statusChance?: number; // 0-100
}

export interface PokemonInstance {
  id: string;
  pokedexNumber: number;
  name: string;
  sprite: string;
  types: PokemonType[];
  level: number;
  exp: number;
  rarity: Rarity;
  isShiny: boolean;
  
  baseStats: BaseStats;
  currentStats: BaseStats;
  ivs: IVs;
  evs: EVs;
  nature: Nature;
  
  ability: PassiveAbility;
  heldItem?: HeldItem;
  moves: Move[];
  
  fatigue: number; // 0 - 100
  morale: Morale;
  isInjured: boolean;
  injuryDaysRemaining: number;
  currentHp: number;
  currentOVR: number;
  status?: StatusCondition;
}

export interface Facilities {
  stadiumLevel: number; // Increases match income
  medicalCenterLevel: number; // Reduces fatigue/injury
  academyLevel: number; // Increases base stats of common pulls
}

export interface Staff {
  tacticalCoach: boolean;
  physiotherapist: boolean;
  scout: boolean;
}

export interface GymLeader {
  id: string;
  name: string;
  type: PokemonType;
  badgeName: string;
  badgeIcon: string;
  team: { pokedexNumber: number; level: number }[];
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  reward: number; // coins
  completed: boolean;
  progress: number;
  target: number;
}

export interface GameState {
  // Resources
  coins: number;
  stardust: number;
  energy: number;
  trainingPoints: number;
  bandages: number;

  // Roster
  roster: PokemonInstance[];
  activeTeamIds: string[]; // Max 6
  
  // Progress
  badges: string[]; // Badge IDs
  missions: Mission[];

  // Management
  facilities: Facilities;
  staff: Staff;

  // League
  currentWeek: number;
  season: number;
  leagueStandings: { teamName: string; points: number; played: number; won: number; drawn: number; lost: number }[];

  // Actions
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addPokemon: (pokemon: PokemonInstance) => void;
  setActiveTeam: (ids: string[]) => void;
  upgradeFacility: (facility: keyof Facilities) => void;
  hireStaff: (role: keyof Staff) => void;
  healPokemon: (id: string) => void;
  advanceWeek: () => void;
  completeMission: (id: string) => void;
}
