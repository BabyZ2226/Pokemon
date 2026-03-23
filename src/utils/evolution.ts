import { PokemonInstance, InventoryItem } from '../types';

export const EVOLUTION_DATA: Record<number, { 
  evolvesTo: number, 
  method: 'level' | 'stone' | 'happiness', 
  stoneId?: string, 
  requiredHappiness?: number,
  requiredLevel?: number
}> = {
  // Gen 1-4
  447: { evolvesTo: 448, method: 'happiness', requiredHappiness: 220 }, // Riolu to Lucario
  133: { evolvesTo: 134, method: 'stone', stoneId: 'water' }, // Eevee to Vaporeon
  // Gen 5
  495: { evolvesTo: 496, method: 'level', requiredLevel: 17 },
  496: { evolvesTo: 497, method: 'level', requiredLevel: 36 },
  498: { evolvesTo: 499, method: 'level', requiredLevel: 17 },
  499: { evolvesTo: 500, method: 'level', requiredLevel: 36 },
  501: { evolvesTo: 502, method: 'level', requiredLevel: 17 },
  502: { evolvesTo: 503, method: 'level', requiredLevel: 36 },
  504: { evolvesTo: 505, method: 'level', requiredLevel: 20 },
  506: { evolvesTo: 507, method: 'level', requiredLevel: 16 },
  507: { evolvesTo: 508, method: 'level', requiredLevel: 32 },
  509: { evolvesTo: 510, method: 'level', requiredLevel: 20 },
  511: { evolvesTo: 512, method: 'stone', stoneId: 'leaf' },
  513: { evolvesTo: 514, method: 'stone', stoneId: 'fire' },
  515: { evolvesTo: 516, method: 'stone', stoneId: 'water' },
  517: { evolvesTo: 518, method: 'stone', stoneId: 'moon' },
  519: { evolvesTo: 520, method: 'level', requiredLevel: 21 },
  520: { evolvesTo: 521, method: 'level', requiredLevel: 32 },
  522: { evolvesTo: 523, method: 'level', requiredLevel: 27 },
  524: { evolvesTo: 525, method: 'level', requiredLevel: 25 },
  527: { evolvesTo: 528, method: 'happiness', requiredHappiness: 220 },
  529: { evolvesTo: 530, method: 'level', requiredLevel: 31 },
  532: { evolvesTo: 533, method: 'level', requiredLevel: 25 },
  535: { evolvesTo: 536, method: 'level', requiredLevel: 25 },
  536: { evolvesTo: 537, method: 'level', requiredLevel: 36 },
  540: { evolvesTo: 541, method: 'level', requiredLevel: 20 },
  541: { evolvesTo: 542, method: 'happiness', requiredHappiness: 220 },
  543: { evolvesTo: 544, method: 'level', requiredLevel: 22 },
  544: { evolvesTo: 545, method: 'level', requiredLevel: 30 },
  546: { evolvesTo: 547, method: 'stone', stoneId: 'sun' },
  548: { evolvesTo: 549, method: 'stone', stoneId: 'sun' },
  551: { evolvesTo: 552, method: 'level', requiredLevel: 29 },
  552: { evolvesTo: 553, method: 'level', requiredLevel: 40 },
  554: { evolvesTo: 555, method: 'level', requiredLevel: 35 },
  557: { evolvesTo: 558, method: 'level', requiredLevel: 34 },
  559: { evolvesTo: 560, method: 'level', requiredLevel: 39 },
  562: { evolvesTo: 563, method: 'level', requiredLevel: 34 },
  564: { evolvesTo: 565, method: 'level', requiredLevel: 37 },
  566: { evolvesTo: 567, method: 'level', requiredLevel: 37 },
  568: { evolvesTo: 569, method: 'level', requiredLevel: 36 },
  570: { evolvesTo: 571, method: 'level', requiredLevel: 30 },
  572: { evolvesTo: 573, method: 'stone', stoneId: 'shiny' },
  574: { evolvesTo: 575, method: 'level', requiredLevel: 32 },
  575: { evolvesTo: 576, method: 'level', requiredLevel: 41 },
  577: { evolvesTo: 578, method: 'level', requiredLevel: 32 },
  578: { evolvesTo: 579, method: 'level', requiredLevel: 41 },
  580: { evolvesTo: 581, method: 'level', requiredLevel: 35 },
  582: { evolvesTo: 583, method: 'level', requiredLevel: 35 },
  583: { evolvesTo: 584, method: 'level', requiredLevel: 47 },
  585: { evolvesTo: 586, method: 'level', requiredLevel: 34 },
  590: { evolvesTo: 591, method: 'level', requiredLevel: 39 },
  592: { evolvesTo: 593, method: 'level', requiredLevel: 40 },
  595: { evolvesTo: 596, method: 'level', requiredLevel: 36 },
  597: { evolvesTo: 598, method: 'level', requiredLevel: 40 },
  599: { evolvesTo: 600, method: 'level', requiredLevel: 38 },
  600: { evolvesTo: 601, method: 'level', requiredLevel: 49 },
  602: { evolvesTo: 603, method: 'level', requiredLevel: 39 },
  603: { evolvesTo: 604, method: 'stone', stoneId: 'thunder' },
  605: { evolvesTo: 606, method: 'level', requiredLevel: 42 },
  607: { evolvesTo: 608, method: 'level', requiredLevel: 41 },
  608: { evolvesTo: 609, method: 'stone', stoneId: 'dusk' },
  610: { evolvesTo: 611, method: 'level', requiredLevel: 38 },
  611: { evolvesTo: 612, method: 'level', requiredLevel: 48 },
  613: { evolvesTo: 614, method: 'level', requiredLevel: 37 },
  619: { evolvesTo: 620, method: 'level', requiredLevel: 50 },
  622: { evolvesTo: 623, method: 'level', requiredLevel: 43 },
  624: { evolvesTo: 625, method: 'level', requiredLevel: 52 },
  627: { evolvesTo: 628, method: 'level', requiredLevel: 54 },
  629: { evolvesTo: 630, method: 'level', requiredLevel: 54 },
  633: { evolvesTo: 634, method: 'level', requiredLevel: 50 },
  634: { evolvesTo: 635, method: 'level', requiredLevel: 64 },
  636: { evolvesTo: 637, method: 'level', requiredLevel: 59 },
  // Gen 6
  650: { evolvesTo: 651, method: 'level', requiredLevel: 16 },
  651: { evolvesTo: 652, method: 'level', requiredLevel: 36 },
  653: { evolvesTo: 654, method: 'level', requiredLevel: 16 },
  654: { evolvesTo: 655, method: 'level', requiredLevel: 36 },
  656: { evolvesTo: 657, method: 'level', requiredLevel: 16 },
  657: { evolvesTo: 658, method: 'level', requiredLevel: 36 },
  659: { evolvesTo: 660, method: 'level', requiredLevel: 20 },
  661: { evolvesTo: 662, method: 'level', requiredLevel: 17 },
  662: { evolvesTo: 663, method: 'level', requiredLevel: 35 },
  664: { evolvesTo: 665, method: 'level', requiredLevel: 9 },
  665: { evolvesTo: 666, method: 'level', requiredLevel: 12 },
  667: { evolvesTo: 668, method: 'level', requiredLevel: 35 },
  669: { evolvesTo: 670, method: 'level', requiredLevel: 19 },
  670: { evolvesTo: 671, method: 'stone', stoneId: 'shiny' },
  672: { evolvesTo: 673, method: 'level', requiredLevel: 32 },
  674: { evolvesTo: 675, method: 'level', requiredLevel: 32 },
  677: { evolvesTo: 678, method: 'level', requiredLevel: 25 },
  679: { evolvesTo: 680, method: 'level', requiredLevel: 35 },
  680: { evolvesTo: 681, method: 'stone', stoneId: 'dusk' },
  686: { evolvesTo: 687, method: 'level', requiredLevel: 30 },
  688: { evolvesTo: 689, method: 'level', requiredLevel: 39 },
  690: { evolvesTo: 691, method: 'level', requiredLevel: 48 },
  692: { evolvesTo: 693, method: 'level', requiredLevel: 37 },
  694: { evolvesTo: 695, method: 'stone', stoneId: 'sun' },
  696: { evolvesTo: 697, method: 'level', requiredLevel: 39 },
  698: { evolvesTo: 699, method: 'level', requiredLevel: 39 },
};

export function canEvolve(pokemon: any, inventory: any[]): { canEvolve: boolean, evolutionId?: number } {
  const evolution = EVOLUTION_DATA[pokemon.id || pokemon.pokedexNumber];
  if (!evolution) return { canEvolve: false };

  if (evolution.method === 'level' && pokemon.level >= (evolution.requiredLevel || 0)) return { canEvolve: true, evolutionId: evolution.evolvesTo };
  if (evolution.method === 'happiness' && (pokemon.happiness || 0) >= (evolution.requiredHappiness || 220)) return { canEvolve: true, evolutionId: evolution.evolvesTo };
  if (evolution.method === 'stone') {
    // Check if inventory has the stone. In App.tsx it's evolutionStones object
    // But in InventoryTab it's an array. We handle both.
    if (Array.isArray(inventory)) {
      const stone = inventory.find(i => i.id === evolution.stoneId && i.quantity > 0);
      if (stone) return { canEvolve: true, evolutionId: evolution.evolvesTo };
    } else {
      // Assuming it's the evolutionStones object from App.tsx
      if (inventory[evolution.stoneId as string] > 0) return { canEvolve: true, evolutionId: evolution.evolvesTo };
    }
  }

  return { canEvolve: false };
}
