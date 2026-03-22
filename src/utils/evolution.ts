import { PokemonInstance, InventoryItem } from '../types';

export const EVOLUTION_DATA: Record<number, { 
  evolvesTo: number, 
  method: 'level' | 'stone' | 'happiness', 
  stoneId?: string, 
  requiredHappiness?: number 
}> = {
  447: { evolvesTo: 448, method: 'happiness', requiredHappiness: 220 }, // Riolu to Lucario
  133: { evolvesTo: 134, method: 'stone', stoneId: 'water_stone' }, // Eevee to Vaporeon
  135: { evolvesTo: 135, method: 'stone', stoneId: 'thunder_stone' }, // Eevee to Jolteon
  136: { evolvesTo: 136, method: 'stone', stoneId: 'fire_stone' }, // Eevee to Flareon
};

export function canEvolve(pokemon: PokemonInstance, inventory: InventoryItem[]): { canEvolve: boolean, evolutionId?: number } {
  const evolution = EVOLUTION_DATA[pokemon.pokedexNumber];
  if (!evolution) return { canEvolve: false };

  if (evolution.method === 'happiness' && pokemon.happiness >= (evolution.requiredHappiness || 220)) return { canEvolve: true, evolutionId: evolution.evolvesTo };
  if (evolution.method === 'stone') {
    const stone = inventory.find(i => i.id === evolution.stoneId && i.quantity > 0);
    if (stone) return { canEvolve: true, evolutionId: evolution.evolvesTo };
  }

  return { canEvolve: false };
}
