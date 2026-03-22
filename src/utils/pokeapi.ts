import { PokemonInstance, PokemonType, BaseStats, IVs, EVs, Nature, Rarity, Move, PassiveAbility, StatusCondition } from '../types';

const POKEAPI_BASE = 'https://pokeapi.co/api/v2';

// Helper to calculate random IVs
function getRandomIVs(): IVs {
  return {
    hp: Math.floor(Math.random() * 32),
    atk: Math.floor(Math.random() * 32),
    def: Math.floor(Math.random() * 32),
    spa: Math.floor(Math.random() * 32),
    spd: Math.floor(Math.random() * 32),
    spe: Math.floor(Math.random() * 32),
  };
}

// Helper to get random nature
const natures: Nature[] = [
  'Adamant', 'Bold', 'Brave', 'Calm', 'Careful', 'Gentle',
  'Hasty', 'Impish', 'Jolly', 'Lax', 'Lonely', 'Mild',
  'Modest', 'Naive', 'Naughty', 'Quiet', 'Quirky', 'Rash',
  'Relaxed', 'Sassy', 'Serious', 'Timid'
];

function getRandomNature(): Nature {
  return natures[Math.floor(Math.random() * natures.length)];
}

// Helper to calculate stats
import { calculateStat } from './battle';

const moveCache: Record<string, Move> = {};

async function fetchMoveDetails(moveUrl: string): Promise<Move> {
  if (moveCache[moveUrl]) return moveCache[moveUrl];

  try {
    const response = await fetch(moveUrl);
    const data = await response.json();
    
    const categoryMap: Record<string, 'Physical' | 'Special' | 'Status'> = {
      'physical': 'Physical',
      'special': 'Special',
      'status': 'Status'
    };

    const ailmentMap: Record<string, StatusCondition> = {
      'burn': 'Burn',
      'sleep': 'Sleep',
      'poison': 'Poison',
      'paralysis': 'Paralysis',
      'freeze': 'Freeze'
    };

    const move: Move = {
      id: data.name,
      name: data.name.replace('-', ' ').toUpperCase(),
      type: (data.type.name.charAt(0).toUpperCase() + data.type.name.slice(1)) as PokemonType,
      category: categoryMap[data.damage_class.name] || 'Physical',
      power: data.power || 0,
      accuracy: data.accuracy || 100,
      pp: data.pp,
      description: data.effect_entries.find((e: any) => e.language.name === 'en')?.short_effect || 'No description.',
      statusEffect: ailmentMap[data.meta?.ailment?.name] || 'None',
      statusChance: data.meta?.ailment_chance || 0
    };

    moveCache[moveUrl] = move;
    return move;
  } catch (e) {
    console.error('Failed to fetch move details', e);
    return {
      id: 'unknown',
      name: 'UNKNOWN',
      type: 'Normal',
      category: 'Physical',
      power: 40,
      accuracy: 100,
      pp: 35,
      description: 'A mysterious attack.'
    };
  }
}

export async function fetchPokemonData(idOrName: string | number, rarity: Rarity): Promise<PokemonInstance> {
  const response = await fetch(`${POKEAPI_BASE}/pokemon/${idOrName}`);
  if (!response.ok) throw new Error('Pokemon not found');
  const data = await response.json();

  const types: PokemonType[] = data.types.map((t: any) => 
    t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)
  );

  const baseStats: BaseStats = {
    hp: data.stats.find((s: any) => s.stat.name === 'hp').base_stat,
    atk: data.stats.find((s: any) => s.stat.name === 'attack').base_stat,
    def: data.stats.find((s: any) => s.stat.name === 'defense').base_stat,
    spa: data.stats.find((s: any) => s.stat.name === 'special-attack').base_stat,
    spd: data.stats.find((s: any) => s.stat.name === 'special-defense').base_stat,
    spe: data.stats.find((s: any) => s.stat.name === 'speed').base_stat,
  };

  const isShiny = Math.random() < 0.01; // 1% shiny chance
  const sprite = isShiny 
    ? data.sprites.front_shiny || data.sprites.front_default
    : data.sprites.front_default;

  const ivs = getRandomIVs();
  const evs: EVs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  const nature = getRandomNature();
  
  // Get ability
  const abilityData = data.abilities[0]?.ability;
  let ability: PassiveAbility = {
    name: 'Unknown',
    description: 'No ability',
  };

  if (abilityData) {
    try {
      const abilityRes = await fetch(abilityData.url);
      const abilityDetails = await abilityRes.json();
      const englishEntry = abilityDetails.effect_entries.find((e: any) => e.language.name === 'en');
    ability = {
      name: abilityData.name.charAt(0).toUpperCase() + abilityData.name.slice(1),
      description: englishEntry ? englishEntry.short_effect : 'No description available.',
    };
    } catch (e) {
      console.warn('Failed to fetch ability details', e);
    }
  }

  // Get 4 random moves from available moves
  const movePromises = data.moves
    .sort(() => 0.5 - Math.random())
    .slice(0, 4)
    .map((m: any) => fetchMoveDetails(m.move.url));
  
  const moves = await Promise.all(movePromises);

  const level = 1;

  // Calculate current stats
  const currentStats: BaseStats = {
    hp: calculateStat(baseStats.hp, ivs.hp, evs.hp, level, 1, true),
    atk: calculateStat(baseStats.atk, ivs.atk, evs.atk, level, 1, false),
    def: calculateStat(baseStats.def, ivs.def, evs.def, level, 1, false),
    spa: calculateStat(baseStats.spa, ivs.spa, evs.spa, level, 1, false),
    spd: calculateStat(baseStats.spd, ivs.spd, evs.spd, level, 1, false),
    spe: calculateStat(baseStats.spe, ivs.spe, evs.spe, level, 1, false),
  };

  const ovr = Math.floor(
    (currentStats.hp + currentStats.atk + currentStats.def + currentStats.spa + currentStats.spd + currentStats.spe) / 6
  );

  return {
    id: `${data.id}-${Date.now()}`,
    pokedexNumber: data.id,
    name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
    sprite,
    isShiny,
    types,
    rarity,
    level,
    exp: 0,
    baseStats,
    ivs,
    evs,
    nature,
    ability,
    moves,
    fatigue: 0,
    morale: 100 as any,
    isInjured: false,
    injuryDaysRemaining: 0,
    currentStats,
    currentHp: currentStats.hp,
    currentOVR: ovr,
    happiness: 70,
    megaEvolved: false
  };
}

export async function openPack(packType: 'Standard' | 'Premium' | 'Elite'): Promise<PokemonInstance> {
  let rarity: Rarity = 'Common';
  const rand = Math.random();

  if (packType === 'Standard') {
    if (rand < 0.05) rarity = 'Mythical';
    else if (rand < 0.25) rarity = 'Rare';
  } else if (packType === 'Premium') {
    if (rand < 0.10) rarity = 'Legendary';
    else if (rand < 0.50) rarity = 'Mythical';
    else rarity = 'Rare';
  } else if (packType === 'Elite') {
    if (rand < 0.20) rarity = 'Legendary';
    else if (rand < 0.70) rarity = 'Mythical';
    else rarity = 'Rare';
  }

  // Pick a random Pokemon ID (Expanded to Gen 4)
  const randomId = Math.floor(Math.random() * 493) + 1;
  return fetchPokemonData(randomId, rarity);
}

export async function fetchPokemonSpeciesData(id: number): Promise<{ description: string }> {
  try {
    const response = await fetch(`${POKEAPI_BASE}/pokemon-species/${id}`);
    if (!response.ok) return { description: 'No description available.' };
    const data = await response.json();
    
    // Find the first English flavor text entry
    const englishEntry = data.flavor_text_entries.find((e: any) => e.language.name === 'en');
    
    // Clean up the text (remove special characters like form feeds)
    const description = englishEntry 
      ? englishEntry.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ') 
      : 'No description available.';
      
    return { description };
  } catch (error) {
    console.error('Error fetching species data:', error);
    return { description: 'No description available.' };
  }
}
