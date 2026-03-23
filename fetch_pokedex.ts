import fs from 'fs';

async function fetchPokemon(id: number) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!res.ok) return null;
  return res.json();
}

async function fetchSpecies(id: number) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
  if (!res.ok) return null;
  return res.json();
}

async function fetchEvolutionChain(url: string) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

function extractChainIds(chain: any): number[] {
  const ids: number[] = [];
  let current = chain;
  while (current) {
    const urlParts = current.species.url.split('/');
    const id = parseInt(urlParts[urlParts.length - 2]);
    if (id <= 700) {
      ids.push(id);
    }
    if (current.evolves_to && current.evolves_to.length > 0) {
      current = current.evolves_to[0]; // Just taking the first branch for simplicity
    } else {
      current = null;
    }
  }
  return ids;
}

async function main() {
  console.log('Starting to fetch 700 Pokemon...');
  const pokedex: string[] = [];
  
  // Fetch in batches of 50
  for (let i = 1; i <= 700; i += 50) {
    const batch = [];
    for (let j = i; j < i + 50 && j <= 700; j++) {
      batch.push((async () => {
        try {
          const data = await fetchPokemon(j);
          if (!data) return null;
          
          const species = await fetchSpecies(j);
          let evolutionChain = [j];
          let isLegendary = false;
          let isMythical = false;
          
          if (species) {
            isLegendary = species.is_legendary;
            isMythical = species.is_mythical;
            if (species.evolution_chain) {
              const chainData = await fetchEvolutionChain(species.evolution_chain.url);
              if (chainData) {
                evolutionChain = extractChainIds(chainData.chain);
              }
            }
          }
          
          const types = data.types.map((t: any) => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1));
          const ability = data.abilities[0] ? data.abilities[0].ability.name.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown';
          const baseStatsSum = data.stats.reduce((sum: number, stat: any) => sum + stat.base_stat, 0);
          
          let entry = `  { id: ${data.id}, name: '${data.name.charAt(0).toUpperCase() + data.name.slice(1)}', types: ${JSON.stringify(types)}, ability: '${ability}', evolutionChain: ${JSON.stringify(evolutionChain)}, baseStatsSum: ${baseStatsSum}`;
          if (isLegendary) entry += `, isLegendary: true`;
          if (isMythical) entry += `, isMythical: true`;
          entry += ` }`;
          
          return { id: data.id, entry };
        } catch (e) {
          console.error(`Error fetching ${j}:`, e);
          return null;
        }
      })());
    }
    
    const results = await Promise.all(batch);
    const validResults = results.filter(r => r !== null) as { id: number, entry: string }[];
    validResults.sort((a, b) => a.id - b.id);
    
    for (const r of validResults) {
      pokedex.push(r.entry);
    }
    console.log(`Fetched up to ${Math.min(i + 49, 700)}`);
  }

  const newPokedexStr = `export const POKEDEX_BASE: PokemonBase[] = [\n${pokedex.join(',\n')}\n];`;
  
  const appTsx = fs.readFileSync('src/App.tsx', 'utf8');
  const startIndex = appTsx.indexOf('export const POKEDEX_BASE: PokemonBase[] = [');
  
  // Find the end of the array
  // We need to find the matching '];' for POKEDEX_BASE
  let endIndex = startIndex;
  let bracketCount = 0;
  let foundStart = false;
  
  for (let i = startIndex; i < appTsx.length; i++) {
    if (appTsx[i] === '[') {
      bracketCount++;
      foundStart = true;
    } else if (appTsx[i] === ']') {
      bracketCount--;
      if (foundStart && bracketCount === 0) {
        endIndex = i + 2; // include '];'
        break;
      }
    }
  }
  
  const newAppTsx = appTsx.substring(0, startIndex) + newPokedexStr + appTsx.substring(endIndex);
  fs.writeFileSync('src/App.tsx', newAppTsx);
  console.log('Successfully updated src/App.tsx with 700 Pokemon!');
}

main().catch(console.error);
