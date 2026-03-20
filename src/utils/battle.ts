import { PokemonInstance, Move, PokemonType, Weather, Terrain, StatusCondition } from '../types';

// Type Effectiveness Chart (simplified for example)
const typeChart: Record<PokemonType, Record<PokemonType, number>> = {
  Normal: { Normal: 1, Fire: 1, Water: 1, Electric: 1, Grass: 1, Ice: 1, Fighting: 1, Poison: 1, Ground: 1, Flying: 1, Psychic: 1, Bug: 1, Rock: 0.5, Ghost: 0, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 1 },
  Fire: { Normal: 1, Fire: 0.5, Water: 0.5, Electric: 1, Grass: 2, Ice: 2, Fighting: 1, Poison: 1, Ground: 1, Flying: 1, Psychic: 1, Bug: 2, Rock: 0.5, Ghost: 1, Dragon: 0.5, Dark: 1, Steel: 2, Fairy: 1 },
  Water: { Normal: 1, Fire: 2, Water: 0.5, Electric: 1, Grass: 0.5, Ice: 1, Fighting: 1, Poison: 1, Ground: 2, Flying: 1, Psychic: 1, Bug: 1, Rock: 2, Ghost: 1, Dragon: 0.5, Dark: 1, Steel: 1, Fairy: 1 },
  Electric: { Normal: 1, Fire: 1, Water: 2, Electric: 0.5, Grass: 0.5, Ice: 1, Fighting: 1, Poison: 1, Ground: 0, Flying: 2, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 0.5, Dark: 1, Steel: 1, Fairy: 1 },
  Grass: { Normal: 1, Fire: 0.5, Water: 2, Electric: 1, Grass: 0.5, Ice: 1, Fighting: 1, Poison: 0.5, Ground: 2, Flying: 0.5, Psychic: 1, Bug: 0.5, Rock: 2, Ghost: 1, Dragon: 0.5, Dark: 1, Steel: 0.5, Fairy: 1 },
  Ice: { Normal: 1, Fire: 0.5, Water: 0.5, Electric: 1, Grass: 2, Ice: 0.5, Fighting: 1, Poison: 1, Ground: 2, Flying: 2, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 2, Dark: 1, Steel: 0.5, Fairy: 1 },
  Fighting: { Normal: 2, Fire: 1, Water: 1, Electric: 1, Grass: 1, Ice: 2, Fighting: 1, Poison: 0.5, Ground: 1, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dragon: 1, Dark: 2, Steel: 2, Fairy: 0.5 },
  Poison: { Normal: 1, Fire: 1, Water: 1, Electric: 1, Grass: 2, Ice: 1, Fighting: 1, Poison: 0.5, Ground: 0.5, Flying: 1, Psychic: 1, Bug: 1, Rock: 0.5, Ghost: 0.5, Dragon: 1, Dark: 1, Steel: 0, Fairy: 2 },
  Ground: { Normal: 1, Fire: 2, Water: 1, Electric: 2, Grass: 0.5, Ice: 1, Fighting: 1, Poison: 2, Ground: 1, Flying: 0, Psychic: 1, Bug: 0.5, Rock: 2, Ghost: 1, Dragon: 1, Dark: 1, Steel: 2, Fairy: 1 },
  Flying: { Normal: 1, Fire: 1, Water: 1, Electric: 0.5, Grass: 2, Ice: 1, Fighting: 2, Poison: 1, Ground: 1, Flying: 1, Psychic: 1, Bug: 2, Rock: 0.5, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 1 },
  Psychic: { Normal: 1, Fire: 1, Water: 1, Electric: 1, Grass: 1, Ice: 1, Fighting: 2, Poison: 2, Ground: 1, Flying: 1, Psychic: 0.5, Bug: 1, Rock: 1, Ghost: 1, Dragon: 1, Dark: 0, Steel: 0.5, Fairy: 1 },
  Bug: { Normal: 1, Fire: 0.5, Water: 1, Electric: 1, Grass: 2, Ice: 1, Fighting: 0.5, Poison: 0.5, Ground: 1, Flying: 0.5, Psychic: 2, Bug: 1, Rock: 1, Ghost: 0.5, Dragon: 1, Dark: 2, Steel: 0.5, Fairy: 0.5 },
  Rock: { Normal: 1, Fire: 2, Water: 1, Electric: 1, Grass: 1, Ice: 2, Fighting: 0.5, Poison: 1, Ground: 0.5, Flying: 2, Psychic: 1, Bug: 2, Rock: 1, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 1 },
  Ghost: { Normal: 0, Fire: 1, Water: 1, Electric: 1, Grass: 1, Ice: 1, Fighting: 1, Poison: 1, Ground: 1, Flying: 1, Psychic: 2, Bug: 1, Rock: 1, Ghost: 2, Dragon: 1, Dark: 0.5, Steel: 1, Fairy: 1 },
  Dragon: { Normal: 1, Fire: 1, Water: 1, Electric: 1, Grass: 1, Ice: 1, Fighting: 1, Poison: 1, Ground: 1, Flying: 1, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 2, Dark: 1, Steel: 0.5, Fairy: 0 },
  Dark: { Normal: 1, Fire: 1, Water: 1, Electric: 1, Grass: 1, Ice: 1, Fighting: 0.5, Poison: 1, Ground: 1, Flying: 1, Psychic: 2, Bug: 1, Rock: 1, Ghost: 2, Dragon: 1, Dark: 0.5, Steel: 1, Fairy: 0.5 },
  Steel: { Normal: 1, Fire: 0.5, Water: 0.5, Electric: 0.5, Grass: 1, Ice: 2, Fighting: 1, Poison: 1, Ground: 1, Flying: 1, Psychic: 1, Bug: 1, Rock: 2, Ghost: 1, Dragon: 1, Dark: 1, Steel: 0.5, Fairy: 2 },
  Fairy: { Normal: 1, Fire: 0.5, Water: 1, Electric: 1, Grass: 1, Ice: 1, Fighting: 2, Poison: 0.5, Ground: 1, Flying: 1, Psychic: 1, Bug: 1, Rock: 1, Ghost: 1, Dragon: 2, Dark: 2, Steel: 0.5, Fairy: 1 }
};

export function calculateDamage(
  attacker: PokemonInstance,
  defender: PokemonInstance,
  move: Move,
  weather: Weather,
  terrain: Terrain
): { damage: number; isCritical: boolean; effectiveness: number; statusApplied?: StatusCondition } {
  let statusApplied: StatusCondition | undefined = undefined;

  // Handle Status moves
  if (move.category === 'Status') {
    if (move.statusEffect && move.statusEffect !== 'None') {
      const chance = move.statusChance || 100;
      if (Math.random() * 100 < chance) {
        statusApplied = move.statusEffect;
      }
    }
    return { damage: 0, isCritical: false, effectiveness: 1, statusApplied };
  }

  const level = attacker.level;
  const power = move.power;
  
  // Determine Attack and Defense stats based on move category
  let a = move.category === 'Physical' ? attacker.currentStats.atk : attacker.currentStats.spa;
  let d = move.category === 'Physical' ? defender.currentStats.def : defender.currentStats.spd;

  // Weather modifiers
  let weatherMod = 1;
  if (weather === 'Sun') {
    if (move.type === 'Fire') weatherMod = 1.5;
    if (move.type === 'Water') weatherMod = 0.5;
  } else if (weather === 'Rain') {
    if (move.type === 'Water') weatherMod = 1.5;
    if (move.type === 'Fire') weatherMod = 0.5;
  }

  // STAB (Same Type Attack Bonus)
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;

  // Type Effectiveness
  let effectiveness = 1;
  for (const defType of defender.types) {
    if (typeChart[move.type] && typeChart[move.type][defType]) {
      effectiveness *= typeChart[move.type][defType];
    }
  }

  // Critical Hit (approx 1/16 chance)
  const isCritical = Math.random() < 0.0625;
  const critMod = isCritical ? 1.5 : 1;

  // Random factor (0.85 to 1.0)
  const random = (Math.floor(Math.random() * 16) + 85) / 100;

  // Burn status effect (if physical)
  let burnMod = 1; 
  if (attacker.status === 'Burn' && move.category === 'Physical') {
    burnMod = 0.5;
  }

  // Other modifiers (Items, Abilities)
  let otherMod = 1;
  if (attacker.heldItem?.name === 'Choice Band' && move.category === 'Physical') otherMod *= 1.5;
  if (attacker.heldItem?.name === 'Choice Specs' && move.category === 'Special') otherMod *= 1.5;
  
  if (defender.ability?.name === 'Levitate' && move.type === 'Ground') effectiveness = 0;

  // Base Damage Calculation
  const baseDamage = Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * power * a / d) / 50) + 2;
  
  // Final Damage
  const damage = Math.floor(baseDamage * weatherMod * critMod * random * stab * effectiveness * burnMod * otherMod);

  // Check for secondary status effects
  if (move.statusEffect && move.statusEffect !== 'None' && effectiveness > 0) {
    const chance = move.statusChance || 0;
    if (Math.random() * 100 < chance) {
      statusApplied = move.statusEffect;
    }
  }

  return { damage: Math.max(1, damage), isCritical, effectiveness, statusApplied };
}

export function calculateStat(base: number, iv: number, ev: number, level: number, natureMod: number, isHp: boolean): number {
  if (isHp) {
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
  } else {
    return Math.floor((Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5) * natureMod);
  }
}
