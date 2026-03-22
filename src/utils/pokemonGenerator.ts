import { PokemonInstance, BaseStats, Nature, PassiveAbility, HeldItem, Move, PokemonType, Rarity } from '../types';

const NATURES: Nature[] = [
  'Adamant', 'Jolly', 'Modest', 'Timid', 'Bold', 'Impish', 'Careful', 'Calm', 'Serious'
];

const ITEMS: HeldItem[] = [
  { id: 'leftovers', name: 'Leftovers', description: 'Heals 6% HP each turn.', effectType: 'healing', value: 0.06 },
  { id: 'choice_band', name: 'Choice Band', description: 'Boosts ATK by 50% but locks move.', effectType: 'stat_boost', value: 1.5 },
  { id: 'life_orb', name: 'Life Orb', description: 'Boosts damage by 30% but costs 10% HP.', effectType: 'stat_boost', value: 1.3 },
  { id: 'focus_sash', name: 'Focus Sash', description: 'Survive a fatal hit with 1 HP.', effectType: 'utility', value: 1 },
];

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateIVs(): BaseStats {
  return {
    hp: getRandomInt(0, 31),
    atk: getRandomInt(0, 31),
    def: getRandomInt(0, 31),
    spa: getRandomInt(0, 31),
    spd: getRandomInt(0, 31),
    spe: getRandomInt(0, 31),
  };
}

function generateEVs(): BaseStats {
  // Freshly pulled pokemon have 0 EVs
  return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
}

function calculateOVR(baseStats: BaseStats, ivs: BaseStats, level: number): number {
  // Simplified OVR calculation based on base stats and IVs
  const totalBase = baseStats.hp + baseStats.atk + baseStats.def + baseStats.spa + baseStats.spd + baseStats.spe;
  const totalIVs = ivs.hp + ivs.atk + ivs.def + ivs.spa + ivs.spd + ivs.spe;
  
  // Max possible base is around 720 (Arceus), max IVs is 186
  const baseScore = (totalBase / 600) * 100;
  const ivScore = (totalIVs / 186) * 100;
  
  return Math.floor((baseScore * 0.7) + (ivScore * 0.3) + (level * 0.5));
}

export async function generatePokemon(rarity: Rarity, academyLevel: number): Promise<PokemonInstance> {
  // Determine level range based on rarity
  let level = 1;
  let idRange = [1, 493]; // Expanded to Gen 4
  
  const LEGENDARY_IDS = [
    144, 145, 146, 150, 151, // Gen 1
    243, 244, 245, 249, 250, 251, // Gen 2
    377, 378, 379, 380, 381, 382, 383, 384, 385, 386, // Gen 3
    480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493 // Gen 4
  ];

  switch (rarity) {
    case 'Common': level = getRandomInt(1, 10); break;
    case 'Rare': level = getRandomInt(10, 20); break;
    case 'Mythical': level = getRandomInt(20, 40); break;
    case 'Legendary': 
      level = getRandomInt(40, 60); 
      const randomLegendaryId = LEGENDARY_IDS[getRandomInt(0, LEGENDARY_IDS.length - 1)];
      return await fetchPokemonById(randomLegendaryId, level, rarity, academyLevel);
  }

  const pokedexNumber = getRandomInt(idRange[0], idRange[1]);
  return await fetchPokemonById(pokedexNumber, level, rarity, academyLevel);
}

async function fetchPokemonById(pokedexNumber: number, level: number, rarity: Rarity, academyLevel: number): Promise<PokemonInstance> {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokedexNumber}`);
    const data = await response.json();
    
    const types: PokemonType[] = data.types.map((t: any) => {
      const name = t.type.name;
      return (name.charAt(0).toUpperCase() + name.slice(1)) as PokemonType;
    });
    const baseStats: BaseStats = {
      hp: data.stats.find((s: any) => s.stat.name === 'hp').base_stat + (rarity === 'Common' ? academyLevel * 2 : 0),
      atk: data.stats.find((s: any) => s.stat.name === 'attack').base_stat + (rarity === 'Common' ? academyLevel * 2 : 0),
      def: data.stats.find((s: any) => s.stat.name === 'defense').base_stat + (rarity === 'Common' ? academyLevel * 2 : 0),
      spa: data.stats.find((s: any) => s.stat.name === 'special-attack').base_stat + (rarity === 'Common' ? academyLevel * 2 : 0),
      spd: data.stats.find((s: any) => s.stat.name === 'special-defense').base_stat + (rarity === 'Common' ? academyLevel * 2 : 0),
      spe: data.stats.find((s: any) => s.stat.name === 'speed').base_stat + (rarity === 'Common' ? academyLevel * 2 : 0),
    };

    const abilityName = data.abilities[0]?.ability.name || 'Unknown';
    const ability: PassiveAbility = { name: abilityName, description: 'A passive ability.' };
    
    // Fetch some moves (simplified)
    const moves: Move[] = data.moves.slice(0, 4).map((m: any, i: number) => ({
      id: `m_${i}`,
      name: m.move.name,
      type: types[0], // Simplified: assign primary type to moves
      category: i % 2 === 0 ? 'Physical' : 'Special',
      power: getRandomInt(40, 100),
      accuracy: getRandomInt(80, 100),
    }));

    const ivs = generateIVs();
    const isShiny = Math.random() < 0.01; // 1% shiny rate

    return {
      id: `pkmn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pokedexNumber,
      name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
      sprite: isShiny ? data.sprites.front_shiny : data.sprites.front_default,
      types,
      level,
      exp: 0,
      rarity,
      isShiny,
      baseStats,
      currentStats: { ...baseStats },
      currentHp: baseStats.hp,
      ivs,
      evs: generateEVs(),
      nature: NATURES[getRandomInt(0, NATURES.length - 1)],
      ability,
      heldItem: Math.random() < 0.2 ? ITEMS[getRandomInt(0, ITEMS.length - 1)] : undefined, // 20% chance for item
      moves,
      fatigue: 0,
      morale: 'Good',
      isInjured: false,
      injuryDaysRemaining: 0,
      currentOVR: calculateOVR(baseStats, ivs, level) + (isShiny ? 10 : 0),
      happiness: 50,
      megaEvolved: false,
    };
  } catch (error) {
    console.error("Failed to fetch pokemon", error);
    throw error;
  }
}
