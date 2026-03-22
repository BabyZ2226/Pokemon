/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Users, 
  ShoppingBag, 
  Zap, 
  Coins, 
  ChevronRight, 
  Star, 
  Info,
  Play,
  History,
  Dna,
  FastForward,
  Pause,
  Sword,
  FlaskConical,
  Dumbbell,
  Sparkles,
  Heart,
  Shield,
  Store,
  Award,
  Settings,
  Building2,
  Package,
  Search,
  Trash2,
  Lock,
  Check,
  ShieldCheck,
  X,
  AlertTriangle,
  Menu,
  Activity,
  Clock,
  Flame,
  Droplets,
  Leaf,
  Mountain,
  Skull,
  Eye,
  Map as MapIcon,
  Medal,
  Crown,
  Palette,
  Volume2,
  Bell,
  Monitor,
  Cloud,
  LogIn
} from 'lucide-react';
import { ProfileMenu } from './components/ProfileMenu';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

import { InventoryTab } from './components/InventoryTab';


// --- Types & Constants ---

type Rarity = 'Common' | 'Rare' | 'Mythical' | 'Legendary';

export type StatusCondition = 'None' | 'Burn' | 'Sleep' | 'Poison' | 'Paralysis' | 'Freeze';

interface Move {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  level_learned_at?: number;
  category?: 'Physical' | 'Special' | 'Status';
  statusEffect?: StatusCondition;
  statusChance?: number;
}

interface PokemonBase {
  id: number;
  name: string;
  types: string[];
  ability: string;
  evolutionChain: number[]; // Array of IDs in order: [Bulbasaur, Ivysaur, Venusaur]
  isLegendary?: boolean;
  isMythical?: boolean;
  baseStatsSum?: number;
  description?: string;
  stats?: { hp: number, atk: number, def: number, spe: number };
  evolutionCondition?: {
    type: 'happiness' | 'stone' | 'item' | 'trade' | 'time';
    value?: string | number;
  };
  evolutions?: {
    id: number;
    condition: {
      type: 'level' | 'happiness' | 'stone' | 'item' | 'trade' | 'time';
      value?: string | number;
    }
  }[];
}

interface PokemonCard extends PokemonBase {
  instanceId: string;
  rarity: Rarity;
  level: number;
  maxLevel: number;
  evolutionLevel?: number | null;
  powerLevel: number; // Max 10
  trainingLevel: number; // Max 10
  limitBroken: boolean;
  atk: number;
  def: number;
  spe: number;
  hp: number;
  maxHp: number;
  ovr: number;
  status?: StatusCondition;
  isEvolved: boolean;
  isShiny: boolean;
  fatigue: number; // 0-100
  moral: number; // 0-100
  happiness: number; // 0-255
  isInjured: boolean;
  injuryWeeks: number;
  matchesPlayed: number;
  mvpCount: number;
  totalDamageDealt: number;
  matchHistory: {
    opponent: string;
    result: 'win' | 'loss' | 'draw';
    damageDealt: number;
    fainted: boolean;
    date: string;
  }[];
  item?: string;
  megaStone?: string;
  megaEvolved?: boolean;
  moves: Move[];
  nature: string;
  ivs: { atk: number, def: number, spe: number, hp: number };
  evs: { atk: number, def: number, spe: number, hp: number };
}

interface Facility {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  cost: number;
  description: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: 'Tactician' | 'Physio' | 'Scout';
  hired: boolean;
  cost: number;
  description: string;
}

interface Sponsor {
  id: string;
  name: string;
  description: string;
  goal: string;
  reward: { coins?: number, stardust?: number, tp?: number };
  targetValue: number;
  currentValue: number;
  isCompleted: boolean;
}

type MissionType = 'daily' | 'weekly' | 'event' | 'league';

interface Mission {
  id: string;
  title: string;
  description: string;
  goal: number;
  current: number;
  reward: { coins?: number, stardust?: number, tp?: number, banditas?: number };
  type: MissionType;
  claimed: boolean;
}

interface GameEvent {
  id: string;
  title: string;
  description: string;
  icon: string; // Emoji or Lucide icon name
  color: string;
  modifiers: {
    shinyRate?: number;
    legendaryRate?: number;
    coinMultiplier?: number;
    stardustMultiplier?: number;
    tpMultiplier?: number;
    energyRegenMultiplier?: number;
    typeBoost?: { type: string, boost: number };
    evolutionDiscount?: number;
  };
  endDate: number; // timestamp
}

interface Item {
  id: string;
  name: string;
  description: string;
  effect: { atk?: number, def?: number, spe?: number, hp?: number };
  rarity: Rarity;
}

interface MarketOffer {
  id: string;
  pokemon: PokemonCard;
  cost: number;
  seller: string;
}

const TUTORIAL_STEPS = [
  {
    title: "¡Bienvenido, Entrenador!",
    content: "Tu aventura acaba de comenzar. Te guiaremos por las funciones básicas para que te conviertas en el mejor Manager Pokémon.",
    target: "welcome",
  },
  {
    title: "Tu Equipo",
    content: "Aquí puedes ver a tus Pokémon. Haz clic en uno para ver sus estadísticas, equipar objetos o entrenarlo.",
    target: "team",
    tab: "team",
  },
  {
    title: "El Laboratorio",
    content: "En el Laboratorio puedes mejorar el nivel de tus Pokémon usando Polvos Estelares (Stardust) y Puntos de Entrenamiento (TP).",
    target: "lab",
    tab: "lab",
  },
  {
    title: "Batallas",
    content: "¡Es hora de luchar! Aquí puedes desafiar a Gimnasios, participar en Torneos o buscar Pokémon salvajes.",
    target: "battles",
    tab: "battles",
  },
  {
    title: "La Tienda",
    content: "Usa tus Monedas para comprar sobres de cartas, objetos de mejora y más.",
    target: "shop",
    tab: "shop",
  },
  {
    title: "¡Buena Suerte!",
    content: "Ya estás listo para empezar. ¡Completa misiones, derrota a los líderes de gimnasio y llega a la cima!",
    target: "finish",
  }
];

interface LeagueTeam {
  id: string;
  name: string;
  logo: string;
  ovr: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  played: boolean;
  week: number;
}

const HELD_ITEMS = [
  { id: 'leftovers', name: 'Restos', description: 'Recupera un poco de HP cada turno en combate.', price: 3000, effect: 'Heal 1/16 HP per turn' },
  { id: 'life-orb', name: 'Vidasfera', description: 'Potencia el daño un 30% pero consume 10% de HP al atacar.', price: 5000, effect: '+30% Damage, -10% HP recoil' },
  { id: 'choice-band', name: 'Cinta Elección', description: 'Aumenta el Ataque un 50%.', price: 4500, effect: '+50% ATK' },
  { id: 'choice-scarf', name: 'Pañuelo Elección', description: 'Aumenta la Velocidad un 50%.', price: 4500, effect: '+50% SPE' },
  { id: 'focus-sash', name: 'Banda Focus', description: 'Si tienes el HP al máximo, evita debilitarte de un golpe.', price: 2500, effect: 'Prevents OHKO' },
  { id: 'rocky-helmet', name: 'Casco Dentado', description: 'Daña al oponente si te golpea con un ataque físico.', price: 3500, effect: 'Damage attacker on contact' },
  { id: 'expert-belt', name: 'Cinturón Experto', description: 'Potencia los ataques súper eficaces.', price: 4000, effect: '+20% Super Effective Damage' },
];

const TYPE_CHART: Record<string, Record<string, number>> = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Electric: { Water: 2, Grass: 0.5, Electric: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Rock: 2, Dark: 2, Steel: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Ghost: 0, Fairy: 0.5 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
  Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying: { Grass: 2, Electric: 0.5, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
  Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 }
};

const NATURES: Record<string, { plus?: keyof PokemonCard['ivs'], minus?: keyof PokemonCard['ivs'] }> = {
  Adamant: { plus: 'atk', minus: 'spe' },
  Bold: { plus: 'def', minus: 'atk' },
  Modest: { plus: 'atk', minus: 'atk' }, // Simplification: Modest usually boosts SpAtk, but we only have Atk
  Timid: { plus: 'spe', minus: 'atk' },
  Jolly: { plus: 'spe', minus: 'def' },
  Calm: { plus: 'def', minus: 'spe' },
  Careful: { plus: 'def', minus: 'atk' },
  Impish: { plus: 'def', minus: 'spe' },
  Hardy: {},
  Docile: {},
  Serious: {},
  Bashful: {},
  Quirky: {}
};

const INITIAL_FACILITIES: Facility[] = [
  { id: 'stadium', name: 'Estadio', level: 1, maxLevel: 5, cost: 3000, description: 'Aumenta los ingresos por partido.' },
  { id: 'medical', name: 'Centro Médico', level: 1, maxLevel: 5, cost: 4500, description: 'Reduce el coste de curación de fatiga.' },
  { id: 'academy', name: 'Academia', level: 1, maxLevel: 5, cost: 6000, description: 'Aumenta los stats base de nuevos Pokémon Comunes y Raros.' }
];

const INITIAL_STAFF: StaffMember[] = [
  { id: 'tactician', name: 'Entrenador Táctico', role: 'Tactician', hired: false, cost: 15000, description: 'Aumenta el daño en combate un 10%.' },
  { id: 'physio', name: 'Fisioterapeuta', role: 'Physio', hired: false, cost: 12000, description: 'Los Pokémon recuperan fatiga más rápido.' },
  { id: 'scout', name: 'Ojeador (Scout)', role: 'Scout', hired: false, cost: 18000, description: 'Mejora la calidad del Mercado de Transferencias.' }
];

const BATTLE_ITEMS = [
  { name: 'Choice Band', effect: 'Aumenta ATK x1.5 pero solo puedes usar un movimiento.', type: 'offensive' },
  { name: 'Leftovers', effect: 'Recupera un poco de HP cada turno.', type: 'defensive' },
  { name: 'Life Orb', effect: 'Aumenta el daño x1.3 pero pierdes HP cada turno.', type: 'offensive' },
  { name: 'Rocky Helmet', effect: 'Daña al atacante si usa un movimiento físico.', type: 'defensive' },
  { name: 'Focus Band', effect: 'Probabilidad de sobrevivir con 1 HP.', type: 'utility' }
];

const WEATHER_TYPES = [
  { id: 'clear', name: 'Despejado', effect: 'Sin efectos especiales.' },
  { id: 'sun', name: 'Sol Intenso', effect: 'Fuego x1.5, Agua x0.5.' },
  { id: 'rain', name: 'Lluvia', effect: 'Agua x1.5, Fuego x0.5.' },
  { id: 'sandstorm', name: 'Tormenta de Arena', effect: 'Daña a tipos que no sean Roca/Tierra/Acero.' },
  { id: 'hail', name: 'Granizo', effect: 'Daña a tipos que no sean Hielo.' }
];

const getLeagueName = (level: number) => {
  const tiers = ["Hierro", "Bronce", "Plata", "Oro", "Platino", "Esmeralda", "Diamante", "Maestro", "Challenger"];
  const tierIndex = Math.floor((level - 1) / 3);
  const divisionIndex = (level - 1) % 3 + 1;
  if (tierIndex >= tiers.length) return `Challenger 3`;
  return `${tiers[tierIndex]} ${divisionIndex}`;
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

const RARITY_CONFIG: Record<Rarity, { color: string, bg: string, border: string, initialMaxLevel: number, multiplier: number, label: string, statGain: number, baseStatRange: [number, number], glow: string, shadow: string }> = {
  Common: { 
    color: 'text-zinc-400', 
    bg: 'bg-zinc-900/80', 
    border: 'border-zinc-700/50', 
    initialMaxLevel: 10, 
    multiplier: 1.0, 
    label: 'Común', 
    statGain: 2, 
    baseStatRange: [25, 40],
    glow: 'from-zinc-500/5 to-transparent',
    shadow: 'shadow-zinc-900/20'
  },
  Rare: { 
    color: 'text-blue-400', 
    bg: 'bg-blue-950/80', 
    border: 'border-blue-500/40', 
    initialMaxLevel: 15, 
    multiplier: 1.2, 
    label: 'Raro', 
    statGain: 3, 
    baseStatRange: [40, 55],
    glow: 'from-blue-500/10 to-transparent',
    shadow: 'shadow-blue-900/30'
  },
  Mythical: { 
    color: 'text-purple-400', 
    bg: 'bg-purple-950/80', 
    border: 'border-purple-500/40', 
    initialMaxLevel: 20, 
    multiplier: 1.5, 
    label: 'Mítico', 
    statGain: 4, 
    baseStatRange: [55, 75],
    glow: 'from-purple-500/20 to-transparent',
    shadow: 'shadow-purple-900/40'
  },
  Legendary: { 
    color: 'text-amber-400', 
    bg: 'bg-amber-950/80', 
    border: 'border-amber-500/40', 
    initialMaxLevel: 30, 
    multiplier: 2.0, 
    label: 'Legendario', 
    statGain: 6, 
    baseStatRange: [75, 100],
    glow: 'from-amber-500/30 to-transparent',
    shadow: 'shadow-amber-900/50'
  },
};

interface Gym {
  id: string;
  name: string;
  leader: string;
  type: string;
  badgeName: string;
  level: number;
}

const GYMS: Gym[] = [
  { id: 'gym1', name: 'Gimnasio Ciudad Plateada', leader: 'Brock', type: 'Rock', badgeName: 'Medalla Roca', level: 15 },
  { id: 'gym2', name: 'Gimnasio Ciudad Celeste', leader: 'Misty', type: 'Water', badgeName: 'Medalla Cascada', level: 20 },
  { id: 'gym3', name: 'Gimnasio Ciudad Carmín', leader: 'Lt. Surge', type: 'Electric', badgeName: 'Medalla Trueno', level: 25 },
  { id: 'gym4', name: 'Gimnasio Ciudad Azulona', leader: 'Erika', type: 'Grass', badgeName: 'Medalla Arcoíris', level: 30 },
  { id: 'gym5', name: 'Gimnasio Ciudad Fucsia', leader: 'Koga', type: 'Poison', badgeName: 'Medalla Alma', level: 35 },
  { id: 'gym6', name: 'Gimnasio Ciudad Azafrán', leader: 'Sabrina', type: 'Psychic', badgeName: 'Medalla Pantano', level: 40 },
  { id: 'gym7', name: 'Gimnasio Isla Canela', leader: 'Blaine', type: 'Fire', badgeName: 'Medalla Volcán', level: 45 },
  { id: 'gym8', name: 'Gimnasio Ciudad Verde', leader: 'Giovanni', type: 'Ground', badgeName: 'Medalla Tierra', level: 50 },
];

const getRarity = (p: PokemonBase): Rarity => {
  return getPokemonRarity(p);
};

export const POKEDEX_BASE: PokemonBase[] = [
  { id: 1, name: 'Bulbasaur', types: ['Grass', 'Poison'], ability: 'Overgrow', evolutionChain: [1, 2, 3] },
  { id: 2, name: 'Ivysaur', types: ['Grass', 'Poison'], ability: 'Overgrow', evolutionChain: [1, 2, 3] },
  { id: 3, name: 'Venusaur', types: ['Grass', 'Poison'], ability: 'Overgrow', evolutionChain: [1, 2, 3] },
  { id: 4, name: 'Charmander', types: ['Fire'], ability: 'Blaze', evolutionChain: [4, 5, 6] },
  { id: 5, name: 'Charmeleon', types: ['Fire'], ability: 'Blaze', evolutionChain: [4, 5, 6] },
  { id: 6, name: 'Charizard', types: ['Fire', 'Flying'], ability: 'Blaze', evolutionChain: [4, 5, 6], baseStatsSum: 534 },
  { id: 7, name: 'Squirtle', types: ['Water'], ability: 'Torrent', evolutionChain: [7, 8, 9] },
  { id: 8, name: 'Wartortle', types: ['Water'], ability: 'Torrent', evolutionChain: [7, 8, 9] },
  { id: 9, name: 'Blastoise', types: ['Water'], ability: 'Torrent', evolutionChain: [7, 8, 9] },
  { id: 10, name: 'Caterpie', types: ['Bug'], ability: 'Shield Dust', evolutionChain: [10, 11, 12] },
  { id: 11, name: 'Metapod', types: ['Bug'], ability: 'Shed Skin', evolutionChain: [10, 11, 12] },
  { id: 12, name: 'Butterfree', types: ['Bug', 'Flying'], ability: 'Compound Eyes', evolutionChain: [10, 11, 12] },
  { id: 13, name: 'Weedle', types: ['Bug', 'Poison'], ability: 'Shield Dust', evolutionChain: [13, 14, 15] },
  { id: 14, name: 'Kakuna', types: ['Bug', 'Poison'], ability: 'Shed Skin', evolutionChain: [13, 14, 15] },
  { id: 15, name: 'Beedrill', types: ['Bug', 'Poison'], ability: 'Swarm', evolutionChain: [13, 14, 15] },
  { id: 16, name: 'Pidgey', types: ['Normal', 'Flying'], ability: 'Keen Eye', evolutionChain: [16, 17, 18] },
  { id: 17, name: 'Pidgeotto', types: ['Normal', 'Flying'], ability: 'Keen Eye', evolutionChain: [16, 17, 18] },
  { id: 18, name: 'Pidgeot', types: ['Normal', 'Flying'], ability: 'Keen Eye', evolutionChain: [16, 17, 18] },
  { id: 19, name: 'Rattata', types: ['Normal'], ability: 'Run Away', evolutionChain: [19, 20] },
  { id: 20, name: 'Raticate', types: ['Normal'], ability: 'Guts', evolutionChain: [19, 20] },
  { id: 21, name: 'Spearow', types: ['Normal', 'Flying'], ability: 'Keen Eye', evolutionChain: [21, 22] },
  { id: 22, name: 'Fearow', types: ['Normal', 'Flying'], ability: 'Keen Eye', evolutionChain: [21, 22] },
  { id: 23, name: 'Ekans', types: ['Poison'], ability: 'Intimidate', evolutionChain: [23, 24] },
  { id: 24, name: 'Arbok', types: ['Poison'], ability: 'Intimidate', evolutionChain: [23, 24] },
  { 
    id: 25, name: 'Pikachu', types: ['Electric'], ability: 'Static', evolutionChain: [25, 26],
    evolutions: [{ id: 26, condition: { type: 'stone', value: 'thunder' } }]
  },
  { id: 26, name: 'Raichu', types: ['Electric'], ability: 'Static', evolutionChain: [25, 26] },
  { id: 27, name: 'Sandshrew', types: ['Ground'], ability: 'Sand Veil', evolutionChain: [27, 28] },
  { id: 28, name: 'Sandslash', types: ['Ground'], ability: 'Sand Veil', evolutionChain: [27, 28] },
  { id: 29, name: 'Nidoran♀', types: ['Poison'], ability: 'Poison Point', evolutionChain: [29, 30, 31] },
  { 
    id: 30, name: 'Nidorina', types: ['Poison'], ability: 'Poison Point', evolutionChain: [29, 30, 31],
    evolutions: [{ id: 31, condition: { type: 'stone', value: 'moon' } }]
  },
  { id: 31, name: 'Nidoqueen', types: ['Poison', 'Ground'], ability: 'Poison Point', evolutionChain: [29, 30, 31] },
  { id: 32, name: 'Nidoran♂', types: ['Poison'], ability: 'Poison Point', evolutionChain: [32, 33, 34] },
  { 
    id: 33, name: 'Nidorino', types: ['Poison'], ability: 'Poison Point', evolutionChain: [32, 33, 34],
    evolutions: [{ id: 34, condition: { type: 'stone', value: 'moon' } }]
  },
  { id: 34, name: 'Nidoking', types: ['Poison', 'Ground'], ability: 'Poison Point', evolutionChain: [32, 33, 34] },
  { 
    id: 35, name: 'Clefairy', types: ['Fairy'], ability: 'Cute Charm', evolutionChain: [35, 36],
    evolutions: [{ id: 36, condition: { type: 'stone', value: 'moon' } }]
  },
  { id: 36, name: 'Clefable', types: ['Fairy'], ability: 'Cute Charm', evolutionChain: [35, 36] },
  { 
    id: 37, name: 'Vulpix', types: ['Fire'], ability: 'Flash Fire', evolutionChain: [37, 38],
    evolutions: [{ id: 38, condition: { type: 'stone', value: 'fire' } }]
  },
  { id: 38, name: 'Ninetales', types: ['Fire'], ability: 'Flash Fire', evolutionChain: [37, 38] },
  { 
    id: 39, name: 'Jigglypuff', types: ['Normal', 'Fairy'], ability: 'Cute Charm', evolutionChain: [39, 40],
    evolutions: [{ id: 40, condition: { type: 'stone', value: 'moon' } }]
  },
  { id: 40, name: 'Wigglytuff', types: ['Normal', 'Fairy'], ability: 'Cute Charm', evolutionChain: [39, 40] },
  { id: 41, name: 'Zubat', types: ['Poison', 'Flying'], ability: 'Inner Focus', evolutionChain: [41, 42, 169] },
  { 
    id: 42, name: 'Golbat', types: ['Poison', 'Flying'], ability: 'Inner Focus', evolutionChain: [41, 42, 169],
    evolutions: [{ id: 169, condition: { type: 'happiness', value: 220 } }]
  },
  { id: 43, name: 'Oddish', types: ['Grass', 'Poison'], ability: 'Chlorophyll', evolutionChain: [43, 44, 45] },
  { 
    id: 44, name: 'Gloom', types: ['Grass', 'Poison'], ability: 'Chlorophyll', evolutionChain: [43, 44, 45, 182],
    evolutions: [
      { id: 45, condition: { type: 'stone', value: 'leaf' } },
      { id: 182, condition: { type: 'stone', value: 'sun' } }
    ]
  },
  { id: 45, name: 'Vileplume', types: ['Grass', 'Poison'], ability: 'Chlorophyll', evolutionChain: [43, 44, 45] },
  { id: 46, name: 'Paras', types: ['Bug', 'Grass'], ability: 'Effect Spore', evolutionChain: [46, 47] },
  { id: 47, name: 'Parasect', types: ['Bug', 'Grass'], ability: 'Effect Spore', evolutionChain: [46, 47] },
  { id: 48, name: 'Venonat', types: ['Bug', 'Poison'], ability: 'Compound Eyes', evolutionChain: [48, 49] },
  { id: 49, name: 'Venomoth', types: ['Bug', 'Poison'], ability: 'Shield Dust', evolutionChain: [48, 49] },
  { id: 50, name: 'Diglett', types: ['Ground'], ability: 'Sand Veil', evolutionChain: [50, 51] },
  { id: 51, name: 'Dugtrio', types: ['Ground'], ability: 'Sand Veil', evolutionChain: [50, 51] },
  { id: 52, name: 'Meowth', types: ['Normal'], ability: 'Pickup', evolutionChain: [52, 53] },
  { id: 53, name: 'Persian', types: ['Normal'], ability: 'Limber', evolutionChain: [52, 53] },
  { id: 54, name: 'Psyduck', types: ['Water'], ability: 'Damp', evolutionChain: [54, 55] },
  { id: 55, name: 'Golduck', types: ['Water'], ability: 'Damp', evolutionChain: [54, 55] },
  { id: 56, name: 'Mankey', types: ['Fighting'], ability: 'Vital Spirit', evolutionChain: [56, 57] },
  { id: 57, name: 'Primeape', types: ['Fighting'], ability: 'Vital Spirit', evolutionChain: [56, 57] },
  { 
    id: 58, name: 'Growlithe', types: ['Fire'], ability: 'Intimidate', evolutionChain: [58, 59],
    evolutions: [{ id: 59, condition: { type: 'stone', value: 'fire' } }]
  },
  { id: 59, name: 'Arcanine', types: ['Fire'], ability: 'Intimidate', evolutionChain: [58, 59], baseStatsSum: 555 },
  { id: 60, name: 'Poliwag', types: ['Water'], ability: 'Water Absorb', evolutionChain: [60, 61, 62] },
  { 
    id: 61, name: 'Poliwhirl', types: ['Water'], ability: 'Water Absorb', evolutionChain: [60, 61, 62, 186],
    evolutions: [
      { id: 62, condition: { type: 'stone', value: 'water' } },
      { id: 186, condition: { type: 'stone', value: 'sun' } }
    ]
  },
  { id: 62, name: 'Poliwrath', types: ['Water', 'Fighting'], ability: 'Water Absorb', evolutionChain: [60, 61, 62] },
  { id: 63, name: 'Abra', types: ['Psychic'], ability: 'Synchronize', evolutionChain: [63, 64, 65] },
  { id: 64, name: 'Kadabra', types: ['Psychic'], ability: 'Synchronize', evolutionChain: [63, 64, 65] },
  { id: 65, name: 'Alakazam', types: ['Psychic'], ability: 'Synchronize', evolutionChain: [63, 64, 65] },
  { id: 66, name: 'Machop', types: ['Fighting'], ability: 'Guts', evolutionChain: [66, 67, 68] },
  { id: 67, name: 'Machoke', types: ['Fighting'], ability: 'Guts', evolutionChain: [66, 67, 68] },
  { id: 68, name: 'Machamp', types: ['Fighting'], ability: 'Guts', evolutionChain: [66, 67, 68] },
  { id: 69, name: 'Bellsprout', types: ['Grass', 'Poison'], ability: 'Chlorophyll', evolutionChain: [69, 70, 71] },
  { id: 70, name: 'Weepinbell', types: ['Grass', 'Poison'], ability: 'Chlorophyll', evolutionChain: [69, 70, 71] },
  { id: 71, name: 'Victreebel', types: ['Grass', 'Poison'], ability: 'Chlorophyll', evolutionChain: [69, 70, 71] },
  { id: 72, name: 'Tentacool', types: ['Water', 'Poison'], ability: 'Clear Body', evolutionChain: [72, 73] },
  { id: 73, name: 'Tentacruel', types: ['Water', 'Poison'], ability: 'Clear Body', evolutionChain: [72, 73] },
  { id: 74, name: 'Geodude', types: ['Rock', 'Ground'], ability: 'Rock Head', evolutionChain: [74, 75, 76] },
  { id: 75, name: 'Graveler', types: ['Rock', 'Ground'], ability: 'Rock Head', evolutionChain: [74, 75, 76] },
  { id: 76, name: 'Golem', types: ['Rock', 'Ground'], ability: 'Rock Head', evolutionChain: [74, 75, 76] },
  { id: 77, name: 'Ponyta', types: ['Fire'], ability: 'Run Away', evolutionChain: [77, 78] },
  { id: 78, name: 'Rapidash', types: ['Fire'], ability: 'Run Away', evolutionChain: [77, 78] },
  { 
    id: 79, name: 'Slowpoke', types: ['Water', 'Psychic'], ability: 'Oblivious', evolutionChain: [79, 80, 199],
    evolutions: [
      { id: 80, condition: { type: 'level', value: 37 } },
      { id: 199, condition: { type: 'stone', value: 'moon' } }
    ]
  },
  { id: 80, name: 'Slowbro', types: ['Water', 'Psychic'], ability: 'Oblivious', evolutionChain: [79, 80] },
  { id: 81, name: 'Magnemite', types: ['Electric', 'Steel'], ability: 'Magnet Pull', evolutionChain: [81, 82, 462] },
  { 
    id: 82, name: 'Magneton', types: ['Electric', 'Steel'], ability: 'Magnet Pull', evolutionChain: [81, 82, 462],
    evolutions: [{ id: 462, condition: { type: 'stone', value: 'thunder' } }]
  },
  { id: 83, name: 'Farfetch\'d', types: ['Normal', 'Flying'], ability: 'Keen Eye', evolutionChain: [83] },
  { id: 84, name: 'Doduo', types: ['Normal', 'Flying'], ability: 'Run Away', evolutionChain: [84, 85] },
  { id: 85, name: 'Dodrio', types: ['Normal', 'Flying'], ability: 'Run Away', evolutionChain: [84, 85] },
  { id: 86, name: 'Seel', types: ['Water'], ability: 'Thick Fat', evolutionChain: [86, 87] },
  { id: 87, name: 'Dewgong', types: ['Water', 'Ice'], ability: 'Thick Fat', evolutionChain: [86, 87] },
  { id: 88, name: 'Grimer', types: ['Poison'], ability: 'Stench', evolutionChain: [88, 89] },
  { id: 89, name: 'Muk', types: ['Poison'], ability: 'Stench', evolutionChain: [88, 89] },
  { 
    id: 90, name: 'Shellder', types: ['Water'], ability: 'Shell Armor', evolutionChain: [90, 91],
    evolutions: [{ id: 91, condition: { type: 'stone', value: 'water' } }]
  },
  { id: 91, name: 'Cloyster', types: ['Water', 'Ice'], ability: 'Shell Armor', evolutionChain: [90, 91] },
  { id: 92, name: 'Gastly', types: ['Ghost', 'Poison'], ability: 'Levitate', evolutionChain: [92, 93, 94] },
  { id: 93, name: 'Haunter', types: ['Ghost', 'Poison'], ability: 'Levitate', evolutionChain: [92, 93, 94] },
  { id: 94, name: 'Gengar', types: ['Ghost', 'Poison'], ability: 'Cursed Body', evolutionChain: [92, 93, 94] },
  { 
    id: 95, name: 'Onix', types: ['Rock', 'Ground'], ability: 'Rock Head', evolutionChain: [95, 208],
    evolutions: [{ id: 208, condition: { type: 'stone', value: 'shiny' } }]
  },
  { id: 96, name: 'Drowzee', types: ['Psychic'], ability: 'Insomnia', evolutionChain: [96, 97] },
  { id: 97, name: 'Hypno', types: ['Psychic'], ability: 'Insomnia', evolutionChain: [96, 97] },
  { id: 98, name: 'Krabby', types: ['Water'], ability: 'Hyper Cutter', evolutionChain: [98, 99] },
  { id: 99, name: 'Kingler', types: ['Water'], ability: 'Hyper Cutter', evolutionChain: [98, 99] },
  { id: 100, name: 'Voltorb', types: ['Electric'], ability: 'Soundproof', evolutionChain: [100, 101] },
  { id: 101, name: 'Electrode', types: ['Electric'], ability: 'Soundproof', evolutionChain: [100, 101] },
  { id: 102, name: 'Exeggcute', types: ['Grass', 'Psychic'], ability: 'Chlorophyll', evolutionChain: [102, 103] },
  { id: 103, name: 'Exeggutor', types: ['Grass', 'Psychic'], ability: 'Chlorophyll', evolutionChain: [102, 103] },
  { id: 104, name: 'Cubone', types: ['Ground'], ability: 'Rock Head', evolutionChain: [104, 105] },
  { id: 105, name: 'Marowak', types: ['Ground'], ability: 'Rock Head', evolutionChain: [104, 105] },
  { id: 106, name: 'Hitmonlee', types: ['Fighting'], ability: 'Limber', evolutionChain: [236, 106] },
  { id: 107, name: 'Hitmonchan', types: ['Fighting'], ability: 'Keen Eye', evolutionChain: [236, 107] },
  { id: 108, name: 'Lickitung', types: ['Normal'], ability: 'Own Tempo', evolutionChain: [108, 463] },
  { id: 109, name: 'Koffing', types: ['Poison'], ability: 'Levitate', evolutionChain: [109, 110] },
  { id: 110, name: 'Weezing', types: ['Poison'], ability: 'Levitate', evolutionChain: [109, 110] },
  { id: 111, name: 'Rhyhorn', types: ['Ground', 'Rock'], ability: 'Lightning Rod', evolutionChain: [111, 112, 464] },
  { 
    id: 112, name: 'Rhydon', types: ['Ground', 'Rock'], ability: 'Lightning Rod', evolutionChain: [111, 112, 464],
    evolutions: [{ id: 464, condition: { type: 'stone', value: 'moon' } }]
  },
  { 
    id: 113, name: 'Chansey', types: ['Normal'], ability: 'Natural Cure', evolutionChain: [440, 113, 242],
    evolutions: [{ id: 242, condition: { type: 'happiness', value: 220 } }]
  },
  { 
    id: 114, name: 'Tangela', types: ['Grass'], ability: 'Chlorophyll', evolutionChain: [114, 465],
    evolutions: [{ id: 465, condition: { type: 'stone', value: 'leaf' } }]
  },
  { id: 115, name: 'Kangaskhan', types: ['Normal'], ability: 'Early Bird', evolutionChain: [115] },
  { id: 116, name: 'Horsea', types: ['Water'], ability: 'Swift Swim', evolutionChain: [116, 117, 230] },
  { 
    id: 117, name: 'Seadra', types: ['Water'], ability: 'Poison Point', evolutionChain: [116, 117, 230],
    evolutions: [{ id: 230, condition: { type: 'stone', value: 'water' } }]
  },
  { id: 118, name: 'Goldeen', types: ['Water'], ability: 'Swift Swim', evolutionChain: [118, 119] },
  { id: 119, name: 'Seaking', types: ['Water'], ability: 'Swift Swim', evolutionChain: [118, 119] },
  { 
    id: 120, name: 'Staryu', types: ['Water'], ability: 'Illuminate', evolutionChain: [120, 121],
    evolutions: [{ id: 121, condition: { type: 'stone', value: 'water' } }]
  },
  { id: 121, name: 'Starmie', types: ['Water', 'Psychic'], ability: 'Illuminate', evolutionChain: [120, 121] },
  { id: 122, name: 'Mr. Mime', types: ['Psychic', 'Fairy'], ability: 'Soundproof', evolutionChain: [439, 122] },
  { 
    id: 123, name: 'Scyther', types: ['Bug', 'Flying'], ability: 'Swarm', evolutionChain: [123, 212],
    evolutions: [{ id: 212, condition: { type: 'stone', value: 'shiny' } }]
  },
  { id: 124, name: 'Jynx', types: ['Ice', 'Psychic'], ability: 'Oblivious', evolutionChain: [238, 124] },
  { 
    id: 125, name: 'Electabuzz', types: ['Electric'], ability: 'Static', evolutionChain: [239, 125, 466],
    evolutions: [{ id: 466, condition: { type: 'stone', value: 'thunder' } }]
  },
  { 
    id: 126, name: 'Magmar', types: ['Fire'], ability: 'Flame Body', evolutionChain: [240, 126, 467],
    evolutions: [{ id: 467, condition: { type: 'stone', value: 'fire' } }]
  },
  { id: 127, name: 'Pinsir', types: ['Bug'], ability: 'Hyper Cutter', evolutionChain: [127] },
  { id: 128, name: 'Tauros', types: ['Normal'], ability: 'Intimidate', evolutionChain: [128] },
  { id: 129, name: 'Magikarp', types: ['Water'], ability: 'Swift Swim', evolutionChain: [129, 130] },
  { id: 130, name: 'Gyarados', types: ['Water', 'Flying'], ability: 'Intimidate', evolutionChain: [129, 130], baseStatsSum: 540 },
  { id: 131, name: 'Lapras', types: ['Water', 'Ice'], ability: 'Water Absorb', evolutionChain: [131], baseStatsSum: 535 },
  { id: 132, name: 'Ditto', types: ['Normal'], ability: 'Limber', evolutionChain: [132] },
  { 
    id: 133, name: 'Eevee', types: ['Normal'], ability: 'Run Away', evolutionChain: [133, 134, 135, 136, 196, 197, 470, 471, 700],
    evolutions: [
      { id: 134, condition: { type: 'stone', value: 'water' } },
      { id: 135, condition: { type: 'stone', value: 'thunder' } },
      { id: 136, condition: { type: 'stone', value: 'fire' } },
      { id: 196, condition: { type: 'happiness', value: 220 } },
      { id: 197, condition: { type: 'happiness', value: 220 } },
      { id: 470, condition: { type: 'stone', value: 'leaf' } },
      { id: 471, condition: { type: 'stone', value: 'ice' } },
      { id: 700, condition: { type: 'happiness', value: 220 } }
    ]
  },
  { id: 134, name: 'Vaporeon', types: ['Water'], ability: 'Water Absorb', evolutionChain: [133, 134] },
  { id: 135, name: 'Jolteon', types: ['Electric'], ability: 'Volt Absorb', evolutionChain: [133, 135] },
  { id: 136, name: 'Flareon', types: ['Fire'], ability: 'Flash Fire', evolutionChain: [133, 136] },
  { 
    id: 137, name: 'Porygon', types: ['Normal'], ability: 'Trace', evolutionChain: [137, 233, 474],
    evolutions: [{ id: 233, condition: { type: 'stone', value: 'moon' } }]
  },
  { id: 138, name: 'Omanyte', types: ['Rock', 'Water'], ability: 'Swift Swim', evolutionChain: [138, 139] },
  { id: 139, name: 'Omastar', types: ['Rock', 'Water'], ability: 'Swift Swim', evolutionChain: [138, 139] },
  { id: 140, name: 'Kabuto', types: ['Rock', 'Water'], ability: 'Swift Swim', evolutionChain: [140, 141] },
  { id: 141, name: 'Kabutops', types: ['Rock', 'Water'], ability: 'Swift Swim', evolutionChain: [140, 141] },
  { id: 142, name: 'Aerodactyl', types: ['Rock', 'Flying'], ability: 'Rock Head', evolutionChain: [142] },
  { id: 143, name: 'Snorlax', types: ['Normal'], ability: 'Immunity', evolutionChain: [446, 143], baseStatsSum: 540 },
  { id: 144, name: 'Articuno', types: ['Ice', 'Flying'], ability: 'Pressure', evolutionChain: [144], isLegendary: true, baseStatsSum: 580 },
  { id: 145, name: 'Zapdos', types: ['Electric', 'Flying'], ability: 'Pressure', evolutionChain: [145], isLegendary: true, baseStatsSum: 580 },
  { id: 146, name: 'Moltres', types: ['Fire', 'Flying'], ability: 'Pressure', evolutionChain: [146], isLegendary: true, baseStatsSum: 580 },
  { id: 147, name: 'Dratini', types: ['Dragon'], ability: 'Shed Skin', evolutionChain: [147, 148, 149] },
  { id: 148, name: 'Dragonair', types: ['Dragon'], ability: 'Shed Skin', evolutionChain: [147, 148, 149] },
  { id: 149, name: 'Dragonite', types: ['Dragon', 'Flying'], ability: 'Inner Focus', evolutionChain: [147, 148, 149], baseStatsSum: 600 },
  { id: 150, name: 'Mewtwo', types: ['Psychic'], ability: 'Pressure', evolutionChain: [150], isLegendary: true, baseStatsSum: 680 },
  { id: 151, name: 'Mew', types: ['Psychic'], ability: 'Synchronize', evolutionChain: [151], isMythical: true, baseStatsSum: 600 },
  { id: 249, name: 'Lugia', types: ['Psychic', 'Flying'], ability: 'Pressure', evolutionChain: [249], isLegendary: true, baseStatsSum: 680 },
  { id: 250, name: 'Ho-Oh', types: ['Fire', 'Flying'], ability: 'Pressure', evolutionChain: [250], isLegendary: true, baseStatsSum: 680 },
  { id: 384, name: 'Rayquaza', types: ['Dragon', 'Flying'], ability: 'Air Lock', evolutionChain: [384], isLegendary: true, baseStatsSum: 680 },
  { id: 152, name: 'Chikorita', types: ['Grass'], ability: 'Overgrow', evolutionChain: [152, 153, 154] },
  { id: 153, name: 'Bayleef', types: ['Grass'], ability: 'Overgrow', evolutionChain: [152, 153, 154] },
  { id: 154, name: 'Meganium', types: ['Grass'], ability: 'Overgrow', evolutionChain: [152, 153, 154], baseStatsSum: 525 },
  { id: 155, name: 'Cyndaquil', types: ['Fire'], ability: 'Blaze', evolutionChain: [155, 156, 157] },
  { id: 156, name: 'Quilava', types: ['Fire'], ability: 'Blaze', evolutionChain: [155, 156, 157] },
  { id: 157, name: 'Typhlosion', types: ['Fire'], ability: 'Blaze', evolutionChain: [155, 156, 157], baseStatsSum: 534 },
  { id: 158, name: 'Totodile', types: ['Water'], ability: 'Torrent', evolutionChain: [158, 159, 160] },
  { id: 159, name: 'Croconaw', types: ['Water'], ability: 'Torrent', evolutionChain: [158, 159, 160] },
  { id: 160, name: 'Feraligatr', types: ['Water'], ability: 'Torrent', evolutionChain: [158, 159, 160], baseStatsSum: 530 },
  { id: 161, name: 'Sentret', types: ['Normal'], ability: 'Run Away', evolutionChain: [161, 162] },
  { id: 162, name: 'Furret', types: ['Normal'], ability: 'Run Away', evolutionChain: [161, 162] },
  { 
    id: 175, name: 'Togepi', types: ['Fairy'], ability: 'Serene Grace', evolutionChain: [175, 176, 468],
    evolutions: [{ id: 176, condition: { type: 'happiness', value: 220 } }]
  },
  { 
    id: 176, name: 'Togetic', types: ['Fairy', 'Flying'], ability: 'Serene Grace', evolutionChain: [175, 176, 468],
    evolutions: [{ id: 468, condition: { type: 'stone', value: 'shiny' } }]
  },
  { id: 468, name: 'Togekiss', types: ['Fairy', 'Flying'], ability: 'Serene Grace', evolutionChain: [175, 176, 468], baseStatsSum: 545 },
  { id: 179, name: 'Mareep', types: ['Electric'], ability: 'Static', evolutionChain: [179, 180, 181] },
  { id: 180, name: 'Flaaffy', types: ['Electric'], ability: 'Static', evolutionChain: [179, 180, 181] },
  { id: 181, name: 'Ampharos', types: ['Electric'], ability: 'Static', evolutionChain: [179, 180, 181] },
  { id: 214, name: 'Heracross', types: ['Bug', 'Fighting'], ability: 'Swarm', evolutionChain: [214] },
  { id: 215, name: 'Sneasel', types: ['Dark', 'Ice'], ability: 'Inner Focus', evolutionChain: [215] },
  { id: 227, name: 'Skarmory', types: ['Steel', 'Flying'], ability: 'Keen Eye', evolutionChain: [227] },
  { id: 228, name: 'Houndour', types: ['Dark', 'Fire'], ability: 'Early Bird', evolutionChain: [228, 229] },
  { id: 229, name: 'Houndoom', types: ['Dark', 'Fire'], ability: 'Early Bird', evolutionChain: [228, 229] },
  { id: 246, name: 'Larvitar', types: ['Rock', 'Ground'], ability: 'Guts', evolutionChain: [246, 247, 248] },
  { id: 247, name: 'Pupitar', types: ['Rock', 'Ground'], ability: 'Shed Skin', evolutionChain: [246, 247, 248] },
  { id: 248, name: 'Tyranitar', types: ['Rock', 'Dark'], ability: 'Sand Stream', evolutionChain: [246, 247, 248], baseStatsSum: 600 },
  { id: 251, name: 'Celebi', types: ['Psychic', 'Grass'], ability: 'Natural Cure', evolutionChain: [251], isMythical: true, baseStatsSum: 600 },
  { id: 252, name: 'Treecko', types: ['Grass'], ability: 'Overgrow', evolutionChain: [252, 253, 254] },
  { id: 253, name: 'Grovyle', types: ['Grass'], ability: 'Overgrow', evolutionChain: [252, 253, 254] },
  { id: 254, name: 'Sceptile', types: ['Grass'], ability: 'Overgrow', evolutionChain: [252, 253, 254] },
  { id: 255, name: 'Torchic', types: ['Fire'], ability: 'Blaze', evolutionChain: [255, 256, 257] },
  { id: 256, name: 'Combusken', types: ['Fire', 'Fighting'], ability: 'Blaze', evolutionChain: [255, 256, 257] },
  { id: 257, name: 'Blaziken', types: ['Fire', 'Fighting'], ability: 'Blaze', evolutionChain: [255, 256, 257] },
  { id: 258, name: 'Mudkip', types: ['Water'], ability: 'Torrent', evolutionChain: [258, 259, 260] },
  { id: 259, name: 'Marshtomp', types: ['Water', 'Ground'], ability: 'Torrent', evolutionChain: [258, 259, 260] },
  { id: 260, name: 'Swampert', types: ['Water', 'Ground'], ability: 'Torrent', evolutionChain: [258, 259, 260] },
  { id: 280, name: 'Ralts', types: ['Psychic', 'Fairy'], ability: 'Synchronize', evolutionChain: [280, 281, 282] },
  { id: 281, name: 'Kirlia', types: ['Psychic', 'Fairy'], ability: 'Synchronize', evolutionChain: [280, 281, 282] },
  { id: 282, name: 'Gardevoir', types: ['Psychic', 'Fairy'], ability: 'Synchronize', evolutionChain: [280, 281, 282] },
  { id: 304, name: 'Aron', types: ['Steel', 'Rock'], ability: 'Sturdy', evolutionChain: [304, 305, 306] },
  { id: 305, name: 'Lairon', types: ['Steel', 'Rock'], ability: 'Sturdy', evolutionChain: [304, 305, 306] },
  { id: 306, name: 'Aggron', types: ['Steel', 'Rock'], ability: 'Sturdy', evolutionChain: [304, 305, 306], baseStatsSum: 530 },
  { id: 328, name: 'Trapinch', types: ['Ground'], ability: 'Arena Trap', evolutionChain: [328, 329, 330] },
  { id: 329, name: 'Vibrava', types: ['Ground', 'Dragon'], ability: 'Levitate', evolutionChain: [328, 329, 330] },
  { id: 330, name: 'Flygon', types: ['Ground', 'Dragon'], ability: 'Levitate', evolutionChain: [328, 329, 330], baseStatsSum: 520 },
  { id: 333, name: 'Swablu', types: ['Normal', 'Flying'], ability: 'Natural Cure', evolutionChain: [333, 334] },
  { id: 334, name: 'Altaria', types: ['Dragon', 'Flying'], ability: 'Natural Cure', evolutionChain: [333, 334], baseStatsSum: 490 },
  { id: 371, name: 'Bagon', types: ['Dragon'], ability: 'Rock Head', evolutionChain: [371, 372, 373] },
  { id: 372, name: 'Shelgon', types: ['Dragon'], ability: 'Rock Head', evolutionChain: [371, 372, 373] },
  { id: 373, name: 'Salamence', types: ['Dragon', 'Flying'], ability: 'Intimidate', evolutionChain: [371, 372, 373], baseStatsSum: 600 },
  { id: 374, name: 'Beldum', types: ['Steel', 'Psychic'], ability: 'Clear Body', evolutionChain: [374, 375, 376] },
  { id: 375, name: 'Metang', types: ['Steel', 'Psychic'], ability: 'Clear Body', evolutionChain: [374, 375, 376] },
  { id: 376, name: 'Metagross', types: ['Steel', 'Psychic'], ability: 'Clear Body', evolutionChain: [374, 375, 376], baseStatsSum: 600 },
  { id: 380, name: 'Latias', types: ['Dragon', 'Psychic'], ability: 'Levitate', evolutionChain: [380], isLegendary: true, baseStatsSum: 600 },
  { id: 381, name: 'Latios', types: ['Dragon', 'Psychic'], ability: 'Levitate', evolutionChain: [381], isLegendary: true, baseStatsSum: 600 },
  { id: 382, name: 'Kyogre', types: ['Water'], ability: 'Drizzle', evolutionChain: [382], isLegendary: true, baseStatsSum: 670 },
  { id: 383, name: 'Groudon', types: ['Ground'], ability: 'Drought', evolutionChain: [383], isLegendary: true, baseStatsSum: 670 },
  { id: 443, name: 'Gible', types: ['Dragon', 'Ground'], ability: 'Sand Veil', evolutionChain: [443, 444, 445] },
  { id: 444, name: 'Gabite', types: ['Dragon', 'Ground'], ability: 'Sand Veil', evolutionChain: [443, 444, 445] },
  { id: 445, name: 'Garchomp', types: ['Dragon', 'Ground'], ability: 'Sand Veil', evolutionChain: [443, 444, 445], baseStatsSum: 600 },
  { id: 387, name: 'Turtwig', types: ['Grass'], ability: 'Overgrow', evolutionChain: [387, 388, 389] },
  { id: 388, name: 'Grotle', types: ['Grass'], ability: 'Overgrow', evolutionChain: [387, 388, 389] },
  { id: 389, name: 'Torterra', types: ['Grass', 'Ground'], ability: 'Overgrow', evolutionChain: [387, 388, 389], baseStatsSum: 525 },
  { id: 390, name: 'Chimchar', types: ['Fire'], ability: 'Blaze', evolutionChain: [390, 391, 392] },
  { id: 391, name: 'Monferno', types: ['Fire', 'Fighting'], ability: 'Blaze', evolutionChain: [390, 391, 392] },
  { id: 392, name: 'Infernape', types: ['Fire', 'Fighting'], ability: 'Blaze', evolutionChain: [390, 391, 392], baseStatsSum: 534 },
  { id: 393, name: 'Piplup', types: ['Water'], ability: 'Torrent', evolutionChain: [393, 394, 395] },
  { id: 394, name: 'Prinplup', types: ['Water'], ability: 'Torrent', evolutionChain: [393, 394, 395] },
  { id: 395, name: 'Empoleon', types: ['Water', 'Steel'], ability: 'Torrent', evolutionChain: [393, 394, 395], baseStatsSum: 530 },
  { id: 403, name: 'Shinx', types: ['Electric'], ability: 'Rivalry', evolutionChain: [403, 404, 405] },
  { id: 404, name: 'Luxio', types: ['Electric'], ability: 'Rivalry', evolutionChain: [403, 404, 405] },
  { id: 405, name: 'Luxray', types: ['Electric'], ability: 'Intimidate', evolutionChain: [403, 404, 405], baseStatsSum: 523 },
  { 
    id: 447, name: 'Riolu', types: ['Fighting'], ability: 'Steadfast', evolutionChain: [447, 448],
    evolutions: [{ id: 448, condition: { type: 'happiness', value: 220 } }]
  },
  { id: 448, name: 'Lucario', types: ['Fighting', 'Steel'], ability: 'Steadfast', evolutionChain: [447, 448], baseStatsSum: 525 },
  { id: 459, name: 'Snover', types: ['Grass', 'Ice'], ability: 'Snow Warning', evolutionChain: [459, 460] },
  { id: 460, name: 'Abomasnow', types: ['Grass', 'Ice'], ability: 'Snow Warning', evolutionChain: [459, 460], baseStatsSum: 494 },
  { id: 479, name: 'Rotom', types: ['Electric', 'Ghost'], ability: 'Levitate', evolutionChain: [479], baseStatsSum: 440 },
  { id: 495, name: 'Snivy', types: ['Grass'], ability: 'Overgrow', evolutionChain: [495, 496, 497] },
  { id: 496, name: 'Servine', types: ['Grass'], ability: 'Overgrow', evolutionChain: [495, 496, 497] },
  { id: 497, name: 'Serperior', types: ['Grass'], ability: 'Overgrow', evolutionChain: [495, 496, 497] },
  { id: 498, name: 'Tepig', types: ['Fire'], ability: 'Blaze', evolutionChain: [498, 499, 500] },
  { id: 499, name: 'Pignite', types: ['Fire', 'Fighting'], ability: 'Blaze', evolutionChain: [498, 499, 500] },
  { id: 500, name: 'Emboar', types: ['Fire', 'Fighting'], ability: 'Blaze', evolutionChain: [498, 499, 500] },
  { id: 501, name: 'Oshawott', types: ['Water'], ability: 'Torrent', evolutionChain: [501, 502, 503] },
  { id: 502, name: 'Dewott', types: ['Water'], ability: 'Torrent', evolutionChain: [501, 502, 503] },
  { id: 503, name: 'Samurott', types: ['Water'], ability: 'Torrent', evolutionChain: [501, 502, 503] },
  { id: 504, name: 'Patrat', types: ['Normal'], ability: 'Run Away', evolutionChain: [504, 505] },
  { id: 505, name: 'Watchog', types: ['Normal'], ability: 'Illuminate', evolutionChain: [504, 505] },
  { id: 506, name: 'Lillipup', types: ['Normal'], ability: 'Vital Spirit', evolutionChain: [506, 507, 508] },
  { id: 507, name: 'Herdier', types: ['Normal'], ability: 'Intimidate', evolutionChain: [506, 507, 508] },
  { id: 508, name: 'Stoutland', types: ['Normal'], ability: 'Intimidate', evolutionChain: [506, 507, 508] },
  { id: 509, name: 'Purrloin', types: ['Dark'], ability: 'Limber', evolutionChain: [509, 510] },
  { id: 510, name: 'Liepard', types: ['Dark'], ability: 'Limber', evolutionChain: [509, 510] },
  { id: 511, name: 'Pansage', types: ['Grass'], ability: 'Gluttony', evolutionChain: [511, 512] },
  { id: 512, name: 'Simisage', types: ['Grass'], ability: 'Gluttony', evolutionChain: [511, 512] },
  { id: 513, name: 'Pansear', types: ['Fire'], ability: 'Gluttony', evolutionChain: [513, 514] },
  { id: 514, name: 'Simisear', types: ['Fire'], ability: 'Gluttony', evolutionChain: [513, 514] },
  { id: 515, name: 'Panpour', types: ['Water'], ability: 'Gluttony', evolutionChain: [515, 516] },
  { id: 516, name: 'Simipour', types: ['Water'], ability: 'Gluttony', evolutionChain: [515, 516] },
  { id: 517, name: 'Munna', types: ['Psychic'], ability: 'Forewarn', evolutionChain: [517, 518] },
  { id: 518, name: 'Musharna', types: ['Psychic'], ability: 'Forewarn', evolutionChain: [517, 518] },
  { id: 519, name: 'Pidove', types: ['Normal', 'Flying'], ability: 'Big Pecks', evolutionChain: [519, 520, 521] },
  { id: 520, name: 'Tranquill', types: ['Normal', 'Flying'], ability: 'Big Pecks', evolutionChain: [519, 520, 521] },
  { id: 521, name: 'Unfezant', types: ['Normal', 'Flying'], ability: 'Big Pecks', evolutionChain: [519, 520, 521] },
  { id: 522, name: 'Blitzle', types: ['Electric'], ability: 'Lightning Rod', evolutionChain: [522, 523] },
  { id: 523, name: 'Zebstrika', types: ['Electric'], ability: 'Lightning Rod', evolutionChain: [522, 523] },
  { id: 524, name: 'Roggenrola', types: ['Rock'], ability: 'Sturdy', evolutionChain: [524, 525, 526] },
  { id: 525, name: 'Boldore', types: ['Rock'], ability: 'Sturdy', evolutionChain: [524, 525, 526] },
  { id: 526, name: 'Gigalith', types: ['Rock'], ability: 'Sturdy', evolutionChain: [524, 525, 526] },
  { id: 527, name: 'Woobat', types: ['Psychic', 'Flying'], ability: 'Unaware', evolutionChain: [527, 528] },
  { id: 528, name: 'Swoobat', types: ['Psychic', 'Flying'], ability: 'Unaware', evolutionChain: [527, 528] },
  { id: 529, name: 'Drilbur', types: ['Ground'], ability: 'Sand Rush', evolutionChain: [529, 530] },
  { id: 530, name: 'Excadrill', types: ['Ground', 'Steel'], ability: 'Sand Rush', evolutionChain: [529, 530] },
  { id: 531, name: 'Audino', types: ['Normal'], ability: 'Healer', evolutionChain: [531] },
  { id: 532, name: 'Timburr', types: ['Fighting'], ability: 'Guts', evolutionChain: [532, 533, 534] },
  { id: 533, name: 'Gurdurr', types: ['Fighting'], ability: 'Guts', evolutionChain: [532, 533, 534] },
  { id: 534, name: 'Conkeldurr', types: ['Fighting'], ability: 'Guts', evolutionChain: [532, 533, 534] },
  { id: 535, name: 'Tympole', types: ['Water'], ability: 'Swift Swim', evolutionChain: [535, 536, 537] },
  { id: 536, name: 'Palpitoad', types: ['Water', 'Ground'], ability: 'Swift Swim', evolutionChain: [535, 536, 537] },
  { id: 537, name: 'Seismitoad', types: ['Water', 'Ground'], ability: 'Swift Swim', evolutionChain: [535, 536, 537] },
  { id: 538, name: 'Throh', types: ['Fighting'], ability: 'Guts', evolutionChain: [538] },
  { id: 539, name: 'Sawk', types: ['Fighting'], ability: 'Sturdy', evolutionChain: [539] },
  { id: 540, name: 'Sewaddle', types: ['Bug', 'Grass'], ability: 'Swarm', evolutionChain: [540, 541, 542] },
  { id: 541, name: 'Swadloon', types: ['Bug', 'Grass'], ability: 'Leaf Guard', evolutionChain: [540, 541, 542] },
  { id: 542, name: 'Leavanny', types: ['Bug', 'Grass'], ability: 'Swarm', evolutionChain: [540, 541, 542] },
  { id: 543, name: 'Venipede', types: ['Bug', 'Poison'], ability: 'Poison Point', evolutionChain: [543, 544, 545] },
  { id: 544, name: 'Whirlipede', types: ['Bug', 'Poison'], ability: 'Poison Point', evolutionChain: [543, 544, 545] },
  { id: 545, name: 'Scolipede', types: ['Bug', 'Poison'], ability: 'Poison Point', evolutionChain: [543, 544, 545] },
  { id: 546, name: 'Cottonee', types: ['Grass', 'Fairy'], ability: 'Prankster', evolutionChain: [546, 547] },
  { id: 547, name: 'Whimsicott', types: ['Grass', 'Fairy'], ability: 'Prankster', evolutionChain: [546, 547] },
  { id: 548, name: 'Petilil', types: ['Grass'], ability: 'Chlorophyll', evolutionChain: [548, 549] },
  { id: 549, name: 'Lilligant', types: ['Grass'], ability: 'Chlorophyll', evolutionChain: [548, 549] },
  { id: 550, name: 'Basculin', types: ['Water'], ability: 'Reckless', evolutionChain: [550] },
  { id: 551, name: 'Sandile', types: ['Ground', 'Dark'], ability: 'Intimidate', evolutionChain: [551, 552, 553] },
  { id: 552, name: 'Krokorok', types: ['Ground', 'Dark'], ability: 'Intimidate', evolutionChain: [551, 552, 553] },
  { id: 553, name: 'Krookodile', types: ['Ground', 'Dark'], ability: 'Intimidate', evolutionChain: [551, 552, 553] },
  { id: 554, name: 'Darumaka', types: ['Fire'], ability: 'Hustle', evolutionChain: [554, 555] },
  { id: 555, name: 'Darmanitan', types: ['Fire'], ability: 'Sheer Force', evolutionChain: [554, 555] },
  { id: 556, name: 'Maractus', types: ['Grass'], ability: 'Water Absorb', evolutionChain: [556] },
  { id: 557, name: 'Dwebble', types: ['Bug', 'Rock'], ability: 'Sturdy', evolutionChain: [557, 558] },
  { id: 558, name: 'Crustle', types: ['Bug', 'Rock'], ability: 'Sturdy', evolutionChain: [557, 558] },
  { id: 559, name: 'Scraggy', types: ['Dark', 'Fighting'], ability: 'Shed Skin', evolutionChain: [559, 560] },
  { id: 560, name: 'Scrafty', types: ['Dark', 'Fighting'], ability: 'Shed Skin', evolutionChain: [559, 560] },
  { id: 561, name: 'Sigilyph', types: ['Psychic', 'Flying'], ability: 'Wonder Skin', evolutionChain: [561] },
  { id: 562, name: 'Yamask', types: ['Ghost'], ability: 'Mummy', evolutionChain: [562, 563] },
  { id: 563, name: 'Cofagrigus', types: ['Ghost'], ability: 'Mummy', evolutionChain: [562, 563] },
  { id: 564, name: 'Tirtouga', types: ['Water', 'Rock'], ability: 'Solid Rock', evolutionChain: [564, 565] },
  { id: 565, name: 'Carracosta', types: ['Water', 'Rock'], ability: 'Solid Rock', evolutionChain: [564, 565] },
  { id: 566, name: 'Archen', types: ['Rock', 'Flying'], ability: 'Defeatist', evolutionChain: [566, 567] },
  { id: 567, name: 'Archeops', types: ['Rock', 'Flying'], ability: 'Defeatist', evolutionChain: [566, 567] },
  { id: 568, name: 'Trubbish', types: ['Poison'], ability: 'Stench', evolutionChain: [568, 569] },
  { id: 569, name: 'Garbodor', types: ['Poison'], ability: 'Stench', evolutionChain: [568, 569] },
  { id: 570, name: 'Zorua', types: ['Dark'], ability: 'Illusion', evolutionChain: [570, 571] },
  { id: 571, name: 'Zoroark', types: ['Dark'], ability: 'Illusion', evolutionChain: [570, 571] },
  { id: 572, name: 'Minccino', types: ['Normal'], ability: 'Cute Charm', evolutionChain: [572, 573] },
  { id: 573, name: 'Cinccino', types: ['Normal'], ability: 'Cute Charm', evolutionChain: [572, 573] },
  { id: 574, name: 'Gothita', types: ['Psychic'], ability: 'Frisk', evolutionChain: [574, 575, 576] },
  { id: 575, name: 'Gothorita', types: ['Psychic'], ability: 'Frisk', evolutionChain: [574, 575, 576] },
  { id: 576, name: 'Gothitelle', types: ['Psychic'], ability: 'Frisk', evolutionChain: [574, 575, 576] },
  { id: 577, name: 'Solosis', types: ['Psychic'], ability: 'Overcoat', evolutionChain: [577, 578, 579] },
  { id: 578, name: 'Duosion', types: ['Psychic'], ability: 'Overcoat', evolutionChain: [577, 578, 579] },
  { id: 579, name: 'Reuniclus', types: ['Psychic'], ability: 'Overcoat', evolutionChain: [577, 578, 579] },
  { id: 580, name: 'Ducklett', types: ['Water', 'Flying'], ability: 'Keen Eye', evolutionChain: [580, 581] },
  { id: 581, name: 'Swanna', types: ['Water', 'Flying'], ability: 'Keen Eye', evolutionChain: [580, 581] },
  { id: 582, name: 'Vanillite', types: ['Ice'], ability: 'Ice Body', evolutionChain: [582, 583, 584] },
  { id: 583, name: 'Vanillish', types: ['Ice'], ability: 'Ice Body', evolutionChain: [582, 583, 584] },
  { id: 584, name: 'Vanilluxe', types: ['Ice'], ability: 'Ice Body', evolutionChain: [582, 583, 584] },
  { id: 585, name: 'Deerling', types: ['Normal', 'Grass'], ability: 'Chlorophyll', evolutionChain: [585, 586] },
  { id: 586, name: 'Sawsbuck', types: ['Normal', 'Grass'], ability: 'Chlorophyll', evolutionChain: [585, 586] },
  { id: 587, name: 'Emolga', types: ['Electric', 'Flying'], ability: 'Static', evolutionChain: [587] },
  { id: 588, name: 'Karrablast', types: ['Bug'], ability: 'Swarm', evolutionChain: [588, 589] },
  { id: 589, name: 'Escavalier', types: ['Bug', 'Steel'], ability: 'Swarm', evolutionChain: [588, 589] },
  { id: 590, name: 'Foongus', types: ['Grass', 'Poison'], ability: 'Effect Spore', evolutionChain: [590, 591] },
  { id: 591, name: 'Amoonguss', types: ['Grass', 'Poison'], ability: 'Effect Spore', evolutionChain: [590, 591] },
  { id: 592, name: 'Frillish', types: ['Water', 'Ghost'], ability: 'Water Absorb', evolutionChain: [592, 593] },
  { id: 593, name: 'Jellicent', types: ['Water', 'Ghost'], ability: 'Water Absorb', evolutionChain: [592, 593] },
  { id: 594, name: 'Alomomola', types: ['Water'], ability: 'Healer', evolutionChain: [594] },
  { id: 595, name: 'Joltik', types: ['Bug', 'Electric'], ability: 'Compound Eyes', evolutionChain: [595, 596] },
  { id: 596, name: 'Galvantula', types: ['Bug', 'Electric'], ability: 'Compound Eyes', evolutionChain: [595, 596] },
  { id: 597, name: 'Ferroseed', types: ['Grass', 'Steel'], ability: 'Iron Barbs', evolutionChain: [597, 598] },
  { id: 598, name: 'Ferrothorn', types: ['Grass', 'Steel'], ability: 'Iron Barbs', evolutionChain: [597, 598] },
  { id: 599, name: 'Klink', types: ['Steel'], ability: 'Plus', evolutionChain: [599, 600, 601] },
  { id: 600, name: 'Klang', types: ['Steel'], ability: 'Plus', evolutionChain: [599, 600, 601] },
  { id: 601, name: 'Klinklang', types: ['Steel'], ability: 'Plus', evolutionChain: [599, 600, 601] },
  { id: 602, name: 'Tynamo', types: ['Electric'], ability: 'Levitate', evolutionChain: [602, 603, 604] },
  { id: 603, name: 'Eelektrik', types: ['Electric'], ability: 'Levitate', evolutionChain: [602, 603, 604] },
  { id: 604, name: 'Eelektross', types: ['Electric'], ability: 'Levitate', evolutionChain: [602, 603, 604] },
  { id: 605, name: 'Elgyem', types: ['Psychic'], ability: 'Telepathy', evolutionChain: [605, 606] },
  { id: 606, name: 'Beheeyem', types: ['Psychic'], ability: 'Telepathy', evolutionChain: [605, 606] },
  { id: 607, name: 'Litwick', types: ['Ghost', 'Fire'], ability: 'Flash Fire', evolutionChain: [607, 608, 609] },
  { id: 608, name: 'Lampent', types: ['Ghost', 'Fire'], ability: 'Flash Fire', evolutionChain: [607, 608, 609] },
  { id: 609, name: 'Chandelure', types: ['Ghost', 'Fire'], ability: 'Flash Fire', evolutionChain: [607, 608, 609] },
  { id: 610, name: 'Axew', types: ['Dragon'], ability: 'Rivalry', evolutionChain: [610, 611, 612] },
  { id: 611, name: 'Fraxure', types: ['Dragon'], ability: 'Rivalry', evolutionChain: [610, 611, 612] },
  { id: 612, name: 'Haxorus', types: ['Dragon'], ability: 'Rivalry', evolutionChain: [610, 611, 612] },
  { id: 613, name: 'Cubchoo', types: ['Ice'], ability: 'Snow Cloak', evolutionChain: [613, 614] },
  { id: 614, name: 'Beartic', types: ['Ice'], ability: 'Snow Cloak', evolutionChain: [613, 614] },
  { id: 615, name: 'Cryogonal', types: ['Ice'], ability: 'Levitate', evolutionChain: [615] },
  { id: 616, name: 'Shelmet', types: ['Bug'], ability: 'Shell Armor', evolutionChain: [616, 617] },
  { id: 617, name: 'Accelgor', types: ['Bug'], ability: 'Hydration', evolutionChain: [616, 617] },
  { id: 618, name: 'Stunfisk', types: ['Ground', 'Electric'], ability: 'Static', evolutionChain: [618] },
  { id: 619, name: 'Mienfoo', types: ['Fighting'], ability: 'Inner Focus', evolutionChain: [619, 620] },
  { id: 620, name: 'Mienshao', types: ['Fighting'], ability: 'Inner Focus', evolutionChain: [619, 620] },
  { id: 621, name: 'Druddigon', types: ['Dragon'], ability: 'Rough Skin', evolutionChain: [621] },
  { id: 622, name: 'Golett', types: ['Ground', 'Ghost'], ability: 'Iron Fist', evolutionChain: [622, 623] },
  { id: 623, name: 'Golurk', types: ['Ground', 'Ghost'], ability: 'Iron Fist', evolutionChain: [622, 623] },
  { id: 624, name: 'Pawniard', types: ['Dark', 'Steel'], ability: 'Defiant', evolutionChain: [624, 625] },
  { id: 625, name: 'Bisharp', types: ['Dark', 'Steel'], ability: 'Defiant', evolutionChain: [624, 625] },
  { id: 626, name: 'Bouffalant', types: ['Normal'], ability: 'Reckless', evolutionChain: [626] },
  { id: 627, name: 'Rufflet', types: ['Normal', 'Flying'], ability: 'Keen Eye', evolutionChain: [627, 628] },
  { id: 628, name: 'Braviary', types: ['Normal', 'Flying'], ability: 'Keen Eye', evolutionChain: [627, 628] },
  { id: 629, name: 'Vullaby', types: ['Dark', 'Flying'], ability: 'Big Pecks', evolutionChain: [629, 630] },
  { id: 630, name: 'Mandibuzz', types: ['Dark', 'Flying'], ability: 'Big Pecks', evolutionChain: [629, 630] },
  { id: 631, name: 'Heatmor', types: ['Fire'], ability: 'Gluttony', evolutionChain: [631] },
  { id: 632, name: 'Durant', types: ['Bug', 'Steel'], ability: 'Swarm', evolutionChain: [632] },
  { id: 633, name: 'Deino', types: ['Dark', 'Dragon'], ability: 'Hustle', evolutionChain: [633, 634, 635] },
  { id: 634, name: 'Zweilous', types: ['Dark', 'Dragon'], ability: 'Hustle', evolutionChain: [633, 634, 635] },
  { id: 635, name: 'Hydreigon', types: ['Dark', 'Dragon'], ability: 'Levitate', evolutionChain: [633, 634, 635] },
  { id: 636, name: 'Larvesta', types: ['Bug', 'Fire'], ability: 'Flame Body', evolutionChain: [636, 637] },
  { id: 637, name: 'Volcarona', types: ['Bug', 'Fire'], ability: 'Flame Body', evolutionChain: [636, 637] },
  { id: 638, name: 'Cobalion', types: ['Steel', 'Fighting'], ability: 'Justified', evolutionChain: [638], isLegendary: true },
  { id: 639, name: 'Terrakion', types: ['Rock', 'Fighting'], ability: 'Justified', evolutionChain: [639], isLegendary: true },
  { id: 640, name: 'Virizion', types: ['Grass', 'Fighting'], ability: 'Justified', evolutionChain: [640], isLegendary: true },
  { id: 641, name: 'Tornadus', types: ['Flying'], ability: 'Prankster', evolutionChain: [641], isLegendary: true },
  { id: 642, name: 'Thundurus', types: ['Electric', 'Flying'], ability: 'Prankster', evolutionChain: [642], isLegendary: true },
  { id: 643, name: 'Reshiram', types: ['Dragon', 'Fire'], ability: 'Turboblaze', evolutionChain: [643], isLegendary: true },
  { id: 644, name: 'Zekrom', types: ['Dragon', 'Electric'], ability: 'Teravolt', evolutionChain: [644], isLegendary: true },
  { id: 645, name: 'Landorus', types: ['Ground', 'Flying'], ability: 'Sand Force', evolutionChain: [645], isLegendary: true },
  { id: 646, name: 'Kyurem', types: ['Dragon', 'Ice'], ability: 'Pressure', evolutionChain: [646], isLegendary: true },
  { id: 647, name: 'Keldeo', types: ['Water', 'Fighting'], ability: 'Justified', evolutionChain: [647], isMythical: true },
  { id: 648, name: 'Meloetta', types: ['Normal', 'Psychic'], ability: 'Serene Grace', evolutionChain: [648], isMythical: true },
  { id: 649, name: 'Genesect', types: ['Bug', 'Steel'], ability: 'Download', evolutionChain: [649], isMythical: true },
  { id: 650, name: 'Chespin', types: ['Grass'], ability: 'Overgrow', evolutionChain: [650, 651, 652] },
  { id: 651, name: 'Quilladin', types: ['Grass'], ability: 'Overgrow', evolutionChain: [650, 651, 652] },
  { id: 652, name: 'Chesnaught', types: ['Grass', 'Fighting'], ability: 'Overgrow', evolutionChain: [650, 651, 652] },
  { id: 653, name: 'Fennekin', types: ['Fire'], ability: 'Blaze', evolutionChain: [653, 654, 655] },
  { id: 654, name: 'Braixen', types: ['Fire'], ability: 'Blaze', evolutionChain: [653, 654, 655] },
  { id: 655, name: 'Delphox', types: ['Fire', 'Psychic'], ability: 'Blaze', evolutionChain: [653, 654, 655] },
  { id: 656, name: 'Froakie', types: ['Water'], ability: 'Torrent', evolutionChain: [656, 657, 658] },
  { id: 657, name: 'Frogadier', types: ['Water'], ability: 'Torrent', evolutionChain: [656, 657, 658] },
  { id: 658, name: 'Greninja', types: ['Water', 'Dark'], ability: 'Torrent', evolutionChain: [656, 657, 658] },
  { id: 659, name: 'Bunnelby', types: ['Normal'], ability: 'Pickup', evolutionChain: [659, 660] },
  { id: 660, name: 'Diggersby', types: ['Normal', 'Ground'], ability: 'Pickup', evolutionChain: [659, 660] },
  { id: 661, name: 'Fletchling', types: ['Normal', 'Flying'], ability: 'Big Pecks', evolutionChain: [661, 662, 663] },
  { id: 662, name: 'Fletchinder', types: ['Fire', 'Flying'], ability: 'Flame Body', evolutionChain: [661, 662, 663] },
  { id: 663, name: 'Talonflame', types: ['Fire', 'Flying'], ability: 'Flame Body', evolutionChain: [661, 662, 663] },
  { id: 664, name: 'Scatterbug', types: ['Bug'], ability: 'Shield Dust', evolutionChain: [664, 665, 666] },
  { id: 665, name: 'Spewpa', types: ['Bug'], ability: 'Shed Skin', evolutionChain: [664, 665, 666] },
  { id: 666, name: 'Vivillon', types: ['Bug', 'Flying'], ability: 'Shield Dust', evolutionChain: [664, 665, 666] },
  { id: 667, name: 'Litleo', types: ['Fire', 'Normal'], ability: 'Rivalry', evolutionChain: [667, 668] },
  { id: 668, name: 'Pyroar', types: ['Fire', 'Normal'], ability: 'Rivalry', evolutionChain: [667, 668] },
  { id: 669, name: 'Flabébé', types: ['Fairy'], ability: 'Flower Veil', evolutionChain: [669, 670, 671] },
  { id: 670, name: 'Floette', types: ['Fairy'], ability: 'Flower Veil', evolutionChain: [669, 670, 671] },
  { id: 671, name: 'Florges', types: ['Fairy'], ability: 'Flower Veil', evolutionChain: [669, 670, 671] },
  { id: 672, name: 'Skiddo', types: ['Grass'], ability: 'Sap Sipper', evolutionChain: [672, 673] },
  { id: 673, name: 'Gogoat', types: ['Grass'], ability: 'Sap Sipper', evolutionChain: [672, 673] },
  { id: 674, name: 'Pancham', types: ['Fighting'], ability: 'Iron Fist', evolutionChain: [674, 675] },
  { id: 675, name: 'Pangoro', types: ['Fighting', 'Dark'], ability: 'Iron Fist', evolutionChain: [674, 675] },
  { id: 676, name: 'Furfrou', types: ['Normal'], ability: 'Fur Coat', evolutionChain: [676] },
  { id: 677, name: 'Espurr', types: ['Psychic'], ability: 'Keen Eye', evolutionChain: [677, 678] },
  { id: 678, name: 'Meowstic', types: ['Psychic'], ability: 'Keen Eye', evolutionChain: [677, 678] },
  { id: 679, name: 'Honedge', types: ['Steel', 'Ghost'], ability: 'No Guard', evolutionChain: [679, 680, 681] },
  { id: 680, name: 'Doublade', types: ['Steel', 'Ghost'], ability: 'No Guard', evolutionChain: [679, 680, 681] },
  { id: 681, name: 'Aegislash', types: ['Steel', 'Ghost'], ability: 'Stance Change', evolutionChain: [679, 680, 681] },
  { id: 682, name: 'Spritzee', types: ['Fairy'], ability: 'Healer', evolutionChain: [682, 683] },
  { id: 683, name: 'Aromatisse', types: ['Fairy'], ability: 'Healer', evolutionChain: [682, 683] },
  { id: 684, name: 'Swirlix', types: ['Fairy'], ability: 'Sweet Veil', evolutionChain: [684, 685] },
  { id: 685, name: 'Slurpuff', types: ['Fairy'], ability: 'Sweet Veil', evolutionChain: [684, 685] },
  { id: 686, name: 'Inkay', types: ['Dark', 'Psychic'], ability: 'Contrary', evolutionChain: [686, 687] },
  { id: 687, name: 'Malamar', types: ['Dark', 'Psychic'], ability: 'Contrary', evolutionChain: [686, 687] },
  { id: 688, name: 'Binacle', types: ['Rock', 'Water'], ability: 'Tough Claws', evolutionChain: [688, 689] },
  { id: 689, name: 'Barbaracle', types: ['Rock', 'Water'], ability: 'Tough Claws', evolutionChain: [688, 689] },
  { id: 690, name: 'Skrelp', types: ['Poison', 'Water'], ability: 'Poison Point', evolutionChain: [690, 691] },
  { id: 691, name: 'Dragalge', types: ['Poison', 'Dragon'], ability: 'Poison Point', evolutionChain: [690, 691] },
  { id: 692, name: 'Clauncher', types: ['Water'], ability: 'Mega Launcher', evolutionChain: [692, 693] },
  { id: 693, name: 'Clawitzer', types: ['Water'], ability: 'Mega Launcher', evolutionChain: [692, 693] },
  { id: 694, name: 'Helioptile', types: ['Electric', 'Normal'], ability: 'Dry Skin', evolutionChain: [694, 695] },
  { id: 704, name: 'Goomy', types: ['Dragon'], ability: 'Sap Sipper', evolutionChain: [704, 705, 706] },
  { id: 705, name: 'Sliggoo', types: ['Dragon'], ability: 'Sap Sipper', evolutionChain: [704, 705, 706] },
  { id: 706, name: 'Goodra', types: ['Dragon'], ability: 'Sap Sipper', evolutionChain: [704, 705, 706], baseStatsSum: 600 },
  { id: 722, name: 'Rowlet', types: ['Grass', 'Flying'], ability: 'Overgrow', evolutionChain: [722, 723, 724] },
  { id: 723, name: 'Dartrix', types: ['Grass', 'Flying'], ability: 'Overgrow', evolutionChain: [722, 723, 724] },
  { id: 724, name: 'Decidueye', types: ['Grass', 'Ghost'], ability: 'Overgrow', evolutionChain: [722, 723, 724] },
  { id: 725, name: 'Litten', types: ['Fire'], ability: 'Blaze', evolutionChain: [725, 726, 727] },
  { id: 726, name: 'Torracat', types: ['Fire'], ability: 'Blaze', evolutionChain: [725, 726, 727] },
  { id: 727, name: 'Incineroar', types: ['Fire', 'Dark'], ability: 'Blaze', evolutionChain: [725, 726, 727] },
  { id: 728, name: 'Popplio', types: ['Water'], ability: 'Torrent', evolutionChain: [728, 729, 730] },
  { id: 729, name: 'Brionne', types: ['Water'], ability: 'Torrent', evolutionChain: [728, 729, 730] },
  { id: 730, name: 'Primarina', types: ['Water', 'Fairy'], ability: 'Torrent', evolutionChain: [728, 729, 730] },
  { id: 782, name: 'Jangmo-o', types: ['Dragon'], ability: 'Bulletproof', evolutionChain: [782, 783, 784] },
  { id: 783, name: 'Hakamo-o', types: ['Dragon', 'Fighting'], ability: 'Bulletproof', evolutionChain: [782, 783, 784] },
  { id: 784, name: 'Kommo-o', types: ['Dragon', 'Fighting'], ability: 'Bulletproof', evolutionChain: [782, 783, 784], baseStatsSum: 600 },
  // Gen 8
  { id: 810, name: 'Grookey', types: ['Grass'], ability: 'Overgrow', evolutionChain: [810, 811, 812] },
  { id: 811, name: 'Thwackey', types: ['Grass'], ability: 'Overgrow', evolutionChain: [810, 811, 812] },
  { id: 812, name: 'Rillaboom', types: ['Grass'], ability: 'Overgrow', evolutionChain: [810, 811, 812], baseStatsSum: 530 },
  { id: 813, name: 'Scorbunny', types: ['Fire'], ability: 'Blaze', evolutionChain: [813, 814, 815] },
  { id: 814, name: 'Raboot', types: ['Fire'], ability: 'Blaze', evolutionChain: [813, 814, 815] },
  { id: 815, name: 'Cinderace', types: ['Fire'], ability: 'Blaze', evolutionChain: [813, 814, 815], baseStatsSum: 530 },
  { id: 816, name: 'Sobble', types: ['Water'], ability: 'Torrent', evolutionChain: [816, 817, 818] },
  { id: 817, name: 'Drizzile', types: ['Water'], ability: 'Torrent', evolutionChain: [816, 817, 818] },
  { id: 818, name: 'Inteleon', types: ['Water'], ability: 'Torrent', evolutionChain: [816, 817, 818], baseStatsSum: 530 },
  { id: 888, name: 'Zacian', types: ['Fairy', 'Steel'], ability: 'Intrepid Sword', evolutionChain: [888], isLegendary: true, baseStatsSum: 670 },
  { id: 889, name: 'Zamazenta', types: ['Fighting', 'Steel'], ability: 'Dauntless Shield', evolutionChain: [889], isLegendary: true, baseStatsSum: 670 },
  { id: 890, name: 'Eternatus', types: ['Poison', 'Dragon'], ability: 'Pressure', evolutionChain: [890], isLegendary: true, baseStatsSum: 690 },
  // Gen 9
  { id: 906, name: 'Sprigatito', types: ['Grass'], ability: 'Overgrow', evolutionChain: [906, 907, 908] },
  { id: 907, name: 'Floragato', types: ['Grass'], ability: 'Overgrow', evolutionChain: [906, 907, 908] },
  { id: 908, name: 'Meowscarada', types: ['Grass', 'Dark'], ability: 'Overgrow', evolutionChain: [906, 907, 908], baseStatsSum: 530 },
  { id: 909, name: 'Fuecoco', types: ['Fire'], ability: 'Blaze', evolutionChain: [909, 910, 911] },
  { id: 910, name: 'Crocalor', types: ['Fire'], ability: 'Blaze', evolutionChain: [909, 910, 911] },
  { id: 911, name: 'Skeledirge', types: ['Fire', 'Ghost'], ability: 'Blaze', evolutionChain: [909, 910, 911], baseStatsSum: 530 },
  { id: 912, name: 'Quaxly', types: ['Water'], ability: 'Torrent', evolutionChain: [912, 913, 914] },
  { id: 913, name: 'Quaxwell', types: ['Water'], ability: 'Torrent', evolutionChain: [912, 913, 914] },
  { id: 914, name: 'Quaquaval', types: ['Water', 'Fighting'], ability: 'Torrent', evolutionChain: [912, 913, 914], baseStatsSum: 530 },
  { id: 1007, name: 'Koraidon', types: ['Fighting', 'Dragon'], ability: 'Orichalcum Pulse', evolutionChain: [1007], isLegendary: true, baseStatsSum: 670 },
  { id: 1008, name: 'Miraidon', types: ['Electric', 'Dragon'], ability: 'Hadron Engine', evolutionChain: [1008], isLegendary: true, baseStatsSum: 670 },
  // More Gen 8
  { id: 821, name: 'Rookidee', types: ['Flying'], ability: 'Keen Eye', evolutionChain: [821, 822, 823] },
  { id: 822, name: 'Corvisquire', types: ['Flying'], ability: 'Keen Eye', evolutionChain: [821, 822, 823] },
  { id: 823, name: 'Corviknight', types: ['Flying', 'Steel'], ability: 'Pressure', evolutionChain: [821, 822, 823], baseStatsSum: 495 },
  { id: 831, name: 'Wooloo', types: ['Normal'], ability: 'Fluffy', evolutionChain: [831, 832] },
  { id: 832, name: 'Dubwool', types: ['Normal'], ability: 'Fluffy', evolutionChain: [831, 832] },
  { id: 885, name: 'Dreepy', types: ['Dragon', 'Ghost'], ability: 'Clear Body', evolutionChain: [885, 886, 887] },
  { id: 886, name: 'Drakloak', types: ['Dragon', 'Ghost'], ability: 'Clear Body', evolutionChain: [885, 886, 887] },
  { id: 887, name: 'Dragapult', types: ['Dragon', 'Ghost'], ability: 'Clear Body', evolutionChain: [885, 886, 887], baseStatsSum: 600 },
  // More Gen 9
  { id: 921, name: 'Pawmi', types: ['Electric'], ability: 'Static', evolutionChain: [921, 922, 923] },
  { id: 922, name: 'Pawmo', types: ['Electric', 'Fighting'], ability: 'Static', evolutionChain: [921, 922, 923] },
  { id: 923, name: 'Pawmot', types: ['Electric', 'Fighting'], ability: 'Static', evolutionChain: [921, 922, 923], baseStatsSum: 490 },
  { id: 935, name: 'Charcadet', types: ['Fire'], ability: 'Flash Fire', evolutionChain: [935, 936, 937] },
  { id: 936, name: 'Armarouge', types: ['Fire', 'Psychic'], ability: 'Flash Fire', evolutionChain: [935, 936] },
  { id: 937, name: 'Ceruledge', types: ['Fire', 'Ghost'], ability: 'Flash Fire', evolutionChain: [935, 937] },
  { id: 957, name: 'Tinkatink', types: ['Fairy', 'Steel'], ability: 'Mold Breaker', evolutionChain: [957, 958, 959] },
  { id: 958, name: 'Tinkatuff', types: ['Fairy', 'Steel'], ability: 'Mold Breaker', evolutionChain: [957, 958, 959] },
  { id: 959, name: 'Tinkaton', types: ['Fairy', 'Steel'], ability: 'Mold Breaker', evolutionChain: [957, 958, 959], baseStatsSum: 506 },
  // Eeveelutions missing
  { id: 196, name: 'Espeon', types: ['Psychic'], ability: 'Synchronize', evolutionChain: [133, 196], baseStatsSum: 525 },
  { id: 197, name: 'Umbreon', types: ['Dark'], ability: 'Synchronize', evolutionChain: [133, 197], baseStatsSum: 525 },
  { id: 470, name: 'Leafeon', types: ['Grass'], ability: 'Leaf Guard', evolutionChain: [133, 470], baseStatsSum: 525 },
  { id: 471, name: 'Glaceon', types: ['Ice'], ability: 'Snow Cloak', evolutionChain: [133, 471], baseStatsSum: 525 },
  { id: 700, name: 'Sylveon', types: ['Fairy'], ability: 'Cute Charm', evolutionChain: [133, 700], baseStatsSum: 525 },
  // Cross-gen evolutions
  { id: 169, name: 'Crobat', types: ['Poison', 'Flying'], ability: 'Inner Focus', evolutionChain: [41, 42, 169], baseStatsSum: 535 },
  { id: 208, name: 'Steelix', types: ['Steel', 'Ground'], ability: 'Rock Head', evolutionChain: [95, 208], baseStatsSum: 510 },
  { id: 212, name: 'Scizor', types: ['Bug', 'Steel'], ability: 'Swarm', evolutionChain: [123, 212], baseStatsSum: 500 },
  { id: 230, name: 'Kingdra', types: ['Water', 'Dragon'], ability: 'Swift Swim', evolutionChain: [116, 117, 230], baseStatsSum: 540 },
  { 
    id: 233, name: 'Porygon2', types: ['Normal'], ability: 'Trace', evolutionChain: [137, 233, 474], baseStatsSum: 515,
    evolutions: [{ id: 474, condition: { type: 'stone', value: 'shiny' } }]
  },
  { id: 242, name: 'Blissey', types: ['Normal'], ability: 'Natural Cure', evolutionChain: [113, 242], baseStatsSum: 540 },
  { id: 462, name: 'Magnezone', types: ['Electric', 'Steel'], ability: 'Magnet Pull', evolutionChain: [81, 82, 462], baseStatsSum: 535 },
  { id: 464, name: 'Rhyperior', types: ['Ground', 'Rock'], ability: 'Lightning Rod', evolutionChain: [111, 112, 464], baseStatsSum: 535 },
  { id: 465, name: 'Tangrowth', types: ['Grass'], ability: 'Chlorophyll', evolutionChain: [114, 465], baseStatsSum: 535 },
  { id: 466, name: 'Electivire', types: ['Electric'], ability: 'Motor Drive', evolutionChain: [125, 466], baseStatsSum: 540 },
  { id: 467, name: 'Magmortar', types: ['Fire'], ability: 'Flame Body', evolutionChain: [126, 467], baseStatsSum: 540 },
  { id: 474, name: 'Porygon-Z', types: ['Normal'], ability: 'Adaptability', evolutionChain: [137, 233, 474], baseStatsSum: 535 },
  { id: 182, name: 'Bellossom', types: ['Grass'], ability: 'Chlorophyll', evolutionChain: [43, 44, 182], baseStatsSum: 490 },
  { id: 186, name: 'Politoed', types: ['Water'], ability: 'Water Absorb', evolutionChain: [60, 61, 186], baseStatsSum: 500 },
  { id: 199, name: 'Slowking', types: ['Water', 'Psychic'], ability: 'Oblivious', evolutionChain: [79, 199], baseStatsSum: 490 },
];

const PACK_TYPES = [
  { id: 'standard', name: 'Sobre Estándar', cost: 1200, costType: 'coins', description: '75% Común, 20% Raro, 5% Mítico', odds: { Common: 0.75, Rare: 0.20, Mythical: 0.05, Legendary: 0 } },
  { id: 'premium', name: 'Sobre Premium', cost: 5000, costType: 'coins', description: '50% Raro, 40% Mítico, 10% Legendario', odds: { Common: 0, Rare: 0.50, Mythical: 0.40, Legendary: 0.10 } },
  { id: 'elite', name: 'Sobre Élite', cost: 12000, costType: 'coins', description: '30% Raro, 50% Mítico, 20% Legendario', odds: { Common: 0, Rare: 0.30, Mythical: 0.50, Legendary: 0.20 } },
  { id: 'master', name: 'Sobre Maestro', cost: 25000, costType: 'coins', description: 'Garantiza Mítico o Legendario', odds: { Common: 0, Rare: 0, Mythical: 0.70, Legendary: 0.30 } },
  { id: 'stardust', name: 'Sobre Estelar', cost: 15000, costType: 'stardust', description: '100% Legendario', odds: { Common: 0, Rare: 0, Mythical: 0, Legendary: 1.0 } },
  { id: 'mythic', name: 'Sobre Mítico', cost: 60000, costType: 'coins', description: 'Alta probabilidad de Legendario', odds: { Common: 0, Rare: 0, Mythical: 0.40, Legendary: 0.60 } },
  { id: 'champion', name: 'Sobre Campeón', cost: 40000, costType: 'stardust', description: '100% Legendario con stats base altos', odds: { Common: 0, Rare: 0, Mythical: 0, Legendary: 1.0 } },
];

const EQUIPMENT_TYPES: Item[] = [
  { id: 'leftovers', name: 'Restos', description: 'Recupera un poco de HP cada turno.', effect: { hp: 10 }, rarity: 'Rare' },
  { id: 'choice_band', name: 'Cinta Elegida', description: 'Aumenta mucho el Ataque.', effect: { atk: 20 }, rarity: 'Mythical' },
  { id: 'choice_specs', name: 'Gafas Especiales', description: 'Aumenta mucho el Ataque (Especial).', effect: { atk: 20 }, rarity: 'Mythical' },
  { id: 'choice_scarf', name: 'Pañuelo Elegido', description: 'Aumenta mucho la Velocidad.', effect: { spe: 20 }, rarity: 'Mythical' },
  { id: 'focus_band', name: 'Cinta Focus', description: 'Aumenta la Defensa.', effect: { def: 15 }, rarity: 'Rare' },
  { id: 'lucky_egg', name: 'Huevo Suerte', description: 'Aumenta la ganancia de TP.', effect: {}, rarity: 'Legendary' },
];

const SPONSOR_TEMPLATES: Omit<Sponsor, 'currentValue' | 'isCompleted'>[] = [
  { id: 'silph_co', name: 'Silph Co.', description: 'Evoluciona a tus Pokémon para demostrar nuestra tecnología.', goal: 'Evoluciona 2 Pokémon', reward: { coins: 5000, stardust: 1000 }, targetValue: 2 },
  { id: 'devon_corp', name: 'Devon Corp.', description: 'Gana partidos para promocionar nuestra marca.', goal: 'Gana 5 partidos', reward: { coins: 3000, tp: 500 }, targetValue: 5 },
  { id: 'poke_mart', name: 'Poké Mart', description: 'Abre sobres para aumentar las ventas.', goal: 'Abre 10 sobres', reward: { coins: 2000, stardust: 2000 }, targetValue: 10 },
  { id: 'aether_foundation', name: 'Fundación Æther', description: 'Cuida a tus Pokémon y aumenta su felicidad.', goal: 'Aumenta felicidad 5 veces', reward: { coins: 4000, stardust: 1500 }, targetValue: 5 },
  { id: 'macro_cosmos', name: 'Macro Cosmos', description: 'Demuestra tu poder en la Liga Pokémon.', goal: 'Sube 1 nivel de Liga', reward: { coins: 10000, stardust: 5000 }, targetValue: 1 },
  { id: 'team_yell', name: 'Team Yell', description: '¡Anima a tus Pokémon en combate!', goal: 'Usa 10 movimientos en combate', reward: { coins: 1500, tp: 1000 }, targetValue: 10 },
  { id: 'kimono_girls', name: 'Chicas Kimono', description: 'Demuestra la elegancia de tus Pokémon de Johto.', goal: 'Evoluciona 1 Pokémon con felicidad', reward: { coins: 5000, stardust: 2000 }, targetValue: 1 },
  { id: 'galaxy_team', name: 'Equipo Galaxia', description: 'Investiga la energía de las evoluciones en Sinnoh.', goal: 'Usa 3 piedras evolutivas', reward: { coins: 8000, tp: 1500 }, targetValue: 3 },
];

const TRAINING_COST_BASE = 400;
const BULK_TRAIN_COIN_COST_PER_LEVEL = 250;
const LIMIT_BREAK_COST_COINS = 15000;
const LIMIT_BREAK_COST_STARDUST = 6000;
const POWERUP_COST_BASE = 450; // Uses Stardust
const EVOLUTION_COST = 12000;

const ARENA_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=1920&q=80', // Space
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80', // Mountains
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80', // Forest
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80', // Field
  'https://images.unsplash.com/photo-1518066000714-58c45f1a2c0a?auto=format&fit=crop&w=1920&q=80', // Sunset
];

// --- Helper Functions ---

const ALL_MOVES: Record<string, Move[]> = {
  Fire: [
    { name: 'Lanzallamas', type: 'Fire', power: 90, accuracy: 100 },
    { name: 'Ascuas', type: 'Fire', power: 40, accuracy: 100 },
    { name: 'Llamarada', type: 'Fire', power: 110, accuracy: 85 },
    { name: 'Puño Fuego', type: 'Fire', power: 75, accuracy: 100 },
    { name: 'Envite Ígneo', type: 'Fire', power: 120, accuracy: 100 },
  ],
  Water: [
    { name: 'Hidrobomba', type: 'Water', power: 110, accuracy: 80 },
    { name: 'Pistola Agua', type: 'Water', power: 40, accuracy: 100 },
    { name: 'Surf', type: 'Water', power: 90, accuracy: 100 },
    { name: 'Rayo Burbuja', type: 'Water', power: 65, accuracy: 100 },
    { name: 'Acua Cola', type: 'Water', power: 90, accuracy: 90 },
  ],
  Grass: [
    { name: 'Látigo Cepa', type: 'Grass', power: 45, accuracy: 100 },
    { name: 'Hoja Afilada', type: 'Grass', power: 55, accuracy: 95 },
    { name: 'Rayo Solar', type: 'Grass', power: 120, accuracy: 100 },
    { name: 'Gigadrenado', type: 'Grass', power: 75, accuracy: 100 },
    { name: 'Tormenta Hojas', type: 'Grass', power: 130, accuracy: 90 },
  ],
  Electric: [
    { name: 'Impactrueno', type: 'Electric', power: 40, accuracy: 100 },
    { name: 'Rayo', type: 'Electric', power: 90, accuracy: 100 },
    { name: 'Trueno', type: 'Electric', power: 110, accuracy: 70 },
    { name: 'Onda Voltio', type: 'Electric', power: 60, accuracy: 100 },
    { name: 'Chispazo', type: 'Electric', power: 80, accuracy: 100 },
  ],
  Normal: [
    { name: 'Placaje', type: 'Normal', power: 40, accuracy: 100 },
    { name: 'Golpe Cuerpo', type: 'Normal', power: 85, accuracy: 100 },
    { name: 'Hiperrayo', type: 'Normal', power: 150, accuracy: 90 },
    { name: 'Cuchillada', type: 'Normal', power: 70, accuracy: 100 },
    { name: 'Portazo', type: 'Normal', power: 80, accuracy: 75 },
  ],
  Psychic: [
    { name: 'Psíquico', type: 'Psychic', power: 90, accuracy: 100 },
    { name: 'Confusión', type: 'Psychic', power: 50, accuracy: 100 },
    { name: 'Psicocorte', type: 'Psychic', power: 70, accuracy: 100 },
    { name: 'Premonición', type: 'Psychic', power: 120, accuracy: 100 },
  ],
  Fighting: [
    { name: 'A bocajarro', type: 'Fighting', power: 120, accuracy: 100 },
    { name: 'Golpe Karate', type: 'Fighting', power: 50, accuracy: 100 },
    { name: 'Patada Salto Alta', type: 'Fighting', power: 130, accuracy: 90 },
    { name: 'Puño Dinámico', type: 'Fighting', power: 100, accuracy: 50 },
  ],
  Flying: [
    { name: 'Ataque Ala', type: 'Flying', power: 60, accuracy: 100 },
    { name: 'Vuelo', type: 'Flying', power: 90, accuracy: 95 },
    { name: 'Tajo Aéreo', type: 'Flying', power: 75, accuracy: 95 },
    { name: 'Pico Taladro', type: 'Flying', power: 80, accuracy: 100 },
  ],
  Poison: [
    { name: 'Bomba Lodo', type: 'Poison', power: 90, accuracy: 100 },
    { name: 'Residuos', type: 'Poison', power: 65, accuracy: 100 },
    { name: 'Puya Nociva', type: 'Poison', power: 80, accuracy: 100 },
    { name: 'Tóxico', type: 'Poison', power: 0, accuracy: 90 },
  ],
  Ground: [
    { name: 'Terremoto', type: 'Ground', power: 100, accuracy: 100 },
    { name: 'Terratemblor', type: 'Ground', power: 60, accuracy: 100 },
    { name: 'Bofetón Lodo', type: 'Ground', power: 20, accuracy: 100 },
    { name: 'Tierra Viva', type: 'Ground', power: 90, accuracy: 100 },
  ],
  Rock: [
    { name: 'Avalancha', type: 'Rock', power: 75, accuracy: 90 },
    { name: 'Roca Afilada', type: 'Rock', power: 100, accuracy: 80 },
    { name: 'Lanzarrocas', type: 'Rock', power: 50, accuracy: 90 },
    { name: 'Poder Pasado', type: 'Rock', power: 60, accuracy: 100 },
  ],
  Bug: [
    { name: 'Tijera X', type: 'Bug', power: 80, accuracy: 100 },
    { name: 'Zumbido', type: 'Bug', power: 90, accuracy: 100 },
    { name: 'Ida y Vuelta', type: 'Bug', power: 70, accuracy: 100 },
    { name: 'Chupavidas', type: 'Bug', power: 80, accuracy: 100 },
  ],
  Ghost: [
    { name: 'Bola Sombra', type: 'Ghost', power: 80, accuracy: 100 },
    { name: 'Tinieblas', type: 'Ghost', power: 0, accuracy: 100 },
    { name: 'Garra Umbría', type: 'Ghost', power: 70, accuracy: 100 },
    { name: 'Puño Sombra', type: 'Ghost', power: 60, accuracy: 100 },
  ],
  Steel: [
    { name: 'Foco Resplandor', type: 'Steel', power: 80, accuracy: 100 },
    { name: 'Garra Metal', type: 'Steel', power: 50, accuracy: 95 },
    { name: 'Cuerpo Pesado', type: 'Steel', power: 0, accuracy: 100 },
    { name: 'Ala de Acero', type: 'Steel', power: 70, accuracy: 90 },
  ],
  Dragon: [
    { name: 'Garra Dragón', type: 'Dragon', power: 80, accuracy: 100 },
    { name: 'Pulso Dragón', type: 'Dragon', power: 85, accuracy: 100 },
    { name: 'Carga Dragón', type: 'Dragon', power: 100, accuracy: 75 },
    { name: 'Cometa Draco', type: 'Dragon', power: 130, accuracy: 90 },
  ],
  Ice: [
    { name: 'Rayo Hielo', type: 'Ice', power: 90, accuracy: 100 },
    { name: 'Ventisca', type: 'Ice', power: 110, accuracy: 70 },
    { name: 'Canto Helado', type: 'Ice', power: 40, accuracy: 100 },
    { name: 'Puño Hielo', type: 'Ice', power: 75, accuracy: 100 },
  ],
  Fairy: [
    { name: 'Brillo Mágico', type: 'Fairy', power: 80, accuracy: 100 },
    { name: 'Fuerza Lunar', type: 'Fairy', power: 95, accuracy: 100 },
    { name: 'Beso Drenaje', type: 'Fairy', power: 50, accuracy: 100 },
    { name: 'Carantoña', type: 'Fairy', power: 90, accuracy: 90 },
  ],
  Dark: [
    { name: 'Pulso Umbrío', type: 'Dark', power: 80, accuracy: 100 },
    { name: 'Tajo Umbrío', type: 'Dark', power: 70, accuracy: 100 },
    { name: 'Mordisco', type: 'Dark', power: 60, accuracy: 100 },
    { name: 'Triturar', type: 'Dark', power: 80, accuracy: 100 },
  ],
};

const ALL_EVENTS: GameEvent[] = [
  {
    id: 'kanto_fest',
    title: 'Festival de Kanto',
    description: '¡Los Pokémon de Kanto están de fiesta! +50% Monedas en batallas y mayor probabilidad de Shiny.',
    icon: '🏮',
    color: 'border-red-500 text-red-400',
    modifiers: { coinMultiplier: 1.5, shinyRate: 2 },
    endDate: Date.now() + 86400000 * 3
  },
  {
    id: 'electric_storm',
    title: 'Tormenta Eléctrica',
    description: 'Una tormenta eléctrica azota la región. Los Pokémon de tipo Eléctrico tienen +20% de ATK.',
    icon: '⚡',
    color: 'border-yellow-500 text-yellow-400',
    modifiers: { typeBoost: { type: 'Electric', boost: 1.2 } },
    endDate: Date.now() + 86400000 * 2
  },
  {
    id: 'full_moon',
    title: 'Luna Llena',
    description: 'La luna llena potencia a los seres de la noche. Pokémon de tipo Fantasma y Siniestro tienen +20% de DEF.',
    icon: '🌕',
    color: 'border-indigo-500 text-indigo-400',
    modifiers: { typeBoost: { type: 'Ghost', boost: 1.2 } },
    endDate: Date.now() + 86400000 * 2
  },
  {
    id: 'fire_frenzy',
    title: 'Frenesí de Fuego',
    description: '¡El calor aumenta! Los Pokémon de tipo Fuego tienen +20% de ATK.',
    icon: '🔥',
    color: 'border-orange-500 text-orange-400',
    modifiers: { typeBoost: { type: 'Fire', boost: 1.2 }, coinMultiplier: 1.2 },
    endDate: Date.now() + 86400000 * 2
  },
  {
    id: 'legendary_hunt',
    title: 'Caza Legendaria',
    description: '¡Los Pokémon Legendarios aparecen más a menudo! +50% de Polvos en batallas.',
    icon: '✨',
    color: 'border-purple-500 text-purple-400',
    modifiers: { stardustMultiplier: 1.5 },
    endDate: Date.now() + 86400000 * 1
  },
  {
    id: 'training_camp',
    title: 'Campo de Entrenamiento',
    description: '¡Entrena duro! Los Pokémon ganan +50% de TP en batallas.',
    icon: '🏋️',
    color: 'border-emerald-500 text-emerald-400',
    modifiers: { tpMultiplier: 1.5 },
    endDate: Date.now() + 86400000 * 2
  },
  {
    id: 'johto_journey',
    title: 'Viaje por Johto',
    description: '¡Los Pokémon de Johto están apareciendo más! +30% Stardust en batallas.',
    icon: '🍃',
    color: 'border-emerald-500 text-emerald-400',
    modifiers: { stardustMultiplier: 1.3 },
    endDate: Date.now() + 86400000 * 3
  },
  {
    id: 'sinnoh_summit',
    title: 'Cumbre de Sinnoh',
    description: '¡La energía de Sinnoh potencia las evoluciones! Coste de evolución reducido un 20%.',
    icon: '🏔️',
    color: 'border-cyan-500 text-cyan-400',
    modifiers: { evolutionDiscount: 0.8 },
    endDate: Date.now() + 86400000 * 3
  },
];

const moveCache = new Map<string, Move>();
const evolutionCache = new Map<number, number | null>();
const pokemonDataCache = new Map<number, any>();

const fetchWithTimeout = async (url: string, options: any = {}, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
};

const fetchMoveData = async (moveUrl: string): Promise<Move> => {
  if (moveCache.has(moveUrl)) return moveCache.get(moveUrl)!;
  try {
    const res = await fetchWithTimeout(moveUrl);
    const data = await res.json();
    const move: Move = {
      name: data.names?.find((n: any) => n?.language?.name === 'es')?.name || data.name || 'Ataque',
      type: data.type?.name ? data.type.name.charAt(0).toUpperCase() + data.type.name.slice(1) : 'Normal',
      power: data.power || 40,
      accuracy: data.accuracy || 100,
      category: data.damage_class?.name === 'physical' ? 'Physical' : data.damage_class?.name === 'special' ? 'Special' : 'Status',
      statusEffect: data.meta?.ailment?.name ? (data.meta.ailment.name.charAt(0).toUpperCase() + data.meta.ailment.name.slice(1)) as StatusCondition : 'None',
      statusChance: data.meta?.ailment_chance || 0,
    };
    
    // Map API ailment names to our StatusCondition type
    if (move.statusEffect) {
      if (move.statusEffect === 'Paralysis' as any) move.statusEffect = 'Paralysis';
      else if (move.statusEffect === 'Burn' as any) move.statusEffect = 'Burn';
      else if (move.statusEffect === 'Freeze' as any) move.statusEffect = 'Freeze';
      else if (move.statusEffect === 'Poison' as any) move.statusEffect = 'Poison';
      else if (move.statusEffect === 'Sleep' as any) move.statusEffect = 'Sleep';
      else move.statusEffect = 'None';
    }

    moveCache.set(moveUrl, move);
    return move;
  } catch (e) {
    return { name: 'Placaje', type: 'Normal', power: 40, accuracy: 100 };
  }
};

const fetchSpeciesData = async (id: number): Promise<{ evolutionLevel: number | null, baseHappiness: number }> => {
  if (evolutionCache.has(id)) return { evolutionLevel: evolutionCache.get(id)!, baseHappiness: 70 }; // Default 70 if cached only level
  try {
    const speciesRes = await fetchWithTimeout(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
    if (!speciesRes.ok) throw new Error('Failed to fetch species');
    const speciesData = await speciesRes.json();
    const baseHappiness = speciesData.base_happiness ?? 70;
    
    if (!speciesData?.evolution_chain?.url) return { evolutionLevel: null, baseHappiness };
    const chainRes = await fetchWithTimeout(speciesData.evolution_chain.url);
    if (!chainRes.ok) throw new Error('Failed to fetch chain');
    const chainData = await chainRes.json();

    const findMinLevel = (chain: any, targetName: string): number | null => {
      if (!chain) return null;
      if (chain.species?.name === targetName) {
        if (chain.evolves_to && chain.evolves_to.length > 0) {
          return chain.evolves_to[0].evolution_details?.[0]?.min_level || null;
        }
        return null;
      }
      if (chain.evolves_to) {
        for (const next of chain.evolves_to) {
          const level = findMinLevel(next, targetName);
          if (level !== null) return level;
        }
      }
      return null;
    };

    const minLevel = findMinLevel(chainData.chain, speciesData.name);
    evolutionCache.set(id, minLevel);
    return { evolutionLevel: minLevel, baseHappiness };
  } catch (e) {
    return { evolutionLevel: null, baseHappiness: 70 };
  }
};

const fetchEvolutionLevel = async (id: number): Promise<number | null> => {
  const data = await fetchSpeciesData(id);
  return data.evolutionLevel;
};

const getPokemonRarity = (base: PokemonBase): Rarity => {
  if (base.isLegendary) return 'Legendary';
  if (base.isMythical) return 'Mythical';
  
  // If baseStatsSum is explicitly provided and high
  if (base.baseStatsSum && base.baseStatsSum >= 500) return 'Rare';
  
  // Final evolutions of 3-stage chains are usually Rare
  if (base.evolutionChain.length >= 3 && base.id === base.evolutionChain[base.evolutionChain.length - 1]) return 'Rare';
  
  // Strong single-stage or 2-stage final evolutions
  const rareNames = [
    'Lapras', 'Snorlax', 'Pinsir', 'Scyther', 'Tauros', 'Kangaskhan', 'Aerodactyl', 
    'Heracross', 'Skarmory', 'Lucario', 'Arcanine', 'Gyarados', 'Steelix', 'Scizor',
    'Kingdra', 'Porygon2', 'Porygon-Z', 'Electivire', 'Magmortar', 'Glaceon', 'Leafeon',
    'Sylveon', 'Espeon', 'Umbreon', 'Vaporeon', 'Jolteon', 'Flareon', 'Absol', 'Spiritomb'
  ];
  if (rareNames.includes(base.name)) return 'Rare';

  return 'Common';
};

const calculateActualStat = (base: number, iv: number, ev: number, level: number, natureMod: number = 1) => {
  return Math.floor((Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5) * natureMod);
};

const calculateHp = (base: number, iv: number, ev: number, level: number) => {
  if (base === 1) return 1; // Shedinja
  return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
};

const generatePokemon = async (base: PokemonBase, rarity: Rarity, targetLevel: number = 1, shinyMultiplier: number = 1, academyLevel: number = 1): Promise<PokemonCard> => {
  const config = RARITY_CONFIG[rarity];
  
  const shinyChance = 0.01 * shinyMultiplier;
  const isShiny = Math.random() < shinyChance;

  // Academy bonus for Common and Rare
  const academyBonus = (rarity === 'Common' || rarity === 'Rare') ? (academyLevel - 1) * 5 : 0;

  const [minBase, maxBase] = config.baseStatRange;
  const baseStatValue = (minBase + Math.floor(Math.random() * (maxBase - minBase + 1)) + academyBonus) * (isShiny ? 1.2 : 1);
  
  // Natures
  const natureNames = Object.keys(NATURES);
  const nature = natureNames[Math.floor(Math.random() * natureNames.length)];
  const natureEffect = NATURES[nature];

  // IVs (0-31)
  const ivs = {
    atk: Math.floor(Math.random() * 32),
    def: Math.floor(Math.random() * 32),
    spe: Math.floor(Math.random() * 32),
    hp: Math.floor(Math.random() * 32)
  };

  // EVs (Initial 0)
  const evs = { atk: 0, def: 0, spe: 0, hp: 0 };

  const getNatureMod = (stat: keyof typeof ivs) => {
    if (natureEffect.plus === stat) return 1.1;
    if (natureEffect.minus === stat) return 0.9;
    return 1.0;
  };

  const atk = calculateActualStat(baseStatValue * config.multiplier, ivs.atk, evs.atk, targetLevel, getNatureMod('atk'));
  const def = calculateActualStat(baseStatValue * config.multiplier, ivs.def, evs.def, targetLevel, getNatureMod('def'));
  const spe = calculateActualStat(baseStatValue * config.multiplier, ivs.spe, evs.spe, targetLevel, getNatureMod('spe'));
  const hp = calculateHp(baseStatValue * config.multiplier, ivs.hp, evs.hp, targetLevel);

  // Item (20% chance)
  let item: string | undefined = undefined;
  if (Math.random() < 0.2) {
    item = BATTLE_ITEMS[Math.floor(Math.random() * BATTLE_ITEMS.length)].name;
  }
  
  // Assign moves dynamically from PokeAPI based on level
  let pokemonMoves: Move[] = [];
  let evolutionLevel: number | null = null;
  
  try {
    let data;
    if (pokemonDataCache.has(base.id)) {
      data = pokemonDataCache.get(base.id);
    } else {
      const pokemonRes = await fetchWithTimeout(`https://pokeapi.co/api/v2/pokemon/${base.id}`);
      data = await pokemonRes.json();
      pokemonDataCache.set(base.id, data);
    }
    
    const speciesData = await fetchSpeciesData(base.id);
    evolutionLevel = speciesData.evolutionLevel;
    const baseHappiness = speciesData.baseHappiness;
    
    const levelUpMoves = (data.moves || []).filter((m: any) => 
      m?.version_group_details?.some((v: any) => v?.move_learn_method?.name === 'level-up' && v?.level_learned_at <= targetLevel)
    );

    // Sort by level descending to get the most recent moves
    levelUpMoves.sort((a: any, b: any) => {
      const aLevels = a?.version_group_details?.filter((v: any) => v?.move_learn_method?.name === 'level-up').map((v: any) => v?.level_learned_at) || [];
      const bLevels = b?.version_group_details?.filter((v: any) => v?.move_learn_method?.name === 'level-up').map((v: any) => v?.level_learned_at) || [];
      const aLevel = aLevels.length > 0 ? Math.max(...aLevels) : 0;
      const bLevel = bLevels.length > 0 ? Math.max(...bLevels) : 0;
      return bLevel - aLevel;
    });

    const selectedMoves = levelUpMoves.slice(0, 4);
    const movePromises = selectedMoves.map((m: any) => fetchMoveData(m.move.url));
    pokemonMoves = await Promise.all(movePromises);
  } catch (e) {
    if (e instanceof Error && e.message === 'Request timed out') {
      console.warn("Request timed out fetching pokemon data, using fallback");
    } else {
      console.error("Error fetching pokemon data", e);
    }
  }

  // Fallback if API fails or no moves found
  if (pokemonMoves.length === 0) {
    const primaryType = base.types[0];
    const typeMoves = ALL_MOVES[primaryType] || ALL_MOVES['Normal'];
    const normalMoves = ALL_MOVES['Normal'];
    
    const shuffledTypeMoves = [...typeMoves].sort(() => 0.5 - Math.random());
    const shuffledNormalMoves = [...normalMoves].sort(() => 0.5 - Math.random());
    
    pokemonMoves.push(...shuffledTypeMoves.slice(0, 2));
    while (pokemonMoves.length < 4) {
      const move = shuffledNormalMoves.pop();
      if (move && !pokemonMoves.find(m => m?.name === move.name)) {
        pokemonMoves.push(move);
      }
    }
  }
  
  const speciesData = await fetchSpeciesData(base.id);
  const baseHappiness = speciesData.baseHappiness;

  return {
    ...base,
    instanceId: Math.random().toString(36).substr(2, 9),
    rarity,
    level: targetLevel,
    maxLevel: config.initialMaxLevel,
    evolutionLevel,
    powerLevel: 0,
    trainingLevel: 0,
    limitBroken: false,
    atk,
    def,
    spe,
    hp,
    maxHp: hp,
    ovr: Math.max(
      { Common: 25, Rare: 45, Mythical: 65, Legendary: 85 }[rarity] + Math.floor(Math.random() * 11) - 5, 
      Math.floor((atk + def + spe + hp/2) / 3.5)
    ),
    isEvolved: false,
    isShiny,
    fatigue: 0,
    moral: 100,
    happiness: baseHappiness,
    isInjured: false,
    injuryWeeks: 0,
    matchesPlayed: 0,
    mvpCount: 0,
    totalDamageDealt: 0,
    matchHistory: [],
    moves: pokemonMoves,
    nature,
    ivs,
    evs,
    item
  };
};

// --- Components ---

const PokemonCardUI = ({ 
  pokemon, 
  onTrain, 
  onPowerUp, 
  onEvolve, 
  onUseBandita, 
  onRetire, 
  onHealFatigue,
  canTrain, 
  canPowerUp, 
  canEvolve, 
  canUseBandita,
  canHealFatigue,
  isSelected,
  onSelect
}: { 
  pokemon: PokemonCard, 
  onTrain?: () => void, 
  onPowerUp?: () => void,
  onEvolve?: () => void,
  onUseBandita?: () => void,
  onRetire?: () => void,
  onHealFatigue?: () => void,
  canTrain?: boolean,
  canPowerUp?: boolean,
  canEvolve?: boolean,
  canUseBandita?: boolean,
  canHealFatigue?: boolean,
  isSelected?: boolean,
  onSelect?: () => void
}) => {
  const config = RARITY_CONFIG[pokemon.rarity];
  
  return (
    <motion.div 
      layout
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05, y: -10, rotateY: 5, rotateX: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect ? (e) => { e.stopPropagation(); onSelect(); } : undefined}
      className={`relative w-full aspect-[2/3] rounded-2xl border-2 backdrop-blur-md ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-500/20' : pokemon.fatigue > 70 ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse' : config.border} ${config.bg} p-2 sm:p-4 flex flex-col items-center justify-between overflow-hidden group ${config.shadow} ${onSelect ? 'cursor-pointer' : ''} transition-shadow duration-300`}
      style={{ perspective: '1000px' }}
    >
      {/* Dynamic Holographic Overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-30 pointer-events-none z-10 bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.6)_40%,rgba(255,255,255,0.8)_50%,rgba(255,255,255,0.6)_60%,transparent_80%)] bg-[length:200%_100%] transition-opacity duration-500 animate-shine" />
      
      {/* Rarity Specific Effects */}
      {(pokemon.rarity === 'Mythical' || pokemon.rarity === 'Legendary') && (
        <div className="absolute inset-0 opacity-20 pointer-events-none z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)] animate-pulse" />
      )}

      {/* Selection Indicator */}
      {onSelect && (
        <div className={`absolute top-3 right-3 w-7 h-7 rounded-full border-2 flex items-center justify-center z-30 transition-all duration-300 ${isSelected ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/40 scale-110' : 'bg-black/40 border-white/20 text-transparent'}`}>
          <Check size={16} strokeWidth={3} />
        </div>
      )}

      {/* Item Icon */}
      {pokemon.item && (
        <div className="absolute top-12 right-3 z-30 group/item">
          <div className="bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/10 shadow-lg">
            <img 
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${pokemon.item}.png`} 
              alt={pokemon.item}
              className="w-5 h-5 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute right-full mr-2 top-0 bg-zinc-800 text-[8px] font-black px-2 py-1 rounded border border-white/10 opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {HELD_ITEMS.find(i => i.id === pokemon.item)?.name}
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="w-full flex justify-between items-start z-20">
        <div className={`px-1.5 py-0.5 rounded-lg text-[8px] sm:text-[9px] font-black border border-white/10 flex items-center gap-1 ${pokemon.limitBroken ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/40' : 'bg-black/40 text-white/90 backdrop-blur-md'}`}>
          {pokemon.limitBroken && <Zap size={10} fill="currentColor" />}
          LVL {pokemon.level}
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <div className={`px-1.5 py-0.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${config.color} bg-black/60 backdrop-blur-md border border-white/10`}>
            {pokemon.rarity}
          </div>
          {pokemon.isShiny && (
            <div className="px-1.5 py-0.5 rounded-lg text-[8px] sm:text-[9px] font-black bg-gradient-to-r from-amber-400 to-yellow-300 text-black border border-yellow-200 flex items-center gap-1 shadow-lg shadow-amber-500/20">
              <Sparkles size={8} className="sm:w-[10px] sm:h-[10px]" /> SHINY
            </div>
          )}
        </div>
      </div>

      {/* Sprite Container */}
      <div className="relative w-full aspect-square flex items-center justify-center mt-2">
        <div className={`absolute inset-0 bg-gradient-to-b ${config.glow} rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000 opacity-60`} />
        
        {/* Type Badges */}
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20">
          {pokemon.types?.map(type => (
            <div key={type} className={`px-2 py-0.5 rounded-md text-[8px] font-black text-white uppercase shadow-lg border border-white/20 ${getTypeColor(type)}`}>
              {type}
            </div>
          ))}
        </div>

        <motion.img 
          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.isShiny ? 'shiny/' : ''}${pokemon.id}.png`} 
          alt={pokemon.name}
          className={`w-28 h-28 xs:w-32 xs:h-32 sm:w-44 sm:h-44 object-contain relative z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-500 animate-float ${pokemon.isInjured ? 'grayscale opacity-50' : ''}`}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Info Section */}
      <div className="w-full text-center space-y-0 relative z-10 mt-1">
        <h3 className="text-lg xs:text-xl sm:text-2xl font-black italic tracking-tighter text-white uppercase truncate drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] px-1">
          {pokemon.name}
        </h3>
        <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl xs:text-3xl sm:text-4xl font-black italic tracking-tighter ${pokemon.fatigue > 30 ? 'text-red-400' : 'text-white'} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`}>
              {pokemon.ovr - (pokemon.fatigue > 30 ? Math.floor((pokemon.fatigue - 30) / 2) : 0)}
            </span>
            <span className="text-[8px] sm:text-[10px] font-black text-white/40 uppercase tracking-widest">PWR</span>
          </div>
          <div className="flex justify-center gap-1 mt-0.5">
            <div className="text-[7px] sm:text-[8px] font-black text-indigo-300 uppercase bg-indigo-500/20 px-1.5 sm:px-2 py-0.5 rounded border border-indigo-500/30 backdrop-blur-sm">
              {pokemon.nature || 'Fuerte'}
            </div>
            <div className="text-[7px] sm:text-[8px] font-black text-zinc-300 uppercase bg-zinc-500/20 px-1.5 sm:px-2 py-0.5 rounded border border-zinc-500/30 backdrop-blur-sm truncate max-w-[70px] sm:max-w-[90px]">
              {pokemon.ability}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="w-full grid grid-cols-4 gap-0.5 sm:gap-1 py-1 sm:py-2 border-t border-white/10 relative z-10 mt-1 sm:mt-2">
        {[
          { label: 'HP', val: pokemon.hp, iv: pokemon.ivs?.hp },
          { label: 'ATK', val: pokemon.atk, iv: pokemon.ivs?.atk },
          { label: 'DEF', val: pokemon.def, iv: pokemon.ivs?.def },
          { label: 'SPE', val: pokemon.spe, iv: pokemon.ivs?.spe }
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-[6px] sm:text-[7px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">{stat.label}</div>
            <div className={`text-[10px] sm:text-xs font-black ${stat.iv === 31 ? 'text-amber-400' : stat.iv === 0 ? 'text-red-400' : 'text-white'}`}>
              {stat.val}
            </div>
            <div className={`text-[5px] sm:text-[6px] font-bold uppercase ${stat.iv === 31 ? 'text-amber-500/60' : 'text-zinc-600'}`}>IV:{stat.iv}</div>
          </div>
        ))}
      </div>

      {/* Progress Bars Section */}
      <div className="w-full space-y-2 relative z-10">
        {/* Fatigue Bar */}
        <div className="bg-black/40 backdrop-blur-md rounded-xl p-1.5 sm:p-2 border border-white/5">
          <div className="flex justify-between items-center mb-1 sm:mb-1.5">
            <div className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] font-black text-zinc-400 uppercase tracking-widest">
              <Activity size={10} className={`sm:w-[12px] sm:h-[12px] ${pokemon.fatigue > 70 ? 'text-red-400' : pokemon.fatigue > 40 ? 'text-yellow-400' : 'text-green-400'}`} />
              <span>Fatiga</span>
            </div>
            <span className={`text-[9px] sm:text-[10px] font-black ${pokemon.fatigue > 70 ? 'text-red-400' : pokemon.fatigue > 40 ? 'text-yellow-400' : 'text-green-400'}`}>{pokemon.fatigue}%</span>
          </div>
          <div className="h-1.5 sm:h-2 bg-zinc-950 rounded-full overflow-hidden p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${pokemon.fatigue}%` }}
              className={`h-full rounded-full shadow-inner transition-all duration-1000 ${pokemon.fatigue > 70 ? 'bg-gradient-to-r from-red-600 to-red-400' : pokemon.fatigue > 40 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' : 'bg-gradient-to-r from-green-600 to-green-400'}`} 
            />
          </div>
        </div>

        {/* Happiness Bar */}
        <div className="bg-black/40 backdrop-blur-md rounded-xl p-1.5 sm:p-2 border border-white/5">
          <div className="flex justify-between items-center mb-1 sm:mb-1.5">
            <div className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] font-black text-zinc-400 uppercase tracking-widest">
              <Heart size={10} className={`sm:w-[12px] sm:h-[12px] ${pokemon.happiness > 200 ? 'text-rose-400' : pokemon.happiness > 100 ? 'text-pink-400' : 'text-zinc-400'}`} />
              <span>Felicidad</span>
            </div>
            <span className={`text-[9px] sm:text-[10px] font-black ${pokemon.happiness > 200 ? 'text-rose-400' : pokemon.happiness > 100 ? 'text-pink-400' : 'text-zinc-400'}`}>{pokemon.happiness}/255</span>
          </div>
          <div className="h-1.5 sm:h-2 bg-zinc-950 rounded-full overflow-hidden p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(pokemon.happiness / 255) * 100}%` }}
              className={`h-full rounded-full shadow-inner transition-all duration-1000 ${pokemon.happiness > 200 ? 'bg-gradient-to-r from-rose-600 to-rose-400' : pokemon.happiness > 100 ? 'bg-gradient-to-r from-pink-600 to-pink-400' : 'bg-gradient-to-r from-zinc-600 to-zinc-400'}`} 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Training Bar */}
          <div className="bg-black/40 backdrop-blur-md rounded-xl p-1.5 sm:p-2 border border-white/5">
            <div className="flex justify-between items-center mb-0.5 sm:mb-1">
              <span className="text-[7px] sm:text-[8px] font-black text-zinc-500 uppercase tracking-widest">Nivel</span>
              <span className="text-[8px] sm:text-[9px] font-black text-indigo-400">
                {pokemon.level}/{pokemon.evolutionLevel || pokemon.maxLevel}
              </span>
            </div>
            <div className="h-1 sm:h-1.5 bg-zinc-950 rounded-full overflow-hidden p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(pokemon.level / (pokemon.evolutionLevel || pokemon.maxLevel)) * 100}%` }}
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-inner" 
              />
            </div>
          </div>

          {/* Power Bar */}
          <div className="bg-black/40 backdrop-blur-md rounded-xl p-1.5 sm:p-2 border border-white/5">
            <div className="flex justify-between items-center mb-0.5 sm:mb-1">
              <span className="text-[7px] sm:text-[8px] font-black text-zinc-500 uppercase tracking-widest">Poder</span>
              <span className="text-[8px] sm:text-[9px] font-black text-amber-400">{pokemon.powerLevel}/10</span>
            </div>
            <div className="h-1 sm:h-1.5 bg-zinc-950 rounded-full overflow-hidden p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(pokemon.powerLevel / 10) * 100}%` }}
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full shadow-inner" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full flex gap-1.5 mt-3 relative z-10">
        {onPowerUp && pokemon.powerLevel < 10 && (
          <button 
            onClick={(e) => { e.stopPropagation(); onPowerUp(); }}
            disabled={!canPowerUp}
            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-lg ${canPowerUp ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
          >
            <Zap size={12} fill={canPowerUp ? "currentColor" : "none"} />
            Power
          </button>
        )}
        {onTrain && pokemon.level < (pokemon.evolutionLevel || pokemon.maxLevel) && (
          <button 
            onClick={(e) => { e.stopPropagation(); onTrain(); }}
            disabled={!canTrain}
            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-lg ${canTrain ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
          >
            <Dumbbell size={12} />
            Train
          </button>
        )}
        {onEvolve && pokemon.powerLevel === 10 && pokemon.level >= (pokemon.evolutionLevel || pokemon.maxLevel) && pokemon.evolutionChain && pokemon.evolutionChain.indexOf(pokemon.id) < pokemon.evolutionChain.length - 1 && (
          <button 
            onClick={(e) => { e.stopPropagation(); onEvolve(); }}
            disabled={!canEvolve}
            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(225,29,72,0.4)] ${canEvolve ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
          >
            <Dna size={12} /> Evolve
          </button>
        )}
        {onUseBandita && pokemon.fatigue > 0 && (
          <button 
            onClick={(e) => { e.stopPropagation(); onUseBandita(); }}
            disabled={!canUseBandita}
            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-lg ${canUseBandita ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
          >
            <Heart size={12} /> Heal
          </button>
        )}
        {onHealFatigue && pokemon.fatigue > 0 && (
          <button 
            onClick={(e) => { e.stopPropagation(); onHealFatigue(); }}
            disabled={!canHealFatigue}
            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-lg ${canHealFatigue ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
          >
            <Activity size={12} /> Rest
          </button>
        )}
        {onRetire && pokemon.level === 50 && (
          <button 
            onClick={(e) => { e.stopPropagation(); onRetire(); }}
            className="flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20"
          >
            <Award size={12} /> Retire
          </button>
        )}
      </div>
    </motion.div>
  );
};

// --- Main App ---

const CHAMPIONSHIP_TEAMS: LeagueTeam[] = [
  { id: 'champ-1', name: 'Lorelei', logo: '❄️', ovr: 450, points: 0, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 },
  { id: 'champ-2', name: 'Bruno', logo: '🥊', ovr: 500, points: 0, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 },
  { id: 'champ-3', name: 'Agatha', logo: '👻', ovr: 550, points: 0, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 },
  { id: 'champ-4', name: 'Lance', logo: '🐉', ovr: 600, points: 0, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 },
  { id: 'champ-5', name: 'Azul', logo: '⭐', ovr: 650, points: 0, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 },
  { id: 'champ-6', name: 'Rojo', logo: '🧢', ovr: 700, points: 0, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 },
  { id: 'champ-7', name: 'Cintia', logo: '👑', ovr: 750, points: 0, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 },
];

export default function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const [activeTab, setActiveTab] = useState<'team' | 'shop' | 'battles' | 'pokedex' | 'lab' | 'market' | 'settings' | 'hallOfFame' | 'missions' | 'event' | 'facilities' | 'staff' | 'league' | 'inventory' | 'explore'>('team');
  const [gameState, setGameState] = useState<'management' | 'battle'>('management');
  const [selectedLabPokemonId, setSelectedLabPokemonId] = useState<string | null>(null);
  const [showBatchTraining, setShowBatchTraining] = useState(false);
  const [batchSelectedPokemon, setBatchSelectedPokemon] = useState<string[]>([]);
  const [batchTargetLevel, setBatchTargetLevel] = useState<number>(10);
  const [showLoginPrompt, setShowLoginPrompt] = useState(() => {
    const saved = localStorage.getItem('plm_collection');
    if (!saved) return true;
    try {
      const parsed = JSON.parse(saved);
      return !Array.isArray(parsed) || parsed.length === 0;
    } catch {
      return true;
    }
  });
  const [showStarterSelect, setShowStarterSelect] = useState(() => {
    const saved = localStorage.getItem('plm_collection');
    if (!saved) return true;
    try {
      const parsed = JSON.parse(saved);
      return !Array.isArray(parsed) || parsed.length === 0;
    } catch {
      return true;
    }
  });
  const [isSelectingStarter, setIsSelectingStarter] = useState(false);
  const [starterIndex, setStarterIndex] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const isResetting = useRef(false);

  // Tutorial State
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(() => localStorage.getItem('plm_tutorial_completed') === 'true');
  
  // Persistence Logic
  const [coins, setCoins] = useState(() => Number(localStorage.getItem('plm_coins')) || 2000);
  const [stardust, setStardust] = useState(() => Number(localStorage.getItem('plm_stardust')) || 500);
  const [energy, setEnergy] = useState(() => Number(localStorage.getItem('plm_energy')) || 100);
  const [tp, setTp] = useState(() => Number(localStorage.getItem('plm_tp')) || 200);
  const [selectedExplorePokemonId, setSelectedExplorePokemonId] = useState<string | null>(null);
  const [isExploring, setIsExploring] = useState(false);
  const [exploreResult, setExploreResult] = useState<{ type: 'item' | 'coins' | 'happiness' | 'nothing', value: any, pokemonName?: string } | null>(null);
  const [banditas, setBanditas] = useState(() => Number(localStorage.getItem('plm_banditas')) || 2);
  const [evolutionStones, setEvolutionStones] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem('plm_evolutionStones') || '{}');
    } catch { return {}; }
  });
  const [heldItems, setHeldItems] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem('plm_heldItems') || '{}');
    } catch { return {}; }
  });
  const [megaStones, setMegaStones] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('plm_megaStones') || '[]');
    } catch { return []; }
  });
  const [teamName, setTeamName] = useState(() => localStorage.getItem('plm_teamName') || 'Mis Pokémon');
  const [teamLogo, setTeamLogo] = useState(() => localStorage.getItem('plm_teamLogo') || '🛡️');
  const [totalMatches, setTotalMatches] = useState(() => Number(localStorage.getItem('plm_totalMatches')) || 0);
  const [collection, setCollection] = useState<PokemonCard[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_collection') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [team, setTeam] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_team') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('plm_history') || '[]');
      return Array.isArray(saved) ? saved.map((item: any) => typeof item === 'string' ? item : (item.title || item.description || 'Actividad')) : [];
    } catch {
      return [];
    }
  });
  const [badges, setBadges] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_badges') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [defeatedGyms, setDefeatedGyms] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_defeatedGyms') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isLeagueQualified, setIsLeagueQualified] = useState(() => localStorage.getItem('plm_isLeagueQualified') === 'true');
  const [leagueLevel, setLeagueLevel] = useState(() => Number(localStorage.getItem('plm_leagueLevel')) || 1);
  const [pokedex, setPokedex] = useState<number[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_pokedex') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonCard | null>(null);
  const [selectedPokedexPokemon, setSelectedPokedexPokemon] = useState<PokemonBase | null>(null);
  const [showItemSelection, setShowItemSelection] = useState<string | null>(null);
  const [matchPreview, setMatchPreview] = useState<string | null>(null);
  const [previewRivalTeam, setPreviewRivalTeam] = useState<{p: PokemonCard, hp: number, maxHp: number}[] | null>(null);
  const [previewRivalInfo, setPreviewRivalInfo] = useState<any>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [pokedexDescription, setPokedexDescription] = useState<string>('');
  const [pokedexStats, setPokedexStats] = useState<{hp: number, atk: number, def: number, spe: number} | null>(null);
  const [isFetchingPokedexData, setIsFetchingPokedexData] = useState(false);
  const [showRankGuide, setShowRankGuide] = useState(false);
  const [showChampionCelebration, setShowChampionCelebration] = useState(false);

  const nextTutorialStep = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      const nextStep = TUTORIAL_STEPS[tutorialStep + 1];
      if (nextStep.tab) {
        setActiveTab(nextStep.tab as any);
      }
      setTutorialStep(tutorialStep + 1);
    } else {
      setIsTutorialActive(false);
      setTutorialCompleted(true);
    }
  };

  const skipTutorial = () => {
    setIsTutorialActive(false);
    setTutorialCompleted(true);
  };

  const handleSelectPokedexPokemon = async (p: PokemonBase) => {
    setSelectedPokedexPokemon(p);
    setPokedexDescription('');
    setPokedexStats(null);
    setIsFetchingPokedexData(true);
    try {
      let speciesData;
      const speciesRes = await fetchWithTimeout(`https://pokeapi.co/api/v2/pokemon-species/${p.id}`);
      if (speciesRes.ok) {
        speciesData = await speciesRes.json();
        const englishEntry = speciesData.flavor_text_entries.find((e: any) => e.language.name === 'en');
        if (englishEntry) {
          setPokedexDescription(englishEntry.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' '));
        }
      }

      // Fetch pokemon for stats
      let pokemonData;
      if (pokemonDataCache.has(p.id)) {
        pokemonData = pokemonDataCache.get(p.id);
      } else {
        const pokemonRes = await fetchWithTimeout(`https://pokeapi.co/api/v2/pokemon/${p.id}`);
        if (pokemonRes.ok) {
          pokemonData = await pokemonRes.json();
          pokemonDataCache.set(p.id, pokemonData);
        }
      }

      if (pokemonData) {
        const stats = {
          hp: pokemonData.stats.find((s: any) => s.stat.name === 'hp').base_stat,
          atk: pokemonData.stats.find((s: any) => s.stat.name === 'attack').base_stat,
          def: pokemonData.stats.find((s: any) => s.stat.name === 'defense').base_stat,
          spe: pokemonData.stats.find((s: any) => s.stat.name === 'speed').base_stat,
        };
        setPokedexStats(stats);
      }
    } catch (error) {
      console.error('Error fetching pokedex data:', error);
    } finally {
      setIsFetchingPokedexData(false);
    }
  };
  
  useEffect(() => {
    if (selectedPokemon) {
      const updated = collection.find(p => p.instanceId === selectedPokemon.instanceId);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedPokemon)) {
        setSelectedPokemon(updated);
      }
    }
  }, [collection, selectedPokemon]);

  const [isTournamentMode, setIsTournamentMode] = useState(() => localStorage.getItem('plm_isTournamentMode') === 'true');
  const [tournamentPlayedThisSeason, setTournamentPlayedThisSeason] = useState(() => localStorage.getItem('plm_tournamentPlayedThisSeason') === 'true');
  const [isChampionshipTournament, setIsChampionshipTournament] = useState(() => localStorage.getItem('plm_isChampionshipTournament') === 'true');
  const [tournamentRule, setTournamentRule] = useState<string | null>(() => localStorage.getItem('plm_tournamentRule') || null);
  const [tournamentBracket, setTournamentBracket] = useState<{
    quarters: Match[];
    semis: Match[];
    final: Match | null;
    winner: string | null;
  }>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_tournamentBracket') || '{"quarters":[], "semis":[], "final":null, "winner":null}');
      if (parsed && typeof parsed === 'object') {
        return {
          quarters: Array.isArray(parsed.quarters) ? parsed.quarters : [],
          semis: Array.isArray(parsed.semis) ? parsed.semis : [],
          final: parsed.final || null,
          winner: parsed.winner || null
        };
      }
      return {quarters:[], semis:[], final:null, winner:null};
    } catch {
      return {quarters:[], semis:[], final:null, winner:null};
    }
  });
  
  // League State
  const [leagueTeams, setLeagueTeams] = useState<LeagueTeam[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_leagueTeams') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [schedule, setSchedule] = useState<Match[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_schedule') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [currentWeek, setCurrentWeek] = useState(() => Number(localStorage.getItem('plm_currentWeek')) || 1);
  const [season, setSeason] = useState(() => Number(localStorage.getItem('plm_season')) || 1);
  const [arenaBg, setArenaBg] = useState('bg-zinc-950');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationState, setSimulationState] = useState<{
    isActive: boolean;
    type: 'week' | 'season';
    currentMatchIndex: number;
    totalMatches: number;
    currentMatch: {
      homeTeam: { name: string; ovr: number; logo: string };
      awayTeam: { name: string; ovr: number; logo: string };
      homeScore: number;
      awayScore: number;
    } | null;
    isStopping: boolean;
  } | null>(null);
  const stopSimulationRef = useRef(false);
  const battleEndedRef = useRef(false);

  // New Management States
  const [activeSponsor, setActiveSponsor] = useState<Sponsor | null>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_activeSponsor') || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  });
  const [items, setItems] = useState<Item[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_items') || 'null');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [marketOffers, setMarketOffers] = useState<MarketOffer[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_marketOffers') || 'null');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [learnableMoves, setLearnableMoves] = useState<Move[]>([]);
  const [isLoadingMoves, setIsLoadingMoves] = useState(false);
  const [moveSlotToReplace, setMoveSlotToReplace] = useState<number | null>(null);
  const [confirmMove, setConfirmMove] = useState<{ instanceId: string, slotIndex: number, move: Move } | null>(null);
  const [hallOfFame, setHallOfFame] = useState<PokemonCard[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_hallOfFame') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [nursery, setNursery] = useState<{ parents: PokemonCard[], eggProgress: number } | null>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_nursery') || 'null');
      if (parsed && typeof parsed === 'object') {
        return {
          parents: Array.isArray(parsed.parents) ? parsed.parents : [],
          eggProgress: typeof parsed.eggProgress === 'number' ? parsed.eggProgress : 0
        };
      }
      return null;
    } catch {
      return null;
    }
  });
  const [globalBattleSpeed, setGlobalBattleSpeed] = useState(() => Number(localStorage.getItem('plm_globalBattleSpeed')) || 1);
  const [evolvingPokemon, setEvolvingPokemon] = useState<{ from: PokemonCard, to: PokemonCard } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Interface & Settings States
  const [theme, setTheme] = useState(() => localStorage.getItem('plm_theme') || 'zinc');
  const [audioEnabled, setAudioEnabled] = useState(() => localStorage.getItem('plm_audioEnabled') !== 'false');
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('plm_notificationsEnabled') !== 'false');

  useEffect(() => {
    localStorage.setItem('plm_tutorial_completed', String(tutorialCompleted));
  }, [tutorialCompleted]);

  // Bulk Training State
  const [isBulkTrainingMode, setIsBulkTrainingMode] = useState(false);
  const [selectedForBulkTrain, setSelectedForBulkTrain] = useState<string[]>([]);
  const [bulkTrainTargetLevel, setBulkTrainTargetLevel] = useState(20);

  const bulkTrainCosts = useMemo(() => {
    let tpCost = 0;
    let coinCost = 0;
    selectedForBulkTrain.forEach(id => {
      const p = collection.find(x => x.instanceId === id);
      if (p) {
        const levelsToGain = Math.max(0, Math.min(bulkTrainTargetLevel, p.evolutionLevel || p.maxLevel) - p.level);
        tpCost += levelsToGain * TRAINING_COST_BASE;
        coinCost += levelsToGain * BULK_TRAIN_COIN_COST_PER_LEVEL;
      }
    });
    return { tpCost, coinCost };
  }, [selectedForBulkTrain, collection, bulkTrainTargetLevel]);

  // Missions & Events State
  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_activeEvent') || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  });
  const [facilities, setFacilities] = useState<Facility[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_facilities') || 'null');
      return Array.isArray(parsed) ? parsed : INITIAL_FACILITIES;
    } catch {
      return INITIAL_FACILITIES;
    }
  });
  const [staff, setStaff] = useState<StaffMember[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_staff') || 'null');
      return Array.isArray(parsed) ? parsed : INITIAL_STAFF;
    } catch {
      return INITIAL_STAFF;
    }
  });
  const [weather, setWeather] = useState<string>('clear');
  const [missions, setMissions] = useState<Mission[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('plm_missions') || 'null');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [lastMissionReset, setLastMissionReset] = useState(() => Number(localStorage.getItem('plm_lastMissionReset')) || 0);
  const [celebration, setCelebration] = useState<{type: 'win' | 'mission', message: string} | null>(null);

  // Firebase Auth & Cloud Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsCloudSyncing(true);
        try {
          const docRef = doc(db, 'saves', currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data().gameState;
            if (data) {
              // Load all state from cloud
              if (data.coins !== undefined) setCoins(data.coins);
              if (data.stardust !== undefined) setStardust(data.stardust);
              if (data.energy !== undefined) setEnergy(data.energy);
              if (data.tp !== undefined) setTp(data.tp);
              if (data.banditas !== undefined) setBanditas(data.banditas);
              if (data.teamName) setTeamName(data.teamName);
              if (data.teamLogo) setTeamLogo(data.teamLogo);
              if (data.totalMatches !== undefined) setTotalMatches(data.totalMatches);
              if (data.collection && Array.isArray(data.collection)) setCollection(data.collection);
              if (data.team && Array.isArray(data.team)) setTeam(data.team);
              if (data.history && Array.isArray(data.history)) setHistory(data.history);
              if (data.leagueLevel !== undefined) setLeagueLevel(data.leagueLevel);
              if (data.pokedex && Array.isArray(data.pokedex)) setPokedex(data.pokedex);
              if (data.badges && Array.isArray(data.badges)) setBadges(data.badges);
              if (data.defeatedGyms && Array.isArray(data.defeatedGyms)) setDefeatedGyms(data.defeatedGyms);
              if (data.isLeagueQualified !== undefined) setIsLeagueQualified(data.isLeagueQualified);
              if (data.leagueTeams && Array.isArray(data.leagueTeams)) setLeagueTeams(data.leagueTeams);
              if (data.schedule && Array.isArray(data.schedule)) setSchedule(data.schedule);
              if (data.currentWeek !== undefined) setCurrentWeek(data.currentWeek);
              if (data.season !== undefined) setSeason(data.season);
              if (data.isTournamentMode !== undefined) setIsTournamentMode(data.isTournamentMode);
              if (data.tournamentPlayedThisSeason !== undefined) setTournamentPlayedThisSeason(data.tournamentPlayedThisSeason);
              if (data.isChampionshipTournament !== undefined) setIsChampionshipTournament(data.isChampionshipTournament);
              if (data.tournamentRule !== undefined) setTournamentRule(data.tournamentRule);
              if (data.tournamentBracket && typeof data.tournamentBracket === 'object') {
                setTournamentBracket({
                  quarters: Array.isArray(data.tournamentBracket.quarters) ? data.tournamentBracket.quarters : [],
                  semis: Array.isArray(data.tournamentBracket.semis) ? data.tournamentBracket.semis : [],
                  final: data.tournamentBracket.final || null,
                  winner: data.tournamentBracket.winner || null
                });
              }
              if (data.activeSponsor !== undefined) setActiveSponsor(data.activeSponsor);
              if (data.items && Array.isArray(data.items)) setItems(data.items);
              if (data.hallOfFame && Array.isArray(data.hallOfFame)) setHallOfFame(data.hallOfFame);
              if (data.nursery !== undefined) {
                if (data.nursery && typeof data.nursery === 'object') {
                  setNursery({
                    parents: Array.isArray(data.nursery.parents) ? data.nursery.parents : [],
                    eggProgress: typeof data.nursery.eggProgress === 'number' ? data.nursery.eggProgress : 0
                  });
                } else {
                  setNursery(null);
                }
              }
              if (data.marketOffers && Array.isArray(data.marketOffers)) setMarketOffers(data.marketOffers);
              if (data.globalBattleSpeed !== undefined) setGlobalBattleSpeed(data.globalBattleSpeed);
              if (data.activeEvent !== undefined) setActiveEvent(data.activeEvent);
              if (data.missions && Array.isArray(data.missions)) setMissions(data.missions);
              if (data.lastMissionReset !== undefined) setLastMissionReset(data.lastMissionReset);
              if (data.facilities && Array.isArray(data.facilities)) setFacilities(data.facilities);
              if (data.staff && Array.isArray(data.staff)) setStaff(data.staff);
              if (data.tutorialCompleted !== undefined) setTutorialCompleted(data.tutorialCompleted);
              
              // Skip starter select if they have a collection
              if (data.collection && data.collection.length > 0) {
                setShowStarterSelect(false);
                setShowLoginPrompt(false);
              }
            }
          }
        } catch (error) {
          console.error("Error loading from cloud:", error);
        } finally {
          setIsCloudSyncing(false);
          setIsAuthReady(true);
          setShowLoginPrompt(false);
        }
      } else {
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Missions & Events Logic
  const generateMissions = (type: MissionType) => {
    const templates = {
      daily: [
        { title: "Entrenador Novato", description: "Entrena a un Pokémon 3 veces", goal: 3, reward: { coins: 200, tp: 20 } },
        { title: "Cazador de Tesoros", description: "Abre 2 sobres de cartas", goal: 2, reward: { stardust: 40, coins: 100 } },
        { title: "Primer Paso", description: "Gana 1 batalla", goal: 1, reward: { coins: 150, banditas: 1 } },
        { title: "Energía Pura", description: "Gasta 50 de energía", goal: 50, reward: { tp: 50 } },
        { title: "Explorador", description: "Explora la zona 5 veces", goal: 5, reward: { coins: 300, stardust: 50 } },
        { title: "Amistad", description: "Aumenta la felicidad de un Pokémon", goal: 1, reward: { tp: 30 } },
      ],
      weekly: [
        { title: "Maestro de la Liga", description: "Gana 10 batallas", goal: 10, reward: { coins: 2000, stardust: 400 } },
        { title: "Evolución Constante", description: "Evoluciona a 2 Pokémon", goal: 2, reward: { tp: 200, coins: 800 } },
        { title: "Inversión", description: "Gasta 10,000 monedas", goal: 10000, reward: { stardust: 800 } },
        { title: "Coleccionista", description: "Obtén 5 nuevos Pokémon", goal: 5, reward: { banditas: 10, coins: 400 } },
        { title: "Magnate", description: "Gana 50,000 monedas en total", goal: 50000, reward: { stardust: 2000, tp: 500 } },
        { title: "Veterano", description: "Gana 25 batallas", goal: 25, reward: { coins: 5000, stardust: 1000 } },
      ],
      event: [
        { title: "Héroe del Evento", description: "Completa 5 batallas de evento", goal: 5, reward: { coins: 1200, stardust: 200 } },
        { title: "Poder Desatado", description: "Sube de nivel a un Pokémon legendario", goal: 1, reward: { tp: 400, banditas: 5 } },
      ],
      league: [
        { title: "Desafío de Gimnasio", description: "Vence a un Líder de Gimnasio", goal: 1, reward: { coins: 800, stardust: 200 } },
        { title: "Camino a la Cima", description: "Vence a 4 Líderes de Gimnasio", goal: 4, reward: { coins: 4000, tp: 800 } },
        { title: "Leyenda de Kanto", description: "Completa los 8 Gimnasios", goal: 8, reward: { coins: 20000, stardust: 4000, tp: 2000 } },
        { title: "Campeón en Ciernes", description: "Gana 5 combates en el Campeonato Final", goal: 5, reward: { coins: 10000, stardust: 2000 } },
      ]
    };

    return (templates[type as keyof typeof templates] || []).map(t => ({
      id: `${type}-${Math.random().toString(36).substr(2, 9)}`,
      ...t,
      current: 0,
      type,
      claimed: false
    }));
  };

  const claimMissionReward = (missionId: string) => {
    const mission = (missions || []).find(m => m.id === missionId);
    if (!mission || mission.claimed || mission.current < mission.goal) return;

    if (mission.reward.coins) setCoins(c => c + mission.reward.coins!);
    if (mission.reward.stardust) setStardust(s => s + mission.reward.stardust!);
    if (mission.reward.tp) setTp(t => t + mission.reward.tp!);
    if (mission.reward.banditas) setBanditas(b => b + mission.reward.banditas!);

    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, claimed: true } : m));
    setCelebration({type: 'mission', message: '¡Misión Completada!'});
  };

  const updateMissionProgress = (action: string, amount: number = 1) => {
    setMissions(prev => prev.map(m => {
      if (m.claimed) return m;
      
      let shouldUpdate = false;
      const title = m.title.toLowerCase();
      
      if (action === 'train' && (title.includes('entrenador') || title.includes('train'))) shouldUpdate = true;
      if (action === 'open_pack' && (title.includes('cazador') || title.includes('pack') || title.includes('sobre'))) shouldUpdate = true;
      if (action === 'win_battle' && (title.includes('paso') || title.includes('maestro') || title.includes('win') || title.includes('gana'))) shouldUpdate = true;
      if (action === 'spend_energy' && (title.includes('energía') || title.includes('energy'))) shouldUpdate = true;
      if (action === 'evolve' && (title.includes('evolución') || title.includes('evolve'))) shouldUpdate = true;
      if (action === 'spend_coins' && (title.includes('inversión') || title.includes('coins') || title.includes('monedas'))) shouldUpdate = true;
      if (action === 'get_pokemon' && (title.includes('coleccionista') || title.includes('pokemon'))) shouldUpdate = true;
      if (action === 'event_battle' && (title.includes('héroe') || title.includes('evento'))) shouldUpdate = true;
      if (action === 'level_legendary' && (title.includes('poder') || title.includes('legendario'))) shouldUpdate = true;
      if (action === 'win_gym' && (title.includes('gimnasio') || title.includes('cima') || title.includes('leyenda'))) shouldUpdate = true;
      if (action === 'win_championship' && (title.includes('campeón') || title.includes('campeonato'))) shouldUpdate = true;
      if (action === 'explore' && (title.includes('explorador') || title.includes('explora'))) shouldUpdate = true;
      if (action === 'increase_happiness' && (title.includes('amistad') || title.includes('felicidad'))) shouldUpdate = true;
      if (action === 'earn_coins' && (title.includes('magnate') || title.includes('monedas'))) shouldUpdate = true;
      if (action === 'win_battle' && (title.includes('veterano') || title.includes('gana'))) shouldUpdate = true;

      if (shouldUpdate) {
        return { ...m, current: Math.min(m.goal, m.current + amount) };
      }
      return m;
    }));
  };

  // Daily Reset & Event Rotation
  useEffect(() => {
    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);

    if (lastMissionReset < today || (missions || []).length === 0) {
      const daily = generateMissions('daily');
      const weekly = lastMissionReset < today - (today % (86400000 * 7)) ? generateMissions('weekly') : (missions || []).filter(m => m.type === 'weekly');
      
      // Rotate Event
      let event = activeEvent;
      if (!event || event.endDate < now) {
        event = { ...ALL_EVENTS[Math.floor(Math.random() * ALL_EVENTS.length)], endDate: now + 86400000 * 3 };
      }

      const eventMissions = generateMissions('event');
      const leagueMissions = (missions || []).some(m => m.type === 'league') ? (missions || []).filter(m => m.type === 'league') : generateMissions('league');

      setMissions([...daily, ...weekly, ...eventMissions, ...leagueMissions]);
      setActiveEvent(event);
      setLastMissionReset(today);
    }
  }, [lastMissionReset, (missions || []).length]);

  const evolvePokemon = async (pokemon: PokemonCard) => {
    const currentIndex = pokemon.evolutionChain.indexOf(pokemon.id);
    const nextId = pokemon.evolutionChain[currentIndex + 1];
    const nextBase = POKEDEX_BASE.find(p => p.id === nextId);
    if (!nextBase) return;

    // Fetch new evolution level
    const newEvolutionLevel = await fetchEvolutionLevel(nextId);

    // Update Pokémon
    const evolvedPokemon: PokemonCard = {
      ...pokemon,
      id: nextBase.id,
      name: nextBase.name,
      types: nextBase.types,
      ability: nextBase.ability,
      evolutionChain: nextBase.evolutionChain,
      evolutionLevel: newEvolutionLevel,
      isEvolved: true,
      // Increase stats slightly
      atk: Math.floor(pokemon.atk * 1.2),
      def: Math.floor(pokemon.def * 1.2),
      spe: Math.floor(pokemon.spe * 1.2),
      ovr: Math.floor(pokemon.ovr * 1.2),
    };

    setCollection(prev => prev.map(p => p.instanceId === pokemon.instanceId ? evolvedPokemon : p));
    setHistory(prev => [`✨ ¡${pokemon.name} ha evolucionado a ${evolvedPokemon.name}!`, ...prev].slice(0, 10));
  };

  // Migration: Ensure all pokemon have moves
  useEffect(() => {
    if (collection.length > 0) {
      const hasMissingMoves = collection.some(p => !p.moves || p.moves.length === 0);
      if (hasMissingMoves) {
        setCollection(prev => prev.map(p => {
          if (!p.moves || p.moves.length === 0) {
            const primaryType = p.types?.[0] || 'Normal';
            const typeMoves = ALL_MOVES[primaryType] || ALL_MOVES['Normal'];
            const normalMoves = ALL_MOVES['Normal'];
            const pokemonMoves: Move[] = [];
            const shuffledTypeMoves = [...typeMoves].sort(() => 0.5 - Math.random());
            const shuffledNormalMoves = [...normalMoves].sort(() => 0.5 - Math.random());
            
            pokemonMoves.push(...shuffledTypeMoves.slice(0, 2));
            pokemonMoves.push(...shuffledNormalMoves.slice(0, 2));
            
            while (pokemonMoves.length < 4) {
              const move = shuffledNormalMoves.pop();
              if (move && !pokemonMoves.find(m => m?.name === move.name)) {
                pokemonMoves.push(move);
              }
            }
            return { ...p, moves: pokemonMoves };
          }
          return p;
        }));
      }
    }
  }, [collection.length]);

  const getRandomBaseForLevel = (level: number, rarity?: Rarity) => {
    const filtered = POKEDEX_BASE.filter(base => {
      const stage = base.evolutionChain.indexOf(base.id);
      const stageCheck = (stage === 0) || (stage === 1 && level >= 16) || (stage === 2 && level >= 32);
      
      if (!stageCheck) return false;

      if (rarity) {
        return getPokemonRarity(base) === rarity;
      }
      
      return true;
    });
    
    if (filtered.length === 0) {
      // Fallback if no pokemon matches rarity and level
      return POKEDEX_BASE[Math.floor(Math.random() * POKEDEX_BASE.length)];
    }
    
    return filtered[Math.floor(Math.random() * filtered.length)];
  };

  // Market Logic
  useEffect(() => {
    const generateMarketOffers = async () => {
      if ((marketOffers || []).length === 0 && leagueTeams.length > 0) {
        const newOffers: MarketOffer[] = [];
        const offersCount = (staff || []).find(s => s.role === 'Scout' && s.hired) ? 10 : 8;
        for (let i = 0; i < offersCount; i++) {
          const targetLevel = Math.floor(Math.random() * 20) + 1;
          
          const hasScout = (staff || []).find(s => s.role === 'Scout' && s.hired);
          let rarity: Rarity;
          const rand = Math.random();
          
          if (hasScout) {
            if (rand < 0.15) rarity = 'Legendary';
            else if (rand < 0.45) rarity = 'Mythical';
            else if (rand < 0.8) rarity = 'Rare';
            else rarity = 'Common';
          } else {
            if (rand < 0.05) rarity = 'Legendary';
            else if (rand < 0.15) rarity = 'Mythical';
            else if (rand < 0.4) rarity = 'Rare';
            else rarity = 'Common';
          }

          const base = getRandomBaseForLevel(targetLevel, rarity);
          const pokemon = await generatePokemon(base, rarity, targetLevel);
          
          // Make market pokemon expensive
          const rarityMultiplier = rarity === 'Legendary' ? 10 : rarity === 'Mythical' ? 5 : rarity === 'Rare' ? 2 : 1;
          const shinyMultiplier = pokemon.isShiny ? 3 : 1;
          const cost = (5000 * rarityMultiplier + Math.floor(Math.random() * 2000) + (targetLevel * 200)) * shinyMultiplier;
          
          const otherTeams = leagueTeams.filter(t => t.id !== 'player');
          const seller = otherTeams.length > 0 ? otherTeams[Math.floor(Math.random() * otherTeams.length)].name : 'Mercader Errante';

          newOffers.push({ id: Math.random().toString(36).substr(2, 9), pokemon, cost, seller });
        }
        setMarketOffers(newOffers);
      }
    };
    generateMarketOffers();
  }, [(marketOffers || []).length, leagueTeams]);

  // Auto-select first pokemon in lab if none selected
  useEffect(() => {
    if (activeTab === 'lab' && !selectedLabPokemonId && collection.length > 0) {
      setSelectedLabPokemonId(collection[0].instanceId);
    }
  }, [activeTab, collection, selectedLabPokemonId]);

  // Fetch learnable moves when lab pokemon changes
  useEffect(() => {
    const fetchMoves = async () => {
      if (activeTab === 'lab' && selectedLabPokemonId) {
        const p = collection.find(item => item.instanceId === selectedLabPokemonId);
        if (!p) return;
        
        setIsLoadingMoves(true);
        try {
          let data;
          if (pokemonDataCache.has(p.id)) {
            data = pokemonDataCache.get(p.id);
          } else {
            const res = await fetchWithTimeout(`https://pokeapi.co/api/v2/pokemon/${p.id}`);
            data = await res.json();
            pokemonDataCache.set(p.id, data);
          }
          
          // Filter moves learned by level-up
          const levelUpMoves = (data.moves || []).filter((m: any) => 
            m?.version_group_details?.some((v: any) => v?.move_learn_method?.name === 'level-up')
          );

          // Sort by level ascending
          levelUpMoves.sort((a: any, b: any) => {
            const aLevels = a?.version_group_details?.filter((v: any) => v?.move_learn_method?.name === 'level-up').map((v: any) => v?.level_learned_at) || [];
            const bLevels = b?.version_group_details?.filter((v: any) => v?.move_learn_method?.name === 'level-up').map((v: any) => v?.level_learned_at) || [];
            const aLevel = aLevels.length > 0 ? Math.min(...aLevels) : 0;
            const bLevel = bLevels.length > 0 ? Math.min(...bLevels) : 0;
            return aLevel - bLevel;
          });

          // Get a subset of moves (first 30 level-up moves)
          const movePromises = levelUpMoves.slice(0, 30).map(async (m: any) => {
            const moveData = await fetchMoveData(m?.move?.url);
            const levelDetail = m?.version_group_details?.find((v: any) => v?.move_learn_method?.name === 'level-up');
            
            return {
              ...moveData,
              level_learned_at: Math.max(1, Math.floor((levelDetail?.level_learned_at || 1) * 0.5))
            };
          });
          
          const moves = await Promise.all(movePromises);
          setLearnableMoves(moves);
        } catch (error) {
          console.error("Error fetching moves:", error);
        } finally {
          setIsLoadingMoves(false);
        }
      }
    };
    fetchMoves();
  }, [activeTab, selectedLabPokemonId, collection]);

  // Battle State
  const [battleData, setBattleData] = useState<{
    matchId?: string,
    playerTeam: { p: PokemonCard, hp: number, maxHp: number }[],
    rivalTeam: { p: PokemonCard, hp: number, maxHp: number }[],
    playerIdx: number,
    rivalIdx: number,
    log: string[],
    isAuto: boolean,
    speed: number,
    turn: 'player' | 'rival' | 'animating',
    rivalOvr: number,
    rivalName?: string,
    rivalLogo?: string,
    attackingSide: 'player' | 'rival' | null,
    hitSide: 'player' | 'rival' | null,
    playerStats: { [instanceId: string]: { damageDealt: number, fainted: boolean } },
    selectedMove: Move | null,
    showMoves: boolean,
    showTeam: boolean,
    momentum: number,
    coachBuffs: { atk: number, def: number },
    battleEnded?: 'win' | 'loss'
  } | null>(null);

  const selectStarter = async (starterId: number) => {
    if (isSelectingStarter) return;
    setIsSelectingStarter(true);
    
    const base = POKEDEX_BASE.find(p => p.id === starterId);
    if (!base) {
      setIsSelectingStarter(false);
      return;
    }

    try {
      const starter = await generatePokemon(base, 'Common', 5); // Start at level 5
      
      // Generate 5 common Pokémon
      const commonPokemon = [];
      for (let i = 0; i < 5; i++) {
          const randomBase = POKEDEX_BASE[Math.floor(Math.random() * POKEDEX_BASE.length)];
          commonPokemon.push(await generatePokemon(randomBase, 'Common', 5));
      }
      
      // Generate 1 rare Pokémon
      const randomBaseRare = POKEDEX_BASE[Math.floor(Math.random() * POKEDEX_BASE.length)];
      const rarePokemon = await generatePokemon(randomBaseRare, 'Rare', 5);
      
      const newCollection = [starter, ...commonPokemon, rarePokemon];
      
      // Give some extra items or coins to start
      setCollection(newCollection);
      setTeam([starter.instanceId]);
      setPokedex(newCollection.map(p => p.id));
      setCoins(2000);
      setStardust(100);
      setTp(50);
      setHistory([`¡Comienza tu Aventura! Has elegido a ${starter.name} como tu compañero inicial. Además, has recibido 5 Pokémon comunes y 1 raro.`]);
      setShowStarterSelect(false);
      
      // Start tutorial for new players
      if (!tutorialCompleted) {
        setIsTutorialActive(true);
        setTutorialStep(0);
      }
    } catch (error) {
      console.error("Error generating starter team:", error);
    } finally {
      setIsSelectingStarter(false);
    }
  };

  const resetGame = async () => {
    isResetting.current = true;
    
    // Clear cloud save if user is logged in
    if (user) {
      try {
        await deleteDoc(doc(db, 'saves', user.uid));
      } catch (error) {
        console.error("Error deleting cloud save:", error);
      }
    }

    // Clear all game-related keys
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('plm_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Also clear everything as a fallback
    localStorage.clear();
    sessionStorage.clear();
    
    // Force a hard reload to a clean URL
    window.location.replace(window.location.origin + window.location.pathname);
  };

  // Persistence Logic: Save state to localStorage on changes
  useEffect(() => {
    if (isResetting.current) return;
    localStorage.setItem('plm_coins', coins.toString());
    localStorage.setItem('plm_stardust', stardust.toString());
    localStorage.setItem('plm_energy', energy.toString());
    localStorage.setItem('plm_tp', tp.toString());
    localStorage.setItem('plm_banditas', banditas.toString());
    localStorage.setItem('plm_evolutionStones', JSON.stringify(evolutionStones));
    localStorage.setItem('plm_heldItems', JSON.stringify(heldItems));
    localStorage.setItem('plm_megaStones', JSON.stringify(megaStones));
    localStorage.setItem('plm_teamName', teamName);
    localStorage.setItem('plm_teamLogo', teamLogo);
    localStorage.setItem('plm_totalMatches', totalMatches.toString());
    localStorage.setItem('plm_collection', JSON.stringify(collection));
    localStorage.setItem('plm_team', JSON.stringify(team));
    localStorage.setItem('plm_history', JSON.stringify(history));
    localStorage.setItem('plm_leagueLevel', leagueLevel.toString());
    localStorage.setItem('plm_pokedex', JSON.stringify(pokedex));
    localStorage.setItem('plm_badges', JSON.stringify(badges));
    localStorage.setItem('plm_defeatedGyms', JSON.stringify(defeatedGyms));
    localStorage.setItem('plm_isLeagueQualified', String(isLeagueQualified));
    localStorage.setItem('plm_leagueTeams', JSON.stringify(leagueTeams));
    localStorage.setItem('plm_schedule', JSON.stringify(schedule));
    localStorage.setItem('plm_currentWeek', currentWeek.toString());
    localStorage.setItem('plm_season', season.toString());
    localStorage.setItem('plm_isTournamentMode', isTournamentMode.toString());
    localStorage.setItem('plm_tournamentPlayedThisSeason', tournamentPlayedThisSeason.toString());
    localStorage.setItem('plm_isChampionshipTournament', isChampionshipTournament.toString());
    localStorage.setItem('plm_facilities', JSON.stringify(facilities));
    localStorage.setItem('plm_staff', JSON.stringify(staff));
    localStorage.setItem('plm_marketOffers', JSON.stringify(marketOffers));
    if (tournamentRule) localStorage.setItem('plm_tournamentRule', tournamentRule);
    else localStorage.removeItem('plm_tournamentRule');
    localStorage.setItem('plm_tournamentBracket', JSON.stringify(tournamentBracket));
    localStorage.setItem('plm_activeSponsor', JSON.stringify(activeSponsor));
    localStorage.setItem('plm_items', JSON.stringify(items));
    localStorage.setItem('plm_hallOfFame', JSON.stringify(hallOfFame));
    localStorage.setItem('plm_nursery', JSON.stringify(nursery));
    localStorage.setItem('plm_marketOffers', JSON.stringify(marketOffers));
    localStorage.setItem('plm_globalBattleSpeed', globalBattleSpeed.toString());
    localStorage.setItem('plm_activeEvent', JSON.stringify(activeEvent));
    localStorage.setItem('plm_missions', JSON.stringify(missions));
    localStorage.setItem('plm_lastMissionReset', lastMissionReset.toString());
    localStorage.setItem('plm_theme', theme);
    localStorage.setItem('plm_audioEnabled', String(audioEnabled));
    localStorage.setItem('plm_notificationsEnabled', String(notificationsEnabled));
  }, [coins, stardust, energy, tp, banditas, evolutionStones, heldItems, teamName, teamLogo, totalMatches, collection, team, history, leagueLevel, pokedex, badges, defeatedGyms, isLeagueQualified, leagueTeams, schedule, currentWeek, season, isTournamentMode, tournamentPlayedThisSeason, isChampionshipTournament, tournamentRule, tournamentBracket, activeSponsor, items, hallOfFame, nursery, marketOffers, globalBattleSpeed, activeEvent, missions, lastMissionReset, theme, audioEnabled, notificationsEnabled]);

  // Helper to remove undefined values for Firestore
  const sanitizeForFirestore = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj === undefined ? null : obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(v => sanitizeForFirestore(v));
    }
    const sanitized: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
      }
    });
    return sanitized;
  };

  // Cloud Save Logic (Debounced)
  useEffect(() => {
    if (!user || !isAuthReady || isCloudSyncing || isResetting.current) return;
    
    const timeoutId = setTimeout(async () => {
      setIsCloudSyncing(true);
      try {
        const stateToSave = {
          coins, stardust, energy, tp, banditas, teamName, teamLogo, totalMatches, 
          collection, team, history, leagueLevel, pokedex, badges, defeatedGyms, 
          isLeagueQualified, leagueTeams, schedule, currentWeek, season, isTournamentMode, 
          tournamentPlayedThisSeason, isChampionshipTournament, tournamentRule, 
          tournamentBracket, activeSponsor, items, hallOfFame, nursery, marketOffers, 
          globalBattleSpeed, activeEvent, missions, lastMissionReset, facilities, staff,
          tutorialCompleted
        };
        
        await setDoc(doc(db, 'saves', user.uid), sanitizeForFirestore({
          gameState: stateToSave,
          updatedAt: new Date().toISOString()
        }));
      } catch (error) {
        console.error("Error saving to cloud:", error);
      } finally {
        setIsCloudSyncing(false);
      }
    }, 3000); // Save after 3 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [coins, stardust, energy, tp, banditas, teamName, teamLogo, totalMatches, collection, team, history, leagueLevel, pokedex, badges, defeatedGyms, isLeagueQualified, leagueTeams, schedule, currentWeek, season, isTournamentMode, tournamentPlayedThisSeason, isChampionshipTournament, tournamentRule, tournamentBracket, activeSponsor, items, hallOfFame, nursery, marketOffers, globalBattleSpeed, activeEvent, missions, lastMissionReset, facilities, staff, tutorialCompleted, user, isAuthReady]);

  // Energy Recovery
  useEffect(() => {
    const interval = setInterval(() => {
      setEnergy(e => Math.min(100, e + 1));
    }, 30000); // 1 energy per 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Initialize League if empty
  useEffect(() => {
    if (leagueTeams.length === 0) {
      resetLeague();
    }
  }, []);

  const teamMembers = useMemo(() => 
    (team || []).map(id => collection?.find(p => p.instanceId === id)).filter(Boolean) as PokemonCard[],
    [team, collection]
  );

  const teamSynergies = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    teamMembers.forEach(p => {
      p.types?.forEach(t => {
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      });
    });
    
    let bonus = 0;
    const active: { type: string, count: number, bonus: number, effect: string }[] = [];
    
    Object.entries(typeCounts).forEach(([type, count]) => {
      let typeBonus = 0;
      let effect = '';
      
      if (count >= 2) {
        if (type === 'Fire') { typeBonus = 3; effect = '+15% ATK'; }
        else if (type === 'Water') { typeBonus = 3; effect = '+15% VEL'; }
        else if (type === 'Grass') { typeBonus = 3; effect = '+15% HP'; }
        else if (type === 'Electric') { typeBonus = 4; effect = '+20% Crit'; }
        else if (type === 'Dragon') { typeBonus = 5; effect = '+10% Todo'; }
        else if (type === 'Steel') { typeBonus = 3; effect = '+15% DEF'; }
        else if (type === 'Psychic') { typeBonus = 3; effect = '+15% Daño Esp.'; }
        else { typeBonus = 2; effect = '+5% OVR'; }
      }
      
      if (count >= 3) typeBonus += 3;
      if (count >= 4) typeBonus += 3;
      
      if (typeBonus > 0) {
        bonus += typeBonus;
        active.push({ type, count, bonus: typeBonus, effect });
      }
    });
    
    return { bonus, active: active.sort((a, b) => b.bonus - a.bonus) };
  }, [teamMembers]);

  const maxTeamOvr = useMemo(() => {
    if (teamMembers.length === 0) return 50;
    const baseOvr = Math.floor(teamMembers.reduce((acc, p) => acc + p.ovr, 0) / teamMembers.length);
    return baseOvr + teamSynergies.bonus;
  }, [teamMembers, teamSynergies.bonus]);

  const teamOvr = useMemo(() => {
    if (teamMembers.length === 0) return 0;
    
    // Calculate effective OVR for each member based on fatigue
    const effectiveOvrs = teamMembers.map(p => {
      let penalty = 0;
      if (p.fatigue > 30) penalty = Math.floor((p.fatigue - 30) / 2); 
      return Math.max(1, p.ovr - penalty);
    });

    const baseOvr = Math.floor(effectiveOvrs.reduce((acc, ovr) => acc + ovr, 0) / teamMembers.length);
    return baseOvr + teamSynergies.bonus;
  }, [teamMembers, teamSynergies.bonus]);

  useEffect(() => {
    setLeagueTeams(prev => prev.map(t => t.id === 'player' ? { ...t, ovr: teamOvr, name: teamName } : t));
  }, [teamOvr, teamName]);

  const updateSponsorProgress = (amount: number) => {
    if (!activeSponsor || activeSponsor.isCompleted) return;
    
    setActiveSponsor(prev => {
      if (!prev) return null;
      const newValue = prev.currentValue + amount;
      const isCompleted = newValue >= prev.targetValue;
      
      if (isCompleted && !prev.isCompleted) {
        setCoins(c => c + (prev.reward.coins || 0));
        setStardust(s => s + (prev.reward.stardust || 0));
        setTp(t => t + (prev.reward.tp || 0));
        setHistory(h => [`💰 ¡Sponsor ${prev.name} completado! Recompensa recibida.`, ...h].slice(0, 10));
      }
      
      return { ...prev, currentValue: newValue, isCompleted };
    });
  };

  const [openingPack, setOpeningPack] = useState<{ pack: any, pokemon: PokemonCard | null, isRevealed: boolean } | null>(null);
  const [openingStage, setOpeningStage] = useState<'idle' | 'shaking' | 'bursting' | 'revealed'>('idle');

  const handleScout = async (packId: string) => {
    const pack = PACK_TYPES.find(p => p.id === packId);
    if (!pack) return;
    
    if (pack.costType === 'coins' && coins < pack.cost) return;
    if (pack.costType === 'stardust' && stardust < pack.cost) return;
    
    if (pack.costType === 'coins') {
      setCoins(prev => Math.max(0, prev - pack.cost));
      updateMissionProgress('spend_coins', pack.cost);
    } else {
      setStardust(prev => Math.max(0, prev - pack.cost));
    }
    updateMissionProgress('open_pack', 1);
    updateMissionProgress('get_pokemon', 1);
    
    setOpeningPack({ pack, pokemon: null, isRevealed: false });
    setOpeningStage('shaking');
    
    const roll = Math.random();
    let rarity: Rarity = 'Common';
    if (roll < pack.odds.Legendary) rarity = 'Legendary';
    else if (roll < pack.odds.Legendary + pack.odds.Mythical) rarity = 'Mythical';
    else if (roll < pack.odds.Legendary + pack.odds.Mythical + pack.odds.Rare) rarity = 'Rare';
    
    const base = getRandomBaseForLevel(1, rarity);

    const newPokemon = await generatePokemon(base, rarity, 1);
    
    setTimeout(() => {
      setOpeningStage('bursting');
      setTimeout(() => {
        setOpeningPack({ pack, pokemon: newPokemon, isRevealed: true });
        setOpeningStage('revealed');
        setCollection(prev => [...prev, newPokemon]);
        if (!pokedex.includes(base.id)) setPokedex(prev => [...prev, base.id]);
        setHistory(prev => [`✨ ¡Has reclutado a ${newPokemon.name} (${rarity})!`, ...prev].slice(0, 10));

        if (activeSponsor?.id === 'poke_mart') {
          updateSponsorProgress(1);
        }
      }, 500); // Burst duration
    }, 2000); // Shake duration
  };

  const handlePowerUp = (instanceId: string) => {
    if (stardust < POWERUP_COST_BASE) return;
    const target = collection.find(p => p.instanceId === instanceId);
    if (!target || target.powerLevel >= 10) return;

    setStardust(s => Math.max(0, s - POWERUP_COST_BASE));
    setCollection(prev => prev.map(p => {
      if (p.instanceId === instanceId && p.powerLevel < 10) {
        const config = RARITY_CONFIG[p.rarity];
        const gain = config.statGain * 2;
        const newAtk = p.atk + gain;
        const newDef = p.def + gain;
        const newHp = p.hp + gain;
        return {
          ...p,
          powerLevel: p.powerLevel + 1,
          atk: newAtk,
          def: newDef,
          hp: newHp,
          maxHp: newHp,
          ovr: Math.max(p.ovr + 1, Math.floor((newAtk + newDef + p.spe + newHp/2) / 3.5))
        };
      }
      return p;
    }));
  };

  const handleRetireToHallOfFame = (instanceId: string) => {
    const target = collection.find(p => p.instanceId === instanceId);
    if (!target || target.level < 50) return;

    setHallOfFame(prev => [...prev, target]);
    setCollection(prev => prev.filter(item => item.instanceId !== instanceId));
    setTeam(prev => prev.filter(id => id !== instanceId));
    setCoins(c => c + 15000);
    setStardust(s => s + 5000);
    setHistory(h => [`🏆 ¡${target.name} ha entrado en el Salón de la Fama! Recompensa: +15,000 Monedas, +5,000 Polvos.`, ...h].slice(0, 10));
    setSelectedLabPokemonId(null);
    setSelectedPokemon(null);
  };

  const handleBatchTrain = () => {
    if (batchSelectedPokemon.length === 0) return;

    let totalTpNeeded = 0;
    const updates: Record<string, number> = {}; // instanceId -> levels to train

    batchSelectedPokemon.forEach(id => {
      const p = collection.find(poke => poke.instanceId === id);
      if (p && p.level < batchTargetLevel && p.level < p.maxLevel) {
        const levelsToTrain = Math.min(batchTargetLevel, p.maxLevel) - p.level;
        totalTpNeeded += levelsToTrain * TRAINING_COST_BASE;
        updates[id] = levelsToTrain;
      }
    });

    if (totalTpNeeded === 0) return;

    let tpToSpend = 0;
    let coinsToSpend = 0;

    if (tp >= totalTpNeeded) {
      tpToSpend = totalTpNeeded;
    } else {
      tpToSpend = tp;
      const remainingTp = totalTpNeeded - tp;
      coinsToSpend = remainingTp * 2; // 1 TP = 2 Coins
    }

    if (coins < coinsToSpend) {
      alert("No tienes suficientes TP ni Monedas para este entrenamiento.");
      return;
    }

    setTp(t => Math.max(0, t - tpToSpend));
    setCoins(c => Math.max(0, c - coinsToSpend));

    setCollection(prev => prev.map(p => {
      if (updates[p.instanceId]) {
        const levels = updates[p.instanceId];
        const config = RARITY_CONFIG[p.rarity];
        const gain = config.statGain;
        let newAtk = p.atk;
        let newDef = p.def;
        let newSpe = p.spe;
        let newHp = p.hp;
        for (let i = 1; i <= levels; i++) {
          const currentLevel = p.level + i;
          const statToBoost = currentLevel % 3;
          if (statToBoost === 0) newAtk += gain;
          else if (statToBoost === 1) newDef += gain;
          else newSpe += gain;
          newHp += Math.floor(gain / 2);
        }
        const newLevel = p.level + levels;
        return {
          ...p,
          trainingLevel: p.trainingLevel + levels,
          level: newLevel,
          atk: newAtk,
          def: newDef,
          spe: newSpe,
          hp: newHp,
          maxHp: newHp,
          ovr: Math.max(p.ovr + Math.max(1, Math.floor(levels / 3)), Math.floor((newAtk + newDef + newSpe + newHp/2) / 3.5))
        };
      }
      return p;
    }));

    setHistory(prev => [`Entrenamiento múltiple completado: -${tpToSpend} TP, -${coinsToSpend} Monedas.`, ...prev].slice(0, 10));
    setShowBatchTraining(false);
    setBatchSelectedPokemon([]);
  };

  const handleUseBandita = (instanceId: string) => {
    if (banditas <= 0) return;
    const target = collection.find(p => p.instanceId === instanceId);
    if (!target || target.fatigue <= 0) return;

    setBanditas(b => b - 1);
    setCollection(prev => prev.map(p => {
      if (p.instanceId === instanceId) {
        return { ...p, fatigue: Math.max(0, p.fatigue - 50) };
      }
      return p;
    }));
    if (selectedPokemon?.instanceId === instanceId) {
      setSelectedPokemon(prev => prev ? { ...prev, fatigue: Math.max(0, prev.fatigue - 50) } : null);
    }
    setHistory(prev => [`🩹 Has usado una Bandita en ${target.name}.`, ...prev].slice(0, 10));
  };

  const handleEquipMegaStone = (instanceId: string, stoneName: string) => {
    const target = collection.find(p => p.instanceId === instanceId);
    if (!target) return;
    setCollection(prev => prev.map(p => p.instanceId === instanceId ? { ...p, megaStone: stoneName } : p));
    if (selectedPokemon?.instanceId === instanceId) {
      setSelectedPokemon(prev => prev ? { ...prev, megaStone: stoneName } : null);
    }
    setMegaStones(prev => {
      const newStones = [...prev];
      newStones.splice(newStones.indexOf(stoneName), 1);
      return newStones;
    });
    setHistory(prev => [`¡${target.name} ha equipado ${stoneName}!`, ...prev].slice(0, 10));
  };

  const handleUnequipMegaStone = (instanceId: string) => {
    const target = collection.find(p => p.instanceId === instanceId);
    if (!target || !target.megaStone) return;
    const stoneName = target.megaStone;
    setCollection(prev => prev.map(p => p.instanceId === instanceId ? { ...p, megaStone: undefined } : p));
    if (selectedPokemon?.instanceId === instanceId) {
      setSelectedPokemon(prev => prev ? { ...prev, megaStone: undefined } : null);
    }
    setMegaStones(prev => [...prev, stoneName]);
    setHistory(prev => [`¡${target.name} se ha quitado ${stoneName}!`, ...prev].slice(0, 10));
  };

  const handleEquipItem = (instanceId: string, itemId: string) => {
    setCollection(prev => prev.map(p => {
      if (p.instanceId === instanceId) {
        const oldItem = p.item;
        if (oldItem) {
          setHeldItems(prevItems => ({ ...prevItems, [oldItem]: (prevItems[oldItem] || 0) + 1 }));
        }
        setHeldItems(prevItems => ({ ...prevItems, [itemId]: Math.max(0, (prevItems[itemId] || 0) - 1) }));
        
        const updated = { ...p, item: itemId };
        if (selectedPokemon?.instanceId === instanceId) setSelectedPokemon(updated);
        return updated;
      }
      return p;
    }));
    const itemName = HELD_ITEMS.find(i => i.id === itemId)?.name || itemId;
    setHistory(prev => [`Equipaste ${itemName} a tu Pokémon.`, ...prev].slice(0, 10));
    setShowItemSelection(null);
  };

  const handleUnequipItem = (instanceId: string) => {
    setCollection(prev => prev.map(p => {
      if (p.instanceId === instanceId) {
        const oldItem = p.item;
        if (oldItem) {
          setHeldItems(prevItems => ({ ...prevItems, [oldItem]: (prevItems[oldItem] || 0) + 1 }));
        }
        const updated = { ...p, item: undefined };
        if (selectedPokemon?.instanceId === instanceId) setSelectedPokemon(updated);
        return updated;
      }
      return p;
    }));
  };

  const handleTrain = (instanceId: string) => {
    if (tp < TRAINING_COST_BASE) return;
    const target = collection.find(p => p.instanceId === instanceId);
    if (!target || target.level >= target.maxLevel) return;

    setTp(t => Math.max(0, t - TRAINING_COST_BASE));
    updateMissionProgress('train', 1);
    if (target.rarity === 'Legendary') updateMissionProgress('level_legendary', 1);
    
    setCollection(prev => prev.map(p => {
      if (p.instanceId === instanceId && p.level < p.maxLevel) {
        const newLevel = p.level + 1;
        let newAtk = p.atk;
        let newDef = p.def;
        let newSpe = p.spe;
        
        // Distribute stat gain based on rarity
        const config = RARITY_CONFIG[p.rarity];
        const gain = config.statGain;
        const statToBoost = newLevel % 3;
        if (statToBoost === 0) newAtk += gain;
        else if (statToBoost === 1) newDef += gain;
        else newSpe += gain;

        const newHp = p.hp + Math.floor(gain / 2);

        return {
          ...p,
          trainingLevel: p.trainingLevel + 1,
          level: newLevel,
          atk: newAtk,
          def: newDef,
          spe: newSpe,
          hp: newHp,
          maxHp: newHp,
          ovr: Math.max(p.ovr + 1, Math.floor((newAtk + newDef + newSpe + newHp/2) / 3.5))
        };
      }
      return p;
    }));
  };

  const handleLimitBreak = (instanceId: string) => {
    const target = collection.find(p => p.instanceId === instanceId);
    if (!target || target.limitBroken || target.level < target.maxLevel) return;
    if (coins < LIMIT_BREAK_COST_COINS || stardust < LIMIT_BREAK_COST_STARDUST) return;

    setCoins(prev => prev - LIMIT_BREAK_COST_COINS);
    setStardust(prev => prev - LIMIT_BREAK_COST_STARDUST);
    setCollection(prev => prev.map(p => {
      if (p.instanceId === instanceId) {
        return {
          ...p,
          limitBroken: true,
          maxLevel: 50
        };
      }
      return p;
    }));
    setHistory(prev => [`¡LÍMITE SUPERADO! ${target.name} ahora puede entrenar hasta nivel 50.`, ...prev].slice(0, 10));
  };

  const handleChangeMove = (instanceId: string, slotIndex: number, newMove: Move) => {
    if (tp < 100) return;
    const target = collection.find(p => p.instanceId === instanceId);
    if (!target) return;

    setTp(prev => Math.max(0, prev - 100));
    setCollection(prev => prev.map(p => {
      if (p.instanceId === instanceId) {
        const newMoves = [...p.moves].filter(Boolean); // Remove any existing holes
        if (slotIndex >= newMoves.length) {
          newMoves.push(newMove);
        } else {
          newMoves[slotIndex] = newMove;
        }
        return { ...p, moves: newMoves };
      }
      return p;
    }));
    setMoveSlotToReplace(null);
    setHistory(prev => [`Movimiento cambiado: -100 TP.`, ...prev].slice(0, 10));
  };

  const handleUpgradeFacility = (id: string) => {
    const facility = (facilities || []).find(f => f.id === id);
    if (!facility || facility.level >= facility.maxLevel) return;
    if (coins < facility.cost) return;

    setCoins(prev => prev - facility.cost);
    setFacilities(prev => prev.map(f => f.id === id ? { ...f, level: f.level + 1, cost: Math.floor(f.cost * 1.5) } : f));
  };

  const handleHireStaff = (id: string) => {
    const member = (staff || []).find(s => s.id === id);
    if (!member || member.hired) return;
    if (coins < member.cost) return;

    setCoins(prev => prev - member.cost);
    setStaff(prev => prev.map(s => s.id === id ? { ...s, hired: true } : s));
  };

  const handleHealFatigue = (instanceId: string) => {
    const pokemon = collection.find(p => p.instanceId === instanceId);
    if (!pokemon || pokemon.fatigue === 0) return;

    const medicalLevel = (facilities || []).find(f => f.id === 'medical')?.level || 1;
    const baseCost = Math.floor(pokemon.fatigue * 2);
    const discount = (medicalLevel - 1) * 0.1;
    const finalCost = Math.floor(baseCost * (1 - discount));

    if (coins < finalCost) return;

    setCoins(prev => prev - finalCost);
    setCollection(prev => prev.map(p => p.instanceId === instanceId ? { ...p, fatigue: 0 } : p));
  };

  const handleSellPokemon = (instanceId: string) => {
    const p = collection.find(item => item.instanceId === instanceId);
    if (!p) return;
    
    // Calculate sell price
    const config = RARITY_CONFIG[p.rarity];
    const sellPrice = Math.floor(100 * config.multiplier * (1 + p.level * 0.1) * (1 + p.powerLevel * 0.2) * (1 + p.trainingLevel * 0.2));
    const energyGain = Math.max(1, Math.floor(sellPrice / 500));
    
    setCoins(c => c + sellPrice);
    setEnergy(e => Math.min(100, e + energyGain));
    setCollection(prev => prev.filter(item => item.instanceId !== instanceId));
    setTeam(prev => prev.filter(id => id !== instanceId));
    setHistory(h => [`💰 Has vendido a ${p.name} por ${sellPrice} Monedas y recuperado ${energyGain} de Energía.`, ...h].slice(0, 10));
    setSelectedLabPokemonId(null);
  };

  const handleBuyMarketPokemon = (offerId: string) => {
    const offer = (marketOffers || []).find(o => o.id === offerId);
    if (!offer) return;
    if (coins < offer.cost) return;

    setCoins(c => Math.max(0, c - offer.cost));
    updateMissionProgress('spend_coins', offer.cost);
    updateMissionProgress('get_pokemon', 1);
    setCollection(prev => [...prev, offer.pokemon]);
    if (!pokedex.includes(offer.pokemon.id)) {
      setPokedex(p => [...p, offer.pokemon.id]);
    }
    setMarketOffers(prev => prev.filter(o => o.id !== offerId));
    setHistory(h => [`🛒 Has comprado a ${offer.pokemon.name} en el mercado por ${offer.cost} Monedas.`, ...h].slice(0, 10));
  };

  const handleBulkTrain = () => {
    let totalTpCost = 0;
    let totalCoinCost = 0;
    let totalLevelsGained = 0;
    let legendaryLevelsGained = 0;

    const updates = collection.map(p => {
      if (selectedForBulkTrain.includes(p.instanceId)) {
        const levelsToGain = Math.max(0, Math.min(bulkTrainTargetLevel, p.evolutionLevel || p.maxLevel) - p.level);
        if (levelsToGain > 0) {
          totalTpCost += levelsToGain * TRAINING_COST_BASE;
          totalCoinCost += levelsToGain * BULK_TRAIN_COIN_COST_PER_LEVEL;
          
          let newP = { ...p };
          for (let i = 0; i < levelsToGain; i++) {
            const nextLevel = newP.level + 1;
            const config = RARITY_CONFIG[newP.rarity];
            const gain = config.statGain;
            const statToBoost = nextLevel % 3;
            if (statToBoost === 0) newP.atk += gain;
            else if (statToBoost === 1) newP.def += gain;
            else newP.spe += gain;
            newP.hp += Math.floor(gain / 2);
            newP.level = nextLevel;
            newP.trainingLevel++;
          }
          newP.maxHp = newP.hp;
          newP.ovr = Math.floor((newP.atk + newP.def + newP.spe + newP.hp/2) / 3.5);
          
          totalLevelsGained += levelsToGain;
          if (p.rarity === 'Legendary') legendaryLevelsGained += levelsToGain;
          
          return newP;
        }
      }
      return p;
    });

    if (tp < totalTpCost || coins < totalCoinCost) return;

    setTp(t => t - totalTpCost);
    setCoins(c => c - totalCoinCost);
    setCollection(updates);
    updateMissionProgress('train', totalLevelsGained);
    if (legendaryLevelsGained > 0) updateMissionProgress('level_legendary', legendaryLevelsGained);
    updateMissionProgress('spend_coins', totalCoinCost);
    
    setHistory(h => [`🏋️ Entrenamiento masivo completado: ${totalLevelsGained} niveles subidos por ${totalCoinCost} Monedas y ${totalTpCost} TP.`, ...h].slice(0, 10));
    
    setIsBulkTrainingMode(false);
    setSelectedForBulkTrain([]);
  };

  const toggleBulkTrainSelection = (instanceId: string) => {
    setSelectedForBulkTrain(prev => 
      prev.includes(instanceId) 
        ? prev.filter(id => id !== instanceId) 
        : [...prev, instanceId]
    );
  };

  const currentEvolutionCost = Math.floor(EVOLUTION_COST * (activeEvent?.modifiers?.evolutionDiscount || 1));

  const handleEvolve = async (instanceId: string) => {
    if (coins < currentEvolutionCost) return;
    const target = collection.find(p => p.instanceId === instanceId);
    if (!target || target.powerLevel < 10) return;

    if (target.evolutions && target.evolutions.length > 0) {
      const eligible = target.evolutions.filter(evo => {
        if (evo.condition.type === 'happiness') return target.happiness >= (evo.condition.value as number);
        if (evo.condition.type === 'stone') return (Number(evolutionStones[evo.condition.value as string]) || 0) > 0;
        return false;
      });
      if (eligible.length > 0) {
        if (eligible.length === 1 && eligible[0].condition.type !== 'stone') {
          // Evolve directly if it's just happiness and only one option
          executeEvolution(target, eligible[0].id);
        } else {
          setPendingEvolution({ pokemon: target, options: eligible });
        }
        return;
      } else {
        setHistory(prev => [`❌ ${target.name} no cumple las condiciones para evolucionar.`, ...prev].slice(0, 10));
        return;
      }
    }

    // Condition: Reach evolution level from API or max level if no level evolution
    const evolutionRequirement = target.evolutionLevel || target.maxLevel;
    if (target.level < evolutionRequirement) return;

    const currentIndex = target.evolutionChain?.indexOf(target.id) ?? -1;
    if (currentIndex === -1 || currentIndex >= (target.evolutionChain?.length || 0) - 1) return;

    const nextId = target.evolutionChain![currentIndex + 1];
    executeEvolution(target, nextId);
  };

  const executeEvolution = async (target: PokemonCard, nextId: number, usedStone?: string) => {
    const nextBase = POKEDEX_BASE.find(b => b.id === nextId);
    if (!nextBase) return;

    if (usedStone) {
      setEvolutionStones(prev => ({ ...prev, [usedStone]: Math.max(0, (prev[usedStone] || 0) - 1) }));
    }

    const nextEvolutionLevel = await fetchEvolutionLevel(nextId);

    setCoins(c => Math.max(0, c - currentEvolutionCost));
    updateMissionProgress('spend_coins', currentEvolutionCost);
    updateMissionProgress('evolve', 1);
    if (!pokedex.includes(nextId)) setPokedex(px => [...px, nextId]);

    const config = RARITY_CONFIG[target.rarity];
    const evoGain = config.statGain * 10;

    const evolvedPokemon: PokemonCard = {
      ...target,
      ...nextBase,
      evolutionLevel: nextEvolutionLevel,
      powerLevel: 0,
      trainingLevel: 0,
      atk: target.atk + evoGain,
      def: target.def + evoGain,
      spe: target.spe + evoGain,
      hp: target.hp + evoGain,
      maxHp: target.hp + evoGain,
      ovr: Math.max(target.ovr + 5, Math.floor((target.atk + evoGain + target.def + evoGain + target.spe + evoGain + (target.hp + evoGain)/2) / 3.5)),
      isEvolved: true
    };

    setEvolvingPokemon({ from: target, to: evolvedPokemon });

    // Sponsor progress: Evolve pokemon
    if (activeSponsor?.id === 'silph_co') {
      updateSponsorProgress(1);
    }

    setCollection(prev => prev.map(p => {
      if (p.instanceId === target.instanceId) {
        return evolvedPokemon;
      }
      return p;
    }));
    setHistory(prev => [`¡Tu Pokémon ha evolucionado!`, ...prev].slice(0, 10));
    setPendingEvolution(null);
  };

  const toggleTeamMember = (instanceId: string) => {
    const pokemon = collection.find(p => p.instanceId === instanceId);
    if (pokemon?.isInjured) {
      setHistory(prev => [`❌ ${pokemon.name} está lesionado y no puede jugar.`, ...prev].slice(0, 10));
      return;
    }

    if (team.includes(instanceId)) {
      setTeam(prev => prev.filter(id => id !== instanceId));
    } else if (team.length < 6) {
      setTeam(prev => [...prev, instanceId]);
    }
  };

  const autoSelectBestTeam = () => {
    const bestPokemon = [...collection]
      .filter(p => !p.isInjured)
      .sort((a, b) => b.ovr - a.ovr)
      .slice(0, 6)
      .map(p => p.instanceId);
    setTeam(bestPokemon);
    setHistory(prev => [`✅ Equipo optimizado automáticamente.`, ...prev].slice(0, 10));
  };

  const [isGeneratingBattle, setIsGeneratingBattle] = useState(false);
  const [pendingEvolution, setPendingEvolution] = useState<{ pokemon: PokemonCard, options: { id: number, condition: any }[] } | null>(null);

  const generateRivalTeam = async (rivalOvr: number, matchId?: string) => {
    const rivalTeamPromises = [...Array(6)].map(async () => {
      let base: PokemonBase;
      const targetLevel = Math.max(1, Math.floor(rivalOvr / 10) + Math.floor(Math.random() * 5) - 2);
      
      // Filter POKEDEX_BASE to avoid low-level legendaries/mythicals
      // Legendaries only appear if level >= 50, Mythicals if level >= 40
      const availableBases = POKEDEX_BASE.filter(p => {
        if (p.isLegendary && targetLevel < 50) return false;
        if (p.isMythical && targetLevel < 40) return false;
        return true;
      });

      const pool = availableBases.length > 0 ? availableBases : POKEDEX_BASE;

      if (matchId === 'event' && activeEvent?.modifiers?.typeBoost) {
        const type = activeEvent.modifiers.typeBoost.type;
        const filteredBase = pool.filter(p => p.types.includes(type));
        base = filteredBase.length > 0 
          ? filteredBase[Math.floor(Math.random() * filteredBase.length)]
          : pool[Math.floor(Math.random() * pool.length)];
      } else {
        base = pool[Math.floor(Math.random() * pool.length)];
      }
      
      const academyLevel = (facilities || []).find(f => f.id === 'academy')?.level || 1;
      const baseRarity = getPokemonRarity(base);
      // For non-legendary/mythical, maintain the 20% chance of being Rare if it was Common
      const rarity = (baseRarity === 'Common' && Math.random() > 0.8) ? 'Rare' : baseRarity;
      
      const p = await generatePokemon(base, rarity, targetLevel, 1, academyLevel);
      
      const factor = rivalOvr / p.ovr;
      p.atk = Math.floor(p.atk * factor);
      p.def = Math.floor(p.def * factor);
      p.spe = Math.floor(p.spe * factor);
      p.hp = Math.floor(p.hp * factor);
      p.maxHp = p.hp;
      p.ovr = Math.floor((p.atk + p.def + p.spe + p.hp/2) / 3.5);
      return { p, hp: p.hp, maxHp: p.hp };
    });

    return await Promise.all(rivalTeamPromises);
  };

  const handleMatchPreview = async (matchId: string) => {
    setMatchPreview(matchId);
    setIsGeneratingPreview(true);
    
    try {
      let rivalTeamInfo: any;
      let rivalOvr = Math.max(1, maxTeamOvr - 5 + Math.floor(Math.random() * 10)); // Narrower range for more "similar" power

      if (matchId === 'event' && activeEvent) {
        rivalTeamInfo = { 
          id: 'event_rival', 
          name: `Guardián del ${activeEvent.title}`, 
          logo: activeEvent.icon, 
          ovr: Math.floor(maxTeamOvr * 1.15),
          points: 0, played: 0, won: 0, drawn: 0, lost: 0
        };
        rivalOvr = rivalTeamInfo.ovr;
      } else if (matchId.startsWith('gym-')) {
        const gymId = matchId.split('-')[1];
        const gym = GYMS.find(g => g.id === gymId);
        if (gym) {
          rivalTeamInfo = {
            id: matchId,
            name: gym.name,
            logo: '🏅',
            ovr: gym.level * 10,
            points: 0, played: 0, won: 0, drawn: 0, lost: 0
          };
          rivalOvr = rivalTeamInfo.ovr;
        }
      } else {
        const allMatches = [...schedule, ...tournamentBracket.quarters, ...tournamentBracket.semis, tournamentBracket.final].filter(Boolean) as Match[];
        const match = allMatches.find(m => m.id === matchId);
        if (match) {
          const rivalId = match.homeTeamId === 'player' ? match.awayTeamId : match.homeTeamId;
          rivalTeamInfo = getTeamInfo(rivalId);
          rivalOvr = rivalTeamInfo?.ovr || rivalOvr;
        }
      }

      setPreviewRivalInfo(rivalTeamInfo);
      const team = await generateRivalTeam(rivalOvr, matchId);
      setPreviewRivalTeam(team);
    } catch (error) {
      console.error("Error generating match preview:", error);
      setHistory(prev => ["❌ Error al analizar el rival. Inténtalo de nuevo.", ...prev].slice(0, 10));
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const getTeamInfo = (id: string) => {
    if (id === 'player') return { id: 'player', name: teamName, logo: teamLogo, ovr: teamOvr, points: 0, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 };
    if (isChampionshipTournament) {
      return CHAMPIONSHIP_TEAMS.find(t => t.id === id);
    }
    return leagueTeams.find(t => t.id === id);
  };

  const startBattle = async (matchId?: string) => {
    if (teamMembers.length === 0) return;
    
    if (energy < 1) {
      setHistory(prev => ["⚡ No tienes suficiente energía para jugar el partido (Requiere 1).", ...prev].slice(0, 10));
      return;
    }
    setEnergy(e => e - 1);

    battleEndedRef.current = false;
    setIsGeneratingBattle(true);
    
    try {
      let rivalTeam: {p: PokemonCard, hp: number, maxHp: number}[];
      let rivalTeamInfo: any;
      let rivalOvr = 0;

    if (previewRivalTeam && previewRivalInfo && matchPreview === matchId) {
      rivalTeam = previewRivalTeam;
      rivalTeamInfo = previewRivalInfo;
      rivalOvr = rivalTeamInfo.ovr;
    } else {
      rivalOvr = Math.max(1, maxTeamOvr - 5 + Math.floor(Math.random() * 10));

      if (matchId === 'event' && activeEvent) {
        rivalTeamInfo = { 
          id: 'event_rival', 
          name: `Guardián del ${activeEvent.title}`, 
          logo: activeEvent.icon, 
          ovr: Math.floor(maxTeamOvr * 1.15),
          points: 0, played: 0, won: 0, drawn: 0, lost: 0
        };
        rivalOvr = rivalTeamInfo.ovr;
      } else if (matchId?.startsWith('gym-')) {
        const gymId = matchId.split('-')[1];
        const gym = GYMS.find(g => g.id === gymId);
        if (gym) {
          rivalTeamInfo = {
            id: matchId,
            name: gym.name,
            logo: '🏅',
            ovr: gym.level * 10,
            points: 0, played: 0, won: 0, drawn: 0, lost: 0
          };
          rivalOvr = rivalTeamInfo.ovr;
        }
      } else if (matchId) {
        const allMatches = [...schedule, ...tournamentBracket.quarters, ...tournamentBracket.semis, tournamentBracket.final].filter(Boolean) as Match[];
        const match = allMatches.find(m => m.id === matchId);
        if (match) {
          const rivalId = match.homeTeamId === 'player' ? match.awayTeamId : match.homeTeamId;
          rivalTeamInfo = getTeamInfo(rivalId);
          rivalOvr = rivalTeamInfo?.ovr || rivalOvr;
        }
      }
      rivalTeam = await generateRivalTeam(rivalOvr, matchId);
    }

    const randomWeather = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)].id;
    setWeather(randomWeather);
    
    setArenaBg(ARENA_BACKGROUNDS[Math.floor(Math.random() * ARENA_BACKGROUNDS.length)]);
    const hpMultiplier = isTournamentMode && tournamentRule === 'Resistencia Extrema' ? 2 : 1;
    
    setBattleData({
      matchId,
      rivalName: rivalTeamInfo?.name || 'Rival',
      rivalLogo: rivalTeamInfo?.logo || '⚔️',
      playerTeam: teamMembers.map(p => {
        const fatiguePenalty = p.fatigue > 30 ? Math.floor((p.fatigue - 30) / 2) : 0;
        const effectiveOvr = Math.max(1, p.ovr + teamSynergies.bonus - fatiguePenalty);
        const factor = p.ovr > 0 ? effectiveOvr / p.ovr : 1;
        
        const finalHp = Math.floor(p.hp * factor);
        
        return { 
          p: { 
            ...p, 
            ovr: effectiveOvr,
            atk: Math.floor(p.atk * factor),
            def: Math.floor(p.def * factor),
            spe: Math.floor(p.spe * factor),
            hp: finalHp,
            maxHp: finalHp
          }, 
          hp: finalHp * hpMultiplier, 
          maxHp: finalHp * hpMultiplier 
        };
      }),
      rivalTeam: rivalTeam.map(r => ({ ...r, hp: r.hp * hpMultiplier, maxHp: r.maxHp * hpMultiplier })),
      playerIdx: 0,
      rivalIdx: 0,
      log: [`¡Comienza el combate contra ${rivalTeamInfo?.name || 'Rival'} (Poder ${rivalOvr})!`],
      isAuto: false,
      speed: globalBattleSpeed,
      turn: 'player',
      rivalOvr,
      attackingSide: null,
      hitSide: null,
      playerStats: teamMembers.reduce((acc, p) => ({ ...acc, [p.instanceId]: { damageDealt: 0, fainted: false } }), {}),
      selectedMove: null,
      showMoves: false,
      showTeam: false,
      momentum: 0,
      coachBuffs: { atk: 1, def: 1 }
    });
    setGameState('battle');
    } catch (error) {
      console.error("Error starting battle:", error);
      setHistory(prev => ["❌ Error al iniciar el combate. Inténtalo de nuevo.", ...prev].slice(0, 10));
      setEnergy(e => Math.min(100, e + 1)); // Refund energy
    } finally {
      setIsGeneratingBattle(false);
    }
  };

  // Sync teamName and teamLogo with leagueTeams
  useEffect(() => {
    setLeagueTeams(prev => prev.map(t => t.id === 'player' ? { ...t, name: teamName, logo: teamLogo } : t));
  }, [teamName, teamLogo]);

  const stopSimulation = () => {
    stopSimulationRef.current = true;
    setSimulationState(prev => prev ? { ...prev, isStopping: true } : null);
  };

  const simulateMatchVisual = async (matchId: string, skipRewardsAndFatigue: boolean = false, tickMs: number = 100) => {
    // We need to get the latest schedule and leagueTeams from state to avoid stale closures,
    // but since we only read ovr and name which don't change during simulation, it's fine.
    // However, to be safe, we can use the functional update pattern to get the latest state if needed,
    // but for now, we'll just use the closure variables.
    const match = schedule.find(m => m.id === matchId);
    if (!match || match.played) return;

    const home = getTeamInfo(match.homeTeamId);
    const away = getTeamInfo(match.awayTeamId);
    if (!home || !away) return;

    const homeOvr = home.id === 'player' ? teamOvr : home.ovr;
    const awayOvr = away.id === 'player' ? teamOvr : away.ovr;

    const winProb = homeOvr / (homeOvr + awayOvr);
    const roll = Math.random();

    let finalHomeGoals = 0;
    let finalAwayGoals = 0;

    if (roll < winProb - 0.1) {
      finalHomeGoals = Math.floor(Math.random() * 4);
      finalAwayGoals = Math.floor(Math.random() * finalHomeGoals);
    } else if (roll < winProb + 0.1) {
      finalHomeGoals = Math.floor(Math.random() * 2);
      finalAwayGoals = finalHomeGoals;
    } else {
      finalAwayGoals = Math.floor(Math.random() * 4);
      finalHomeGoals = Math.floor(Math.random() * finalAwayGoals);
    }

    setSimulationState(prev => prev ? {
      ...prev,
      currentMatch: {
        homeTeam: { name: home.id === 'player' ? teamName : home.name, ovr: homeOvr, logo: home.id === 'player' ? teamLogo : home.logo },
        awayTeam: { name: away.id === 'player' ? teamName : away.name, ovr: awayOvr, logo: away.id === 'player' ? teamLogo : away.logo },
        homeScore: 0,
        awayScore: 0
      }
    } : null);

    const totalGoals = finalHomeGoals + finalAwayGoals;
    let currentHome = 0;
    let currentAway = 0;

    if (totalGoals > 0) {
      for (let i = 0; i < totalGoals; i++) {
        if (stopSimulationRef.current) break;
        await new Promise(resolve => setTimeout(resolve, tickMs));
        
        if (currentHome < finalHomeGoals && currentAway < finalAwayGoals) {
          if (Math.random() > 0.5) currentHome++;
          else currentAway++;
        } else if (currentHome < finalHomeGoals) {
          currentHome++;
        } else {
          currentAway++;
        }

        setSimulationState(prev => prev ? {
          ...prev,
          currentMatch: {
            ...prev.currentMatch!,
            homeScore: currentHome,
            awayScore: currentAway
          }
        } : null);
      }
    }

    if (!stopSimulationRef.current) {
      await new Promise(resolve => setTimeout(resolve, tickMs * 2));
    }

    updateLeagueStats(matchId, finalHomeGoals, finalAwayGoals, skipRewardsAndFatigue);
  };

  const simulateMatchInstant = (matchId: string, skipRewardsAndFatigue: boolean = false) => {
    const match = schedule.find(m => m.id === matchId);
    if (!match || match.played) return;

    const home = getTeamInfo(match.homeTeamId);
    const away = getTeamInfo(match.awayTeamId);
    if (!home || !away) return;

    const homeOvr = home.id === 'player' ? teamOvr : home.ovr;
    const awayOvr = away.id === 'player' ? teamOvr : away.ovr;

    const winProb = homeOvr / (homeOvr + awayOvr);
    const roll = Math.random();

    let homeGoals = 0;
    let awayGoals = 0;

    if (roll < winProb - 0.1) {
      homeGoals = Math.floor(Math.random() * 4);
      awayGoals = Math.floor(Math.random() * homeGoals);
    } else if (roll < winProb + 0.1) {
      homeGoals = Math.floor(Math.random() * 2);
      awayGoals = homeGoals;
    } else {
      awayGoals = Math.floor(Math.random() * 4);
      homeGoals = Math.floor(Math.random() * awayGoals);
    }

    updateLeagueStats(matchId, homeGoals, awayGoals, skipRewardsAndFatigue);
  };

  const updateLeagueStats = (matchId: string, homeGoals: number, awayGoals: number, skipRewardsAndFatigue: boolean = false) => {
    setSchedule(prev => prev.map(m => m.id === matchId ? { ...m, played: true, homeScore: homeGoals, awayScore: awayGoals } : m));
    
    const match = schedule.find(m => m.id === matchId);
    if (!match) return;

    setLeagueTeams(prev => prev.map(t => {
      if (t.id === match.homeTeamId) {
        const won = homeGoals > awayGoals;
        const drawn = homeGoals === awayGoals;
        const lost = homeGoals < awayGoals;
        return {
          ...t,
          played: t.played + 1,
          won: t.won + (won ? 1 : 0),
          drawn: t.drawn + (drawn ? 1 : 0),
          lost: t.lost + (lost ? 1 : 0),
          points: t.points + (won ? 3 : drawn ? 1 : 0),
          goalsFor: t.goalsFor + homeGoals,
          goalsAgainst: t.goalsAgainst + awayGoals
        };
      }
      if (t.id === match.awayTeamId) {
        const won = awayGoals > homeGoals;
        const drawn = awayGoals === homeGoals;
        const lost = awayGoals < homeGoals;
        return {
          ...t,
          played: t.played + 1,
          won: t.won + (won ? 1 : 0),
          drawn: t.drawn + (drawn ? 1 : 0),
          lost: t.lost + (lost ? 1 : 0),
          points: t.points + (won ? 3 : drawn ? 1 : 0),
          goalsFor: t.goalsFor + awayGoals,
          goalsAgainst: t.goalsAgainst + homeGoals
        };
      }
      return t;
    }));

    // Rewards only if player was involved
    if (!skipRewardsAndFatigue && (match.homeTeamId === 'player' || match.awayTeamId === 'player')) {
      const isHome = match.homeTeamId === 'player';
      const playerGoals = isHome ? homeGoals : awayGoals;
      const rivalGoals = isHome ? awayGoals : homeGoals;
      
      const coinReward = (playerGoals > rivalGoals ? 150 : playerGoals === rivalGoals ? 75 : 25) + (leagueLevel * 10);
      const stardustReward = (playerGoals > rivalGoals ? 50 : 25) + (leagueLevel * 5);
      const tpReward = (playerGoals > rivalGoals ? 75 : 35) + (leagueLevel * 8);
      
      setCoins(prev => prev + coinReward);
      setStardust(prev => prev + stardustReward);
      setTp(prev => prev + tpReward);
      setTotalMatches(prev => prev + 1);
      setHistory(prev => [`Resultado Liga: ${playerGoals}-${rivalGoals}. Ganaste ${coinReward} Monedas, ${stardustReward} Polvos y ${tpReward} TP.`, ...prev].slice(0, 10));

      // Update fatigue and injuries for simulated match
      setCollection(prev => {
        const newCollection = prev.map(p => {
          let newFatigue = p.fatigue;
          let isInjured = p.isInjured;
          let injuryWeeks = p.injuryWeeks;

          if (isInjured) {
            injuryWeeks -= 1;
            if (injuryWeeks <= 0) {
              isInjured = false;
              injuryWeeks = 0;
              setHistory(h => [`✅ ¡${p.name} se ha recuperado de su lesión!`, ...h].slice(0, 10));
            }
          }

          if (team.includes(p.instanceId)) {
            newFatigue = Math.min(100, p.fatigue + 15); // Less fatigue than playing manually
            if (!isInjured && newFatigue > 70) {
              if (Math.random() < 0.1) { // 10% chance of injury if highly fatigued
                isInjured = true;
                injuryWeeks = 1 + Math.floor(Math.random() * 2);
                setHistory(h => [`⚠️ ¡${p.name} se ha lesionado por ${injuryWeeks} semanas!`, ...h].slice(0, 10));
              }
            }
            return { ...p, fatigue: newFatigue, isInjured, injuryWeeks, matchesPlayed: (p.matchesPlayed || 0) + 1 };
          } else {
            return { ...p, fatigue: Math.max(0, p.fatigue - 15), isInjured, injuryWeeks };
          }
        });

        // Remove newly injured Pokémon from the team
        setTeam(currentTeam => currentTeam.filter(id => {
          const p = newCollection.find(poke => poke.instanceId === id);
          return p && !p.isInjured;
        }));

        return newCollection;
      });
    }
  };

  const simulateFullSeason = async () => {
    if (isTournamentMode) return;
    
    // Calculate required energy
    const remainingWeeks = 15 - currentWeek + 1;
    const requiredEnergy = remainingWeeks * 1;
    
    if (energy < requiredEnergy) {
      setHistory(prev => [`⚡ No tienes suficiente energía para simular el resto de la temporada (Requiere ${requiredEnergy}).`, ...prev].slice(0, 10));
      return;
    }
    
    setEnergy(e => e - requiredEnergy);
    setIsSimulating(true);
    stopSimulationRef.current = false;
    
    const unplayedMatches = schedule.filter(m => m.week >= currentWeek && m.week <= 15 && !m.played);
    
    setSimulationState({
      isActive: true,
      type: 'season',
      currentMatchIndex: 0,
      totalMatches: unplayedMatches.length,
      currentMatch: null,
      isStopping: false
    });

    let lastWeek = currentWeek;
    for (let i = 0; i < unplayedMatches.length; i++) {
      if (stopSimulationRef.current) break;
      const m = unplayedMatches[i];
      if (m.week > lastWeek) {
        setCurrentWeek(m.week);
        lastWeek = m.week;
      }
      setSimulationState(prev => prev ? { ...prev, currentMatchIndex: i + 1 } : null);
      await simulateMatchVisual(m.id, false, 20); // Faster tick for full season
    }
    
    if (!stopSimulationRef.current) {
      setCurrentWeek(16);
      startTournament();
    }
    
    setSimulationState(null);
    setIsSimulating(false);
  };

  const startTournament = () => {
    const topTeams = [...leagueTeams].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)).slice(0, 8);
    
    const quarters: Match[] = [
      { id: 'quarter-1', homeTeamId: topTeams[0].id, awayTeamId: topTeams[7].id, played: false, week: 100 },
      { id: 'quarter-2', homeTeamId: topTeams[3].id, awayTeamId: topTeams[4].id, played: false, week: 100 },
      { id: 'quarter-3', homeTeamId: topTeams[1].id, awayTeamId: topTeams[6].id, played: false, week: 100 },
      { id: 'quarter-4', homeTeamId: topTeams[2].id, awayTeamId: topTeams[5].id, played: false, week: 100 }
    ];
    
    const rules = ['Muerte Súbita', 'Resistencia Extrema', 'Poder Duplicado', 'Normal'];
    const randomRule = rules[Math.floor(Math.random() * rules.length)];
    
    setTournamentRule(randomRule);
    setTournamentBracket({ quarters, semis: [], final: null, winner: null });
    setIsTournamentMode(true);
    setTournamentPlayedThisSeason(true);
    setHistory(prev => [`¡Comienza el Gran Torneo de Campeones (8 Equipos)! Regla Especial: ${randomRule}`, ...prev].slice(0, 10));
  };

  const startChampionshipTournament = () => {
    const quarters: Match[] = [
      { id: 'quarter-1', homeTeamId: 'player', awayTeamId: 'champ-1', played: false, week: 100 },
      { id: 'quarter-2', homeTeamId: 'champ-2', awayTeamId: 'champ-3', played: false, week: 100 },
      { id: 'quarter-3', homeTeamId: 'champ-4', awayTeamId: 'champ-5', played: false, week: 100 },
      { id: 'quarter-4', homeTeamId: 'champ-6', awayTeamId: 'champ-7', played: false, week: 100 }
    ];
    
    setTournamentRule('Normal');
    setTournamentBracket({ quarters, semis: [], final: null, winner: null });
    setIsTournamentMode(true);
    setIsChampionshipTournament(true);
    setHistory(prev => [`¡Comienza el Campeonato Final!`, ...prev].slice(0, 10));
  };

  const simulateTournamentMatch = async (matchId: string, manualHomeGoals?: number, manualAwayGoals?: number) => {
    const match = [...tournamentBracket.quarters, ...tournamentBracket.semis, tournamentBracket.final].find(m => m?.id === matchId);
    if (!match || match.played) return;

    const home = getTeamInfo(match.homeTeamId);
    const away = getTeamInfo(match.awayTeamId);
    if (!home || !away) return;

    let homeGoals = manualHomeGoals ?? 0;
    let awayGoals = manualAwayGoals ?? 0;

    if (manualHomeGoals === undefined || manualAwayGoals === undefined) {
      const homeOvr = home.id === 'player' ? teamOvr : home.ovr;
      const awayOvr = away.id === 'player' ? teamOvr : away.ovr;

      const winProb = homeOvr / (homeOvr + awayOvr);
      const roll = Math.random();

      if (roll < winProb) {
        homeGoals = Math.floor(Math.random() * 3) + 1;
        awayGoals = Math.floor(Math.random() * homeGoals);
      } else {
        awayGoals = Math.floor(Math.random() * 3) + 1;
        homeGoals = Math.floor(Math.random() * awayGoals);
      }

      // Handle Draws in Knockout
      if (homeGoals === awayGoals) {
        if (Math.random() > 0.5) homeGoals++; else awayGoals++;
      }
    }

    const updatedMatch = { ...match, played: true, homeScore: homeGoals, awayScore: awayGoals };

    if (matchId.startsWith('quarter')) {
      const newQuarters = tournamentBracket.quarters.map(m => m.id === matchId ? updatedMatch : m);
      setTournamentBracket(prev => ({ ...prev, quarters: newQuarters }));

      if (newQuarters.every(m => m.played)) {
        const winner1 = newQuarters[0].homeScore! > newQuarters[0].awayScore! ? newQuarters[0].homeTeamId : newQuarters[0].awayTeamId;
        const winner2 = newQuarters[1].homeScore! > newQuarters[1].awayScore! ? newQuarters[1].homeTeamId : newQuarters[1].awayTeamId;
        const winner3 = newQuarters[2].homeScore! > newQuarters[2].awayScore! ? newQuarters[2].homeTeamId : newQuarters[2].awayTeamId;
        const winner4 = newQuarters[3].homeScore! > newQuarters[3].awayScore! ? newQuarters[3].homeTeamId : newQuarters[3].awayTeamId;
        
        setTournamentBracket(prev => ({
          ...prev,
          semis: [
            { id: 'semi-1', homeTeamId: winner1, awayTeamId: winner2, played: false, week: 101 },
            { id: 'semi-2', homeTeamId: winner3, awayTeamId: winner4, played: false, week: 101 }
          ]
        }));
      }
    } else if (matchId.startsWith('semi')) {
      const newSemis = tournamentBracket.semis.map(m => m.id === matchId ? updatedMatch : m);
      setTournamentBracket(prev => ({ ...prev, semis: newSemis }));

      if (newSemis.every(m => m.played)) {
        const winner1 = newSemis[0].homeScore! > newSemis[0].awayScore! ? newSemis[0].homeTeamId : newSemis[0].awayTeamId;
        const winner2 = newSemis[1].homeScore! > newSemis[1].awayScore! ? newSemis[1].homeTeamId : newSemis[1].awayTeamId;
        setTournamentBracket(prev => ({
          ...prev,
          final: { id: 'final', homeTeamId: winner1, awayTeamId: winner2, played: false, week: 102 }
        }));
      }
    } else if (matchId === 'final') {
      const winnerId = homeGoals > awayGoals ? match.homeTeamId : match.awayTeamId;
      setTournamentBracket(prev => ({ ...prev, final: updatedMatch, winner: winnerId }));
      if (winnerId === 'player') {
        if (isChampionshipTournament) {
          // HUGE REWARDS FOR CHAMPIONSHIP
          setCoins(prev => prev + 50000);
          setStardust(prev => prev + 10000);
          setTp(prev => prev + 5000);
          updateMissionProgress('win_championship', 1);
          setCelebration({type: 'win', message: '¡MAESTRO POKÉMON!'});
          setHistory(prev => [
            `👑 ¡HAS DERROTADO AL ALTO MANDO Y ERES EL NUEVO CAMPEÓN!`,
            `🏆 Recompensa: +50000 Monedas, +10000 Polvos, +5000 TP.`,
            ...prev
          ].slice(0, 10));
        } else {
          // HUGE REWARDS FOR REGULAR TOURNAMENT
          setCoins(prev => prev + 15000);
          setStardust(prev => prev + 5000);
          setTp(prev => prev + 3000);
          setCelebration({type: 'win', message: '¡CAMPEÓN DEL TORNEO!'});
          setHistory(prev => [
            `🏆 ¡CAMPEÓN DEL TORNEO! +15000 Monedas, +5000 Polvos, +3000 TP.`,
            `🎁 ¡Has recibido 3 Pokémon de Élite como recompensa!`,
            ...prev
          ].slice(0, 10));
        }
        
        // Give 3 random high-rarity pokemon as "Packs"
        const newPokemonList: PokemonCard[] = [];
        for (let i = 0; i < 3; i++) {
          const roll = Math.random();
          let rarity: Rarity = 'Common';
          if (roll < 0.15) rarity = 'Legendary';
          else if (roll < 0.45) rarity = 'Mythical';
          else if (roll < 0.8) rarity = 'Rare';
          
          const base = getRandomBaseForLevel(1, rarity);
          const newP = await generatePokemon(base, rarity, 1);
          newPokemonList.push(newP);
          if (!pokedex.includes(base.id)) setPokedex(prev => [...prev, base.id]);
        }
        
        setCollection(prev => [...prev, ...newPokemonList]);
      } else {
        setHistory(prev => [`El campeón del torneo es ${getTeamInfo(winnerId)?.name}`, ...prev].slice(0, 10));
      }
    }
  };

  const simulateWeek = async () => {
    const unplayedMatches = schedule.filter(m => m.week === currentWeek && !m.played);
    const hasPlayerMatch = unplayedMatches.some(m => m.homeTeamId === 'player' || m.awayTeamId === 'player');
    
    if (hasPlayerMatch) {
      if (energy < 1) {
        setHistory(prev => ["⚡ No tienes suficiente energía para simular el partido (Requiere 1).", ...prev].slice(0, 10));
        return;
      }
      setEnergy(e => e - 1);
      updateMissionProgress('spend_energy', 1);
    }

    setIsSimulating(true);
    stopSimulationRef.current = false;
    setSimulationState({
      isActive: true,
      type: 'week',
      currentMatchIndex: 0,
      totalMatches: unplayedMatches.length,
      currentMatch: null,
      isStopping: false
    });

    for (let i = 0; i < unplayedMatches.length; i++) {
      if (stopSimulationRef.current) break;
      const m = unplayedMatches[i];
      setSimulationState(prev => prev ? { ...prev, currentMatchIndex: i + 1 } : null);
      await simulateMatchVisual(m.id, false, 100); // 100ms tick
    }
    
    setSimulationState(null);
    setIsSimulating(false);

    if (!stopSimulationRef.current) {
      if (currentWeek < 15) {
        setCurrentWeek(prev => prev + 1);
      } else {
        startTournament();
      }
    }
  };

  const applyAbilityEffects = (attacker: any, defender: any, baseDamage: number, move: Move) => {
    let damage = baseDamage;
    let log = '';

    const ability = attacker.p.ability;
    const defAbility = defender.p.ability;
    const hpPercent = attacker.hp / attacker.maxHp;
    const defHpPercent = defender.hp / defender.maxHp;

    // Attacker abilities
    if ((ability === 'Overgrow' && move.type === 'Grass') || 
        (ability === 'Blaze' && move.type === 'Fire') || 
        (ability === 'Torrent' && move.type === 'Water') ||
        (ability === 'Swarm' && move.type === 'Bug')) {
      if (hpPercent < 0.33) {
        damage *= 1.5;
        log = `¡${attacker.p.name} activó ${ability}! Al tener menos del 33% de PS, la potencia de sus ataques de tipo ${move.type} aumentó un 50% según datos de la PokéAPI.`;
      }
    } else if (ability === 'Adaptability' && attacker.p.types?.includes(move.type)) {
      damage *= 1.33; // STAB goes from 1.5 to 2.0 (approx 1.33x boost to the 1.5x)
      log = `¡${attacker.p.name} activó Adaptabilidad! El bonus por afinidad de tipo (STAB) aumentó de 1.5x a 2.0x potencia.`;
    } else if (ability === 'Guts' && attacker.p.status && attacker.p.status !== 'None' && move.category === 'Physical') {
      damage *= 1.5;
      log = `¡${attacker.p.name} activó Agallas! Su ataque físico aumentó un 50% al estar bajo un estado alterado (${attacker.p.status}).`;
    } else if (ability === 'Technician' && move.power <= 60) {
      damage *= 1.5;
      log = `¡${attacker.p.name} activó Experto! La potencia de ${move.name} aumentó un 50% por ser un movimiento de base baja (<= 60).`;
    } else if (ability === 'Huge Power' || ability === 'Pure Power') {
      if (move.category === 'Physical') {
        damage *= 2.0;
        log = `¡${attacker.p.name} activó ${ability}! Su estadística de Ataque se ha duplicado literalmente en combate.`;
      }
    } else if (ability === 'Iron Fist' && move.name.toLowerCase().includes('punch')) {
      damage *= 1.2;
      log = `¡${attacker.p.name} activó Puño Férreo! Los movimientos basados en puñetazos reciben un incremento del 20% en potencia.`;
    } else if (ability === 'Strong Jaw' && move.name.toLowerCase().includes('bite')) {
      damage *= 1.5;
      log = `¡${attacker.p.name} activó Mandíbula Fuerte! Los movimientos de mordisco reciben un incremento del 50% en potencia.`;
    } else if (ability === 'Mega Launcher' && move.name.toLowerCase().includes('pulse')) {
      damage *= 1.5;
      log = `¡${attacker.p.name} activó Megadisparador! Los movimientos de pulso y aura reciben un incremento del 50% en potencia.`;
    } else if (ability === 'Tough Claws' && move.category === 'Physical') {
      damage *= 1.3;
      log = `¡${attacker.p.name} activó Garra Dura! Los ataques de contacto físico directo aumentan su potencia un 30%.`;
    } else if (ability === 'Sheer Force' && move.statusEffect && move.statusEffect !== 'None') {
      damage *= 1.3;
      log = `¡${attacker.p.name} activó Potencia Bruta! Elimina los efectos secundarios del movimiento para ganar un 30% de daño extra.`;
    } else if (ability === 'Sniper' && battleData?.isCritical) {
      damage *= 1.5; // Critical damage is 1.5x, Sniper makes it 2.25x (1.5 * 1.5)
      log = `¡${attacker.p.name} activó Francotirador! El daño de los golpes críticos aumenta de 1.5x a 2.25x.`;
    } else if (ability === 'Solar Power' && weather === 'sun' && move.category === 'Special') {
      damage *= 1.5;
      log = `¡${attacker.p.name} activó Poder Solar! Bajo el sol, su Ataque Especial aumenta un 50% a cambio de PS.`;
    } else if (ability === 'Sharpness' && (move.name.toLowerCase().includes('slash') || move.name.toLowerCase().includes('cutter') || move.name.toLowerCase().includes('blade'))) {
      damage *= 1.5;
      log = `¡${attacker.p.name} activó Agudeza! Los movimientos de corte y tajo aumentan su potencia un 50%.`;
    } else if (ability === 'Static' && Math.random() < 0.3 && move.category === 'Physical') {
      damage *= 1.2;
      log = `¡La Electricidad Estática de ${attacker.p.name} generó una descarga que potenció el ataque un 20%!`;
    }

    // Defender abilities
    if (defAbility === 'Levitate' && move.type === 'Ground') {
      damage = 0;
      log = `¡${defender.p.name} levita! Según la PokéAPI, los Pokémon con Levitación son inmunes a ataques de tipo Tierra.`;
    } else if (defAbility === 'Flash Fire' && move.type === 'Fire') {
      damage = 0;
      log = `¡${defender.p.name} activó Absorbe Fuego! Es inmune al fuego y sus propios ataques ígneos se potenciarán.`;
    } else if (defAbility === 'Water Absorb' && move.type === 'Water') {
      damage = 0;
      log = `¡${defender.p.name} activó Absorbe Agua! Recupera un 25% de PS máximos al recibir ataques de tipo Agua.`;
    } else if (defAbility === 'Volt Absorb' && move.type === 'Electric') {
      damage = 0;
      log = `¡${defender.p.name} activó Absorbe Electricidad! Recupera un 25% de PS máximos al recibir ataques de tipo Eléctrico.`;
    } else if (defAbility === 'Intimidate') {
      damage *= 0.8;
      log = `¡La Intimidación de ${defender.p.name} bajó el Ataque de ${attacker.p.name} un nivel (-20% daño).`;
    } else if (defAbility === 'Sturdy' && defHpPercent === 1 && damage >= defender.hp) {
      damage = Math.max(0, defender.hp - 1);
      log = `¡${defender.p.name} activó Robustez! Al tener PS al máximo, evita el K.O. fulminante y queda con 1 PS.`;
    } else if (defAbility === 'Multiscale' && defHpPercent === 1) {
      damage *= 0.5;
      log = `¡${defender.p.name} activó Multiescamas! Reduce el daño recibido a la mitad cuando sus PS están al máximo.`;
    } else if (defAbility === 'Marvel Scale' && defender.p.status && defender.p.status !== 'None') {
      damage *= 0.67; // 1.5x defense approx 0.67x damage
      log = `¡${defender.p.name} activó Escama Especial! Su Defensa aumenta un 50% si sufre un estado alterado.`;
    } else if ((defAbility === 'Iron Barbs' || defAbility === 'Rough Skin') && move.category === 'Physical') {
      damage *= 0.9;
      log = `¡${defender.p.name} activó ${defAbility}! El contacto físico daña al atacante (1/8 de sus PS).`;
    } else if (defAbility === 'Filter' || defAbility === 'Solid Rock') {
      const multiplier = getEffectiveness(move.type, defender.p.types);
      if (multiplier > 1) {
        damage *= 0.75;
        log = `¡${defender.p.name} activó ${defAbility}! Reduce el daño de los movimientos supereficaces en un 25%.`;
      }
    } else if (defAbility === 'Thick Fat' && (move.type === 'Fire' || move.type === 'Ice')) {
      damage *= 0.5;
      log = `¡${defender.p.name} activó Sebo! La potencia de los ataques de tipo Fuego e Hielo se reduce un 50%.`;
    } else if (defAbility === 'Sap Sipper' && move.type === 'Grass') {
      damage = 0;
      log = `¡${defender.p.name} activó Herbívoro! Es inmune a ataques de tipo Planta y aumenta su Ataque.`;
    } else if (defAbility === 'Bulletproof' && (move.name.toLowerCase().includes('ball') || move.name.toLowerCase().includes('bomb') || move.name.toLowerCase().includes('cannon'))) {
      damage = 0;
      log = `¡${defender.p.name} activó Antibalas! Es inmune a movimientos basados en bolas, bombas y proyectiles.`;
    } else if (defAbility === 'Soundproof' && (move.name.toLowerCase().includes('voice') || move.name.toLowerCase().includes('sound') || move.name.toLowerCase().includes('roar') || move.name.toLowerCase().includes('sing'))) {
      damage = 0;
      log = `¡${defender.p.name} activó Insonorizar! Es inmune a todos los movimientos basados en sonido.`;
    }

    return { damage: Math.floor(damage), log };
  };

  // Helper for effectiveness (needed for Filter/Solid Rock)
  const getEffectiveness = (moveType: string, defenderTypes: string[]) => {
    let multiplier = 1.0;
    defenderTypes.forEach(t => {
      if (TYPE_CHART[moveType] && TYPE_CHART[moveType][t] !== undefined) {
        multiplier *= TYPE_CHART[moveType][t];
      }
    });
    return multiplier;
  };

  const executeMegaEvolution = async () => {
    if (!battleData) return;
    const { playerTeam, playerIdx, speed } = battleData;
    const currentPokemon = playerTeam[playerIdx];

    if (!currentPokemon.p.megaStone || currentPokemon.p.megaEvolved) return;

    setBattleData(prev => {
      if (!prev) return null;
      const next = { ...prev };
      next.turn = 'animating';
      next.log = [`¡${currentPokemon.p.name} está reaccionando a la ${currentPokemon.p.megaStone}!`, ...prev.log].slice(0, 5);
      return next;
    });

    await new Promise(resolve => setTimeout(resolve, 1000 / speed));

    setBattleData(prev => {
      if (!prev) return null;
      const next = { ...prev };
      const p = next.playerTeam[next.playerIdx].p;
      
      // Apply Mega Evolution stats boost (simplified: +30 to all base stats)
      p.megaEvolved = true;
      p.atk += 30;
      p.def += 30;
      p.spe += 30;
      p.name = `Mega ${p.name}`;
      
      next.log = [`¡Mega Evolución completada! ¡${p.name} está listo para arrasar!`, ...prev.log].slice(0, 5);
      next.turn = 'player';
      return next;
    });
  };

  const executeMove = async (isPlayer: boolean, move?: Move) => {
    if (!battleData) return;
    const { playerTeam, rivalTeam, playerIdx, rivalIdx, speed } = battleData;
    
    const attacker = isPlayer ? playerTeam[playerIdx] : rivalTeam[rivalIdx];
    const defender = isPlayer ? rivalTeam[rivalIdx] : playerTeam[playerIdx];
    
    if (!attacker?.p || !defender?.p) {
      console.error("Battle state error: Attacker or defender missing", { attacker, defender });
      setBattleData(prev => prev ? { ...prev, turn: isPlayer ? 'rival' : 'player' } : null);
      return;
    }

    // Move Selection
    const attackerMoves = attacker.p.moves || [];
    const selectedMove = move || (isPlayer ? battleData.selectedMove : null) || (attackerMoves.length > 0 ? attackerMoves[Math.floor(Math.random() * attackerMoves.length)] : null);
    
    if (!selectedMove) {
      console.error("No move selected and no moves available for attacker", attacker.p.name);
      setBattleData(prev => prev ? { ...prev, turn: isPlayer ? 'rival' : 'player' } : null);
      return;
    }
    
    // Type Advantage Logic (Full Type Chart)
    let multiplier = 1.0;
    const moveType = selectedMove.type;
    const defenderTypes = defender.p.types || [];

    defenderTypes.forEach(t => {
      if (TYPE_CHART[moveType] && TYPE_CHART[moveType][t] !== undefined) {
        multiplier *= TYPE_CHART[moveType][t];
      }
    });

    // Fatigue penalty
    const attackerFatiguePenalty = isPlayer && attacker.p.fatigue > 30 ? Math.floor((attacker.p.fatigue - 30) / 2) : 0;
    const defenderFatiguePenalty = !isPlayer && defender.p.fatigue > 30 ? Math.floor((defender.p.fatigue - 30) / 2) : 0;

    const effectiveAtk = Math.max(1, attacker.p.atk - attackerFatiguePenalty);
    const effectiveDef = Math.max(1, defender.p.def - defenderFatiguePenalty);

    // Damage Calculation
    const stab = attacker.p.types?.includes(selectedMove.type) ? 1.5 : 1;
    
    // Burn penalty for physical attacks
    let burnModifier = 1.0;
    if (attacker.p.status === 'Burn' && selectedMove.category === 'Physical') {
      burnModifier = 0.5;
    }

    let baseDamage = Math.floor((selectedMove.power * (effectiveAtk / effectiveDef)) * (attacker.p.ovr / 15 + 1) * 0.5 * stab * burnModifier + 10);
    
    // Weather Modifiers
    if (weather === 'sun') {
      if (moveType === 'Fire') baseDamage *= 1.5;
      if (moveType === 'Water') baseDamage *= 0.5;
    } else if (weather === 'rain') {
      if (moveType === 'Water') baseDamage *= 1.5;
      if (moveType === 'Fire') baseDamage *= 0.5;
    }

    // Item Modifiers
    if (attacker.p.item === 'choice-band') baseDamage *= 1.5;
    if (attacker.p.item === 'life-orb') baseDamage *= 1.3;
    if (attacker.p.item === 'expert-belt' && multiplier > 1) baseDamage *= 1.2;
    if (attacker.p.item === 'choice-scarf') {
      // Since it's turn based, maybe Scarf gives a chance to dodge or extra momentum
      // Let's make it increase momentum gain
    }
    
    // Apply Event Modifiers
    if (activeEvent?.modifiers?.typeBoost && attacker.p.types?.includes(activeEvent.modifiers.typeBoost.type)) {
      baseDamage *= activeEvent.modifiers.typeBoost.boost;
    }
    
    // Staff Modifiers
    const hasTactician = (staff || []).find(s => s.role === 'Tactician' && s.hired);
    if (isPlayer && hasTactician) baseDamage *= 1.1;

    // Apply Tournament Rules
    if (isTournamentMode) {
      if (tournamentRule === 'Muerte Súbita') {
        baseDamage *= 3;
      } else if (tournamentRule === 'Poder Duplicado') {
        baseDamage *= 2;
      }
    }

    const variance = Math.floor(Math.random() * (10 + attacker.p.ovr / 2));
    let damage = Math.max(5, Math.floor((baseDamage + variance) * multiplier));
    
    // If it's a status move, damage is 0
    if (selectedMove.category === 'Status') {
      damage = 0;
    }

    // Coach Buffs
    if (isPlayer) {
      damage = Math.floor(damage * battleData.coachBuffs.atk);
    } else {
      damage = Math.floor(damage / battleData.coachBuffs.def);
    }

    // Ability Logic
    const { damage: finalDamage, log: abilityLog } = applyAbilityEffects(attacker, defender, damage, selectedMove);
    
    // Status Application Logic
    let statusApplied: StatusCondition = 'None';
    if (selectedMove.statusEffect && selectedMove.statusEffect !== 'None' && !defender.p.status) {
      const chance = selectedMove.statusChance || 100;
      if (Math.random() * 100 < chance) {
        statusApplied = selectedMove.statusEffect;
      }
    }

    // Life Orb recoil
    if (attacker.p.item === 'life-orb') {
      const recoil = Math.floor(attacker.maxHp * 0.1);
      attacker.hp = Math.max(0, attacker.hp - recoil);
    }

    let newHp = Math.max(0, (defender.hp || 0) - finalDamage);
    
    // Focus Sash
    let sashTriggered = false;
    if (defender.p.item === 'focus-sash' && defender.hp === defender.maxHp && newHp <= 0 && finalDamage > 0) {
      newHp = 1;
      sashTriggered = true;
    }

    // Leftovers
    let leftoversHeal = 0;
    if (attacker.p.item === 'leftovers' && attacker.hp > 0 && attacker.hp < attacker.maxHp) {
      leftoversHeal = Math.floor(attacker.maxHp / 16);
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + leftoversHeal);
    }
    
    // Periodic Damage (Burn/Poison)
    let periodicDamage = 0;
    let periodicLog = '';
    if (attacker.p.status === 'Burn' || attacker.p.status === 'Poison') {
      periodicDamage = Math.floor(attacker.maxHp / 8);
      attacker.hp = Math.max(0, attacker.hp - periodicDamage);
      periodicLog = `¡${attacker.p.name} recibe daño por su estado!`;
    }

    // Rocky Helmet
    let helmetLog = '';
    if (defender.p.item === 'Rocky Helmet' && finalDamage > 0) {
      const helmetDamage = Math.floor(attacker.maxHp / 6);
      attacker.hp = Math.max(0, attacker.hp - helmetDamage);
      helmetLog = `¡${attacker.p.name} se dañó con el Casco Dentado!`;
    }

    const newLog = [
      abilityLog ? `🌟 ${abilityLog}` : '',
      helmetLog ? `🛡️ ${helmetLog}` : '',
      periodicLog ? `⚠️ ${periodicLog}` : '',
      sashTriggered ? `Focus Sash evitó el K.O. de ${defender.p.name}!` : '',
      leftoversHeal > 0 ? `🍎 Restos curó a ${attacker.p.name}!` : '',
      `¡${attacker.p.name} usó ${selectedMove.name}!`,
      finalDamage > 0 ? `${defender.p.name || 'Pokémon'} recibió ${finalDamage} de daño.${multiplier > 1 ? ' ¡Es muy eficaz!' : multiplier < 1 && multiplier > 0 ? ' No es muy eficaz...' : multiplier === 0 ? ' No afecta...' : ''}` : '',
      statusApplied !== 'None' ? `¡${defender.p.name} ha sido ${statusApplied === 'Burn' ? 'quemado' : statusApplied === 'Poison' ? 'envenenado' : statusApplied === 'Paralysis' ? 'paralizado' : statusApplied === 'Sleep' ? 'dormido' : 'congelado'}!` : ''
    ].filter(Boolean);
    
    setBattleData(prev => {
      if (!prev) return null;
      const next = { ...prev };
      if (isPlayer) {
        next.rivalTeam = [...prev.rivalTeam];
        next.rivalTeam[rivalIdx] = { ...prev.rivalTeam[rivalIdx], hp: newHp };
        if (statusApplied !== 'None') {
          next.rivalTeam[rivalIdx].p.status = statusApplied;
        }
        
        // Track damage
        const pId = next.playerTeam[playerIdx].p.instanceId;
        next.playerStats[pId].damageDealt += finalDamage;

        // Increase momentum
        next.momentum = Math.min(100, prev.momentum + 10 + (multiplier > 1 ? 5 : 0));
      } else {
        next.playerTeam = [...prev.playerTeam];
        next.playerTeam[playerIdx] = { ...prev.playerTeam[playerIdx], hp: newHp };
        if (statusApplied !== 'None') {
          next.playerTeam[playerIdx].p.status = statusApplied;
        }
        
        // Increase momentum on hit received
        next.momentum = Math.min(100, prev.momentum + 5);
      }
      next.log = [...newLog, ...prev.log].slice(0, 5);
      next.turn = 'animating';
      next.attackingSide = isPlayer ? 'player' : 'rival';
      next.selectedMove = null; // Reset selection
      
      // Reset coach buffs after turn if they were used
      if (isPlayer && prev.coachBuffs.atk > 1) {
        next.coachBuffs = { ...prev.coachBuffs, atk: 1 };
      }
      if (!isPlayer && prev.coachBuffs.def > 1) {
        next.coachBuffs = { ...prev.coachBuffs, def: 1 };
      }

      return next;
    });

    // Wait for attack animation
    await new Promise(resolve => setTimeout(resolve, 600 / speed));

    // Trigger hit effect
    setBattleData(prev => prev ? { ...prev, attackingSide: null, hitSide: isPlayer ? 'rival' : 'player' } : null);
    
    await new Promise(resolve => setTimeout(resolve, 400 / speed));

    setBattleData(prev => {
      if (!prev) return null;
      const next = { ...prev };
      next.hitSide = null;
      
      // Check for faint
      if (newHp <= 0) {
        next.log = [`¡${defender.p?.name || 'Pokémon'} se ha debilitado!`, ...next.log].slice(0, 5);
        if (isPlayer) {
          if (rivalIdx < rivalTeam.length - 1) {
            next.rivalIdx = rivalIdx + 1;
            next.turn = 'player';
          } else {
            next.battleEnded = 'win';
          }
        } else {
          // Player pokemon fainted
          const pId = next.playerTeam[playerIdx].p.instanceId;
          next.playerStats[pId].fainted = true;

          if (playerIdx < playerTeam.length - 1) {
            next.playerIdx = playerIdx + 1;
            next.turn = 'player';
          } else {
            next.battleEnded = 'loss';
          }
        }
      } else {
        next.turn = isPlayer ? 'rival' : 'player';
      }
      return next;
    });
  };

  const coachAction = (action: 'heal' | 'atk' | 'def') => {
    if (!battleData || battleData.turn !== 'player' || battleData.momentum < (action === 'heal' ? 30 : action === 'atk' ? 50 : 40)) return;

    setBattleData(prev => {
      if (!prev) return null;
      const next = { ...prev };
      const currentPokemon = next.playerTeam[next.playerIdx];

      if (action === 'heal') {
        const healAmount = Math.floor(currentPokemon.maxHp * 0.25);
        currentPokemon.hp = Math.min(currentPokemon.maxHp, currentPokemon.hp + healAmount);
        next.momentum -= 30;
        next.log = [`¡Entrenador usó ¡AGUANTA!: ${currentPokemon.p.name} recuperó HP!`, ...prev.log].slice(0, 5);
      } else if (action === 'atk') {
        next.coachBuffs.atk = 1.5;
        next.momentum -= 50;
        next.log = [`¡Entrenador usó ¡ATAQUE TOTAL!: El próximo ataque será devastador.`, ...prev.log].slice(0, 5);
      } else if (action === 'def') {
        next.coachBuffs.def = 1.5;
        next.momentum -= 40;
        next.log = [`¡Entrenador usó ¡DEFENSA FÉRREA!: El próximo golpe recibido se reducirá.`, ...prev.log].slice(0, 5);
      }

      return next;
    });
  };
  const endBattle = (result: 'win' | 'loss') => {
    if (!battleData || battleEndedRef.current) return;
    battleEndedRef.current = true;
    const { rivalOvr, playerStats, matchId } = battleData;
    
    let coinReward = 0;
    let tpReward = 0;
    let stardustReward = 0;
    let msg = "";
    
    // Update collection with fatigue, injuries, and stats
    setCollection(prev => {
      const newCollection = prev.map(p => {
        const stats = playerStats[p.instanceId];
        
        let newFatigue = p.fatigue;
        let isInjured = p.isInjured;
        let injuryWeeks = p.injuryWeeks;

        // Injury recovery
        if (isInjured) {
          injuryWeeks -= 1;
          if (injuryWeeks <= 0) {
            isInjured = false;
            injuryWeeks = 0;
            setHistory(h => [`✅ ¡${p.name} se ha recuperado de su lesión!`, ...h].slice(0, 10));
          }
        }

        if (stats) {
          newFatigue = Math.min(100, p.fatigue + 25);

          // Chance of injury if fatigue is high or fainted
          if (!isInjured && (newFatigue > 70 || stats.fainted)) {
            if (Math.random() < (stats.fainted ? 0.4 : 0.2)) {
              isInjured = true;
              injuryWeeks = 1 + Math.floor(Math.random() * 3);
              setHistory(h => [`⚠️ ¡${p.name} se ha lesionado por ${injuryWeeks} semanas!`, ...h].slice(0, 10));
            }
          }

          return {
            ...p,
            fatigue: newFatigue,
            isInjured,
            injuryWeeks,
            matchesPlayed: (p.matchesPlayed || 0) + 1,
            totalDamageDealt: (p.totalDamageDealt || 0) + stats.damageDealt,
            matchHistory: [
              {
                opponent: battleData.rivalTeam[0]?.p?.name || 'Rival',
                result: result === 'win' ? 'win' : 'loss',
                damageDealt: stats.damageDealt,
                fainted: stats.fainted,
                date: new Date().toISOString()
              },
              ...(p.matchHistory || [])
            ].slice(0, 20)
          };
        } else if (team.includes(p.instanceId)) {
          // Pokemon in team but didn't participate (substitutes)
          // Recover some fatigue
          return {
            ...p,
            fatigue: Math.max(0, p.fatigue - 5),
            isInjured,
            injuryWeeks
          };
        } else {
          // Pokemon not in team
          // Recover more fatigue
          return {
            ...p,
            fatigue: Math.max(0, p.fatigue - 15),
            isInjured,
            injuryWeeks
          };
        }
      });

      // Remove newly injured Pokémon from the team
      setTeam(currentTeam => currentTeam.filter(id => {
        const p = newCollection.find(poke => poke.instanceId === id);
        return p && !p.isInjured;
      }));

      return newCollection;
    });

    if (result === 'win') {
      updateMissionProgress('win_battle', 1);
      if (activeEvent) updateMissionProgress('event_battle', 1);
      
      const isTournament = isTournamentMode;
      const coinMod = activeEvent?.modifiers?.coinMultiplier || 1;
      const stardustMod = activeEvent?.modifiers?.stardustMultiplier || 1;
      const tpMod = activeEvent?.modifiers?.tpMultiplier || 1;

      coinReward = Math.floor((80 + (leagueLevel * 15)) * (isTournament ? 3 : 1) * coinMod);
      tpReward = Math.floor((25 + (leagueLevel * 5)) * (isTournament ? 1.5 : 1) * tpMod);
      stardustReward = Math.floor((20 + (leagueLevel * 3)) * (isTournament ? 2 : 1) * stardustMod);
      
      msg = isTournament 
        ? `¡Victoria en Torneo! Ganaste ${coinReward} Monedas, ${stardustReward} Polvos y ${tpReward} TP.`
        : `¡Victoria en combate! Ganaste ${coinReward} Monedas, ${stardustReward} Polvos y ${tpReward} TP.`;
      
      // Sponsor progress: Win matches
      if (activeSponsor?.id === 'devon_corp') {
        updateSponsorProgress(1);
      }

      if (isTournament) {
        setHistory(prev => ["🏆 ¡HAS AVANZADO EN EL TORNEO! 🏆", ...prev].slice(0, 10));
      }
    } else {
      coinReward = 20;
      tpReward = 10;
      stardustReward = 5;
      msg = `Derrota en combate. El rival (Poder ${rivalOvr}) fue superior. Ganaste ${coinReward} Monedas, ${stardustReward} Polvos y ${tpReward} TP.`;
    }
    
    setCoins(prev => prev + coinReward);
    setTp(prev => prev + tpReward);
    setStardust(prev => prev + stardustReward);
    setTotalMatches(prev => prev + 1);
    setHistory(prev => [msg, ...prev].slice(0, 10));

    if (matchId) {
      if (matchId.startsWith('gym-')) {
        if (result === 'win') {
          const gymId = matchId.split('-')[1];
          const gym = GYMS.find(g => g.id === gymId);
          if (gym && !defeatedGyms.includes(gymId)) {
            setDefeatedGyms(prev => [...prev, gymId]);
            setBadges(prev => [...prev, gym.badgeName]);
            updateMissionProgress('win_gym', 1);
            setHistory(prev => [`🏅 ¡Has derrotado al Líder ${gym.leader} y obtenido la ${gym.badgeName}!`, ...prev].slice(0, 10));
            setCelebration({type: 'win', message: `¡${gym.badgeName} OBTENIDA!`});
            
            // Check if all gyms are defeated
            if (defeatedGyms.length + 1 === 8) {
              setIsLeagueQualified(true);
              setHistory(prev => ["🏆 ¡TE HAS CLASIFICADO PARA EL CAMPEONATO FINAL!", ...prev].slice(0, 10));
            }
          }
        }
      } else if (matchId.startsWith('quarter') || matchId.startsWith('semi') || matchId === 'final') {
        const match = [...tournamentBracket.quarters, ...tournamentBracket.semis, tournamentBracket.final].find(m => m?.id === matchId);
        if (match) {
          const isHome = match.homeTeamId === 'player';
          const isWin = result === 'win';
          const playerGoals = isWin ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 2);
          const rivalGoals = isWin ? Math.floor(Math.random() * playerGoals) : playerGoals + Math.floor(Math.random() * 3) + 1;
          const homeGoals = isHome ? playerGoals : rivalGoals;
          const awayGoals = isHome ? rivalGoals : playerGoals;
          simulateTournamentMatch(matchId, homeGoals, awayGoals);
        }
      } else {
        const match = schedule.find(m => m.id === matchId);
        if (match) {
          const isHome = match.homeTeamId === 'player';
          const isWin = result === 'win';
          const playerGoals = isWin ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 2);
          const rivalGoals = isWin ? Math.floor(Math.random() * playerGoals) : playerGoals + Math.floor(Math.random() * 3) + 1;
          const homeGoals = isHome ? playerGoals : rivalGoals;
          const awayGoals = isHome ? rivalGoals : playerGoals;
          updateLeagueStats(matchId, homeGoals, awayGoals, true);
        }
      }
    }

    if (result === 'win' && !matchId?.startsWith('gym-') && matchId !== 'championship') setCelebration({type: 'win', message: '¡VICTORIA!'});
    setGameState('management');
    setBattleData(null);
  };

  useEffect(() => {
    if (gameState === 'battle' && battleData?.battleEnded) {
      endBattle(battleData.battleEnded);
    } else if (gameState === 'battle' && battleData && battleData.isAuto && battleData.turn !== 'animating') {
      const timer = setTimeout(() => {
        executeMove(battleData.turn === 'player');
      }, 500 / battleData.speed);
      return () => clearTimeout(timer);
    } else if (gameState === 'battle' && battleData && !battleData.isAuto && battleData.turn === 'rival') {
      const timer = setTimeout(() => {
        executeMove(false);
      }, 1000 / battleData.speed);
      return () => clearTimeout(timer);
    }
  }, [gameState, battleData]);

  const resetLeague = () => {
    // Check for promotion: Only if player is 1st
    const sortedTeams = [...leagueTeams].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
    const playerRank = sortedTeams.findIndex(t => t.id === 'player') + 1;
    
    let promoted = false;
    if (playerRank === 1) {
      setLeagueLevel(prev => prev + 1);
      promoted = true;
    }

    const nextLevel = promoted ? leagueLevel + 1 : leagueLevel;
    const currentLvl = nextLevel;

    const rivalNames = [
      'Team Rocket', 'Elite Four', 'Gym Leaders', 'Pallet Town', 
      'Cerulean City', 'Indigo Plateau', 'Victory Road', 'Team Aqua', 
      'Team Magma', 'Team Galactic', 'Team Plasma', 'Team Flare',
      'Aether Foundation', 'Team Skull', 'Macro Cosmos'
    ];
    const logos = ['🚀', '👑', '🏅', '🍃', '💧', '⛰️', '🏆', '🌊', '🌋', '🌌', '⚡', '🔥', '🧬', '💀', '⚙️'];
    const teams: LeagueTeam[] = rivalNames.map((name, i) => ({
      id: `rival-${i}`,
      name,
      logo: logos[i % logos.length],
      // Difficulty scales balancedly with leagueLevel
      ovr: Math.max(1, Math.floor(maxTeamOvr * 0.85) + (i * 2) + Math.floor(Math.random() * 10) + (currentLvl * 5)),
      points: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0
    }));
    teams.push({
      id: 'player',
      name: teamName,
      logo: teamLogo,
      ovr: teamOvr,
      points: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0
    });
    setLeagueTeams(teams);
    
    // Round Robin Schedule for 16 teams
    const matches: Match[] = [];
    const teamIds = teams.map(t => t.id);
    const numTeams = teamIds.length;
    const numWeeks = numTeams - 1;
    const matchesPerWeek = numTeams / 2;

    for (let w = 0; w < numWeeks; w++) {
      for (let m = 0; m < matchesPerWeek; m++) {
        const home = (w + m) % (numTeams - 1);
        let away = (numTeams - 1 - m + w) % (numTeams - 1);
        if (m === 0) away = numTeams - 1;
        
        matches.push({
          id: `m-${w}-${m}`,
          homeTeamId: teamIds[home],
          awayTeamId: teamIds[away],
          played: false,
          week: w + 1
        });
      }
    }

    setSchedule(matches);
    setCurrentWeek(1);
    setSeason(prev => prev + 1);
    setTournamentPlayedThisSeason(false);
    setMarketOffers([]);
    
    if (promoted) {
      setShowChampionCelebration(true);
    }
    
    const msg = promoted 
      ? `🏆 ¡ASCENSO! Has quedado 1º y subes a ${getLeagueName(nextLevel)}. ¡Comienza la Temporada ${season + 1}!`
      : `📉 Permaneces en ${getLeagueName(leagueLevel)}. ¡Debes quedar 1º para ascender! Temporada ${season + 1}.`;
    
    setHistory(prev => [msg, ...prev].slice(0, 10));
  };

  const toggleAuto = () => {
    setBattleData(prev => prev ? { ...prev, isAuto: !prev.isAuto } : null);
  };

  const cycleSpeed = () => {
    setBattleData(prev => {
      if (!prev) return null;
      const nextSpeed = prev.speed === 1 ? 2 : prev.speed === 2 ? 4 : 1;
      return { ...prev, speed: nextSpeed };
    });
  };

  const activePlayerType = battleData?.playerTeam[battleData.playerIdx]?.p?.types?.[0] || 'Normal';
  const activeRivalType = battleData?.rivalTeam[battleData.rivalIdx]?.p?.types?.[0] || 'Normal';

  const TutorialOverlay = () => {
    if (!isTutorialActive) return null;

    const currentStep = TUTORIAL_STEPS[tutorialStep];

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-zinc-900 border border-white/10 rounded-[32px] p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-600/20 blur-[100px] rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-600/20 blur-[100px] rounded-full" />

          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Tutorial: Paso {tutorialStep + 1} de {TUTORIAL_STEPS.length}</span>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">{currentStep.title}</h2>
              </div>
              <button 
                onClick={skipTutorial}
                className="text-zinc-500 hover:text-white transition-colors p-2"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-zinc-400 font-medium leading-relaxed">
              {currentStep.content}
            </p>

            <div className="flex gap-3 pt-4">
              <button
                onClick={skipTutorial}
                className="flex-1 px-6 py-4 rounded-2xl bg-zinc-800 text-zinc-400 text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition-all"
              >
                Saltar
              </button>
              <button
                onClick={nextTutorialStep}
                className="flex-[2] px-6 py-4 rounded-2xl bg-rose-600 text-white text-xs font-black uppercase tracking-widest hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 group"
              >
                {tutorialStep === TUTORIAL_STEPS.length - 1 ? '¡Entendido!' : 'Siguiente'}
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div data-theme={theme} className="flex h-screen bg-zinc-950 overflow-hidden font-sans selection:bg-rose-500/30 transition-colors duration-500">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed top-0 left-0 bottom-0 w-72 bg-zinc-900 z-[70] lg:hidden flex flex-col border-r border-white/5"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-600/20">
                  <Trophy size={20} className="text-white" />
                </div>
                <h1 className="text-xl font-black italic uppercase tracking-tighter text-white">PokeManager</h1>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="text-zinc-500 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {[
                { id: 'team', icon: Users, label: 'Mi Equipo', color: 'rose' },
                { id: 'inventory', icon: Package, label: 'Inventario', color: 'indigo' },
                { id: 'explore', icon: MapIcon, label: 'Explorar', color: 'emerald' },
                { id: 'missions', icon: Activity, label: 'Misiones', color: 'indigo' },
                { id: 'event', icon: Sparkles, label: 'Eventos', color: 'amber' },
                { id: 'lab', icon: FlaskConical, label: 'Laboratorio', color: 'indigo' },
                { id: 'shop', icon: ShoppingBag, label: 'Tienda', color: 'rose' },
                { id: 'market', icon: Store, label: 'Mercado', color: 'emerald' },
                { id: 'battles', icon: Trophy, label: 'Combates', color: 'rose' },
                { id: 'league', icon: Building2, label: 'Liga Pokémon', color: 'amber' },
                { id: 'pokedex', icon: Info, label: 'Pokédex', color: 'rose' },
                { id: 'hallOfFame', icon: Award, label: 'Salón Fama', color: 'amber' },
                { id: 'settings', icon: Settings, label: 'Ajustes', color: 'zinc' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as any); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-black uppercase tracking-tight transition-all group ${
                    activeTab === tab.id 
                      ? `bg-${tab.color === 'zinc' ? 'zinc-700' : tab.color + '-600'} text-white shadow-lg shadow-${tab.color === 'zinc' ? 'zinc-700' : tab.color + '-600'}/20` 
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <tab.icon size={20} className={activeTab === tab.id ? 'text-white' : `group-hover:text-${tab.color === 'zinc' ? 'zinc-400' : tab.color + '-400'} transition-colors`} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 border-t border-white/5">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Manager</div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center text-sm">
                    {teamLogo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-white truncate uppercase italic">{teamName}</div>
                    <div className="text-[8px] font-bold text-zinc-500 uppercase">{getLeagueName(leagueLevel)}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop */}
      {!showStarterSelect && !showLoginPrompt && gameState === 'management' && (
        <aside className="hidden lg:flex w-72 flex-col border-r border-white/5 bg-zinc-900/50 backdrop-blur-xl z-50">
          <div className="p-8 border-b border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-600/20">
                <Trophy size={20} className="text-white" />
              </div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter text-white text-gradient">PokeManager</h1>
            </div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Elite League Edition</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {[
              { id: 'team', icon: Users, label: 'Mi Equipo', color: 'rose' },
              { id: 'inventory', icon: Package, label: 'Inventario', color: 'indigo' },
              { id: 'explore', icon: MapIcon, label: 'Explorar', color: 'emerald' },
              { id: 'missions', icon: Activity, label: 'Misiones', color: 'indigo' },
              { id: 'event', icon: Sparkles, label: 'Eventos', color: 'amber' },
              { id: 'lab', icon: FlaskConical, label: 'Laboratorio', color: 'indigo' },
              { id: 'shop', icon: ShoppingBag, label: 'Tienda', color: 'rose' },
              { id: 'market', icon: Store, label: 'Mercado', color: 'emerald' },
              { id: 'battles', icon: Trophy, label: 'Combates', color: 'rose' },
              { id: 'league', icon: Building2, label: 'Liga Pokémon', color: 'amber' },
              { id: 'pokedex', icon: Info, label: 'Pokédex', color: 'rose' },
              { id: 'hallOfFame', icon: Award, label: 'Salón Fama', color: 'amber' },
              { id: 'settings', icon: Settings, label: 'Ajustes', color: 'zinc' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-black uppercase tracking-tight transition-all group ${
                  activeTab === tab.id 
                    ? `bg-${tab.color === 'zinc' ? 'zinc-700' : tab.color + '-600'} text-white shadow-lg shadow-${tab.color === 'zinc' ? 'zinc-700' : tab.color + '-600'}/20` 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                <tab.icon size={20} className={activeTab === tab.id ? 'text-white' : `group-hover:text-${tab.color === 'zinc' ? 'zinc-400' : tab.color + '-400'} transition-colors`} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <span>Estado del Servidor</span>
              <span className="flex items-center gap-1.5 text-emerald-500">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Online
              </span>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <div className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Manager</div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center text-sm">
                  {teamLogo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-white truncate uppercase italic">{teamName}</div>
                  <div className="text-[8px] font-bold text-zinc-500 uppercase">{getLeagueName(leagueLevel)}</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Pack Opening Modal */}
        <AnimatePresence>
          {openingPack && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl"
            >
              <div className="flex flex-col items-center relative w-full h-full justify-center">
                {openingStage === 'shaking' && (
                  <motion.div 
                    animate={{ 
                      x: [-10, 10, -10, 10, 0],
                      y: [-5, 5, -5, 5, 0],
                      rotate: [-5, 5, -5, 5, 0],
                      scale: [1, 1.1, 1.2, 1.1, 1.2]
                    }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="relative cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full animate-pulse" />
                    <div className="text-[150px] drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] relative z-10">
                      {openingPack.pack.icon || <ShoppingBag />}
                    </div>
                    <div className="text-2xl font-black text-white text-center mt-8 tracking-widest uppercase animate-pulse">
                      Abriendo {openingPack.pack.name}...
                    </div>
                  </motion.div>
                )}

                {openingStage === 'bursting' && (
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: [1, 5, 10], opacity: [1, 1, 0] }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute inset-0 bg-white z-50"
                  />
                )}

                {openingStage === 'revealed' && openingPack.pokemon && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0, rotateY: 180 }}
                    animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                    transition={{ type: "spring", damping: 15, stiffness: 100 }}
                    className="flex flex-col items-center relative z-10"
                  >
                    {/* Background rays */}
                    <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="w-[800px] h-[800px] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(255,255,255,0.3)_360deg)] rounded-full blur-xl"
                      />
                    </div>

                    <motion.div 
                      initial={{ y: -50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white mb-12 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                    >
                      ¡Nuevo Pokémon!
                    </motion.div>
                    
                    <div className="scale-125 md:scale-150 mb-16 relative group">
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-0 group-hover:opacity-100 group-hover:animate-shine pointer-events-none z-50 rounded-2xl" />
                      <PokemonCardUI 
                        pokemon={openingPack.pokemon} 
                        canTrain={false} 
                        canPowerUp={false} 
                        canEvolve={false} 
                      />
                    </div>
                    
                    <motion.button 
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      onClick={() => {
                        setOpeningPack(null);
                        setOpeningStage('idle');
                      }}
                      className="px-12 py-4 bg-white text-black font-black uppercase tracking-widest text-sm rounded-full hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                    >
                      Continuar
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        {!showStarterSelect && !showLoginPrompt && (
          <header className="h-20 border-b border-white/5 bg-zinc-900/50 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
            <div className="flex items-center gap-4 md:gap-8">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-white hover:bg-zinc-700 transition-colors"
              >
                <Menu size={20} />
              </button>
              
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20">
                  {teamLogo}
                </div>
                <div className="flex flex-col">
                  <div className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-white truncate w-32 md:w-48">{teamName}</div>
                  <div className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Manager de Liga</div>
                </div>
              </div>
              
              <div className="hidden md:block h-8 w-px bg-white/10" />
              
              <div className="hidden xs:flex flex-col">
                <div className="text-lg md:text-xl font-black italic text-white">T{season}</div>
                <div className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Temporada</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 md:gap-3 overflow-x-auto no-scrollbar py-2">
                <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 px-3 md:px-4 py-2 rounded-full border border-white/10 shrink-0 shadow-inner">
                  <Coins size={14} className="text-amber-400" />
                  <span className="text-[11px] md:text-sm font-black text-white drop-shadow-md">{coins.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 px-3 md:px-4 py-2 rounded-full border border-white/10 shrink-0 shadow-inner">
                  <Zap size={14} className="text-emerald-400" />
                  <span className="text-[11px] md:text-sm font-black text-white drop-shadow-md">{energy}</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 px-3 md:px-4 py-2 rounded-full border border-white/10 shrink-0 shadow-inner">
                  <Dumbbell size={14} className="text-indigo-400" />
                  <span className="text-[11px] md:text-sm font-black text-white drop-shadow-md">{tp.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 px-3 md:px-4 py-2 rounded-full border border-white/10 shrink-0 shadow-inner">
                  <Sparkles size={14} className="text-purple-400" />
                  <span className="text-[11px] md:text-sm font-black text-white drop-shadow-md">{stardust.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 bg-black/60 px-3 md:px-4 py-2 rounded-full border border-white/10 shrink-0 shadow-inner">
                  <Heart size={14} className="text-rose-400" />
                  <span className="text-[11px] md:text-sm font-black text-white drop-shadow-md">{banditas}</span>
                </div>
              </div>
              <ProfileMenu user={user} isSyncing={isCloudSyncing} />
            </div>
          </header>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 w-full pb-32 lg:pb-12 custom-scrollbar">
          <AnimatePresence mode="wait">
          {!isAuthReady ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500] bg-zinc-950 flex flex-col items-center justify-center p-4 text-center"
            >
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm">Cargando...</p>
            </motion.div>
          ) : showLoginPrompt ? (
            <motion.div
              key="login-prompt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[400] bg-zinc-950 flex flex-col items-center justify-center p-4 md:p-8 text-center overflow-y-auto custom-scrollbar"
            >
              <div className="max-w-md w-full space-y-8 py-8 md:py-0">
                <div className="space-y-4">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                    className="w-20 h-20 md:w-24 md:h-24 bg-blue-600 rounded-[24px] md:rounded-[32px] mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.4)]"
                  >
                    <Cloud size={40} className="text-white md:w-12 md:h-12" />
                  </motion.div>
                  <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white">Guardado en la Nube</h1>
                  <p className="text-zinc-400 font-medium text-sm md:text-base">
                    Inicia sesión para guardar tu progreso en la nube y jugar en cualquier dispositivo.
                  </p>
                </div>

                <div className="space-y-4 pt-4">
                  <button
                    onClick={async () => {
                      try {
                        await signInWithPopup(auth, googleProvider);
                        // onAuthStateChanged will handle the rest
                      } catch (error) {
                        console.error("Login failed:", error);
                      }
                    }}
                    className="w-full py-4 bg-white text-black rounded-2xl font-bold text-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-3 shadow-lg shadow-white/10"
                  >
                    <LogIn size={24} />
                    Iniciar Sesión con Google
                  </button>
                  
                  <button
                    onClick={() => setShowLoginPrompt(false)}
                    className="w-full py-4 bg-zinc-900 border border-white/10 text-white rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-colors"
                  >
                    Jugar como Invitado
                  </button>
                  <p className="text-xs text-zinc-500">
                    Si juegas como invitado, tu progreso solo se guardará en este navegador.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : showStarterSelect ? (
            <motion.div
              key="starter-select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[300] bg-zinc-950 flex flex-col items-center justify-start md:justify-center p-4 md:p-8 text-center overflow-y-auto custom-scrollbar"
            >
              <div className="max-w-4xl w-full space-y-8 md:space-y-12 py-8 md:py-0">
                <div className="space-y-4">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                    className="w-20 h-20 md:w-24 md:h-24 bg-rose-600 rounded-[24px] md:rounded-[32px] mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(225,29,72,0.4)]"
                  >
                    <Trophy size={40} className="text-white md:w-12 md:h-12" />
                  </motion.div>
                  <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white">Elige tu Compañero</h1>
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs md:text-sm">Tu aventura como manager Pokémon comienza aquí</p>
                </div>

                <div className="relative flex items-center justify-center gap-4">
                  <button 
                    onClick={() => setStarterIndex((prev) => (prev === 0 ? 26 : prev - 1))}
                    className="p-4 bg-zinc-900 border border-white/10 rounded-full hover:bg-zinc-800 transition-colors"
                  >
                    <ChevronRight className="rotate-180" />
                  </button>
                  
                  <div className="w-full max-w-md">
                    <AnimatePresence mode="wait">
                      <motion.button
                        key={[1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912][starterIndex]}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        whileHover={{ y: -5, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isSelectingStarter}
                        onClick={() => selectStarter([1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912][starterIndex])}
                        className={`w-full bg-zinc-900 border border-white/5 rounded-[32px] md:rounded-[40px] p-8 group transition-all flex flex-col items-center space-y-6 ${isSelectingStarter ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20 hover:bg-zinc-800/50'}`}
                      >
                        <div className="w-48 h-48 bg-black/40 rounded-full flex items-center justify-center relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-full" />
                          <img 
                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${[1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912][starterIndex]}.png`}
                            alt={POKEDEX_BASE.find(p => p.id === [1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912][starterIndex])?.name}
                            className="w-40 h-40 object-contain relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">{POKEDEX_BASE.find(p => p.id === [1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912][starterIndex])?.name}</h3>
                          <div className="flex gap-2 justify-center">
                            {POKEDEX_BASE.find(p => p.id === [1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912][starterIndex])?.types.map(t => (
                              <span key={t} className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5 text-zinc-500">{t}</span>
                            ))}
                          </div>
                        </div>
                        <div className="w-full py-4 bg-zinc-800 rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-400 group-hover:bg-rose-600 group-hover:text-white transition-all">
                          Seleccionar
                        </div>
                      </motion.button>
                    </AnimatePresence>
                  </div>

                  <button 
                    onClick={() => setStarterIndex((prev) => (prev === 26 ? 0 : prev + 1))}
                    className="p-4 bg-zinc-900 border border-white/10 rounded-full hover:bg-zinc-800 transition-colors"
                  >
                    <ChevronRight />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : gameState === 'battle' && battleData ? (
            <motion.div
              key="battle-screen"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col"
            >
              {/* Battle Header */}
              <div className="h-14 md:h-16 border-b border-white/5 bg-zinc-900 flex items-center justify-between px-3 md:px-6">
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="flex items-center gap-1 md:gap-2">
                    <span className="text-lg md:text-xl">{teamLogo}</span>
                    <span className="text-[10px] md:text-sm font-black italic uppercase hidden sm:block">{teamName}</span>
                  </div>
                  <span className="text-zinc-600 font-black italic text-xs md:text-base">VS</span>
                  <div className="flex items-center gap-1 md:gap-2">
                    <span className="text-[10px] md:text-sm font-black italic uppercase hidden sm:block">{battleData.rivalName}</span>
                    <span className="text-lg md:text-xl">{battleData.rivalLogo}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="hidden lg:flex items-center gap-4 mr-4">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Liga Regional</div>
                    <div className="text-lg font-black italic">{getLeagueName(leagueLevel)}</div>
                  </div>
                  <button 
                    onClick={cycleSpeed}
                    className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-zinc-800 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold hover:bg-zinc-700 transition-colors"
                  >
                    <FastForward size={12} className="md:w-[14px] md:h-[14px]" /> {battleData.speed}x
                  </button>
                  <button 
                    onClick={toggleAuto}
                    className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-colors ${battleData.isAuto ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                  >
                    {battleData.isAuto ? <Pause size={12} className="md:w-[14px] md:h-[14px]" /> : <Play size={12} className="md:w-[14px] md:h-[14px]" />} {battleData.isAuto ? 'AUTO' : 'MANUAL'}
                  </button>
                  <button 
                    onClick={() => {
                      const win = Math.random() > 0.5;
                      endBattle(win ? 'win' : 'loss');
                    }}
                    className="hidden sm:flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-zinc-800 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold hover:bg-zinc-700 transition-colors text-zinc-400"
                  >
                    <FastForward size={12} className="md:w-[14px] md:h-[14px]" /> Simular
                  </button>
                </div>

                <div className="hidden md:flex items-center gap-3 ml-4 border-l border-white/10 pl-4">
                  <div className="flex items-center gap-1.5 text-amber-400 font-black drop-shadow-md">
                    <Coins size={14} />
                    <span className="text-xs text-white">{coins.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-black drop-shadow-md">
                    <Zap size={14} />
                    <span className="text-xs text-white">{energy}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-indigo-400 font-black drop-shadow-md">
                    <Dumbbell size={14} />
                    <span className="text-xs text-white">{tp.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Battle Arena */}
              <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
                {/* Background image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url('https://i.pinimg.com/originals/df/4e/8b/df4e8ba28f912bf9cdf9fa0dfc196411.png')` }}
                />
                
                <div className="w-full h-full flex flex-col justify-between relative z-10">
                  
                  {/* Top Row: Rival Stats (Right) */}
                  <div className="flex justify-end items-start pt-4 md:pt-8 pr-4 md:pr-12">
                    {/* Rival Stats (Top Right) */}
                    <motion.div 
                      initial={{ x: 100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="bg-white border-l-[8px] md:border-l-[12px] border-l-[#303030] p-2 md:p-3 w-48 md:w-80 shadow-2xl relative transform -skew-x-12 overflow-hidden"
                    >
                      <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-200 to-transparent opacity-50" />
                      <div className="transform skew-x-12">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-1 md:gap-2">
                            <span className="text-sm md:text-xl font-black text-[#303030] truncate max-w-[80px] md:max-w-none uppercase tracking-tight">{battleData.rivalTeam[battleData.rivalIdx]?.p?.name}</span>
                            {battleData.rivalTeam[battleData.rivalIdx]?.p?.status && battleData.rivalTeam[battleData.rivalIdx]?.p?.status !== 'None' && (
                              <span className={`px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-[10px] font-bold text-white uppercase ${
                                battleData.rivalTeam[battleData.rivalIdx].p.status === 'Burn' ? 'bg-orange-500' :
                                battleData.rivalTeam[battleData.rivalIdx].p.status === 'Poison' ? 'bg-purple-500' :
                                battleData.rivalTeam[battleData.rivalIdx].p.status === 'Paralysis' ? 'bg-yellow-500' :
                                battleData.rivalTeam[battleData.rivalIdx].p.status === 'Sleep' ? 'bg-indigo-500' :
                                'bg-blue-400'
                              }`}>
                                {battleData.rivalTeam[battleData.rivalIdx].p.status}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] md:text-lg font-bold text-[#303030] opacity-60 italic">Nv. {battleData.rivalTeam[battleData.rivalIdx]?.p?.level}</span>
                        </div>
                        <div className="h-2 md:h-3 bg-[#303030] rounded-full overflow-hidden p-[1px] md:p-[2px]">
                          <motion.div 
                            animate={{ 
                              width: `${((battleData.rivalTeam[battleData.rivalIdx]?.hp || 0) / (battleData.rivalTeam[battleData.rivalIdx]?.maxHp || 1)) * 100}%`,
                              backgroundColor: (battleData.rivalTeam[battleData.rivalIdx]?.hp || 0) < (battleData.rivalTeam[battleData.rivalIdx]?.maxHp || 1) * 0.2 ? '#f43f5e' : 
                                             (battleData.rivalTeam[battleData.rivalIdx]?.hp || 0) < (battleData.rivalTeam[battleData.rivalIdx]?.maxHp || 1) * 0.5 ? '#f59e0b' : '#10b981'
                            }}
                            className="h-full rounded-full shadow-[0_0_5px_rgba(0,0,0,0.3)]"
                          />
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Sprites Area */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Player Sprite (Left) */}
                    <div className="absolute left-[5%] md:left-[10%] bottom-[10%] md:bottom-[15%]">
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 md:w-48 h-8 md:h-12 bg-black/30 rounded-[100%] blur-sm" />
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`player-sprite-${battleData.playerIdx}`}
                          initial={{ x: -300, opacity: 0 }}
                          animate={{ 
                            x: battleData.attackingSide === 'player' ? 100 : 0, 
                            y: battleData.hitSide === 'player' ? [0, -15, 15, -15, 0] : [0, -8, 0],
                            opacity: 1, 
                            scale: window.innerWidth < 768 ? 1.1 : 1.5,
                            filter: battleData.hitSide === 'player' ? 'brightness(3) saturate(0)' : 'brightness(1) saturate(1)'
                          }}
                          exit={{ x: -200, opacity: 0 }}
                          transition={{ 
                            y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
                          }}
                          className="relative"
                        >
                          {battleData.playerTeam[battleData.playerIdx]?.p && (
                            <img 
                              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${battleData.playerTeam[battleData.playerIdx].p.id}.png`}
                              className="w-[180px] md:w-[280px] h-[180px] md:h-[280px] object-contain"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Rival Sprite (Right) */}
                    <div className="absolute right-[10%] md:right-[15%] top-[20%] md:top-[25%]">
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 md:w-40 h-6 md:h-10 bg-black/30 rounded-[100%] blur-sm" />
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`rival-sprite-${battleData.rivalIdx}`}
                          initial={{ x: 300, opacity: 0 }}
                          animate={{ 
                            x: battleData.attackingSide === 'rival' ? -100 : 0, 
                            y: battleData.hitSide === 'rival' ? [0, -10, 10, -10, 0] : [0, -5, 0],
                            opacity: 1, 
                            scale: window.innerWidth < 768 ? 0.9 : 1.2,
                            filter: battleData.hitSide === 'rival' ? 'brightness(3) saturate(0)' : 'brightness(1) saturate(1)'
                          }}
                          exit={{ x: 200, opacity: 0 }}
                          transition={{ 
                            y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                          }}
                          className="relative"
                        >
                          {battleData.rivalTeam[battleData.rivalIdx]?.p && (
                            <img 
                              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${battleData.rivalTeam[battleData.rivalIdx].p.id}.png`}
                              className="w-[140px] md:w-[220px] h-[140px] md:h-[220px] object-contain"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Battle Log Overlay */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none z-30 px-4">
                      <div className="flex flex-col gap-2 max-w-lg w-full">
                        <AnimatePresence initial={false}>
                          {battleData.log.slice(0, 3).map((msg, i) => (
                            <motion.div
                              key={`${msg}-${i}`}
                              initial={{ opacity: 0, y: 20, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 text-white text-center text-xs md:text-sm font-bold shadow-2xl"
                              style={{ 
                                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                opacity: 1 - (i * 0.2)
                              }}
                            >
                              {msg}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Player Stats (Left) and Action Menu (Right) */}
                  <div className="flex flex-col md:flex-row justify-between items-center md:items-end pb-4 md:pb-8 px-4 md:px-12 z-20 gap-4 w-full">
                    {/* Player Stats (Bottom Left) */}
                    <div className="flex flex-col gap-2 md:gap-4 w-full md:w-auto max-w-sm">
                      {/* Momentum Bar */}
                      <div className="w-full md:w-80 bg-black/40 backdrop-blur-md rounded-xl p-2 md:p-3 border border-white/10 transform md:skew-x-12">
                        <div className="transform md:-skew-x-12">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[8px] md:text-[10px] font-black text-indigo-400 uppercase tracking-widest">Impulso Táctico</span>
                            <span className="text-[8px] md:text-[10px] font-black text-white">{battleData.momentum}%</span>
                          </div>
                          <div className="h-1.5 md:h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div 
                              animate={{ width: `${battleData.momentum}%` }}
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                            />
                          </div>
                        </div>
                      </div>

                      <motion.div 
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="bg-white border-r-[8px] md:border-r-[12px] border-r-[#303030] p-2 md:p-3 w-full md:w-80 shadow-2xl relative transform md:skew-x-12 overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-200 to-transparent opacity-50" />
                        <div className="transform md:-skew-x-12">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-1 md:gap-2">
                              <span className="text-sm md:text-xl font-black text-[#303030] truncate max-w-[120px] md:max-w-none uppercase tracking-tight">{battleData.playerTeam[battleData.playerIdx]?.p?.name}</span>
                              {battleData.playerTeam[battleData.playerIdx]?.p?.status && battleData.playerTeam[battleData.playerIdx]?.p?.status !== 'None' && (
                                <span className={`px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-[10px] font-bold text-white uppercase ${
                                  battleData.playerTeam[battleData.playerIdx].p.status === 'Burn' ? 'bg-orange-500' :
                                  battleData.playerTeam[battleData.playerIdx].p.status === 'Poison' ? 'bg-purple-500' :
                                  battleData.playerTeam[battleData.playerIdx].p.status === 'Paralysis' ? 'bg-yellow-500' :
                                  battleData.playerTeam[battleData.playerIdx].p.status === 'Sleep' ? 'bg-indigo-500' :
                                  'bg-blue-400'
                                }`}>
                                  {battleData.playerTeam[battleData.playerIdx].p.status}
                                </span>
                              )}
                            </div>
                            <span className="text-xs md:text-lg font-bold text-[#303030] opacity-60 italic">Nv. {battleData.playerTeam[battleData.playerIdx]?.p?.level}</span>
                          </div>
                          <div className="h-2 md:h-3 bg-[#303030] rounded-full overflow-hidden p-[1px] md:p-[2px] mb-1">
                            <motion.div 
                              animate={{ 
                                width: `${((battleData.playerTeam[battleData.playerIdx]?.hp || 0) / (battleData.playerTeam[battleData.playerIdx]?.maxHp || 1)) * 100}%`,
                                backgroundColor: (battleData.playerTeam[battleData.playerIdx]?.hp || 0) < (battleData.playerTeam[battleData.playerIdx]?.maxHp || 1) * 0.2 ? '#f43f5e' : 
                                               (battleData.playerTeam[battleData.playerIdx]?.hp || 0) < (battleData.playerTeam[battleData.playerIdx]?.maxHp || 1) * 0.5 ? '#f59e0b' : '#10b981'
                              }}
                              className="h-full rounded-full shadow-[0_0_5px_rgba(0,0,0,0.3)]"
                            />
                          </div>
                          <div className="text-right text-[10px] md:text-lg font-black text-[#303030] tabular-nums tracking-tighter">
                            {Math.ceil(battleData.playerTeam[battleData.playerIdx]?.hp || 0)} <span className="opacity-30">/</span> {battleData.playerTeam[battleData.playerIdx]?.maxHp || 0}
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Action Menu (Bottom Right) */}
                    <div className="flex flex-col gap-2 md:gap-3 w-full md:w-72">
                      {/* Tactical Commands */}
                      <div className="grid grid-cols-3 gap-1 md:gap-2 mb-1 md:mb-2">
                        <button 
                          onClick={() => coachAction('heal')}
                          disabled={battleData.momentum < 30 || battleData.turn !== 'player'}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${battleData.momentum >= 30 && battleData.turn === 'player' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30' : 'bg-zinc-900/50 border-white/5 text-zinc-600 opacity-50'}`}
                        >
                          <Heart size={16} />
                          <span className="text-[8px] font-black uppercase mt-1">Curar</span>
                          <span className="text-[8px] font-bold opacity-70">30%</span>
                        </button>
                        <button 
                          onClick={() => coachAction('atk')}
                          disabled={battleData.momentum < 50 || battleData.turn !== 'player'}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${battleData.momentum >= 50 && battleData.turn === 'player' ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30' : 'bg-zinc-900/50 border-white/5 text-zinc-600 opacity-50'}`}
                        >
                          <Zap size={16} />
                          <span className="text-[8px] font-black uppercase mt-1">Ataque</span>
                          <span className="text-[8px] font-bold opacity-70">50%</span>
                        </button>
                        <button 
                          onClick={() => coachAction('def')}
                          disabled={battleData.momentum < 40 || battleData.turn !== 'player'}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${battleData.momentum >= 40 && battleData.turn === 'player' ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/30' : 'bg-zinc-900/50 border-white/5 text-zinc-600 opacity-50'}`}
                        >
                          <Shield size={16} />
                          <span className="text-[8px] font-black uppercase mt-1">Defensa</span>
                          <span className="text-[8px] font-bold opacity-70">40%</span>
                        </button>
                      </div>
                      {!battleData.showMoves && !battleData.showTeam ? (
                        <div className="grid grid-cols-2 md:flex md:flex-col gap-2">
                          {battleData.playerTeam[battleData.playerIdx]?.p?.megaStone && !battleData.playerTeam[battleData.playerIdx]?.p?.megaEvolved && (
                            <button 
                              onClick={executeMegaEvolution}
                              disabled={battleData.turn !== 'player' || battleData.isAuto}
                              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl md:rounded-full py-2 md:py-3 px-4 md:px-6 text-sm md:text-xl font-black flex justify-between items-center shadow-lg hover:scale-105 transition-transform active:scale-95 col-span-2 md:col-span-1"
                            >
                              <span>MEGA EVOLUCIÓN</span>
                              <div className="w-5 h-5 md:w-8 md:h-8 rounded-full border-2 border-white/50 flex items-center justify-center">
                                <Sparkles size={14} className="text-white" />
                              </div>
                            </button>
                          )}
                          <button 
                            onClick={() => setBattleData(prev => prev ? { ...prev, showMoves: true } : null)}
                            className="bg-[#1A1A1A] text-white rounded-xl md:rounded-full py-2 md:py-3 px-4 md:px-6 text-sm md:text-xl font-black flex justify-between items-center shadow-lg hover:scale-105 transition-transform active:scale-95"
                          >
                            <span>LUCHAR</span>
                            <div className="w-5 h-5 md:w-8 md:h-8 rounded-full border-2 border-rose-500 flex items-center justify-center">
                              <div className="w-2 h-2 md:w-4 md:h-4 bg-rose-500 rounded-full" />
                            </div>
                          </button>
                          <button 
                            onClick={() => setBattleData(prev => prev ? { ...prev, showTeam: true } : null)}
                            className="bg-white text-[#1A1A1A] rounded-xl md:rounded-full py-2 md:py-3 px-4 md:px-6 text-sm md:text-xl font-black flex justify-between items-center shadow-lg hover:scale-105 transition-transform active:scale-95"
                          >
                            <span>EQUIPO</span>
                            <div className="w-5 h-5 md:w-8 md:h-8 rounded-full border-2 border-[#48A048] flex items-center justify-center">
                              <div className="w-2 h-2 md:w-4 md:h-4 bg-[#48A048] rounded-full" />
                            </div>
                          </button>
                          <button 
                            onClick={() => setGameState('management')}
                            className="bg-white text-[#1A1A1A] rounded-xl md:rounded-full py-2 md:py-3 px-4 md:px-6 text-sm md:text-xl font-black flex justify-between items-center shadow-lg hover:scale-105 transition-transform active:scale-95 col-span-2 md:col-span-1"
                          >
                            <span>HUIR</span>
                            <div className="w-5 h-5 md:w-8 md:h-8 rounded-full border-2 border-[#A048A0] flex items-center justify-center">
                              <div className="w-2 h-2 md:w-4 md:h-4 bg-[#A048A0] rounded-full" />
                            </div>
                          </button>
                        </div>
                      ) : battleData.showMoves ? (
                        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-3 md:p-4 shadow-2xl flex flex-col gap-1.5 md:gap-2 border border-zinc-200">
                          <div className="grid grid-cols-2 gap-2">
                            {battleData.playerTeam[battleData.playerIdx]?.p?.moves?.map((move, i) => (
                              <button 
                                key={i}
                                disabled={battleData.turn !== 'player' || battleData.isAuto}
                                onClick={() => {
                                  executeMove(true, move);
                                  setBattleData(prev => prev ? { ...prev, showMoves: false } : null);
                                }}
                                className={`py-2 md:py-3 px-2 md:px-4 rounded-xl ${getTypeColor(move.type)} text-black font-black text-xs md:text-base flex flex-col items-start hover:brightness-110 transition-all shadow-sm active:scale-95`}
                                style={{ textShadow: '0px 1px 2px rgba(255,255,255,0.5)' }}
                              >
                                <span className="uppercase tracking-tighter truncate w-full text-left">{move?.name || 'Ataque'}</span>
                                <span className="text-[8px] md:text-[10px] opacity-70 font-bold">{move.type}</span>
                              </button>
                            ))}
                          </div>
                          <button 
                            onClick={() => setBattleData(prev => prev ? { ...prev, showMoves: false } : null)}
                            className="py-1.5 md:py-2 text-center text-zinc-500 font-black text-xs md:text-sm hover:text-zinc-800 uppercase tracking-widest"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : battleData.showTeam ? (
                        <div className="bg-white rounded-2xl p-4 shadow-2xl flex flex-col gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                          {battleData.playerTeam.map((member, idx) => (
                            <button
                              key={idx}
                              disabled={member.hp <= 0 || idx === battleData.playerIdx || battleData.turn !== 'player' || battleData.isAuto}
                              onClick={() => {
                                setBattleData(prev => {
                                  if (!prev) return null;
                                  return {
                                    ...prev,
                                    playerIdx: idx,
                                    showTeam: false,
                                    turn: 'rival',
                                    log: [`¡Adelante ${member.p.name}!`, ...prev.log]
                                  };
                                });
                              }}
                              className={`flex items-center justify-between p-2 rounded-xl ${idx === battleData.playerIdx ? 'bg-zinc-200' : member.hp <= 0 ? 'bg-red-100 opacity-50' : 'bg-zinc-50 hover:bg-zinc-100'} transition-colors text-left`}
                            >
                              <div className="flex items-center gap-2">
                                <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${member.p.id}.png`} className="w-8 h-8 object-contain" />
                                <div>
                                  <div className="font-bold text-[#303030] text-sm">{member.p.name}</div>
                                  <div className="text-[10px] text-[#303030]">Nv. {member.p.level}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-bold text-[#303030]">{Math.ceil(member.hp)}/{member.maxHp}</div>
                              </div>
                            </button>
                          ))}
                          <button 
                            onClick={() => setBattleData(prev => prev ? { ...prev, showTeam: false } : null)}
                            className="py-2 text-center text-zinc-500 font-bold hover:text-zinc-800"
                          >
                            Volver
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          ) : (
            <motion.div
              key="management"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {activeTab === 'team' && gameState === 'management' && (
            <motion.div 
              key="team"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 pb-20"
            >
              {/* Team Overview */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-2 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-[32px] md:rounded-[40px] p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-indigo-600/10 blur-[80px] md:blur-[120px] rounded-full -mr-32 md:-mr-48 -mt-32 md:-mt-48 animate-pulse" />
                  <div className="absolute bottom-0 left-0 w-48 md:w-64 h-48 md:h-64 bg-rose-600/10 blur-[70px] md:blur-[100px] rounded-full -ml-24 md:-ml-32 -mb-24 md:-mb-32" />
                  
                  <div className="relative z-10 text-center md:text-left space-y-4 w-full md:w-auto">
                    <div>
                      <h2 className="text-zinc-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2">Poder del Equipo</h2>
                      <div className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white flex items-baseline justify-center md:justify-start gap-2 md:gap-3 leading-none group cursor-default">
                        <motion.span 
                          whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
                          className={teamOvr < maxTeamOvr ? 'text-red-400' : 'text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500'}
                        >
                          {teamOvr}
                        </motion.span>
                        <span className="text-xl md:text-2xl text-rose-500 font-black italic">PWR</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 md:gap-3 justify-center md:justify-start">
                      <div className="bg-white/5 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-white/10 flex items-center gap-2">
                        <Users size={14} className="text-indigo-400 md:w-4 md:h-4" />
                        <span className="text-white font-black text-xs md:text-base">{teamMembers.length}/6</span>
                        <span className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Activos</span>
                      </div>
                      <div className="bg-white/5 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-white/10 flex items-center gap-2">
                        <Trophy size={14} className="text-amber-400 md:w-4 md:h-4" />
                        <span className="text-white font-black text-xs md:text-base">{defeatedGyms.length}/8</span>
                        <span className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Medallas</span>
                      </div>
                    </div>

                    {teamSynergies.active.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
                        {teamSynergies.active.map(syn => (
                          <motion.div 
                            key={syn.type} 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white/5 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-2 border border-white/10 shadow-xl backdrop-blur-md group hover:bg-white/10 transition-all"
                          >
                            <span className={`${getTypeColor(syn.type)} w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]`} />
                            <span className="text-white uppercase tracking-widest">{syn.type}</span>
                            <span className="text-indigo-400 bg-black/40 px-2 py-0.5 rounded-lg">x{syn.count}</span>
                            <span className="text-emerald-400">+{syn.bonus}</span>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    <div className="pt-4 flex flex-wrap gap-3 justify-center md:justify-start">
                      <button 
                        onClick={autoSelectBestTeam}
                        className="px-6 py-3 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-zinc-200 transition-all shadow-xl flex items-center gap-2 group"
                      >
                        <Zap size={14} className="group-hover:animate-bounce" />
                        Auto-Optimizar
                      </button>
                      <button 
                        onClick={() => setTeam([])}
                        className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        Limpiar
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 relative z-10 w-full max-w-sm">
                    {[...Array(6)].map((_, i) => (
                      <motion.div 
                        key={i} 
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        className={`aspect-square rounded-3xl border-2 flex flex-col items-center justify-center overflow-hidden group transition-all duration-300 relative ${teamMembers[i] ? 'bg-zinc-800 border-indigo-500/50 cursor-pointer shadow-2xl shadow-indigo-500/10' : 'bg-black/40 border-dashed border-white/10'}`}
                        onClick={() => {
                          if (teamMembers[i]) {
                            setSelectedLabPokemonId(teamMembers[i].instanceId);
                            setActiveTab('lab');
                          } else {
                            // Scroll to collection
                            document.getElementById('collection-section')?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                      >
                        {teamMembers[i] ? (
                          <>
                            <div className={`absolute inset-0 bg-gradient-to-b ${getTypeGradient(teamMembers[i].types[0])} opacity-10`} />
                            <img 
                              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${teamMembers[i].id}.png`} 
                              alt="" 
                              className="w-full h-full object-contain group-hover:scale-125 transition-transform relative z-10 drop-shadow-2xl"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[8px] font-black text-white z-20 border border-white/10">
                              L.{teamMembers[i].level}
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleTeamMember(teamMembers[i].instanceId); }}
                              className="absolute top-2 right-2 w-6 h-6 bg-rose-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-30 shadow-lg"
                            >
                              <X size={12} strokeWidth={3} />
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-zinc-700 group-hover:text-zinc-500 transition-colors">
                            <Users size={24} />
                            <span className="text-[8px] font-black uppercase tracking-widest">Vacío</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-[32px] md:rounded-[40px] p-6 md:p-8 flex flex-col justify-center items-center text-center space-y-4 md:space-y-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500" />
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600/10 rounded-[24px] md:rounded-[32px] flex items-center justify-center text-indigo-500 shadow-inner">
                    <Activity size={32} className="md:w-10 md:h-10" />
                  </div>
                  <div className="space-y-1 md:space-y-2">
                    <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-white">Próximo Desafío</h3>
                    <p className="text-zinc-500 text-xs md:text-sm font-medium leading-relaxed">Derrota a los líderes de gimnasio para desbloquear nuevas zonas y Pokémon legendarios.</p>
                  </div>
                  <div className="w-full bg-black/40 rounded-2xl p-4 border border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="text-zinc-500">Progreso de Liga</span>
                      <span className="text-indigo-400">{defeatedGyms.length}/8</span>
                    </div>
                    <div className="h-2 bg-zinc-950 rounded-full overflow-hidden p-0.5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(defeatedGyms.length / 8) * 100}%` }}
                        className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('league')}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                  >
                    Ir a la Liga
                  </button>
                </div>
              </section>

              {/* Collection */}
              <section id="collection-section" className="space-y-6 md:space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 border-b border-white/5 pb-6 md:pb-8">
                  <div className="space-y-1 md:space-y-2">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-1.5 md:w-2 h-6 md:h-8 bg-indigo-500 rounded-full" />
                      <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight italic text-white">Tu Colección</h2>
                    </div>
                    <p className="text-zinc-500 text-[10px] md:text-sm font-bold uppercase tracking-[0.2em] ml-4 md:ml-5">
                      {collection.length} Pokémon Obtenidos • {teamMembers.length} en Equipo
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="bg-black/40 rounded-xl md:rounded-2xl p-1 border border-white/5 flex w-full md:w-auto">
                      <button 
                        onClick={() => {
                          setIsBulkTrainingMode(!isBulkTrainingMode);
                          setSelectedForBulkTrain([]);
                        }}
                        className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isBulkTrainingMode ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                      >
                        <Dumbbell size={12} className="md:w-[14px] md:h-[14px]" />
                        {isBulkTrainingMode ? 'Cancelar' : 'Entrenamiento Masivo'}
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isBulkTrainingMode && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          <div className="space-y-1">
                            <div className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Nivel Objetivo</div>
                            <div className="flex items-center gap-3">
                              <input 
                                type="range" 
                                min="2" 
                                max="50" 
                                value={bulkTrainTargetLevel} 
                                onChange={(e) => setBulkTrainTargetLevel(parseInt(e.target.value))}
                                className="w-32 accent-indigo-500"
                              />
                              <span className="text-2xl font-black text-white italic">LVL {bulkTrainTargetLevel}</span>
                            </div>
                          </div>
                          
                          <div className="h-12 w-px bg-white/10 hidden md:block" />
                          
                          <div className="space-y-1">
                            <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Seleccionados</div>
                            <div className="text-xl font-black text-white">{selectedForBulkTrain.length} Pokémon</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-2 text-amber-400 font-black">
                              <Coins size={14} />
                              <span>{bulkTrainCosts.coinCost}</span>
                            </div>
                            <div className="flex items-center justify-end gap-2 text-indigo-400 font-black">
                              <Dumbbell size={14} />
                              <span>{bulkTrainCosts.tpCost}</span>
                            </div>
                          </div>
                          
                          <button 
                            onClick={handleBulkTrain}
                            disabled={selectedForBulkTrain.length === 0 || tp < bulkTrainCosts.tpCost || coins < bulkTrainCosts.coinCost}
                            className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${selectedForBulkTrain.length > 0 && tp >= bulkTrainCosts.tpCost && coins >= bulkTrainCosts.coinCost ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                          >
                            Entrenar Ahora
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
                      {collection?.map(p => (
                        <div key={p.instanceId} className="relative cursor-pointer" onClick={() => !isBulkTrainingMode && setSelectedPokemon(p)}>
                          <PokemonCardUI 
                            pokemon={p} 
                            onTrain={isBulkTrainingMode ? undefined : () => handleTrain(p.instanceId)}
                            onPowerUp={isBulkTrainingMode ? undefined : () => handlePowerUp(p.instanceId)}
                            onEvolve={isBulkTrainingMode ? undefined : () => handleEvolve(p.instanceId)}
                            onUseBandita={isBulkTrainingMode ? undefined : () => handleUseBandita(p.instanceId)}
                            onHealFatigue={isBulkTrainingMode ? undefined : () => handleHealFatigue(p.instanceId)}
                            onRetire={isBulkTrainingMode ? undefined : () => handleRetireToHallOfFame(p.instanceId)}
                            canTrain={tp >= TRAINING_COST_BASE}
                            canPowerUp={stardust >= POWERUP_COST_BASE}
                            canEvolve={coins >= currentEvolutionCost}
                            canUseBandita={banditas > 0}
                            canHealFatigue={coins >= Math.floor(p.fatigue * 2 * (1 - (((facilities || []).find(f => f.id === 'medical')?.level || 1) - 1) * 0.1))}
                            isSelected={selectedForBulkTrain.includes(p.instanceId)}
                            onSelect={isBulkTrainingMode ? () => toggleBulkTrainSelection(p.instanceId) : undefined}
                          />
                      {!isBulkTrainingMode && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleTeamMember(p.instanceId); }}
                          className={`absolute -top-2 -right-2 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all z-20 ${team.includes(p.instanceId) ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-700 hover:text-zinc-400'}`}
                        >
                          <Star size={14} fill={team.includes(p.instanceId) ? "currentColor" : "none"} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'league' && (
            <motion.div 
              key="league"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              {/* Header Section */}
              <div className="relative overflow-hidden bg-zinc-900 border border-white/5 rounded-[32px] md:rounded-[40px] p-6 md:p-12">
                <div className="absolute top-0 right-0 p-6 md:p-12 opacity-5">
                  <Trophy size={160} className="md:w-[200px] md:h-[200px]" />
                </div>
                
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <Medal size={24} className="text-white md:w-8 md:h-8" />
                    </div>
                    <div>
                      <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter">Liga Pokémon</h2>
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">El camino hacia la gloria eterna</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 md:gap-4 items-center">
                    <div className="bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-2 md:py-3 flex items-center gap-3">
                      <div className="text-amber-400 font-black text-xl md:text-2xl">{defeatedGyms.length}/8</div>
                      <div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-zinc-500 leading-tight">Medallas<br/>Obtenidas</div>
                    </div>
                    
                    <button 
                      onClick={() => setShowRankGuide(true)}
                      className="bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl md:rounded-2xl px-4 md:px-6 py-2 md:py-3 flex items-center gap-3 transition-all group"
                    >
                      <Info size={18} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                      <div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-indigo-300 leading-tight">Guía de<br/>Rangos</div>
                    </button>
                    
                    <div className="flex-1 min-w-[200px] h-12 md:h-14 bg-black/40 rounded-xl md:rounded-2xl border border-white/5 p-1.5 md:p-2 flex gap-1">
                      {[...Array(8)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`flex-1 rounded-lg transition-all duration-500 ${i < defeatedGyms.length ? 'bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/20' : 'bg-zinc-800'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gyms Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {GYMS.map((gym, index) => {
                  const isDefeated = defeatedGyms.includes(gym.id);
                  const canChallenge = index === 0 || defeatedGyms.includes(GYMS[index-1].id);
                  
                  const getTypeIcon = (type: string) => {
                    switch(type) {
                      case 'Fire': return <Flame size={24} className="text-orange-500" />;
                      case 'Water': return <Droplets size={24} className="text-blue-500" />;
                      case 'Grass': return <Leaf size={24} className="text-emerald-500" />;
                      case 'Electric': return <Zap size={24} className="text-amber-400" />;
                      case 'Rock': return <Mountain size={24} className="text-stone-500" />;
                      case 'Ground': return <MapIcon size={24} className="text-yellow-700" />;
                      case 'Poison': return <Skull size={24} className="text-purple-500" />;
                      case 'Psychic': return <Eye size={24} className="text-pink-500" />;
                      default: return <Star size={24} className="text-zinc-400" />;
                    }
                  };

                  return (
                    <motion.div 
                      key={gym.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`relative group p-6 rounded-[32px] border-2 transition-all duration-300 ${
                        isDefeated 
                          ? 'bg-emerald-900/10 border-emerald-500/30' 
                          : canChallenge 
                            ? 'bg-zinc-900 border-white/10 hover:border-indigo-500/50' 
                            : 'bg-zinc-950 border-white/5 opacity-60 grayscale'
                      }`}
                    >
                      <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity">
                        {getTypeIcon(gym.type)}
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Gimnasio {index + 1}</div>
                          <h3 className="text-xl font-black text-white leading-tight">{gym.name}</h3>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-black/40 rounded-2xl border border-white/5">
                          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-xl">👤</div>
                          <div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Líder</div>
                            <div className="text-xs font-bold text-white">{gym.leader}</div>
                          </div>
                        </div>

                        <div className="flex justify-between items-end">
                          <div className="space-y-1">
                            <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Nivel Sugerido</div>
                            <div className="text-lg font-black text-indigo-400 italic">LVL {gym.level}</div>
                          </div>
                          
                          {isDefeated ? (
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                              <Check size={24} strokeWidth={3} />
                            </div>
                          ) : canChallenge ? (
                            <button 
                              onClick={() => startBattle(`gym-${gym.id}`)}
                              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                            >
                              Desafiar
                            </button>
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-600">
                              <Lock size={20} />
                            </div>
                          )}
                        </div>
                      </div>

                      {isDefeated && (
                        <div className="mt-4 pt-4 border-t border-emerald-500/20 flex items-center gap-2 text-emerald-400">
                          <Medal size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{gym.badgeName}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              
              {/* Final Championship Section */}
              <AnimatePresence>
                {defeatedGyms.length === 8 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 40, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="relative p-12 rounded-[48px] border-4 border-amber-500/30 bg-zinc-900 overflow-hidden text-center shadow-2xl shadow-amber-500/10"
                  >
                    {/* Animated Background Elements */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <motion.div 
                        animate={{ 
                          rotate: 360,
                          scale: [1, 1.2, 1],
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl"
                      />
                      <motion.div 
                        animate={{ 
                          rotate: -360,
                          scale: [1, 1.3, 1],
                        }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-500/10 to-transparent rounded-full blur-3xl"
                      />
                    </div>

                    <div className="relative z-10 space-y-8">
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="w-32 h-32 bg-gradient-to-b from-amber-400 to-amber-600 rounded-[40px] mx-auto flex items-center justify-center shadow-2xl shadow-amber-500/40 border-4 border-white/20"
                      >
                        <Crown size={64} className="text-zinc-950" />
                      </motion.div>

                      <div className="space-y-2">
                        <h3 className="text-5xl md:text-7xl font-black text-white uppercase italic tracking-tighter leading-none">
                          Campeonato <span className="text-amber-400">Final</span>
                        </h3>
                        <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-sm">La prueba definitiva para un Maestro Pokémon</p>
                      </div>

                      <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                        <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
                          <Users size={20} className="text-indigo-400" />
                          <span className="text-xs font-black text-white uppercase tracking-widest">Enfrenta al Alto Mando</span>
                        </div>
                        <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
                          <Trophy size={20} className="text-amber-400" />
                          <span className="text-xs font-black text-white uppercase tracking-widest">Recompensa Legendaria</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => startChampionshipTournament()}
                        className="group relative px-12 py-6 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-2xl uppercase italic rounded-[32px] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/20"
                      >
                        <span className="relative z-10 flex items-center gap-4">
                          Entrar al Campeonato <ChevronRight size={24} />
                        </span>
                        <div className="absolute inset-0 bg-white/20 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'event' && gameState === 'management' && (
            <motion.div
              key="event-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white">Zona de Eventos</h2>
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Participa en eventos especiales para recompensas únicas</p>
                </div>
                {activeEvent && (
                  <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                    <Clock size={14} className="text-amber-400" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      Termina en: {Math.max(0, Math.floor((activeEvent.endDate - Date.now()) / (1000 * 60 * 60)))}h
                    </span>
                  </div>
                )}
              </div>

              {!activeEvent ? (
                <div className="p-12 rounded-[40px] bg-zinc-900 border border-white/5 text-center space-y-4">
                  <div className="text-6xl">⏳</div>
                  <h3 className="text-2xl font-black uppercase italic text-white">No hay eventos activos</h3>
                  <p className="text-zinc-500 max-w-md mx-auto">Vuelve pronto para participar en nuevos desafíos y conseguir Pokémon legendarios.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {/* Event Details Card */}
                  <div className="xl:col-span-2 space-y-8">
                    <div className={`p-6 md:p-12 rounded-[32px] md:rounded-[48px] border-2 ${activeEvent.color} bg-zinc-900 relative overflow-hidden group shadow-2xl shadow-amber-500/20`}>
                      <div className="absolute top-0 right-0 p-6 md:p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <div className="text-[120px] md:text-[200px] leading-none select-none">{activeEvent.icon}</div>
                      </div>
                      
                      <div className="relative z-10 space-y-6 md:space-y-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <span className="px-3 py-1 rounded-full bg-amber-500 text-black text-[8px] md:text-[10px] font-black uppercase tracking-widest">Evento Especial</span>
                            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">ID: {activeEvent.id}</span>
                          </div>
                          <h3 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter text-white leading-none">
                            {activeEvent.title}
                          </h3>
                          <p className="text-base md:text-xl text-zinc-400 font-medium leading-relaxed max-w-2xl">
                            {activeEvent.description}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activeEvent.modifiers.coinMultiplier && (
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                                <Coins size={24} />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Bonus de Oro</div>
                                <div className="text-xl font-black text-white">x{activeEvent.modifiers.coinMultiplier} Monedas</div>
                              </div>
                            </div>
                          )}
                          {activeEvent.modifiers.shinyRate && (
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-500">
                                <Sparkles size={24} />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Probabilidad Shiny</div>
                                <div className="text-xl font-black text-white">x{activeEvent.modifiers.shinyRate} Probabilidad</div>
                              </div>
                            </div>
                          )}
                          {activeEvent.modifiers.typeBoost && (
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                                <Zap size={24} />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Potenciación Tipo</div>
                                <div className="text-xl font-black text-white">+{Math.round((activeEvent.modifiers.typeBoost.boost - 1) * 100)}% {activeEvent.modifiers.typeBoost.type}</div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-8 border-t border-white/10">
                          <button
                            onClick={() => handleMatchPreview('event')}
                            disabled={energy < 1 || teamMembers.length === 0}
                            className={`w-full md:w-auto px-12 py-6 rounded-3xl text-xl font-black uppercase italic tracking-tight transition-all flex items-center justify-center gap-4 shadow-2xl ${
                              energy >= 1 && teamMembers.length > 0
                                ? 'bg-white text-black hover:scale-105 active:scale-95'
                                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                            }`}
                          >
                            <Sword size={24} />
                            Jugar Batalla de Evento
                          </button>
                          <p className="mt-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center md:text-left">
                            Cuesta 1 de Energía • Enfrenta al Guardián del Evento
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Event Missions Side */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                      <div className="w-2 h-8 rounded-full bg-amber-500" />
                      <h3 className="text-xl font-black uppercase italic tracking-tight text-white">Misiones de Evento</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {(missions || []).filter(m => m.type === 'event').map((m) => (
                        <div 
                          key={m.id} 
                          className={`p-6 rounded-[32px] border transition-all ${m.claimed ? 'bg-zinc-900/30 border-white/5 opacity-60' : 'bg-gradient-to-br from-zinc-900 to-zinc-800 border-white/10 hover:border-white/20 shadow-xl'}`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                              <h4 className="text-lg font-black uppercase tracking-tight text-white">{m.title}</h4>
                              <p className="text-xs text-zinc-500 font-medium leading-relaxed">{m.description}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-black text-white">{m.current} / {m.goal}</div>
                              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Progreso</div>
                            </div>
                          </div>

                          <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden mb-6 border border-white/5 p-0.5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (m.current / m.goal) * 100)}%` }}
                              className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(m.reward).map(([key, val]) => (
                                <div key={key} className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                                  {key === 'coins' && <Coins size={10} className="text-amber-400" />}
                                  {key === 'stardust' && <Sparkles size={10} className="text-purple-400" />}
                                  {key === 'tp' && <Dumbbell size={10} className="text-indigo-400" />}
                                  {key === 'banditas' && <Heart size={10} className="text-rose-400" />}
                                  <span className="text-[10px] font-black text-white">+{val}</span>
                                </div>
                              ))}
                            </div>

                            {m.current >= m.goal && !m.claimed && (
                              <button
                                onClick={() => claimMissionReward(m.id)}
                                className="px-6 py-2 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-zinc-200 transition-all shadow-lg shadow-white/10"
                              >
                                Reclamar
                              </button>
                            )}
                            {m.claimed && (
                              <div className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px] tracking-widest">
                                <Check size={14} /> Completada
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {(missions || []).filter(m => m.type === 'event').length === 0 && (
                        <div className="p-8 rounded-3xl border border-dashed border-white/10 text-center">
                          <p className="text-zinc-500 text-sm font-medium italic">No hay misiones específicas para este evento.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'missions' && gameState === 'management' && (
            <motion.div
              key="missions-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white">Centro de Misiones</h2>
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] md:text-xs">Completa desafíos para obtener recompensas legendarias</p>
                </div>
                {activeEvent && (
                  <div className={`px-6 py-4 rounded-3xl border ${activeEvent.color} bg-white/5 backdrop-blur-xl flex items-center gap-4 shadow-2xl`}>
                    <div className="text-4xl">{activeEvent.icon}</div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Evento Activo</div>
                      <div className="text-lg font-black uppercase italic text-white">{activeEvent.title}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8">
                {['daily', 'weekly', 'event', 'league'].map((type) => (
                  <div key={type} className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                      <div className={`w-2 h-8 rounded-full ${type === 'daily' ? 'bg-rose-500' : type === 'weekly' ? 'bg-indigo-500' : type === 'event' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <h3 className="text-xl font-black uppercase italic tracking-tight text-white">
                        {type === 'daily' ? 'Diarias' : type === 'weekly' ? 'Semanales' : type === 'event' ? 'Evento' : 'Liga'}
                      </h3>
                      {type === 'event' && activeEvent && (
                        <button 
                          onClick={() => startBattle('event')}
                          className="ml-auto px-4 py-1 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:scale-105 transition-all"
                        >
                          Jugar
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {(missions || []).filter(m => m.type === type).map((m) => (
                        <div 
                          key={m.id} 
                          className={`p-6 rounded-[32px] border transition-all ${m.claimed ? 'bg-zinc-900/30 border-white/5 opacity-60' : 'bg-gradient-to-br from-zinc-900 to-zinc-800 border-white/10 hover:border-white/20 shadow-xl'}`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                              <h4 className="text-lg font-black uppercase tracking-tight text-white">{m.title}</h4>
                              <p className="text-xs text-zinc-500 font-medium leading-relaxed">{m.description}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-black text-white">{m.current} / {m.goal}</div>
                              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Progreso</div>
                            </div>
                          </div>

                          <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden mb-6 border border-white/5 p-0.5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (m.current / m.goal) * 100)}%` }}
                              className={`h-full rounded-full bg-gradient-to-r ${type === 'daily' ? 'from-rose-600 to-rose-400' : type === 'weekly' ? 'from-indigo-600 to-indigo-400' : type === 'event' ? 'from-amber-600 to-amber-400' : 'from-emerald-600 to-emerald-400'}`}
                            />
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(m.reward).map(([key, val]) => (
                                <div key={key} className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                                  {key === 'coins' && <Coins size={10} className="text-amber-400" />}
                                  {key === 'stardust' && <Sparkles size={10} className="text-purple-400" />}
                                  {key === 'tp' && <Dumbbell size={10} className="text-indigo-400" />}
                                  {key === 'banditas' && <Heart size={10} className="text-rose-400" />}
                                  <span className="text-[10px] font-black text-white">+{val}</span>
                                </div>
                              ))}
                            </div>

                            {m.current >= m.goal && !m.claimed && (
                              <button 
                                onClick={() => claimMissionReward(m.id)}
                                className="px-6 py-2 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-zinc-200 transition-all shadow-lg shadow-white/10"
                              >
                                Reclamar
                              </button>
                            )}
                            {m.claimed && (
                              <div className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px] tracking-widest">
                                <Check size={14} /> Completada
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'shop' && gameState === 'management' && (
            <motion.div 
              key="shop"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-6xl mx-auto space-y-10 md:space-y-16 py-6 md:py-12"
            >
              <div className="text-center space-y-2 md:space-y-4">
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic flex items-center justify-center gap-3 md:gap-4">
                  <Store className="text-amber-500 w-8 h-8 md:w-12 md:h-12" /> Poké Tienda
                </h2>
                <p className="text-zinc-400 text-sm md:text-base max-w-lg mx-auto px-4">Recluta nuevos talentos para tu equipo y adquiere recursos esenciales para la aventura.</p>
              </div>

              {/* Items & Stones */}
              <div className="space-y-6 md:space-y-8 mt-12">
                <div className="flex items-center gap-3 md:gap-4 px-4 md:px-0">
                  <Package className="text-emerald-400 w-6 h-6 md:w-8 md:h-8" />
                  <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic text-white">Objetos y Piedras</h3>
                  <div className="h-px bg-white/10 flex-1 ml-2 md:ml-4" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 md:px-0">
                  {/* Stones */}
                  {['fire', 'water', 'thunder', 'leaf', 'moon', 'sun', 'shiny', 'dusk', 'dawn', 'ice'].map(stone => {
                    const stoneNamesES: Record<string, string> = {
                      fire: 'Fuego', water: 'Agua', thunder: 'Trueno', leaf: 'Hoja', 
                      moon: 'Lunar', sun: 'Solar', shiny: 'Brillante', dusk: 'Noche', 
                      dawn: 'Alba', ice: 'Hielo'
                    };
                    return (
                      <div key={stone} className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3 hover:border-white/20 transition-all">
                        <img 
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${stone}-stone.png`} 
                          alt={stone}
                          className="w-12 h-12 object-contain drop-shadow-md"
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-center">
                          <div className="font-bold text-white capitalize text-sm">Piedra {stoneNamesES[stone] || stone}</div>
                          <div className="text-[10px] text-zinc-400">Evolución</div>
                        </div>
                        <button 
                          onClick={() => {
                            if (coins >= 5000) {
                              setCoins(c => c - 5000);
                              setEvolutionStones(prev => ({ ...prev, [stone]: (prev[stone] || 0) + 1 }));
                              setHistory(prev => [`Compraste Piedra ${stoneNamesES[stone] || stone}.`, ...prev].slice(0, 10));
                            }
                          }}
                          disabled={coins < 5000}
                          className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider disabled:opacity-50"
                        >
                          5000 🪙
                        </button>
                      </div>
                    );
                  })}
                  {/* Mega Stones */}
                  <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3 hover:border-white/20 transition-all col-span-2 md:col-span-4">
                    <div className="flex gap-4 items-center">
                      <img 
                        src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lucarionite.png" 
                        alt="Mega Stone"
                        className="w-12 h-12 object-contain drop-shadow-md"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-center">
                        <div className="font-bold text-white">Mega Piedra Aleatoria</div>
                        <div className="text-xs text-zinc-400">Desata el poder oculto</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (coins >= 10000) {
                          setCoins(c => c - 10000);
                          const possibleStones = [
                            'Charizardite X', 'Charizardite Y', 'Venusaurite', 'Blastoisinite', 'Lucarionite', 
                            'Gengarite', 'Alakazite', 'Mewtwonite X', 'Mewtwonite Y', 'Rayquazite',
                            'Scizorite', 'Steelixite', 'Tyranitarite', 'Salamencite', 'Metagrossite', 
                            'Garchompite', 'Gardevoirite', 'Galladite', 'Aggronite', 'Houndoominite', 
                            'Manectite', 'Pinsirite', 'Heracronite', 'Banettite', 'Absolite', 
                            'Medichamite', 'Ampharosite', 'Aerodactylite', 'Mawilite', 'Kangaskhanite', 
                            'Gyaradosite'
                          ];
                          const randomStone = possibleStones[Math.floor(Math.random() * possibleStones.length)];
                          setMegaStones(prev => [...prev, randomStone]);
                          setHistory(prev => [`¡Obtuviste ${randomStone}!`, ...prev].slice(0, 10));
                        }
                      }}
                      disabled={coins < 10000}
                      className="w-full max-w-xs mx-auto py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm uppercase tracking-wider disabled:opacity-50"
                    >
                      10000 🪙
                    </button>
                  </div>
                </div>
              </div>

              {/* Held Items */}
              <div className="space-y-6 md:space-y-8 mt-12">
                <div className="flex items-center gap-3 md:gap-4 px-4 md:px-0">
                  <ShieldCheck className="text-blue-400 w-6 h-6 md:w-8 md:h-8" />
                  <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic text-white">Objetos de Combate</h3>
                  <div className="h-px bg-white/10 flex-1 ml-2 md:ml-4" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 px-4 md:px-0">
                  {HELD_ITEMS.map(item => (
                    <div key={item.id} className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3 hover:border-white/20 transition-all group relative">
                      <div className="absolute -top-2 -right-2 bg-zinc-800 text-[8px] font-black px-2 py-1 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none w-32 text-center">
                        {item.description}
                      </div>
                      <img 
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${item.id}.png`} 
                        alt={item.name}
                        className="w-12 h-12 object-contain drop-shadow-md group-hover:scale-110 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-center">
                        <div className="font-bold text-white text-[10px] sm:text-xs leading-tight">{item.name}</div>
                        <div className="text-[8px] text-zinc-500 uppercase tracking-widest mt-1">{item.effect}</div>
                      </div>
                      <button 
                        onClick={() => {
                          if (coins >= item.price) {
                            setCoins(c => c - item.price);
                            setHeldItems(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
                            setHistory(prev => [`Compraste ${item.name}.`, ...prev].slice(0, 10));
                          }
                        }}
                        disabled={coins < item.price}
                        className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-wider disabled:opacity-50 mt-auto"
                      >
                        {item.price} 🪙
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stardust Packs (Premium) */}
              <div className="space-y-6 md:space-y-8">
                <div className="flex items-center gap-3 md:gap-4 px-4 md:px-0">
                  <Sparkles className="text-fuchsia-400 w-6 h-6 md:w-8 md:h-8" />
                  <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic text-white">Sobres Estelares</h3>
                  <div className="h-px bg-white/10 flex-1 ml-2 md:ml-4" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 px-4 md:px-0">
                  {PACK_TYPES.filter(p => p.costType === 'stardust').map(pack => {
                    const canAfford = stardust >= pack.cost;
                    const getPackGradient = (id: string) => {
                      switch(id) {
                        case 'stardust': return 'from-purple-500 to-fuchsia-700';
                        case 'champion': return 'from-red-600 to-rose-900';
                        default: return 'from-zinc-500 to-zinc-700';
                      }
                    };

                    return (
                      <motion.div 
                        key={pack.id} 
                        whileHover={{ y: -10, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-zinc-900 border border-white/5 rounded-[24px] md:rounded-[32px] p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6 md:gap-8 group hover:border-white/20 transition-all relative overflow-hidden shadow-xl"
                      >
                        <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${getPackGradient(pack.id)}`} />
                        
                        <div className={`w-32 h-44 md:w-40 md:h-56 shrink-0 bg-gradient-to-br ${getPackGradient(pack.id)} rounded-xl md:rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center group-hover:scale-110 transition-transform duration-500 relative overflow-hidden border border-white/20`}>
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 group-hover:animate-shine pointer-events-none" />
                          <ShoppingBag size={48} className="text-white drop-shadow-md md:w-16 md:h-16" />
                        </div>
                        
                        <div className="flex-1 relative z-10 space-y-3 md:space-y-4 text-center sm:text-left">
                          <div>
                            <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight">{pack.name}</h3>
                            <p className="text-zinc-400 text-xs md:text-sm mt-1 md:mt-2 font-medium leading-relaxed">{pack.description}</p>
                          </div>
                          
                          <div className="text-3xl md:text-4xl font-black text-purple-400 flex items-center justify-center sm:justify-start gap-2">
                            <Sparkles size={24} className="md:w-7 md:h-7" />
                            {pack.cost} 
                            <span className="text-[10px] md:text-xs uppercase tracking-widest text-zinc-500">Polvos</span>
                          </div>
                          
                          <button 
                            onClick={() => handleScout(pack.id)}
                            disabled={!canAfford}
                            className={`w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm transition-all ${canAfford ? 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                          >
                            Comprar
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Coin Packs */}
              <div className="space-y-6 md:space-y-8">
                <div className="flex items-center gap-3 md:gap-4 px-4 md:px-0">
                  <Coins className="text-amber-400 w-6 h-6 md:w-8 md:h-8" />
                  <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic text-white">Sobres de Reclutamiento</h3>
                  <div className="h-px bg-white/10 flex-1 ml-2 md:ml-4" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 px-4 md:px-0">
                  {PACK_TYPES.filter(p => p.costType === 'coins').map(pack => {
                    const canAfford = coins >= pack.cost;
                    const getPackGradient = (id: string) => {
                      switch(id) {
                        case 'standard': return 'from-zinc-500 to-zinc-700';
                        case 'premium': return 'from-blue-500 to-indigo-700';
                        case 'elite': return 'from-rose-500 to-rose-700';
                        case 'master': return 'from-amber-400 to-amber-600';
                        case 'mythic': return 'from-emerald-400 to-teal-600';
                        default: return 'from-zinc-500 to-zinc-700';
                      }
                    };

                    return (
                      <motion.div 
                        key={pack.id} 
                        whileHover={{ y: -10, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-zinc-900 border border-white/5 rounded-[24px] md:rounded-[32px] p-5 md:p-6 flex flex-col items-center text-center space-y-4 md:space-y-6 group hover:border-white/20 transition-all relative overflow-hidden shadow-xl"
                      >
                        <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${getPackGradient(pack.id)}`} />
                        
                        <div className={`w-24 h-36 md:w-28 md:h-40 bg-gradient-to-br ${getPackGradient(pack.id)} rounded-xl md:rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center group-hover:scale-110 transition-transform duration-500 relative overflow-hidden border border-white/20`}>
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 group-hover:animate-shine pointer-events-none" />
                          <ShoppingBag size={40} className="text-white drop-shadow-md md:w-12 md:h-12" />
                        </div>
                        
                        <div className="relative z-10 flex-1 flex flex-col justify-between w-full">
                          <div>
                            <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tight">{pack.name}</h3>
                            <p className="text-zinc-400 text-[9px] md:text-[10px] mt-1 md:mt-2 font-medium leading-relaxed h-8 md:h-10 flex items-center justify-center">{pack.description}</p>
                          </div>
                          
                          <div className="mt-3 md:mt-4 space-y-3 md:space-y-4">
                            <div className="text-xl md:text-2xl font-black text-amber-400 flex items-center justify-center gap-2">
                              <Coins size={14} className="md:w-4 md:h-4" />
                              {pack.cost} 
                              <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-zinc-500">Monedas</span>
                            </div>
                            
                            <button 
                              onClick={() => handleScout(pack.id)}
                              disabled={!canAfford}
                              className={`w-full py-2.5 md:py-3 rounded-lg md:rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${canAfford ? 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                            >
                              Comprar
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 flex items-start gap-4">
                <Info className="text-indigo-500 shrink-0" size={24} />
                <div className="text-sm text-zinc-400 leading-relaxed">
                  <span className="text-indigo-400 font-bold">Consejo de Manager:</span> Los Pokémon Épicos tienen un OVR inicial más alto y pueden alcanzar niveles superiores, lo que los hace indispensables para las ligas más avanzadas.
                </div>
              </div>

              {/* Resources */}
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <Package className="text-emerald-400" size={32} />
                  <h3 className="text-3xl font-black tracking-tighter uppercase italic text-white">Recursos y Objetos</h3>
                  <div className="h-px bg-white/10 flex-1 ml-4" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-zinc-900 border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center space-y-6 group hover:border-amber-500/50 transition-all">
                    <div className="w-32 h-40 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl shadow-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Zap size={48} className="text-white/80" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase italic">Energía x10</h3>
                      <p className="text-zinc-500 text-xs mt-2">Recarga tu energía para seguir jugando.</p>
                    </div>
                    <div className="text-3xl font-black text-amber-400">500 <span className="text-xs">Monedas</span></div>
                    <button 
                      onClick={() => {
                        if (coins >= 500) {
                          setCoins(c => Math.max(0, c - 500));
                          setEnergy(e => Math.min(100, e + 10));
                          setHistory(prev => ["⚡ Has comprado 10 de Energía.", ...prev].slice(0, 10));
                        }
                      }}
                      disabled={coins < 500 || energy >= 100}
                      className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${coins >= 500 && energy < 100 ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                    >
                      {energy >= 100 ? 'Energía Llena' : 'Comprar'}
                    </button>
                  </div>
                  
                  <div className="bg-zinc-900 border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center space-y-6 group hover:border-amber-500/50 transition-all">
                    <div className="w-32 h-40 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl shadow-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Zap size={48} className="text-white/80" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase italic">Energía x50</h3>
                      <p className="text-zinc-500 text-xs mt-2">Gran recarga de energía.</p>
                    </div>
                    <div className="text-3xl font-black text-amber-400">4500 <span className="text-xs">Monedas</span></div>
                    <button 
                      onClick={() => {
                        if (coins >= 4500) {
                          setCoins(c => Math.max(0, c - 4500));
                          setEnergy(e => Math.min(100, e + 50));
                          setHistory(prev => ["⚡ Has comprado 50 de Energía.", ...prev].slice(0, 10));
                        }
                      }}
                      disabled={coins < 4500 || energy >= 100}
                      className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${coins >= 4500 && energy < 100 ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                    >
                      {energy >= 100 ? 'Energía Llena' : 'Comprar'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'market' && gameState === 'management' && (
            <motion.div 
              key="market"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-5xl mx-auto space-y-12 py-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-black tracking-tighter uppercase italic flex items-center justify-center gap-4">
                  <Store className="text-emerald-500" size={48} /> Mercado de Fichajes
                </h2>
                <p className="text-zinc-400 max-w-lg mx-auto">Compra Pokémon de otros equipos. Las ofertas se actualizan periódicamente.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(marketOffers || []).map(offer => {
                  const p = offer.pokemon;
                  const config = RARITY_CONFIG[p.rarity];
                  const canAfford = coins >= offer.cost;
                  
                  return (
                    <div key={offer.id} className="bg-zinc-900 border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center space-y-6 group hover:border-emerald-500/50 transition-all relative overflow-hidden">
                      <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${config.bg}`} />
                      
                      <div className="relative z-10 w-full flex justify-between items-start">
                        <div className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>{p.rarity}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">LVL {p.level}</div>
                      </div>

                      <div className="relative z-10 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                        Vendedor: <span className="text-emerald-400">{offer.seller || 'Mercader Errante'}</span>
                      </div>

                      <div className="relative z-10">
                        <img 
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`} 
                          alt={p.name}
                          className="w-32 h-32 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="relative z-10 space-y-1">
                        <h3 className="text-2xl font-black uppercase italic">{p.name}</h3>
                        <div className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{p.ovr} PWR</div>
                      </div>

                      <div className="relative z-10 w-full pt-4 border-t border-white/5">
                        <div className="text-2xl font-black text-amber-400 mb-4">{offer.cost} <span className="text-xs">Monedas</span></div>
                        <button 
                          onClick={() => handleBuyMarketPokemon(offer.id)}
                          disabled={!canAfford}
                          className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${canAfford ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                        >
                          <Coins size={16} /> Comprar
                        </button>
                      </div>
                    </div>
                  );
                })}
                {(marketOffers || []).length === 0 && (
                  <div className="col-span-full py-12 text-center text-zinc-500 font-bold uppercase tracking-widest">
                    No hay ofertas disponibles en este momento.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'facilities' && gameState === 'management' && (
            <motion.div 
              key="facilities"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto space-y-8 md:space-y-12 py-6 md:py-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic flex items-center justify-center gap-4">
                  <Building2 className="text-indigo-500" size={32} /> Instalaciones
                </h2>
                <p className="text-zinc-400 max-w-lg mx-auto text-sm md:text-base">Mejora tu club para obtener beneficios permanentes en entrenamiento, salud y reclutamiento.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {(facilities || []).map(facility => {
                  const canAfford = coins >= facility.cost;
                  const isMax = facility.level >= facility.maxLevel;
                  
                  return (
                    <div key={facility.id} className="bg-zinc-900 border border-white/5 rounded-[32px] p-8 space-y-6 group hover:border-indigo-500/50 transition-all relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
                      
                      <div className="flex justify-between items-start relative z-10">
                        <div className="space-y-1">
                          <h3 className="text-2xl font-black uppercase italic text-white">{facility.name}</h3>
                          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Nivel {facility.level} / {facility.maxLevel}</div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                          {facility.id === 'academy' && <Dumbbell size={24} />}
                          {facility.id === 'medical' && <Heart size={24} />}
                          {facility.id === 'stadium' && <Trophy size={24} />}
                        </div>
                      </div>

                      <p className="text-zinc-500 text-sm leading-relaxed relative z-10">{facility.description}</p>

                      <div className="pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                        {!isMax ? (
                          <>
                            <div className="space-y-1">
                              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Coste Mejora</div>
                              <div className="text-xl font-black text-amber-400 flex items-center gap-2">
                                <Coins size={16} /> {facility.cost}
                              </div>
                            </div>
                            <button 
                              onClick={() => handleUpgradeFacility(facility.id)}
                              disabled={!canAfford}
                              className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${canAfford ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                            >
                              Mejorar
                            </button>
                          </>
                        ) : (
                          <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center text-emerald-500 font-black uppercase tracking-widest text-xs">
                            Nivel Máximo Alcanzado
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'staff' && gameState === 'management' && (
            <motion.div 
              key="staff"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto space-y-8 md:space-y-12 py-6 md:py-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic flex items-center justify-center gap-4">
                  <Users className="text-rose-500" size={32} /> Cuerpo Técnico
                </h2>
                <p className="text-zinc-400 max-w-lg mx-auto text-sm md:text-base">Contrata especialistas para potenciar diferentes áreas de tu club.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {(staff || []).map(member => {
                  const canAfford = coins >= member.cost;
                  
                  return (
                    <div key={member.id} className="bg-zinc-900 border border-white/5 rounded-[32px] p-8 space-y-6 group hover:border-rose-500/50 transition-all relative overflow-hidden text-center">
                      <div className={`absolute inset-0 opacity-5 bg-gradient-to-b from-rose-500 to-transparent ${member.hired ? 'opacity-10' : ''}`} />
                      
                      <div className="relative z-10 mx-auto w-20 h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                        {member.role === 'Tactician' && <Zap size={40} />}
                        {member.role === 'Scout' && <Search size={40} />}
                        {member.role === 'Physio' && <Activity size={40} />}
                      </div>

                      <div className="relative z-10 space-y-1">
                        <h3 className="text-2xl font-black uppercase italic text-white">{member.name}</h3>
                        <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{member.role}</div>
                      </div>

                      <p className="relative z-10 text-zinc-500 text-xs leading-relaxed min-h-[40px]">{member.description}</p>

                      <div className="relative z-10 pt-6 border-t border-white/5">
                        {!member.hired ? (
                          <div className="space-y-4">
                            <div className="text-xl font-black text-amber-400 flex items-center justify-center gap-2">
                              <Coins size={16} /> {member.cost}
                            </div>
                            <button 
                              onClick={() => handleHireStaff(member.id)}
                              disabled={!canAfford}
                              className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${canAfford ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                            >
                              Contratar
                            </button>
                          </div>
                        ) : (
                          <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center text-emerald-500 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                            <Check size={16} /> Contratado
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && gameState === 'management' && (
            <motion.div 
              key="inventory"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <Package className="text-indigo-400" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Inventario</h2>
                  <p className="text-zinc-400 text-sm">Gestiona tus objetos y piedras evolutivas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">Piedras Evolutivas</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(evolutionStones).map(([stone, count]) => {
                      const stoneNamesES: Record<string, string> = {
                        fire: 'Fuego', water: 'Agua', thunder: 'Trueno', leaf: 'Hoja', 
                        moon: 'Lunar', sun: 'Solar', shiny: 'Brillante', dusk: 'Noche', 
                        dawn: 'Alba', ice: 'Hielo'
                      };
                      return (count as number) > 0 && (
                        <div key={stone} className="p-4 rounded-xl border border-white/5 bg-zinc-900/50 flex flex-col items-center justify-center gap-2">
                          <img 
                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${stone}-stone.png`} 
                            alt={stone}
                            className="w-10 h-10 object-contain drop-shadow-md"
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-xs font-bold text-white capitalize">Piedra {stoneNamesES[stone] || stone}</div>
                          <div className="text-[10px] text-zinc-400">x{count}</div>
                        </div>
                      );
                    })}
                    {Object.values(evolutionStones).every(count => count === 0) && (
                      <div className="col-span-full p-8 text-center text-zinc-500 border border-white/5 rounded-xl bg-zinc-900/50">
                        No tienes piedras evolutivas
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">Mega Piedras</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {megaStones.map(stone => {
                      const stoneId = stone.toLowerCase().replace(' ', '-');
                      return (
                        <div key={stone} className="p-4 rounded-xl border border-white/5 bg-zinc-900/50 flex flex-col items-center justify-center gap-2">
                          <img 
                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${stoneId}.png`} 
                            alt={stone}
                            className="w-10 h-10 object-contain drop-shadow-md"
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-[10px] font-bold text-white capitalize text-center leading-tight">{stone}</div>
                        </div>
                      );
                    })}
                    {megaStones.length === 0 && (
                      <div className="col-span-full p-8 text-center text-zinc-500 border border-white/5 rounded-xl bg-zinc-900/50">
                        No tienes mega piedras
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">Objetos de Combate</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(heldItems).map(([itemId, count]) => {
                      const item = HELD_ITEMS.find(i => i.id === itemId);
                      return (count as number) > 0 && (
                        <div key={itemId} className="p-4 rounded-xl border border-white/5 bg-zinc-900/50 flex flex-col items-center justify-center gap-2">
                          <img 
                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${itemId}.png`} 
                            alt={itemId}
                            className="w-10 h-10 object-contain drop-shadow-md"
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-[10px] font-bold text-white text-center leading-tight">{item?.name || itemId}</div>
                          <div className="text-[10px] text-zinc-400">x{count}</div>
                        </div>
                      );
                    })}
                    {Object.values(heldItems).every(count => count === 0) && (
                      <div className="col-span-full p-8 text-center text-zinc-500 border border-white/5 rounded-xl bg-zinc-900/50">
                        No tienes objetos de combate
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">Otros Objetos</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl border border-white/5 bg-zinc-900/50 flex flex-col items-center justify-center gap-2">
                      <div className="text-2xl">🩹</div>
                      <div className="text-sm font-bold text-white">Banditas</div>
                      <div className="text-xs text-zinc-400">x{banditas}</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'explore' && gameState === 'management' && (
            <motion.div
              key="explore"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 pb-20"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white">Explorar</h2>
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Sal de aventura con tu compañero Pokémon</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pokemon Selection */}
                <div className="lg:col-span-1 space-y-4">
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                    <Users size={20} className="text-indigo-400" /> Elige un Compañero
                  </h3>
                  <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {collection.map(p => (
                      <button
                        key={p.instanceId}
                        onClick={() => setSelectedExplorePokemonId(p.instanceId)}
                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 relative overflow-hidden group ${
                          selectedExplorePokemonId === p.instanceId 
                            ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20' 
                            : 'border-white/5 bg-zinc-900/50 hover:border-white/20'
                        }`}
                      >
                        <div className="absolute top-1 right-1">
                          <Heart size={10} className={p.happiness > 200 ? 'text-rose-500' : 'text-zinc-600'} fill={p.happiness > 200 ? 'currentColor' : 'none'} />
                        </div>
                        <img 
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`} 
                          alt={p.name}
                          className="w-16 h-16 object-contain drop-shadow-md group-hover:scale-110 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-[10px] font-black text-white uppercase truncate w-full text-center">{p.name}</div>
                        <div className="text-[8px] font-bold text-zinc-500 uppercase">Felicidad: {Math.floor((p.happiness / 255) * 100)}%</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exploration Area */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-8 md:p-12 text-center space-y-8 relative overflow-hidden min-h-[400px] flex flex-col items-center justify-center">
                    <div className="absolute inset-0 opacity-5 pointer-events-none">
                      <MapIcon size={400} className="absolute -bottom-20 -right-20" />
                    </div>

                    {!isExploring && !exploreResult && (
                      <div className="relative z-10 space-y-8 max-w-md mx-auto">
                        <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto border border-emerald-500/20">
                          <MapIcon size={48} className="text-emerald-500" />
                        </div>
                        <div className="space-y-4">
                          <h3 className="text-3xl font-black uppercase italic text-white">¿Listo para la aventura?</h3>
                          <p className="text-zinc-400 text-sm leading-relaxed">
                            Explora los alrededores con tu Pokémon seleccionado. Podrás encontrar objetos raros, monedas o fortalecer tu vínculo.
                          </p>
                        </div>

                        <div className="pt-4">
                          <button
                            onClick={() => {
                              if (energy < 1 || !selectedExplorePokemonId) return;
                              setEnergy(e => e - 1);
                              setIsExploring(true);
                              setExploreResult(null);
                              setHistory(prev => [`Saliste a explorar con tu Pokémon...`, ...prev].slice(0, 10));
                              updateMissionProgress('explore', 1);
                              
                              setTimeout(() => {
                                const rand = Math.random();
                                const pokemon = collection.find(p => p.instanceId === selectedExplorePokemonId);
                                
                                if (rand < 0.1) { // Reduced from 0.3 to 0.1 for rarity
                                  const items = ['fire', 'water', 'thunder', 'leaf', 'moon', 'sun', 'shiny', 'dusk', 'dawn', 'ice'];
                                  const item = items[Math.floor(Math.random() * items.length)];
                                  const stoneNamesES: Record<string, string> = {
                                    fire: 'Fuego', water: 'Agua', thunder: 'Trueno', leaf: 'Hoja', 
                                    moon: 'Lunar', sun: 'Solar', shiny: 'Brillante', dusk: 'Noche', 
                                    dawn: 'Alba', ice: 'Hielo'
                                  };
                                  setEvolutionStones(prev => ({ ...prev, [item]: (prev[item] || 0) + 1 }));
                                  setExploreResult({ type: 'item', value: stoneNamesES[item] || item });
                                  setHistory(prev => [`¡Encontraste una Piedra ${stoneNamesES[item] || item}!`, ...prev].slice(0, 10));
                                } else if (rand < 0.5) {
                                  const amount = Math.floor(Math.random() * 800) + 200;
                                  setCoins(c => c + amount);
                                  updateMissionProgress('earn_coins', amount);
                                  setExploreResult({ type: 'coins', value: amount });
                                  setHistory(prev => [`¡Encontraste ${amount} 🪙 en el suelo!`, ...prev].slice(0, 10));
                                } else if (rand < 0.9 && pokemon) {
                                  const currentHappiness = pokemon.happiness || 0;
                                  const increase = Math.floor(Math.random() * 30) + 15;
                                  const newHappiness = Math.min(255, currentHappiness + increase);
                                  setCollection(prev => prev.map(p => p.instanceId === pokemon.instanceId ? { ...p, happiness: newHappiness } : p));
                                  updateMissionProgress('increase_happiness', 1);
                                  setExploreResult({ type: 'happiness', value: Math.floor((increase/255)*100), pokemonName: pokemon.name });
                                  setHistory(prev => [`¡Pasaste un buen rato jugando con ${pokemon.name}! Su felicidad aumentó.`, ...prev].slice(0, 10));
                                } else {
                                  setExploreResult({ type: 'nothing', value: null });
                                  setHistory(prev => [`Exploraste la zona pero no encontraste nada interesante esta vez.`, ...prev].slice(0, 10));
                                }
                                setIsExploring(false);
                              }, 2500);
                            }}
                            disabled={energy < 1 || !selectedExplorePokemonId}
                            className={`w-full py-6 rounded-[24px] text-xl font-black uppercase italic tracking-tight transition-all flex items-center justify-center gap-4 shadow-2xl ${
                              energy >= 1 && selectedExplorePokemonId
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105 active:scale-95 shadow-emerald-500/20'
                                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                            }`}
                          >
                            <MapIcon size={24} />
                            {!selectedExplorePokemonId ? 'Elige un Pokémon' : `Explorar (1 Energía)`}
                          </button>
                          {energy < 1 && (
                            <p className="text-rose-500 text-[10px] font-bold uppercase mt-4 tracking-widest">Sin energía suficiente</p>
                          )}
                        </div>
                      </div>
                    )}

                    {isExploring && (
                      <div className="relative z-10 space-y-8 animate-pulse">
                        <div className="w-32 h-32 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                        <div className="space-y-2">
                          <h3 className="text-3xl font-black uppercase italic text-white">Explorando...</h3>
                          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Tu Pokémon está buscando algo interesante</p>
                        </div>
                      </div>
                    )}

                    {exploreResult && (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative z-10 space-y-8 max-w-md mx-auto"
                      >
                        <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center mx-auto border border-white/10 shadow-2xl">
                          {exploreResult.type === 'item' && <div className="text-6xl animate-bounce">💎</div>}
                          {exploreResult.type === 'coins' && <div className="text-6xl animate-bounce">🪙</div>}
                          {exploreResult.type === 'happiness' && <div className="text-6xl animate-bounce">❤️</div>}
                          {exploreResult.type === 'nothing' && <div className="text-6xl opacity-50">🍃</div>}
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-4xl font-black uppercase italic text-white">
                            {exploreResult.type === 'item' && '¡Hallazgo Raro!'}
                            {exploreResult.type === 'coins' && '¡Tesoro Encontrado!'}
                            {exploreResult.type === 'happiness' && '¡Vínculo Reforzado!'}
                            {exploreResult.type === 'nothing' && 'Nada por aquí'}
                          </h3>
                          <p className="text-zinc-400 text-lg">
                            {exploreResult.type === 'item' && `Has encontrado una Piedra ${exploreResult.value}.`}
                            {exploreResult.type === 'coins' && `Has recolectado ${exploreResult.value} monedas.`}
                            {exploreResult.type === 'happiness' && `La felicidad de ${exploreResult.pokemonName} ha aumentado.`}
                            {exploreResult.type === 'nothing' && 'No has encontrado nada esta vez, pero la caminata fue agradable.'}
                          </p>
                        </div>

                        <button
                          onClick={() => setExploreResult(null)}
                          className="px-12 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-sm hover:bg-zinc-200 transition-all"
                        >
                          Continuar
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'battles' && gameState === 'management' && (
            <motion.div 
              key="battles"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Mini League Ranks Section */}
              <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                    <Award size={14} className="text-amber-400" /> Jerarquía de la Liga
                  </h3>
                  <button 
                    onClick={() => setShowRankGuide(true)} 
                    className="text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                  >
                    <Info size={12} /> Guía Completa
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar-hide scrollbar-hide">
                  {["Hierro", "Bronce", "Plata", "Oro", "Platino", "Esmeralda", "Diamante", "Maestro", "Grandmaster", "Challenger"].map((tier, i) => {
                    const currentTierIndex = Math.floor((leagueLevel - 1) / 3);
                    const isCurrent = i === currentTierIndex;
                    const isUnlocked = i <= currentTierIndex;
                    
                    return (
                      <div 
                        key={tier} 
                        className={`flex-shrink-0 px-5 py-3 rounded-2xl border transition-all duration-500 ${
                          isCurrent 
                            ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-500/30 scale-105' 
                            : isUnlocked 
                              ? 'bg-zinc-800/50 border-white/10' 
                              : 'bg-black/20 border-white/5 opacity-30 grayscale'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            isCurrent ? 'bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]' : isUnlocked ? 'bg-indigo-400' : 'bg-zinc-700'
                          }`} />
                          <div className="flex flex-col">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isCurrent ? 'text-white' : 'text-zinc-400'}`}>
                              {tier}
                            </span>
                            {isCurrent && (
                              <span className="text-[8px] font-bold text-indigo-200 uppercase tracking-tighter">Tu Rango</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Classification Table */}
                <div className="lg:col-span-2 bg-zinc-900 border border-white/5 rounded-3xl p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-black uppercase italic flex items-center gap-2">
                      <Trophy className="text-amber-400" /> {getLeagueName(leagueLevel)}
                    </h2>
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Semana {currentWeek} / 15</div>
                  </div>
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="w-full text-left min-w-[500px]">
                      <thead>
                        <tr className="text-[10px] font-bold text-zinc-500 uppercase border-b border-white/5">
                          <th className="pb-4">Pos</th>
                          <th className="pb-4">Equipo</th>
                          <th className="pb-4 text-center">PJ</th>
                          <th className="pb-4 text-center">PTS</th>
                          <th className="pb-4 text-center">GF</th>
                          <th className="pb-4 text-center">GC</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {leagueTeams?.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)).map((t, i) => (
                          <tr key={t.id} className={`border-b border-white/5 last:border-0 ${t.id === 'player' ? 'bg-indigo-500/10' : ''}`}>
                            <td className="py-4 font-bold text-zinc-500">{i + 1}</td>
                            <td className="py-4 font-black italic uppercase flex items-center gap-2">
                              <span className="text-lg">{t.id === 'player' ? teamLogo : t.logo}</span>
                              {t.id === 'player' ? teamName : t.name} 
                              <span className="text-[10px] text-zinc-500 ml-2">({t.id === 'player' ? teamOvr : t.ovr} PWR)</span>
                            </td>
                            <td className="py-4 text-center">{t.played}</td>
                            <td className="py-4 text-center font-black text-amber-400">{t.points}</td>
                            <td className="py-4 text-center text-zinc-400">{t.goalsFor}</td>
                            <td className="py-4 text-center text-zinc-400">{t.goalsAgainst}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Match Center */}
                <div className="space-y-6">
                  <div className="bg-zinc-900 border border-white/5 rounded-3xl p-8 space-y-6">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center justify-between">
                      <span>Centro de Partidos</span>
                      <span className="text-indigo-400">Semana {currentWeek}</span>
                    </h3>
                    
                    <div className="space-y-3">
                      {schedule?.filter(m => m.week === currentWeek).map(m => {
                        const home = getTeamInfo(m.homeTeamId);
                        const away = getTeamInfo(m.awayTeamId);
                        const isPlayerMatch = m.homeTeamId === 'player' || m.awayTeamId === 'player';
                        
                        return (
                          <div key={m.id} className={`p-4 rounded-2xl border transition-all ${isPlayerMatch ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-black/20 border-white/5'}`}>
                            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest opacity-30 mb-2">
                              <span>{m.played ? 'Finalizado' : 'Próximamente'}</span>
                              <span>Match ID: {m.id}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div className={`flex-1 flex items-center justify-end gap-2 text-[10px] font-black uppercase italic truncate ${m.homeTeamId === 'player' ? 'text-indigo-400' : ''}`}>
                                <span>{m.homeTeamId === 'player' ? teamName : home?.name}</span>
                                <span className="text-lg">{m.homeTeamId === 'player' ? teamLogo : home?.logo}</span>
                              </div>
                              <div className="px-3 py-1 bg-black/60 rounded-lg font-black italic text-xs min-w-[60px] text-center border border-white/5">
                                {m.played ? `${m.homeScore} - ${m.awayScore}` : 'VS'}
                              </div>
                              <div className={`flex-1 flex items-center justify-start gap-2 text-[10px] font-black uppercase italic truncate ${m.awayTeamId === 'player' ? 'text-indigo-400' : ''}`}>
                                <span className="text-lg">{m.awayTeamId === 'player' ? teamLogo : away?.logo}</span>
                                <span>{m.awayTeamId === 'player' ? teamName : away?.name}</span>
                              </div>
                            </div>
                            {!m.played && isPlayerMatch && (
                              <div className="grid grid-cols-2 gap-2 mt-4">
                                <button 
                                  onClick={() => handleMatchPreview(m.id)}
                                  disabled={isGeneratingBattle}
                                  className="py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-indigo-500/20"
                                >
                                  {isGeneratingBattle ? 'Cargando...' : 'Jugar'}
                                </button>
                                <button 
                                  onClick={() => simulateWeek()}
                                  className="py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-[10px] font-black uppercase transition-all"
                                >
                                  Simular
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-4 space-y-3">
                      {schedule?.filter(m => m.week === currentWeek && !m.played).length === 0 ? (
                        <button 
                          onClick={currentWeek >= 15 && tournamentPlayedThisSeason ? resetLeague : simulateWeek}
                          className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl ${
                            currentWeek >= 15 && tournamentPlayedThisSeason 
                              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20' 
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                          }`}
                        >
                          {currentWeek < 15 
                            ? 'Siguiente Semana' 
                            : tournamentPlayedThisSeason 
                              ? 'Empezar Nueva Temporada' 
                              : 'Ir al Torneo Final'}
                        </button>
                      ) : (
                        <button 
                          onClick={simulateWeek}
                          className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                          Simular Resto de Semana
                        </button>
                      )}
                      
                      {!isSimulating && currentWeek < 15 && (
                        <button 
                          onClick={simulateFullSeason}
                          className="w-full py-4 border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <Zap size={14} /> Simular Temporada Completa
                        </button>
                      )}
                    </div>
                  </div>

                  {/* League History / Recent Results */}
                  <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest border-b border-white/5 pb-2">Resultados Recientes</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {schedule.filter(m => m.played).sort((a, b) => b.week - a.week || Number(b.id) - Number(a.id)).slice(0, 10).map(m => {
                        const home = getTeamInfo(m.homeTeamId);
                        const away = getTeamInfo(m.awayTeamId);
                        return (
                          <div key={m.id} className="flex items-center justify-between text-[10px] py-2 border-b border-white/5 last:border-0">
                            <span className="text-zinc-500 font-bold">Sem {m.week}</span>
                            <div className="flex-1 flex items-center justify-center gap-2 px-4">
                              <div className={`flex-1 flex items-center justify-end gap-1 truncate ${m.homeTeamId === 'player' ? 'text-indigo-400 font-black' : ''}`}>
                                <span>{m.homeTeamId === 'player' ? teamName : home?.name}</span>
                                <span className="text-sm">{m.homeTeamId === 'player' ? teamLogo : home?.logo}</span>
                              </div>
                              <span className="font-black italic text-zinc-300">{m.homeScore} - {m.awayScore}</span>
                              <div className={`flex-1 flex items-center justify-start gap-1 truncate ${m.awayTeamId === 'player' ? 'text-indigo-400 font-black' : ''}`}>
                                <span className="text-sm">{m.awayTeamId === 'player' ? teamLogo : away?.logo}</span>
                                <span>{m.awayTeamId === 'player' ? teamName : away?.name}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {schedule.filter(m => m.played).length === 0 && (
                        <div className="text-center py-8 text-zinc-600 text-[10px] uppercase font-black">No hay resultados aún</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Partidos</span>
                      <div className="text-xl font-black italic">{totalMatches}</div>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Nivel Liga</span>
                      <div className="text-xl font-black italic text-indigo-400">{getLeagueName(leagueLevel)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tournament Modal Overlay */}
              <AnimatePresence>
                {isTournamentMode && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[150] bg-zinc-950/95 backdrop-blur-md overflow-y-auto custom-scrollbar flex flex-col items-center justify-start min-h-screen p-4 md:p-6 text-center"
                  >
                    <div className="max-w-5xl w-full space-y-8 md:space-y-12 my-auto py-8">
                      <div className="space-y-4">
                        <motion.div 
                          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 4 }}
                          className="w-24 h-24 bg-amber-500 rounded-full mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.3)]"
                        >
                          <Trophy size={48} className="text-white" />
                        </motion.div>
                        <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter">Gran Torneo de Campeones</h2>
                        <p className="text-zinc-400 text-sm">Los 8 mejores equipos se enfrentan en una eliminación directa por la gloria máxima.</p>
                      </div>

                      <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 custom-scrollbar md:grid md:grid-cols-4 md:overflow-visible md:snap-none md:pb-0">
                        {/* Quarters */}
                        <div className="space-y-4 min-w-[280px] snap-center md:min-w-0">
                          <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Cuartos de Final</h3>
                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                              {tournamentBracket.quarters.map(m => (
                                <div key={m.id} className="bg-zinc-900 border border-white/10 rounded-2xl p-3 space-y-2">
                                  <div className="flex justify-between items-center text-[9px] font-black italic uppercase gap-2">
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                      <span className="text-sm shrink-0">{m.homeTeamId === 'player' ? teamLogo : getTeamInfo(m.homeTeamId)?.logo}</span>
                                      <span className={`truncate ${m.homeTeamId === 'player' ? 'text-indigo-400' : ''}`}>{m.homeTeamId === 'player' ? teamName : getTeamInfo(m.homeTeamId)?.name}</span>
                                    </div>
                                    <span className="text-zinc-600 shrink-0">VS</span>
                                    <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
                                      <span className={`truncate text-right ${m.awayTeamId === 'player' ? 'text-indigo-400' : ''}`}>{m.awayTeamId === 'player' ? teamName : getTeamInfo(m.awayTeamId)?.name}</span>
                                      <span className="text-sm shrink-0">{m.awayTeamId === 'player' ? teamLogo : getTeamInfo(m.awayTeamId)?.logo}</span>
                                    </div>
                                  </div>
                                  {m.played ? (
                                  <div className="text-sm font-black italic">{m.homeScore} - {m.awayScore}</div>
                                ) : (
                                  <button 
                                    onClick={() => m.homeTeamId === 'player' || m.awayTeamId === 'player' ? handleMatchPreview(m.id) : simulateTournamentMatch(m.id)}
                                    disabled={isGeneratingBattle}
                                    className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-lg text-[9px] font-black uppercase"
                                  >
                                    {isGeneratingBattle ? '...' : 'Jugar'}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Semifinals */}
                        <div className="space-y-4 min-w-[280px] snap-center md:min-w-0">
                          <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Semifinales</h3>
                          <div className="space-y-3">
                            {tournamentBracket.semis.length > 0 ? (
                              tournamentBracket.semis.map(m => (
                                <div key={m.id} className="bg-zinc-900 border border-white/10 rounded-2xl p-4 space-y-3">
                                  <div className="flex justify-between items-center text-xs font-black italic uppercase gap-2">
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                      <span className="text-lg shrink-0">{m.homeTeamId === 'player' ? teamLogo : getTeamInfo(m.homeTeamId)?.logo}</span>
                                      <span className={`truncate ${m.homeTeamId === 'player' ? 'text-indigo-400' : ''}`}>{m.homeTeamId === 'player' ? teamName : getTeamInfo(m.homeTeamId)?.name}</span>
                                    </div>
                                    <span className="text-zinc-600 shrink-0">VS</span>
                                    <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
                                      <span className={`truncate text-right ${m.awayTeamId === 'player' ? 'text-indigo-400' : ''}`}>{m.awayTeamId === 'player' ? teamName : getTeamInfo(m.awayTeamId)?.name}</span>
                                      <span className="text-lg shrink-0">{m.awayTeamId === 'player' ? teamLogo : getTeamInfo(m.awayTeamId)?.logo}</span>
                                    </div>
                                  </div>
                                  {m.played ? (
                                    <div className="text-xl font-black italic">{m.homeScore} - {m.awayScore}</div>
                                  ) : (
                                    <button 
                                      onClick={() => m.homeTeamId === 'player' || m.awayTeamId === 'player' ? handleMatchPreview(m.id) : simulateTournamentMatch(m.id)}
                                      disabled={isGeneratingBattle}
                                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase"
                                    >
                                      {isGeneratingBattle ? '...' : 'Jugar'}
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="h-24 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center text-zinc-700 text-[9px] font-black uppercase">Esperando Cuartos</div>
                            )}
                          </div>
                        </div>

                        {/* Final */}
                        <div className="space-y-4 min-w-[280px] snap-center md:min-w-0">
                          <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Gran Final</h3>
                          {tournamentBracket.final ? (
                            <div className="bg-zinc-900 border-2 border-amber-500/50 rounded-2xl p-6 space-y-4 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                              <div className="flex justify-between items-center text-sm font-black italic uppercase gap-2">
                                <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                                  <span className="text-4xl shrink-0">{tournamentBracket.final.homeTeamId === 'player' ? teamLogo : getTeamInfo(tournamentBracket.final!.homeTeamId)?.logo}</span>
                                  <span className={`truncate w-full text-center ${tournamentBracket.final.homeTeamId === 'player' ? 'text-indigo-400' : ''}`}>{tournamentBracket.final.homeTeamId === 'player' ? teamName : getTeamInfo(tournamentBracket.final!.homeTeamId)?.name}</span>
                                </div>
                                <span className="text-zinc-600 shrink-0">VS</span>
                                <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                                  <span className="text-4xl shrink-0">{tournamentBracket.final.awayTeamId === 'player' ? teamLogo : getTeamInfo(tournamentBracket.final!.awayTeamId)?.logo}</span>
                                  <span className={`truncate w-full text-center ${tournamentBracket.final.awayTeamId === 'player' ? 'text-indigo-400' : ''}`}>{tournamentBracket.final.awayTeamId === 'player' ? teamName : getTeamInfo(tournamentBracket.final!.awayTeamId)?.name}</span>
                                </div>
                              </div>
                              {tournamentBracket.final.played ? (
                                <div className="text-3xl font-black italic text-amber-400">{tournamentBracket.final.homeScore} - {tournamentBracket.final.awayScore}</div>
                              ) : (
                                <button 
                                  onClick={() => handleMatchPreview('final')}
                                  disabled={isGeneratingBattle}
                                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-xl text-xs font-black uppercase shadow-lg shadow-amber-500/20"
                                >
                                  {isGeneratingBattle ? '...' : 'Jugar Final'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="h-32 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center text-zinc-700 text-[10px] font-black uppercase">Esperando Semis</div>
                          )}
                        </div>

                        {/* Winner */}
                        <div className="space-y-4 min-w-[280px] snap-center md:min-w-0">
                          <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Campeón</h3>
                          {tournamentBracket.winner ? (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl p-8 text-white shadow-2xl shadow-amber-500/40 flex flex-col items-center text-center"
                            >
                              <div className="text-[10px] font-black uppercase opacity-70 mb-2">Ganador</div>
                              <div className="text-6xl mb-4">{tournamentBracket.winner === 'player' ? teamLogo : getTeamInfo(tournamentBracket.winner)?.logo}</div>
                              <div className="text-2xl font-black uppercase italic truncate w-full">{tournamentBracket.winner === 'player' ? teamName : getTeamInfo(tournamentBracket.winner)?.name}</div>
                            </motion.div>
                          ) : (
                            <div className="h-32 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center text-zinc-700 text-[10px] font-black uppercase">Por Definir</div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-4 justify-center">
                        {!isChampionshipTournament && (
                          <button 
                            onClick={() => {
                              setIsTournamentMode(false);
                              resetLeague();
                            }}
                            className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                          >
                            Nueva Temporada
                          </button>
                        )}
                        {tournamentBracket.winner && (
                          <button 
                            onClick={() => {
                              setIsTournamentMode(false);
                              if (isChampionshipTournament) setIsChampionshipTournament(false);
                            }}
                            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                          >
                            Cerrar
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'lab' && gameState === 'management' && (
            <motion.div 
              key="lab"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-white">
                  <FlaskConical className="text-indigo-400" /> Laboratorio de Mejora
                </h2>
                <div className="text-[10px] md:text-xs font-bold text-white uppercase tracking-widest">
                  Mejora y Evoluciona tus Pokémon
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Pokémon List Sidebar */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-4 space-y-3">
                    <div className="text-[10px] font-black uppercase text-indigo-200 tracking-widest">Sesión de Entrenamiento</div>
                    <p className="text-[10px] text-white">Intercambia monedas por TP para acelerar el crecimiento.</p>
                    <button 
                      onClick={() => {
                        if (coins >= 500) {
                          setCoins(c => Math.max(0, c - 500));
                          setTp(t => t + 250);
                          setHistory(prev => ["Sesión de entrenamiento completada: -500 Monedas, +250 TP.", ...prev].slice(0, 10));
                        }
                      }}
                      disabled={coins < 500}
                      className={`w-full py-2 rounded-xl text-[10px] font-black uppercase transition-all ${coins >= 500 ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-600'}`}
                    >
                      Comprar 250 TP (500 Monedas)
                    </button>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/20 pb-2">
                    <h3 className="text-[10px] font-black uppercase text-white tracking-widest">Tu Colección</h3>
                    <button 
                      onClick={() => setShowBatchTraining(true)}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase flex items-center gap-1"
                    >
                      <Zap size={12} /> Entrenamiento Múltiple
                    </button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {collection.map(p => (
                      <button
                        key={p.instanceId}
                        onClick={() => setSelectedLabPokemonId(p.instanceId)}
                        className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${selectedLabPokemonId === p.instanceId ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-zinc-900 border-white/5 hover:bg-zinc-800'}`}
                      >
                        <img 
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`} 
                          alt="" 
                          className="w-10 h-10 object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-left overflow-hidden">
                          <div className={`text-[10px] font-black uppercase italic truncate ${selectedLabPokemonId === p.instanceId ? 'text-white' : 'text-zinc-300'}`}>{p.name}</div>
                          <div className="flex items-center gap-2">
                            <div className={`text-[8px] font-bold uppercase ${selectedLabPokemonId === p.instanceId ? 'text-indigo-200' : 'text-zinc-500'}`}>PWR {p.ovr}</div>
                            {p.fatigue > 70 && <AlertTriangle size={8} className="text-rose-500 animate-pulse" />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Management Area */}
                <div className="lg:col-span-3">
                  {selectedLabPokemonId ? (
                    (() => {
                      const p = collection.find(item => item.instanceId === selectedLabPokemonId);
                      if (!p) return null;
                      const config = RARITY_CONFIG[p.rarity];
                      const canPowerUp = stardust >= POWERUP_COST_BASE;
                      const canTrain = tp >= TRAINING_COST_BASE;
                      const canEvolve = p.level >= (p.evolutionLevel || Infinity);

                      return (
                        <div className="bg-zinc-900 border border-white/5 rounded-[32px] md:rounded-[40px] p-6 md:p-8 lg:p-12 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-indigo-600/5 blur-[80px] md:blur-[120px] rounded-full -mr-32 md:-mr-48 -mt-32 md:-mt-48" />
                          
                          {/* Left Side: Visuals */}
                          <div className="space-y-6 md:space-y-8 relative z-10">
                            <div className={`aspect-square rounded-[24px] md:rounded-[32px] bg-gradient-to-br ${config.bg} border-2 ${config.border} flex items-center justify-center relative group`}>
                              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[22px] md:rounded-[30px]" />
                              <img 
                                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`} 
                                alt={p.name}
                                className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-white/10 text-[10px] md:text-xs font-black italic uppercase text-white">
                                LVL {p.level}
                              </div>
                              {p.fatigue > 70 && (
                                <div className="absolute top-4 right-4 bg-rose-600 text-white px-2 md:px-3 py-1 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 md:gap-2 animate-pulse shadow-lg shadow-rose-500/20">
                                  <AlertTriangle size={10} className="md:w-3 md:h-3" /> Agotado
                                </div>
                              )}
                            </div>

                            {canEvolve && (
                              <button
                                onClick={() => evolvePokemon(p)}
                                className="w-full py-3 md:py-4 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest text-xs md:text-sm rounded-xl md:rounded-2xl shadow-lg shadow-purple-500/20 transition-all"
                              >
                                Evolucionar
                              </button>
                            )}

                            <div className="grid grid-cols-3 gap-3 md:gap-4">
                              <div className="bg-black/40 rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/5 text-center">
                                <div className="text-[7px] md:text-[8px] font-bold text-zinc-300 uppercase mb-1">Ataque</div>
                                <div className="text-lg md:text-2xl font-black text-white">{p.atk}</div>
                              </div>
                              <div className="bg-black/40 rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/10 text-center">
                                <div className="text-[7px] md:text-[8px] font-bold text-zinc-300 uppercase mb-1">Defensa</div>
                                <div className="text-lg md:text-2xl font-black text-white">{p.def}</div>
                              </div>
                              <div className="bg-black/40 rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/10 text-center">
                                <div className="text-[7px] md:text-[8px] font-bold text-zinc-300 uppercase mb-1">Velocidad</div>
                                <div className="text-lg md:text-2xl font-black text-white">{p.spe}</div>
                              </div>
                            </div>
                          </div>

                          {/* Right Side: Controls */}
                          <div className="space-y-6 md:space-y-8 relative z-10">
                            <div>
                              <div className="text-[8px] md:text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{p.rarity} Pokémon</div>
                              <h3 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white mb-2">{p.name}</h3>
                              <div className="flex gap-2">
                                {p.types?.map(t => (
                                  <span key={t} className="px-2 md:px-3 py-1 bg-white/5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-white/5 text-zinc-400">{t}</span>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-6">
                              {/* Power Up */}
                              <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                  <div className="space-y-1">
                                    <div className="text-xs font-black uppercase italic text-amber-400 flex items-center gap-2">
                                      <Sparkles size={14} /> Potenciación
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Nivel {p.powerLevel} / 10</div>
                                  </div>
                                  <div className="text-[10px] font-black text-zinc-400 uppercase">Coste: {POWERUP_COST_BASE} Polvos</div>
                                </div>
                                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${p.powerLevel * 10}%` }}
                                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400" 
                                  />
                                </div>
                                <button
                                  disabled={!canPowerUp || p.powerLevel >= 10}
                                  onClick={() => handlePowerUp(p.instanceId)}
                                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${canPowerUp && p.powerLevel < 10 ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                                >
                                  {p.powerLevel >= 10 ? 'Máximo Nivel' : 'Potenciar'}
                                </button>
                              </div>

                              {/* Move Management */}
                              <div className="space-y-4 pt-4 border-t border-white/5">
                                <div className="flex justify-between items-center">
                                  <div className="text-xs font-black uppercase italic text-indigo-400 flex items-center gap-2">
                                    <Sword size={14} /> Movimientos
                                  </div>
                                  <div className="text-[10px] font-black text-zinc-500 uppercase">Coste Cambio: 100 TP</div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  {[0, 1, 2, 3].map((idx) => {
                                    const move = p.moves?.[idx];
                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => setMoveSlotToReplace(moveSlotToReplace === idx ? null : idx)}
                                        className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${moveSlotToReplace === idx ? 'bg-indigo-600 border-indigo-500' : 'bg-black/40 border-white/5 hover:bg-zinc-800'}`}
                                      >
                                        {move ? (
                                          <>
                                            <div className={`absolute inset-0 opacity-5 ${getTypeColor(move.type)}`} />
                                            <div className="text-[10px] font-black uppercase relative z-10">{move?.name || 'Ataque'}</div>
                                            <div className="flex justify-between items-center relative z-10">
                                              <span className="text-[8px] opacity-50 uppercase">{move.type}</span>
                                              <span className="text-[8px] font-bold text-rose-500">{move.power} PWR</span>
                                            </div>
                                          </>
                                        ) : (
                                          <div className="flex items-center justify-center h-full opacity-50">
                                            <span className="text-[10px] font-black uppercase text-zinc-500">+ Aprender</span>
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>

                                <AnimatePresence>
                                  {moveSlotToReplace !== null && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="bg-black/60 rounded-2xl p-4 border border-indigo-500/30 space-y-3">
                                        <div className="text-[10px] font-black uppercase text-indigo-400 flex justify-between">
                                          <span>Aprender Nuevo Movimiento</span>
                                          <button onClick={() => setMoveSlotToReplace(null)} className="hover:text-white">Cerrar</button>
                                        </div>
                                        
                                        {isLoadingMoves ? (
                                          <div className="py-8 flex flex-col items-center justify-center gap-3">
                                            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                            <div className="text-[8px] font-bold text-zinc-500 uppercase">Consultando PokeAPI...</div>
                                          </div>
                                        ) : (
                                          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                            {learnableMoves.filter(lm => !p.moves.some(pm => pm?.name === lm?.name)).map((lm, i) => {
                                              const isUnlocked = p.level >= (lm.level_learned_at || 1);
                                              return (
                                                <button
                                                  key={i}
                                                  disabled={tp < 100 || !isUnlocked || moveSlotToReplace === null}
                                                  onClick={() => moveSlotToReplace !== null && setConfirmMove({ instanceId: p.instanceId, slotIndex: moveSlotToReplace, move: lm })}
                                                  className={`p-3 rounded-xl bg-zinc-800/50 border border-white/5 hover:bg-indigo-600/20 hover:border-indigo-500/50 transition-all text-left flex justify-between items-center group ${(!isUnlocked || tp < 100 || moveSlotToReplace === null) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                  <div>
                                                    <div className="text-[10px] font-black uppercase flex items-center gap-2">
                                                      {lm?.name || 'Ataque'}
                                                      {!isUnlocked && <Lock size={8} className="text-zinc-500" />}
                                                    </div>
                                                    <div className="text-[8px] opacity-50 uppercase">{lm?.type || 'Normal'} {!isUnlocked && `(Nivel ${lm?.level_learned_at || 1})`}</div>
                                                  </div>
                                                  <div className="text-right">
                                                    <div className="text-[10px] font-black text-rose-500">{lm?.power || 40} PWR</div>
                                                    <div className="text-[8px] font-bold text-zinc-500 uppercase">100 TP</div>
                                                  </div>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              {/* Training */}
                              <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                  <div className="space-y-1">
                                    <div className="text-xs font-black uppercase italic text-indigo-400 flex items-center gap-2">
                                      <Dumbbell size={14} /> Entrenamiento
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Nivel {p.level} / {p.maxLevel}</div>
                                  </div>
                                  <div className="text-[10px] font-black text-zinc-400 uppercase">Coste: {TRAINING_COST_BASE} TP</div>
                                </div>
                                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(p.level / p.maxLevel) * 100}%` }}
                                    className={`h-full bg-gradient-to-r ${p.limitBroken ? 'from-rose-600 to-rose-400' : 'from-indigo-600 to-indigo-400'}`} 
                                  />
                                </div>
                                <button
                                  disabled={!canTrain || p.level >= p.maxLevel}
                                  onClick={() => handleTrain(p.instanceId)}
                                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${canTrain && p.level < p.maxLevel ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                                >
                                  {p.level >= p.maxLevel ? (p.limitBroken ? 'Máximo Nivel' : 'Límite Alcanzado') : 'Entrenar'}
                                </button>

                                {/* Limit Break Button */}
                                {p.level >= p.maxLevel && !p.limitBroken && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="pt-2 space-y-2"
                                  >
                                    <button
                                      onClick={() => handleLimitBreak(p.instanceId)}
                                      disabled={coins < LIMIT_BREAK_COST_COINS || stardust < LIMIT_BREAK_COST_STARDUST}
                                      className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${(coins >= LIMIT_BREAK_COST_COINS && stardust >= LIMIT_BREAK_COST_STARDUST) ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xl shadow-rose-500/20 animate-pulse' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                                    >
                                      <Zap size={16} /> Superar Límite
                                    </button>
                                    <div className="flex justify-between text-[8px] font-black uppercase text-zinc-500 px-2">
                                      <span>Coste: {LIMIT_BREAK_COST_COINS} Monedas</span>
                                      <span>{LIMIT_BREAK_COST_STARDUST} Polvos</span>
                                    </div>
                                    <p className="text-[9px] text-center text-zinc-400 font-medium italic">Desbloquea el potencial para llegar al Nivel 50</p>
                                  </motion.div>
                                )}
                              </div>

                              {/* Evolution */}
                              {p.powerLevel === 10 && p.level >= p.maxLevel && p.evolutionChain && p.evolutionChain.indexOf(p.id) < p.evolutionChain.length - 1 && (
                                <div className="pt-4">
                                  <button
                                    disabled={!canEvolve}
                                    onClick={() => handleEvolve(p.instanceId)}
                                    className={`w-full py-6 rounded-3xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${canEvolve ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-2xl shadow-rose-500/40 animate-pulse' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                                  >
                                    <Dna size={24} /> Evolucionar Pokémon
                                  </button>
                                  <div className="text-center mt-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Coste: {currentEvolutionCost} Monedas</div>
                                </div>
                              )}

                              {/* Retirement */}
                              {p.level === 50 && (
                                <div className="pt-2">
                                  <button
                                    onClick={() => handleRetireToHallOfFame(p.instanceId)}
                                    className="w-full py-4 rounded-2xl border-2 border-amber-500 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-amber-500/20"
                                  >
                                    <Award size={20} /> Retirar al Salón de la Fama
                                  </button>
                                  <p className="text-[10px] text-center text-zinc-500 mt-2 font-bold uppercase italic">Retira a tu leyenda para obtener recompensas masivas</p>
                                </div>
                              )}

                              {/* Sell */}
                              <div className="pt-2">
                                <button
                                  onClick={() => handleSellPokemon(p.instanceId)}
                                  className="w-full py-3 rounded-2xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                  <Coins size={14} /> Vender por {Math.floor(100 * config.multiplier * (1 + p.level * 0.1) * (1 + p.powerLevel * 0.2) * (1 + p.trainingLevel * 0.2))} Monedas
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="h-full min-h-[500px] bg-zinc-900/50 border-2 border-dashed border-white/5 rounded-[40px] flex flex-col items-center justify-center text-center p-12 space-y-4">
                      <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-600">
                        <FlaskConical size={40} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-black uppercase italic text-zinc-400">Selecciona un Pokémon</h3>
                        <p className="text-zinc-600 text-sm max-w-xs">Elige un Pokémon de tu colección en el panel lateral para comenzar su proceso de mejora.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'pokedex' && gameState === 'management' && (
            <motion.div 
              key="pokedex"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 pb-24"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Pokédex Regional</h2>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  {pokedex.length} / {POKEDEX_BASE.length} Descubiertos
                </div>
              </div>

              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-4">
                {POKEDEX_BASE.map(p => {
                  const isUnlocked = pokedex.includes(p.id);
                  return (
                    <div 
                      key={p.id} 
                      onClick={() => handleSelectPokedexPokemon(p)}
                      className={`aspect-square rounded-2xl sm:rounded-3xl border flex flex-col items-center justify-center p-2 sm:p-4 transition-all cursor-pointer hover:scale-105 ${isUnlocked ? 'bg-zinc-900 border-white/10 hover:bg-zinc-800 hover:border-white/20' : 'bg-zinc-900/40 border-white/5 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'}`}
                    >
                      <div className="text-[8px] sm:text-[10px] font-bold text-zinc-600 mb-1 sm:mb-2">#{p.id.toString().padStart(3, '0')}</div>
                      <img 
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`} 
                        alt="" 
                        className="w-12 h-12 sm:w-20 sm:h-20 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-[9px] sm:text-xs font-black uppercase italic mt-1 sm:mt-2 text-center truncate w-full">
                        {p.name}
                      </div>
                      {!isUnlocked && (
                        <div className="mt-1">
                          <Lock size={10} className="text-zinc-500" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'hallOfFame' && gameState === 'management' && (
            <motion.div 
              key="hallOfFame"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12 pb-24"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase italic flex items-center justify-center gap-4 sm:gap-6">
                  <Award size={48} className="text-amber-500 sm:w-16 sm:h-16" /> Salón de la Fama
                </h2>
                <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
                  Honramos a las leyendas que alcanzaron la cima de su potencial. 
                  Cada Pokémon aquí representa una carrera de excelencia y dedicación.
                </p>
              </div>

              {hallOfFame.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {hallOfFame.map((p, i) => (
                    <motion.div
                      key={p.instanceId}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-zinc-900 border-2 border-amber-500/30 rounded-[40px] p-8 relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[60px] rounded-full -mr-16 -mt-16" />
                      
                      <div className="flex items-center gap-6 mb-8">
                        <div className="w-24 h-24 bg-black/40 rounded-full flex items-center justify-center relative">
                          <img 
                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                            alt={p.name}
                            className="w-20 h-20 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">{p.name}</h3>
                          <div className="text-amber-500 font-black uppercase text-xs tracking-widest">Leyenda Nivel 50</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Poder Final</div>
                          <div className="text-2xl font-black text-white">{p.ovr}</div>
                        </div>
                        <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Combates</div>
                          <div className="text-2xl font-black text-white">{p.matchesPlayed || 0}</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-2">
                          <History size={14} /> Logros de Carrera
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-zinc-400 uppercase tracking-widest">MVP de Liga</span>
                            <span className="text-amber-400">{p.mvpCount || 0} veces</span>
                          </div>
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-zinc-400 uppercase tracking-widest">Daño Total</span>
                            <span className="text-rose-400">{p.totalDamageDealt?.toLocaleString() || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
                        <div className="px-4 py-2 bg-amber-500/10 rounded-full border border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-500">
                          Retirado Permanentemente
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900/50 border-2 border-dashed border-white/5 rounded-[40px] p-20 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-32 h-32 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-600">
                    <Award size={64} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black uppercase italic text-zinc-400">El Salón está vacío</h3>
                    <p className="text-zinc-500 max-w-md mx-auto">
                      Entrena a tus Pokémon hasta el Nivel 50 (superando su límite) para poder retirarlos aquí y convertirlos en leyendas.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'settings' && gameState === 'management' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 max-w-2xl mx-auto pb-24"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                  <Settings className="text-zinc-400" /> Ajustes del Sistema
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Account Settings */}
                <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-8 space-y-6">
                  <h3 className="text-xl font-black uppercase italic flex items-center gap-2">
                    <Users className="text-indigo-400" /> Cuenta y Perfil
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nombre del Equipo</label>
                      <input 
                        type="text" 
                        value={teamName} 
                        onChange={(e) => setTeamName(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Símbolo del Equipo</label>
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 p-4 bg-black/40 border border-white/5 rounded-2xl">
                        {['🛡️', '⚔️', '🔥', '💧', '⚡', '🍃', '❄️', '🌑', '🌟', '🐉', '🦅', '🐺', '🦁', '🐍', '🐻', '🦊', '🦉', '🦇', '🦈', '🐙'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => setTeamLogo(emoji)}
                            className={`text-2xl p-2 rounded-xl transition-all ${teamLogo === emoji ? 'bg-indigo-500/20 border-2 border-indigo-500 scale-110' : 'hover:bg-white/5 border-2 border-transparent hover:scale-105'}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gameplay Settings */}
                <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-8 space-y-6">
                  <h3 className="text-xl font-black uppercase italic flex items-center gap-2">
                    <Play className="text-emerald-400" /> Preferencias de Juego
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                      <div>
                        <div className="text-sm font-black uppercase italic">Velocidad de Batalla Predeterminada</div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase">Afecta a la rapidez de las animaciones en combate</div>
                      </div>
                      <div className="flex gap-2">
                        {[1, 1.5, 2, 3].map(s => (
                          <button
                            key={s}
                            onClick={() => setGlobalBattleSpeed(s)}
                            className={`w-10 h-10 rounded-lg text-xs font-black transition-all ${globalBattleSpeed === s ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                      <div>
                        <div className="text-sm font-black uppercase italic">Limpiar Historial de Eventos</div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase">Borra el registro de noticias recientes</div>
                      </div>
                      <button
                        onClick={() => {
                          setHistory([]);
                        }}
                        className="px-4 py-2 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded-xl text-xs font-black uppercase transition-all"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inventory Stats */}
                <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-8 space-y-6">
                  <h3 className="text-xl font-black uppercase italic flex items-center gap-2">
                    <ShoppingBag className="text-rose-400" /> Inventario y Recursos
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-black/60 p-4 rounded-2xl border border-white/10 flex flex-col items-center text-center shadow-inner">
                      <Coins className="text-amber-400 mb-2" size={24} />
                      <div className="text-xl font-black text-white drop-shadow-md">{coins.toLocaleString()}</div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Monedas</div>
                    </div>
                    <div className="bg-black/60 p-4 rounded-2xl border border-white/10 flex flex-col items-center text-center shadow-inner">
                      <Zap className="text-emerald-400 mb-2" size={24} />
                      <div className="text-xl font-black text-white drop-shadow-md">{energy}/100</div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Energía</div>
                    </div>
                    <div className="bg-black/60 p-4 rounded-2xl border border-white/10 flex flex-col items-center text-center shadow-inner">
                      <Dumbbell className="text-indigo-400 mb-2" size={24} />
                      <div className="text-xl font-black text-white drop-shadow-md">{tp.toLocaleString()}</div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">TP</div>
                    </div>
                    <div className="bg-black/60 p-4 rounded-2xl border border-white/10 flex flex-col items-center text-center shadow-inner">
                      <Heart className="text-rose-400 mb-2" size={24} />
                      <div className="text-xl font-black text-white drop-shadow-md">{banditas}</div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Banditas</div>
                    </div>
                  </div>
                </div>

                {/* Interface Settings */}
                <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-8 space-y-6">
                  <h3 className="text-xl font-black uppercase italic flex items-center gap-2">
                    <Palette className="text-purple-400" /> Interfaz y Estilo
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Paleta de Colores</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { id: 'zinc', name: 'Zinc (Default)', color: 'bg-zinc-900' },
                          { id: 'slate', name: 'Slate', color: 'bg-slate-900' },
                          { id: 'stone', name: 'Stone', color: 'bg-stone-900' },
                          { id: 'neutral', name: 'Neutral', color: 'bg-neutral-900' },
                          { id: 'blue', name: 'Midnight', color: 'bg-blue-900' },
                          { id: 'emerald', name: 'Forest', color: 'bg-emerald-900' },
                          { id: 'rose', name: 'Crimson', color: 'bg-rose-900' },
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${theme === t.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-black/40 hover:border-white/20'}`}
                          >
                            <div className={`w-8 h-8 rounded-full ${t.color} border border-white/10`} />
                            <span className="text-[10px] font-bold uppercase">{t.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audio & Notifications */}
                <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-8 space-y-6">
                  <h3 className="text-xl font-black uppercase italic flex items-center gap-2">
                    <Volume2 className="text-blue-400" /> Sonido y Notificaciones
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => setAudioEnabled(!audioEnabled)}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${audioEnabled ? 'bg-blue-500/10 border-blue-500/50' : 'bg-black/40 border-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Volume2 className={audioEnabled ? 'text-blue-400' : 'text-zinc-500'} size={20} />
                        <div className="text-left">
                          <div className="text-sm font-black uppercase italic">Efectos de Sonido</div>
                          <div className="text-[8px] text-zinc-500 font-bold uppercase">{audioEnabled ? 'Activado' : 'Desactivado'}</div>
                        </div>
                      </div>
                      <div className={`w-10 h-5 rounded-full p-1 transition-colors ${audioEnabled ? 'bg-blue-500' : 'bg-zinc-700'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full transition-transform ${audioEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </button>

                    <button
                      onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${notificationsEnabled ? 'bg-amber-500/10 border-amber-500/50' : 'bg-black/40 border-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Bell className={notificationsEnabled ? 'text-amber-400' : 'text-zinc-500'} size={20} />
                        <div className="text-left">
                          <div className="text-sm font-black uppercase italic">Notificaciones</div>
                          <div className="text-[8px] text-zinc-500 font-bold uppercase">{notificationsEnabled ? 'Activado' : 'Desactivado'}</div>
                        </div>
                      </div>
                      <div className={`w-10 h-5 rounded-full p-1 transition-colors ${notificationsEnabled ? 'bg-amber-500' : 'bg-zinc-700'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full transition-transform ${notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Language & Region */}
                <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-8 space-y-6">
                  <h3 className="text-xl font-black uppercase italic flex items-center gap-2">
                    <Monitor className="text-emerald-400" /> Idioma y Región
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                    <div>
                      <div className="text-sm font-black uppercase italic">Idioma del Sistema</div>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase">Selecciona tu idioma preferido</div>
                    </div>
                    <select className="bg-zinc-800 text-white rounded-xl px-4 py-2 text-xs font-black uppercase border-none focus:ring-2 focus:ring-emerald-500">
                      <option value="es">Español</option>
                      <option value="en">English</option>
                      <option value="jp">日本語</option>
                    </select>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-zinc-900 border border-rose-500/20 rounded-[32px] p-8 space-y-6">
                  <h3 className="text-xl font-black uppercase italic flex items-center gap-2 text-rose-500">
                    <Trash2 size={20} /> Zona de Peligro
                  </h3>
                  <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-2xl space-y-4">
                    <div className="space-y-1">
                      <div className="text-sm font-black uppercase italic text-rose-500">Reiniciar Cuenta</div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Esta acción borrará permanentemente todo tu progreso, incluyendo Pokémon, monedas y nivel de liga. No se puede deshacer.</p>
                    </div>
                    <button 
                      onClick={() => setShowResetConfirm(true)}
                      className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-500/20"
                    >
                      Borrar Todo el Progreso
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
        </AnimatePresence>

      </main>

      {/* Bottom Nav - Mobile */}
      {!showStarterSelect && !showLoginPrompt && gameState === 'management' && (
        <nav className="lg:hidden h-20 border-t border-white/5 bg-zinc-900/80 backdrop-blur-xl fixed bottom-0 w-full px-4 flex items-center justify-center z-50">
          <div className="flex items-center gap-1 bg-zinc-800/50 p-1 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar max-w-full">
            {[
              { id: 'team', icon: Users, label: 'Equipo' },
              { id: 'inventory', icon: Package, label: 'Inventario' },
              { id: 'lab', icon: FlaskConical, label: 'Lab' },
              { id: 'shop', icon: ShoppingBag, label: 'Tienda' },
              { id: 'market', icon: Store, label: 'Mercado' },
              { id: 'battles', icon: Trophy, label: 'Combates' },
              { id: 'pokedex', icon: Info, label: 'Pokedex' },
              { id: 'hallOfFame', icon: Award, label: 'Salón' },
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter flex flex-col items-center gap-1 transition-all min-w-[64px] ${
                  activeTab === tab.id ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'text-zinc-500'
                }`}
              >
                <tab.icon size={16} />
                <span className="hidden xs:block">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

        {/* Batch Training Modal */}
        <AnimatePresence>
          {showBatchTraining && (
            <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowBatchTraining(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-zinc-900 border border-indigo-500/30 p-8 rounded-[32px] max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black uppercase italic text-white flex items-center gap-3">
                    <Zap className="text-indigo-500" /> Entrenamiento Múltiple
                  </h3>
                  <button onClick={() => setShowBatchTraining(false)} className="text-zinc-500 hover:text-white">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-bold text-zinc-400 uppercase">Selecciona Pokémon ({batchSelectedPokemon.length})</div>
                      <button 
                        onClick={() => {
                          const available = collection.filter(p => p.level < batchTargetLevel && p.level < p.maxLevel);
                          if (batchSelectedPokemon.length === available.length) {
                            setBatchSelectedPokemon([]);
                          } else {
                            setBatchSelectedPokemon(available.map(p => p.instanceId));
                          }
                        }}
                        className="text-xs font-black text-indigo-400 uppercase"
                      >
                        {batchSelectedPokemon.length === collection.filter(p => p.level < batchTargetLevel && p.level < p.maxLevel).length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {collection.filter(p => p.level < batchTargetLevel && p.level < p.maxLevel).map(p => (
                        <div 
                          key={p.instanceId}
                          onClick={() => {
                            setBatchSelectedPokemon(prev => 
                              prev.includes(p.instanceId) 
                                ? prev.filter(id => id !== p.instanceId)
                                : [...prev, p.instanceId]
                            );
                          }}
                          className={`relative cursor-pointer rounded-2xl border-2 p-2 transition-all ${batchSelectedPokemon.includes(p.instanceId) ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-zinc-800/50 hover:border-white/20'}`}
                        >
                          <div className="flex items-center gap-3">
                            <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`} alt="" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                            <div>
                              <div className="text-xs font-black uppercase truncate text-white">{p.name}</div>
                              <div className="text-[10px] font-bold text-zinc-500 uppercase">Nivel {p.level}/{p.maxLevel}</div>
                            </div>
                          </div>
                          {batchSelectedPokemon.includes(p.instanceId) && (
                            <div className="absolute top-2 right-2 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                              <Check size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                      {collection.filter(p => p.level < batchTargetLevel && p.level < p.maxLevel).length === 0 && (
                        <div className="col-span-full text-center py-8 text-zinc-500 text-sm font-bold uppercase">
                          No hay Pokémon disponibles para entrenar a este nivel.
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-black/40 rounded-2xl p-6 border border-white/5 space-y-4">
                      <h4 className="text-sm font-black uppercase text-zinc-400">Configuración</h4>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nivel Objetivo (1-10)</label>
                        <input 
                          type="range" 
                          min="1" 
                          max="50" 
                          value={batchTargetLevel} 
                          onChange={(e) => {
                            const newLevel = parseInt(e.target.value);
                            setBatchTargetLevel(newLevel);
                            setBatchSelectedPokemon(prev => prev.filter(id => {
                              const p = collection.find(poke => poke.instanceId === id);
                              return p && p.level < newLevel && p.level < p.maxLevel;
                            }));
                          }}
                          className="w-full accent-indigo-500"
                        />
                        <div className="text-center font-black text-xl text-indigo-400">{batchTargetLevel}</div>
                      </div>
                    </div>
                    
                    <div className="bg-black/40 rounded-2xl p-6 border border-white/5 space-y-4">
                      <h4 className="text-sm font-black uppercase text-zinc-400">Resumen</h4>
                      
                      {(() => {
                        let totalTpNeeded = 0;
                        batchSelectedPokemon.forEach(id => {
                          const p = collection.find(poke => poke.instanceId === id);
                          if (p && p.level < batchTargetLevel && p.level < p.maxLevel) {
                            totalTpNeeded += (Math.min(batchTargetLevel, p.maxLevel) - p.level) * TRAINING_COST_BASE;
                          }
                        });
                        
                        let tpToSpend = 0;
                        let coinsToSpend = 0;
                        if (tp >= totalTpNeeded) {
                          tpToSpend = totalTpNeeded;
                        } else {
                          tpToSpend = tp;
                          coinsToSpend = (totalTpNeeded - tp) * 2;
                        }
                        
                        const canAfford = coins >= coinsToSpend;
                        
                        return (
                          <>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs font-bold uppercase">
                                <span className="text-zinc-500">TP Necesario:</span>
                                <span className="text-white">{totalTpNeeded}</span>
                              </div>
                              <div className="flex justify-between text-xs font-bold uppercase">
                                <span className="text-zinc-500">TP a Usar:</span>
                                <span className="text-indigo-400">-{tpToSpend}</span>
                              </div>
                              <div className="flex justify-between text-xs font-bold uppercase">
                                <span className="text-zinc-500">Monedas a Usar:</span>
                                <span className={coinsToSpend > 0 ? 'text-amber-400' : 'text-zinc-500'}>-{coinsToSpend}</span>
                              </div>
                            </div>
                            
                            <button 
                              onClick={handleBatchTrain}
                              disabled={batchSelectedPokemon.length === 0 || !canAfford}
                              className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all ${batchSelectedPokemon.length > 0 && canAfford ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                            >
                              {batchSelectedPokemon.length === 0 ? 'Selecciona Pokémon' : !canAfford ? 'Recursos Insuficientes' : 'Entrenar'}
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Reset Confirmation Modal */}
        <AnimatePresence>
          {showResetConfirm && (
            <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowResetConfirm(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-zinc-900 border border-rose-500/30 p-8 rounded-[32px] max-w-md w-full shadow-2xl space-y-6"
              >
                <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center mx-auto">
                  <Trash2 className="text-rose-500" size={32} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black uppercase italic text-white">¿Reiniciar Todo?</h3>
                  <p className="text-zinc-400 text-sm font-bold uppercase">
                    Esta acción es irreversible. Perderás todos tus Pokémon, monedas, nivel de liga y récords.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={resetGame}
                    className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-500/20"
                  >
                    Sí, Borrar Todo
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-2xl font-black uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Evolution Animation Modal */}
        <AnimatePresence>
          {evolvingPokemon && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-xl overflow-hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.2)_0%,transparent_70%)] animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.5, 1],
                      rotate: [0, 360, 720],
                      opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-[600px] h-[600px] border-2 border-rose-500/20 rounded-full blur-xl"
                  />
                </div>
              </motion.div>

              <div className="relative z-10 flex flex-col items-center gap-12">
                <div className="flex items-center gap-24">
                  {/* From */}
                  <motion.div
                    animate={{ 
                      scale: [1, 0.8, 0],
                      opacity: [1, 1, 0],
                      filter: ["brightness(1)", "brightness(5)", "brightness(10)"]
                    }}
                    transition={{ duration: 2.5, times: [0, 0.8, 1], ease: "easeInOut" }}
                    className="flex flex-col items-center gap-4"
                  >
                    <img 
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evolvingPokemon.from.id}.png`} 
                      alt="" 
                      className="w-48 h-48 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-xl font-black uppercase text-zinc-500">{evolvingPokemon.from.name}</div>
                  </motion.div>

                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                    transition={{ delay: 2, duration: 1 }}
                  >
                    <ChevronRight size={64} className="text-rose-500 animate-pulse" />
                  </motion.div>

                  {/* To */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0, filter: "brightness(10)" }}
                    animate={{ 
                      scale: [0, 1.2, 1], 
                      opacity: [0, 1, 1],
                      filter: ["brightness(10)", "brightness(5)", "brightness(1)"]
                    }}
                    transition={{ delay: 2.5, duration: 1.5, times: [0, 0.3, 1] }}
                    className="flex flex-col items-center gap-4"
                  >
                    <img 
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evolvingPokemon.to.id}.png`} 
                      alt="" 
                      className="w-64 h-64 object-contain drop-shadow-[0_0_30px_rgba(244,63,94,0.6)]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-3xl font-black uppercase text-white tracking-tighter italic">{evolvingPokemon.to.name}</div>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 4 }}
                  className="flex flex-col items-center gap-6"
                >
                  <div className="text-center">
                    <h2 className="text-5xl font-black uppercase italic text-white tracking-tighter mb-2">¡Evolución Completada!</h2>
                    <p className="text-rose-400 font-bold uppercase tracking-widest">Tu Pokémon ha alcanzado una nueva forma</p>
                  </div>
                  <button
                    onClick={() => setEvolvingPokemon(null)}
                    className="px-12 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-xl"
                  >
                    Continuar
                  </button>
                </motion.div>
              </div>

              {/* Particle Effects */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      x: "50%", 
                      y: "50%", 
                      scale: 0,
                      opacity: 0 
                    }}
                    animate={{ 
                      x: `${Math.random() * 100}%`, 
                      y: `${Math.random() * 100}%`,
                      scale: Math.random() * 2,
                      opacity: [0, 1, 0]
                    }}
                    transition={{ 
                      delay: 2.5 + Math.random() * 1,
                      duration: 2,
                      repeat: Infinity
                    }}
                    className="absolute w-2 h-2 bg-rose-400 rounded-full blur-[2px]"
                  />
                ))}
              </div>
            </div>
          )}
        </AnimatePresence>

      {/* Confirm Move Modal */}
      <AnimatePresence>
        {confirmMove && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmMove(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-zinc-900 border border-indigo-500/30 p-8 rounded-[32px] max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <Sword className="text-indigo-500" size={32} />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tight">¿Aprender Movimiento?</h2>
                <p className="text-zinc-400 text-sm">
                  ¿Quieres que tu Pokémon aprenda <span className="text-indigo-400 font-bold">{confirmMove.move?.name || 'Ataque'}</span>?
                </p>
                <div className="bg-black/40 p-4 rounded-xl mt-4 text-left">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-zinc-500 uppercase">Tipo</span>
                    <span className="text-xs font-black uppercase" style={{ color: getTypeColor(confirmMove.move?.type || 'Normal').replace('bg-', 'text-').replace('-500', '-400') }}>{confirmMove.move?.type || 'Normal'}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-zinc-500 uppercase">Poder</span>
                    <span className="text-xs font-black text-rose-500">{confirmMove.move?.power || 40}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-500 uppercase">Coste</span>
                    <span className="text-xs font-black text-indigo-400">100 TP</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setConfirmMove(null)}
                  className="flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-widest bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    handleChangeMove(confirmMove.instanceId, confirmMove.slotIndex, confirmMove.move);
                    setConfirmMove(null);
                  }}
                  className="flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Match Preview Modal */}
      <AnimatePresence>
        {matchPreview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-zinc-950/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            onClick={() => setMatchPreview(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setMatchPreview(null)}
                className="absolute top-6 right-6 z-50 w-10 h-10 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="p-8 overflow-y-auto custom-scrollbar">
                <div className="text-center space-y-2 mb-8">
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter">Previa del Partido</h2>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Analiza a tu rival antes de la batalla</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Player Team */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-lg shadow-lg shadow-indigo-500/20">{teamLogo}</div>
                      <div>
                        <div className="text-sm font-black uppercase italic">{teamName}</div>
                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Tu Equipo (OVR {teamOvr})</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {teamMembers.map(p => (
                        <div key={p.instanceId} className="bg-black/40 rounded-xl p-2 border border-white/5 flex flex-col items-center">
                          <img 
                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`} 
                            className="w-12 h-12 object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-[8px] font-black uppercase truncate w-full text-center">{p.name}</div>
                          <div className="text-[10px] font-black text-indigo-400">OVR {p.ovr}</div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Synergy Matrix */}
                    <div className="mt-4 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                      <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Zap size={10} /> Matriz de Sinergia
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {teamSynergies.active.length > 0 ? (
                          teamSynergies.active.map((syn, i) => (
                            <div key={i} className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex flex-col">
                              <div className="text-[8px] font-black text-white uppercase">{syn.type} x{syn.count}</div>
                              <div className="text-[7px] font-bold text-indigo-300 uppercase">{syn.effect}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-[8px] font-bold text-zinc-600 uppercase italic">Sin sinergias activas</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rival Team */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-3 justify-end text-right">
                      <div>
                        <div className="text-sm font-black uppercase italic">{previewRivalInfo?.name}</div>
                        <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Rival (OVR {previewRivalInfo?.ovr})</div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center text-lg shadow-lg shadow-rose-500/20">{previewRivalInfo?.logo}</div>
                    </div>
                    
                    {isGeneratingPreview ? (
                      <div className="h-48 flex flex-col items-center justify-center gap-3 bg-black/20 rounded-2xl border border-dashed border-white/5">
                        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Analizando Rival...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {previewRivalTeam?.map((item, idx) => (
                          <div key={idx} className="bg-black/40 rounded-xl p-2 border border-white/5 flex flex-col items-center">
                            <img 
                              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${item.p.id}.png`} 
                              className="w-12 h-12 object-contain"
                              referrerPolicy="no-referrer"
                            />
                            <div className="text-[8px] font-black uppercase truncate w-full text-center">{item.p.name}</div>
                            <div className="text-[10px] font-black text-rose-400">OVR {item.p.ovr}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-12 flex flex-col items-center gap-4">
                  <button 
                    onClick={() => {
                      startBattle(matchPreview!);
                      setMatchPreview(null);
                    }}
                    disabled={isGeneratingPreview || isGeneratingBattle}
                    className="w-full max-w-sm py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-2xl text-sm font-black uppercase italic tracking-widest shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3"
                  >
                    <Sword size={20} /> ¡Comenzar Batalla!
                  </button>
                  <button 
                    onClick={() => setMatchPreview(null)}
                    className="text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors tracking-widest"
                  >
                    Cancelar y Volver
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pokedex Details Modal */}
      <AnimatePresence>
        {selectedPokedexPokemon && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            onClick={() => setSelectedPokedexPokemon(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-[32px] w-full max-w-2xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col relative custom-scrollbar"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedPokedexPokemon(null)}
                className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
              
              <div className="p-6 sm:p-10 flex flex-col items-center relative z-10 overflow-y-auto custom-scrollbar">
                <div className="flex w-full justify-between items-center mb-4">
                  <div className="text-[14px] font-black text-zinc-500 tracking-widest">#{selectedPokedexPokemon.id.toString().padStart(3, '0')}</div>
                  {!pokedex.includes(selectedPokedexPokemon.id) && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full">
                      <Lock size={10} className="text-rose-500" />
                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">No Capturado</span>
                    </div>
                  )}
                </div>
                
                <motion.img 
                  layoutId={`pokedex-img-${selectedPokedexPokemon.id}`}
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${selectedPokedexPokemon.id}.png`}
                  className={`w-40 h-40 sm:w-56 sm:h-56 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] ${!pokedex.includes(selectedPokedexPokemon.id) ? 'grayscale opacity-50' : ''}`}
                  referrerPolicy="no-referrer"
                />

                <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter text-white mt-4 sm:mt-8 mb-4 text-center">
                  {selectedPokedexPokemon.name}
                </h2>

                <div className="flex justify-center gap-2 mb-8">
                  {selectedPokedexPokemon.types.map(t => (
                    <span key={t} className="px-4 py-1.5 bg-white/5 rounded-full text-xs font-black uppercase tracking-widest border border-white/10 text-zinc-300">
                      {t}
                    </span>
                  ))}
                </div>

                <div className="w-full bg-black/40 rounded-3xl p-6 sm:p-8 border border-white/5 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Tipo de Carta</div>
                      <div className={`text-sm sm:text-base font-black uppercase ${RARITY_CONFIG[getRarity(selectedPokedexPokemon)].color}`}>
                        {RARITY_CONFIG[getRarity(selectedPokedexPokemon)].label}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Habilidad</div>
                      <div className="text-sm font-black text-white uppercase">{selectedPokedexPokemon.ability}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Descripción</div>
                    {isFetchingPokedexData ? (
                      <div className="h-12 flex items-center">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-400 leading-relaxed italic">
                        "{pokedexDescription || 'Cargando descripción...'}"
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Estadísticas Base</div>
                    {isFetchingPokedexData ? (
                      <div className="h-12 flex items-center">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : pokedexStats ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">HP</span>
                          <span className="text-xs font-black text-white">{pokedexStats.hp}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">ATK</span>
                          <span className="text-xs font-black text-white">{pokedexStats.atk}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">DEF</span>
                          <span className="text-xs font-black text-white">{pokedexStats.def}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">SPE</span>
                          <span className="text-xs font-black text-white">{pokedexStats.spe}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-600">No hay estadísticas disponibles.</div>
                    )}
                  </div>
                  
                  {selectedPokedexPokemon.evolutionChain && selectedPokedexPokemon.evolutionChain.length > 1 && (
                    <div>
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Línea Evolutiva</div>
                      <div className="flex items-center gap-2">
                        {selectedPokedexPokemon.evolutionChain.map((evId, idx) => {
                          const isCurrent = evId === selectedPokedexPokemon.id;
                          const isUnlocked = pokedex.includes(evId);
                          return (
                            <React.Fragment key={evId}>
                              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${isCurrent ? 'border-indigo-500 bg-indigo-500/20' : 'border-white/5 bg-black/50'} ${!isUnlocked ? 'grayscale opacity-30' : ''}`}>
                                <img 
                                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evId}.png`} 
                                  className="w-10 h-10 object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              {idx < selectedPokedexPokemon.evolutionChain!.length - 1 && (
                                <ChevronRight size={16} className="text-zinc-600" />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-zinc-950 border-t border-white/10 relative z-10">
                <button 
                  onClick={() => setSelectedPokedexPokemon(null)}
                  className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all text-sm"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* League Modals */}
      <AnimatePresence>
        {showRankGuide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-[40px] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                    <Trophy size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase italic">Guía de Rangos y Diseño</h2>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Información del sistema de liga y contrastes</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowRankGuide(false)}
                  className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                >
                  <X size={24} className="text-zinc-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12">
                {/* Ranks Section */}
                <section className="space-y-6">
                  <h3 className="text-lg font-black text-white uppercase italic flex items-center gap-2">
                    <Award className="text-amber-400" /> Jerarquía de la Liga
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {["Hierro", "Bronce", "Plata", "Oro", "Platino", "Esmeralda", "Diamante", "Maestro", "Grandmaster", "Challenger"].map((tier, i) => (
                      <div key={tier} className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            i < 3 ? 'bg-zinc-500' : i < 6 ? 'bg-indigo-500' : 'bg-amber-500'
                          }`} />
                          <span className="text-xs font-black text-white uppercase tracking-wider">{tier}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[9px] font-bold text-zinc-500 uppercase">Divisiones</div>
                          <div className="flex gap-1">
                            {[1, 2, 3].map(d => (
                              <div key={d} className="flex-1 h-1 bg-white/10 rounded-full" />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Contrast Sheet Section */}
                <section className="space-y-6">
                  <h3 className="text-lg font-black text-white uppercase italic flex items-center gap-2">
                    <Activity className="text-emerald-400" /> Contraste y Legibilidad
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-6 bg-zinc-950 rounded-3xl border border-white/5 space-y-4">
                        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Fondo: Zinc 950</div>
                        <div className="space-y-2">
                          <p className="text-white font-medium">Texto Blanco (High Contrast)</p>
                          <p className="text-zinc-300">Texto Zinc 300 (Medium Contrast)</p>
                          <p className="text-zinc-500 italic">Texto Zinc 500 (Low Contrast / Meta)</p>
                          <p className="text-zinc-700 font-black uppercase tracking-tighter">Texto Zinc 700 (Disabled/Background)</p>
                        </div>
                      </div>
                      <div className="p-6 bg-indigo-600 rounded-3xl space-y-4 shadow-xl shadow-indigo-500/20">
                        <div className="text-[10px] font-black text-white/50 uppercase tracking-widest">Fondo: Indigo 600</div>
                        <div className="space-y-2">
                          <p className="text-white font-black italic text-xl">TITULAR IMPACTANTE</p>
                          <p className="text-indigo-100 text-sm">Información secundaria legible sobre color vibrante.</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-3xl p-8 border border-white/5 flex flex-col justify-center items-center text-center space-y-4">
                      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
                        <Check size={40} className="text-emerald-400" />
                      </div>
                      <h4 className="text-xl font-black text-white uppercase">Diseño Validado</h4>
                      <p className="text-zinc-400 text-sm leading-relaxed">
                        La interfaz utiliza una paleta de grises profundos (Zinc 900/950) para maximizar el contraste con los colores de acento (Indigo, Rose, Emerald).
                      </p>
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10" />
                        <div className="w-8 h-8 rounded-lg bg-indigo-600" />
                        <div className="w-8 h-8 rounded-lg bg-rose-600" />
                        <div className="w-8 h-8 rounded-lg bg-emerald-500" />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showChampionCelebration && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              className="relative text-center space-y-8 max-w-2xl"
            >
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 blur-[100px] rounded-full" />
              
              <motion.div
                animate={{ 
                  y: [0, -20, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="relative inline-block"
              >
                <Trophy size={160} className="text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]" />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-4 -right-4"
                >
                  <Crown size={64} className="text-amber-300" />
                </motion.div>
              </motion.div>

              <div className="space-y-4">
                <h2 className="text-6xl md:text-8xl font-black text-white uppercase italic tracking-tighter leading-none">
                  ¡CAMPEÓN DE LIGA!
                </h2>
                <p className="text-amber-400 font-black uppercase tracking-[0.3em] text-sm md:text-base">
                  Has conquistado la gloria en {getLeagueName(leagueLevel - 1)}
                </p>
              </div>

              <div className="p-8 bg-white/5 border border-white/10 rounded-[40px] backdrop-blur-md space-y-6">
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Tu nombre quedará grabado en el Salón de la Fama. Has demostrado ser el mejor entrenador de la región.
                </p>
                <div className="flex justify-center gap-4">
                  <div className="bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase">Temporada</div>
                    <div className="text-2xl font-black text-white">{season}</div>
                  </div>
                  <div className="bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase">Siguiente</div>
                    <div className="text-2xl font-black text-indigo-400">{getLeagueName(leagueLevel)}</div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowChampionCelebration(false)}
                className="w-full py-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-[32px] font-black uppercase tracking-widest text-lg transition-all shadow-2xl shadow-amber-500/40"
              >
                Continuar mi Legado
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPokemon && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            onClick={() => setSelectedPokemon(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-[32px] w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedPokemon(null)}
                className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
              {/* Header / Top Section */}
              <div className="flex flex-col md:flex-row flex-1 overflow-y-auto custom-scrollbar">
                
                {/* Left Column: Image & Core Info */}
                <div className="w-full md:w-2/5 md:sticky md:top-0 bg-black/40 p-6 md:p-10 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-white/5 shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent" />
                  
                  {/* Badges */}
                  <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex flex-col gap-1.5 md:gap-2 z-20">
                    <div className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-[10px] font-bold uppercase tracking-wider ${RARITY_CONFIG[selectedPokemon.rarity].color} bg-black/40 backdrop-blur-sm border border-white/10`}>
                      {selectedPokemon.rarity}
                    </div>
                    {selectedPokemon.limitBroken && (
                      <div className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-[10px] font-bold bg-rose-500/80 text-white border border-rose-500/50 flex items-center gap-1">
                        <Zap size={8} className="md:w-[10px] md:h-[10px]" /> Limit Broken
                      </div>
                    )}
                    {selectedPokemon.isInjured && (
                      <div className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-[10px] font-bold bg-red-500/80 text-white border border-red-500/50 flex items-center gap-1">
                        <Heart size={8} className="md:w-[10px] md:h-[10px]" /> Lesionado ({selectedPokemon.injuryWeeks} sem)
                      </div>
                    )}
                  </div>

                  <motion.img 
                    layoutId={`pokemon-img-${selectedPokemon.instanceId}`}
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${selectedPokemon.id}.png`}
                    className={`w-36 h-36 sm:w-48 sm:h-48 md:w-64 md:h-64 object-contain relative z-10 drop-shadow-[0_0_50px_rgba(255,255,255,0.2)] ${selectedPokemon.isInjured ? 'grayscale opacity-50' : ''}`}
                    referrerPolicy="no-referrer"
                  />

                  <div className="relative z-10 w-full mt-2 sm:mt-6 space-y-3 md:space-y-4">
                    <div className="text-center">
                      <h2 className="text-2xl sm:text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white truncate px-2">{selectedPokemon.name}</h2>
                      <div className="flex justify-center gap-1.5 md:gap-2 mt-1 md:mt-2">
                        {selectedPokemon?.types?.map(t => (
                          <span key={t} className="px-2 md:px-3 py-0.5 md:py-1 bg-white/5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-white/5 text-zinc-400">{t}</span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 md:gap-4 bg-black/30 rounded-xl md:rounded-2xl p-3 md:p-4 border border-white/5">
                      <div className="text-center">
                        <div className="text-3xl md:text-5xl font-black text-rose-500 leading-none">{selectedPokemon.ovr}</div>
                        <div className="text-[8px] md:text-[10px] font-bold text-rose-500/60 uppercase tracking-widest mt-1">Poder Total</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Details & Stats */}
                <div className="flex-1 p-5 md:p-10 flex flex-col space-y-6 md:space-y-8">
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 md:gap-6">
                    <div className="bg-black/40 rounded-xl md:rounded-2xl p-2 md:p-4 border border-white/5 text-center">
                      <div className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase mb-0.5 md:mb-1">Ataque</div>
                      <div className="text-lg md:text-2xl font-black text-white">{selectedPokemon.atk}</div>
                    </div>
                    <div className="bg-black/40 rounded-xl md:rounded-2xl p-2 md:p-4 border border-white/5 text-center">
                      <div className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase mb-0.5 md:mb-1">Defensa</div>
                      <div className="text-lg md:text-2xl font-black text-white">{selectedPokemon.def}</div>
                    </div>
                    <div className="bg-black/40 rounded-xl md:rounded-2xl p-2 md:p-4 border border-white/5 text-center">
                      <div className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase mb-0.5 md:mb-1">Velocidad</div>
                      <div className="text-lg md:text-2xl font-black text-white">{selectedPokemon.spe}</div>
                    </div>
                  </div>

                  {/* Development & Fatigue */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-3">
                      <h3 className="text-xs font-black uppercase text-zinc-500 flex items-center gap-2">
                        <Dumbbell size={14} /> Desarrollo
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase mb-1">
                            <span>Nivel</span>
                            <span className="text-white">{selectedPokemon.level} / {selectedPokemon.maxLevel}</span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${(selectedPokemon.level / selectedPokemon.maxLevel) * 100}%` }} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase mb-1">
                              <span>Entreno</span>
                              <span>{selectedPokemon.trainingLevel}/10</span>
                            </div>
                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-400" style={{ width: `${(selectedPokemon.trainingLevel / 10) * 100}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase mb-1">
                              <span>Potencia</span>
                              <span>{selectedPokemon.powerLevel}/10</span>
                            </div>
                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400" style={{ width: `${(selectedPokemon.powerLevel / 10) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-3">
                      <h3 className="text-xs font-black uppercase text-zinc-500 flex items-center gap-2">
                        <Activity size={14} /> Estado Físico
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase mb-1">
                            <span>Fatiga</span>
                            <span className={selectedPokemon.fatigue > 70 ? 'text-red-400' : selectedPokemon.fatigue > 40 ? 'text-yellow-400' : 'text-green-400'}>{selectedPokemon.fatigue}%</span>
                          </div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full transition-all ${selectedPokemon.fatigue > 70 ? 'bg-red-500' : selectedPokemon.fatigue > 40 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${selectedPokemon.fatigue}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-black/30 rounded-xl p-2 border border-white/5">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">Habilidad</span>
                          <span className="text-[10px] font-black text-indigo-300 uppercase">{selectedPokemon.ability}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance & Moves */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-3">
                      <h3 className="text-xs font-black uppercase text-zinc-500 flex items-center gap-2">
                        <Trophy size={14} /> Rendimiento
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/30 rounded-xl p-2 text-center">
                          <div className="text-[9px] font-bold text-zinc-500 uppercase mb-0.5">Partidos</div>
                          <div className="text-sm font-black text-white">{selectedPokemon.matchesPlayed || 0}</div>
                        </div>
                        <div className="bg-black/30 rounded-xl p-2 text-center">
                          <div className="text-[9px] font-bold text-zinc-500 uppercase mb-0.5">MVPs</div>
                          <div className="text-sm font-black text-amber-400">{selectedPokemon.mvpCount || 0}</div>
                        </div>
                        <div className="col-span-2 bg-black/30 rounded-xl p-2 text-center">
                          <div className="text-[9px] font-bold text-zinc-500 uppercase mb-0.5">Daño Total Repartido</div>
                          <div className="text-sm font-black text-rose-400">{selectedPokemon.totalDamageDealt || 0}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-3">
                      <h3 className="text-xs font-black uppercase text-zinc-500 flex items-center gap-2">
                        <Sword size={14} /> Movimientos
                      </h3>
                      <div className="grid grid-cols-1 gap-1.5">
                        {selectedPokemon.moves?.map((m, i) => (
                          <div key={i} className="flex justify-between items-center bg-black/30 rounded-lg px-3 py-1.5">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase text-white">{m?.name || 'Ataque'}</span>
                              <span className="text-[8px] font-bold text-zinc-500 uppercase">{m?.type || 'Normal'}</span>
                            </div>
                            <span className="text-[10px] font-black text-rose-400">{m?.power || 40} PWR</span>
                          </div>
                        ))}
                        {(!selectedPokemon.moves || selectedPokemon.moves.length === 0) && (
                          <div className="text-[10px] text-zinc-500 italic text-center py-2">Sin movimientos</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Match History */}
                  <div className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-3">
                    <h3 className="text-xs font-black uppercase text-zinc-500 flex items-center gap-2">
                      <History size={14} /> Historial de Combates
                    </h3>
                    <div className="max-h-[120px] overflow-y-auto pr-2 custom-scrollbar space-y-1">
                      {selectedPokemon.matchHistory?.length > 0 ? (
                        selectedPokemon.matchHistory.map((h, i) => (
                          <div key={i} className="flex justify-between items-center text-[10px] py-1.5 border-b border-white/5 last:border-0">
                            <div className="flex flex-col">
                              <span className="font-black uppercase italic text-white">vs {h.opponent}</span>
                              <span className="text-zinc-500">{new Date(h.date).toLocaleDateString()}</span>
                            </div>
                            <div className="text-right">
                              <div className={`font-black uppercase ${h.result === 'win' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {h.result === 'win' ? 'Victoria' : 'Derrota'}
                              </div>
                              <div className="text-zinc-500">{h.damageDealt} Daño • {h.fainted ? 'Debilitado' : 'Sobrevivió'}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-zinc-600 text-[10px] font-bold uppercase">Sin historial aún</div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="p-4 md:p-6 bg-zinc-950 border-t border-white/10 flex flex-wrap sm:flex-nowrap gap-3">
                <button 
                  onClick={() => setSelectedPokemon(null)}
                  className="w-full sm:flex-1 py-3 md:py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all text-xs md:text-sm"
                >
                  Cerrar
                </button>
                {selectedPokemon.fatigue > 0 && (
                  <button 
                    onClick={() => handleUseBandita(selectedPokemon.instanceId)}
                    disabled={banditas <= 0}
                    className={`w-full sm:flex-1 py-3 md:py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-xs md:text-sm ${banditas > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                  >
                    <Heart size={16} /> Curar ({banditas})
                  </button>
                )}
                {selectedPokemon.megaStone ? (
                  <button 
                    onClick={() => handleUnequipMegaStone(selectedPokemon.instanceId)}
                    className="w-full sm:flex-1 py-3 md:py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-xs md:text-sm bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    <Zap size={16} /> Quitar {selectedPokemon.megaStone}
                  </button>
                ) : (() => {
                  const compatibleStones = megaStones.filter(s => {
                    const stone = s.toLowerCase();
                    const name = selectedPokemon.name.toLowerCase();
                    if (name === 'charizard') return stone.includes('charizardite');
                    if (name === 'venusaur') return stone.includes('venusaurite');
                    if (name === 'blastoise') return stone.includes('blastoisinite');
                    if (name === 'lucario') return stone.includes('lucarionite');
                    if (name === 'gengar') return stone.includes('gengarite');
                    if (name === 'alakazam') return stone.includes('alakazite');
                    if (name === 'mewtwo') return stone.includes('mewtwonite');
                    if (name === 'rayquaza') return stone.includes('rayquazite');
                    if (name === 'scizor') return stone.includes('scizorite');
                    if (name === 'steelix') return stone.includes('steelixite');
                    if (name === 'tyranitar') return stone.includes('tyranitarite');
                    if (name === 'salamence') return stone.includes('salamencite');
                    if (name === 'metagross') return stone.includes('metagrossite');
                    if (name === 'garchomp') return stone.includes('garchompite');
                    if (name === 'gardevoir') return stone.includes('gardevoirite');
                    if (name === 'gallade') return stone.includes('galladite');
                    if (name === 'aggron') return stone.includes('aggronite');
                    if (name === 'houndoom') return stone.includes('houndoominite');
                    if (name === 'manectric') return stone.includes('manectite');
                    if (name === 'pinsir') return stone.includes('pinsirite');
                    if (name === 'heracross') return stone.includes('heracronite');
                    if (name === 'banette') return stone.includes('banettite');
                    if (name === 'absol') return stone.includes('absolite');
                    if (name === 'medicham') return stone.includes('medichamite');
                    if (name === 'ampharos') return stone.includes('ampharosite');
                    if (name === 'aerodactyl') return stone.includes('aerodactylite');
                    if (name === 'mawile') return stone.includes('mawilite');
                    if (name === 'kangaskhan') return stone.includes('kangaskhanite');
                    if (name === 'gyarados') return stone.includes('gyaradosite');
                    return false;
                  });
                  return compatibleStones.length > 0 ? (
                    <button 
                      onClick={() => handleEquipMegaStone(selectedPokemon.instanceId, compatibleStones[0])}
                      className="w-full sm:flex-1 py-3 md:py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-xs md:text-sm bg-purple-600 hover:bg-purple-500 text-white"
                    >
                      <Zap size={16} /> Equipar Mega Piedra
                    </button>
                  ) : null;
                })()}
                {selectedPokemon.item ? (
                  <button 
                    onClick={() => handleUnequipItem(selectedPokemon.instanceId)}
                    className="w-full sm:flex-1 py-3 md:py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-xs md:text-sm bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    <Package size={16} /> Quitar {HELD_ITEMS.find(i => i.id === selectedPokemon.item)?.name}
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowItemSelection(selectedPokemon.instanceId)}
                    className="w-full sm:flex-1 py-3 md:py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-xs md:text-sm bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    <Package size={16} /> Equipar Objeto
                  </button>
                )}
                <button 
                  onClick={() => { toggleTeamMember(selectedPokemon.instanceId); setSelectedPokemon(null); }}
                  className={`w-full sm:flex-1 py-3 md:py-4 rounded-2xl font-black uppercase tracking-widest transition-all text-xs md:text-sm ${team.includes(selectedPokemon.instanceId) ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                >
                  {team.includes(selectedPokemon.instanceId) ? 'Quitar del Equipo' : 'Añadir al Equipo'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simulation Overlay */}
      <AnimatePresence>
        {simulationState?.isActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Background glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

              <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-white mb-2 relative z-10">
                Simulando {simulationState.type === 'week' ? 'Semana' : 'Temporada'}
              </h2>
              
              <div className="text-zinc-400 text-sm font-bold uppercase tracking-widest mb-8 relative z-10">
                Partido {simulationState.currentMatchIndex} de {simulationState.totalMatches}
              </div>

              {simulationState.currentMatch ? (
                <div className="w-full bg-black/40 rounded-2xl p-4 sm:p-6 border border-white/5 mb-8 relative z-10">
                  <div className="flex justify-between items-center mb-4 gap-2 sm:gap-4">
                    <div className="flex-1 flex flex-col items-center sm:items-end text-center sm:text-right min-w-0">
                      <div className="text-3xl sm:text-4xl mb-1 sm:mb-2">{simulationState.currentMatch.homeTeam.logo}</div>
                      <div className="text-xs sm:text-lg font-black uppercase text-white truncate w-full">
                        {simulationState.currentMatch.homeTeam.name}
                      </div>
                      <div className="text-[9px] sm:text-xs text-zinc-500 font-bold">OVR {simulationState.currentMatch.homeTeam.ovr}</div>
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-3 px-2 sm:px-4 py-1 sm:py-2 bg-zinc-800 rounded-xl border border-white/10 shrink-0">
                      <span className="text-xl sm:text-3xl font-black text-white w-5 sm:w-8 text-center">{simulationState.currentMatch.homeScore}</span>
                      <span className="text-zinc-500 font-black text-sm sm:text-base">-</span>
                      <span className="text-xl sm:text-3xl font-black text-white w-5 sm:w-8 text-center">{simulationState.currentMatch.awayScore}</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left min-w-0">
                      <div className="text-3xl sm:text-4xl mb-1 sm:mb-2">{simulationState.currentMatch.awayTeam.logo}</div>
                      <div className="text-xs sm:text-lg font-black uppercase text-white truncate w-full">
                        {simulationState.currentMatch.awayTeam.name}
                      </div>
                      <div className="text-[9px] sm:text-xs text-zinc-500 font-bold">OVR {simulationState.currentMatch.awayTeam.ovr}</div>
                    </div>
                  </div>
                  
                  {/* Progress bar for the current match */}
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-500"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: simulationState.type === 'week' ? 0.9 : 0.18, ease: "linear" }}
                      key={simulationState.currentMatchIndex} // Reset animation on new match
                    />
                  </div>
                </div>
              ) : (
                <div className="w-full h-32 flex items-center justify-center mb-8 relative z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              )}

              <button
                onClick={stopSimulation}
                disabled={simulationState.isStopping}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all relative z-10 ${
                  simulationState.isStopping 
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)]'
                }`}
              >
                {simulationState.isStopping ? 'Deteniendo...' : 'Parar Simulación'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Celebration Modal */}
      <AnimatePresence>
        {celebration && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setCelebration(null)}
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className={`bg-zinc-900 border ${celebration.type === 'win' ? 'border-emerald-500' : 'border-amber-500'} rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center`}
            >
              <div className={`p-4 rounded-full mb-4 ${celebration.type === 'win' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {celebration.type === 'win' ? <Trophy size={48} /> : <Award size={48} />}
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">
                {celebration.message}
              </h2>
              <button 
                onClick={() => setCelebration(null)}
                className="mt-6 w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black uppercase tracking-widest transition-all"
              >
                ¡Genial!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Pending Evolution Modal */}
      <AnimatePresence>
        {pendingEvolution && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4 text-center">¿Cómo quieres evolucionar a {pendingEvolution.pokemon.name}?</h3>
              <div className="space-y-3">
                {pendingEvolution.options.map(opt => {
                  const nextBase = POKEDEX_BASE.find(b => b.id === opt.id);
                  if (!nextBase) return null;
                  const isStone = opt.condition.type === 'stone';
                  const stoneName = isStone ? opt.condition.value as string : '';
                  const stoneNamesES: Record<string, string> = {
                    fire: 'Fuego', water: 'Agua', thunder: 'Trueno', leaf: 'Hoja', 
                    moon: 'Lunar', sun: 'Solar', shiny: 'Brillante', dusk: 'Noche', 
                    dawn: 'Alba', ice: 'Hielo'
                  };

                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        executeEvolution(pendingEvolution.pokemon, opt.id, isStone ? stoneName : undefined);
                        setPendingEvolution(null);
                      }}
                      className="w-full p-4 rounded-xl border border-white/10 bg-zinc-800/50 hover:bg-zinc-800 flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${opt.id}.png`} 
                          alt={nextBase.name} 
                          className="w-12 h-12" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-left">
                          <div className="font-bold text-white group-hover:text-rose-400 transition-colors">{nextBase.name}</div>
                          <div className="text-xs text-zinc-400">
                            {isStone ? (
                              <div className="flex items-center gap-1">
                                <img 
                                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${stoneName}-stone.png`}
                                  alt={stoneName}
                                  className="w-4 h-4 object-contain"
                                  referrerPolicy="no-referrer"
                                />
                                <span>Piedra {stoneNamesES[stoneName] || stoneName}</span>
                              </div>
                            ) : (
                              <span>Felicidad: {pendingEvolution.pokemon.happiness}/{opt.condition.value}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="text-zinc-500 group-hover:text-white transition-colors" />
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => setPendingEvolution(null)}
                className="mt-6 w-full py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Selection Modal */}
      <AnimatePresence>
        {showItemSelection && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Equipar Objeto</h2>
                <button onClick={() => setShowItemSelection(null)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3">
                {Object.entries(heldItems).filter(([_, count]) => (count as number) > 0).map(([itemId, count]) => {
                  const item = HELD_ITEMS.find(i => i.id === itemId);
                  return (
                    <button
                      key={itemId}
                      onClick={() => {
                        handleEquipItem(showItemSelection, itemId);
                        setShowItemSelection(null);
                      }}
                      className="w-full p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all flex items-center gap-4 text-left group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-white/10 group-hover:border-blue-500/50 transition-colors">
                        <img 
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${itemId}.png`} 
                          alt={itemId}
                          className="w-8 h-8 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-white uppercase text-sm tracking-tight">{item?.name}</span>
                          <span className="text-[10px] font-bold text-zinc-500">x{count}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight mt-1">{item?.description}</p>
                        <p className="text-[9px] text-blue-400 font-bold mt-1 italic">{item?.effect}</p>
                      </div>
                    </button>
                  );
                })}
                {Object.values(heldItems).every(count => count === 0) && (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-600">
                      <Package size={32} />
                    </div>
                    <p className="text-zinc-500 font-bold uppercase text-xs">No tienes objetos disponibles</p>
                    <button 
                      onClick={() => {
                        setShowItemSelection(null);
                        setActiveTab('shop');
                      }}
                      className="text-blue-400 font-black uppercase text-[10px] hover:underline"
                    >
                      Ir a la tienda
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4 bg-black/20">
                <button 
                  onClick={() => setShowItemSelection(null)}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TutorialOverlay />

    </div>
  </div>
);
}
