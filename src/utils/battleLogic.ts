import { PokemonInstance, Move, Weather, StatName, StatusCondition } from '../types';

const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, poison: 0.5, fighting: 2, dragon: 2, dark: 2, steel: 0.5 },
};

export function getTypeEffectiveness(moveType: string, defenderTypes: string[]): number {
  let effectiveness = 1;
  for (const defType of defenderTypes) {
    const multiplier = TYPE_CHART[moveType]?.[defType];
    if (multiplier !== undefined) {
      effectiveness *= multiplier;
    }
  }
  return effectiveness;
}

const NATURE_EFFECTS: Record<string, { inc: string, dec: string }> = {
  Adamant: { inc: 'atk', dec: 'spa' },
  Bold: { inc: 'def', dec: 'atk' },
  Brave: { inc: 'atk', dec: 'spe' },
  Calm: { inc: 'spd', dec: 'atk' },
  Careful: { inc: 'spd', dec: 'spa' },
  Gentle: { inc: 'spd', dec: 'def' },
  Hasty: { inc: 'spe', dec: 'def' },
  Impish: { inc: 'def', dec: 'spa' },
  Jolly: { inc: 'spe', dec: 'spa' },
  Lax: { inc: 'def', dec: 'spd' },
  Lonely: { inc: 'atk', dec: 'def' },
  Mild: { inc: 'spa', dec: 'def' },
  Modest: { inc: 'spa', dec: 'atk' },
  Naive: { inc: 'spe', dec: 'spd' },
  Naughty: { inc: 'atk', dec: 'spd' },
  Quiet: { inc: 'spa', dec: 'spe' },
  Quirky: { inc: '', dec: '' },
  Rash: { inc: 'spa', dec: 'spd' },
  Relaxed: { inc: 'def', dec: 'spe' },
  Sassy: { inc: 'spd', dec: 'spe' },
  Serious: { inc: '', dec: '' },
  Timid: { inc: 'spe', dec: 'atk' }
};

export function calculateActualStat(pokemon: PokemonInstance, statName: StatName): number {
  if (!pokemon || !pokemon.baseStats) return 100;
  
  const base = pokemon.baseStats[statName] || 50;
  const iv = (pokemon.ivs && pokemon.ivs[statName]) !== undefined ? pokemon.ivs[statName] : 15;
  const ev = (pokemon.evs && pokemon.evs[statName]) !== undefined ? pokemon.evs[statName] : 0;
  const level = pokemon.level || 50;
  
  // Formula for HP is different
  if (statName === 'hp') {
    return Math.floor((((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10);
  }

  let statValue = Math.floor((((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5);
  
  const natureEffect = pokemon.nature ? NATURE_EFFECTS[pokemon.nature as string] : null;
  if (natureEffect) {
    if (natureEffect.inc === statName) statValue = Math.floor(statValue * 1.1);
    if (natureEffect.dec === statName) statValue = Math.floor(statValue * 0.9);
  }
  
  return statValue;
}

interface DamageContext {
  attacker: PokemonInstance;
  defender: PokemonInstance;
  move: Move;
  weather: Weather;
  isCritical: boolean;
}

export function calculateDamage({ attacker, defender, move, weather, isCritical }: DamageContext): { damage: number, statusApplied?: StatusCondition } {
  let statusApplied: StatusCondition | undefined = undefined;

  if (move.category === 'Status') {
    if (move.statusEffect && move.statusEffect !== 'None') {
      const chance = move.statusChance || 100;
      if (Math.random() * 100 < chance) {
        statusApplied = move.statusEffect;
      }
    }
    return { damage: 0, statusApplied };
  }

  const attackStat = move.category === 'Physical' ? calculateActualStat(attacker, 'atk') : calculateActualStat(attacker, 'spa');
  const defenseStat = move.category === 'Physical' ? calculateActualStat(defender, 'def') : calculateActualStat(defender, 'spd');

  const levelFactor = (2 * attacker.level) / 5 + 2;
  const baseDamage = ((levelFactor * move.power * (attackStat / defenseStat)) / 50) + 2;

  const stab = attacker.types.includes(move.type) ? 1.5 : 1.0;
  const typeEffectiveness = getTypeEffectiveness(move.type, defender.types);

  let weatherModifier = 1.0;
  if (weather === 'Sun' && move.type === 'Fire') weatherModifier = 1.5;
  if (weather === 'Sun' && move.type === 'Water') weatherModifier = 0.5;
  if (weather === 'Rain' && move.type === 'Water') weatherModifier = 1.5;
  if (weather === 'Rain' && move.type === 'Fire') weatherModifier = 0.5;

  let itemModifier = 1.0;
  if (attacker.heldItem?.name === 'Choice Band' && move.category === 'Physical') {
    itemModifier = 1.5;
  }

  const randomFactor = (Math.floor(Math.random() * 16) + 85) / 100;
  const criticalModifier = isCritical ? 1.5 : 1.0;

  // Burn modifier
  let burnModifier = 1.0;
  if (attacker.status === 'Burn' && move.category === 'Physical') {
    burnModifier = 0.5;
  }

  const finalDamage = Math.floor(
    baseDamage * weatherModifier * criticalModifier * randomFactor * stab * typeEffectiveness * itemModifier * burnModifier
  );

  // Secondary status effect
  if (move.statusEffect && move.statusEffect !== 'None' && typeEffectiveness > 0) {
    const chance = move.statusChance || 0;
    if (Math.random() * 100 < chance) {
      statusApplied = move.statusEffect;
    }
  }

  return { damage: Math.max(1, finalDamage), statusApplied };
}
