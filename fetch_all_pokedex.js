import fs from 'fs';
import https from 'https';

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

const PSEUDO_LEGENDARIES = [149, 248, 373, 376, 445, 635, 706, 784, 887, 998];
const PARADOX = [984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 1005, 1006, 1009, 1010, 1020, 1021, 1022, 1023];
const ULTRA_BEASTS = [793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806];

function getRarity(id, speciesData, baseStatsSum) {
  if (speciesData.is_mythical) return 'Singular (Mítico)';
  if (speciesData.is_legendary) return 'Legendario';
  if (ULTRA_BEASTS.includes(id)) return 'Ultraente';
  if (PARADOX.includes(id)) return 'Pokémon Paradoja';
  if (PSEUDO_LEGENDARIES.includes(id)) return 'Pseudo-legendario';
  
  if (baseStatsSum >= 500) return 'Raro';
  if (baseStatsSum >= 400) return 'Poco común';
  return 'Común';
}

async function main() {
  console.log('Fetching Pokemon 1 to 1025...');
  const limit = 1025;
  const pokemonList = [];

  const res = await fetchJson(`https://pokeapi.co/api/v2/pokemon?limit=${limit}`);
  const results = res.results;

  const batchSize = 50;
  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize);
    console.log(`Fetching batch ${i} to ${i + batch.length}...`);
    const promises = batch.map(async (p, idx) => {
      const id = i + idx + 1;
      try {
        const data = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${id}`);
        const speciesData = await fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
        
        const types = data.types.map(t => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1));
        const ability = data.abilities.length > 0 ? data.abilities[0].ability.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown';
        
        let description = '';
        const esFlavor = speciesData.flavor_text_entries.find(f => f.language.name === 'es');
        const enFlavor = speciesData.flavor_text_entries.find(f => f.language.name === 'en');
        if (esFlavor) {
          description = esFlavor.flavor_text.replace(/[\n\f\r]/g, ' ');
        } else if (enFlavor) {
          description = enFlavor.flavor_text.replace(/[\n\f\r]/g, ' ');
        }

        const stats = {
          hp: data.stats.find(s => s.stat.name === 'hp').base_stat,
          atk: data.stats.find(s => s.stat.name === 'attack').base_stat,
          def: data.stats.find(s => s.stat.name === 'defense').base_stat,
          spe: data.stats.find(s => s.stat.name === 'speed').base_stat,
        };
        const baseStatsSum = data.stats.reduce((sum, s) => sum + s.base_stat, 0);

        const rarity = getRarity(id, speciesData, baseStatsSum);

        let megaId = undefined;
        let megaIdX = undefined;
        let megaIdY = undefined;
        
        if (speciesData.varieties) {
          for (const variety of speciesData.varieties) {
            if (variety.pokemon.name.endsWith('-mega')) {
              const urlParts = variety.pokemon.url.split('/');
              megaId = parseInt(urlParts[urlParts.length - 2]);
            } else if (variety.pokemon.name.endsWith('-mega-x')) {
              const urlParts = variety.pokemon.url.split('/');
              megaIdX = parseInt(urlParts[urlParts.length - 2]);
            } else if (variety.pokemon.name.endsWith('-mega-y')) {
              const urlParts = variety.pokemon.url.split('/');
              megaIdY = parseInt(urlParts[urlParts.length - 2]);
            }
          }
        }

        const result = {
          id,
          name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
          types,
          ability,
          evolutionChain: [id], // Simplified
          isLegendary: speciesData.is_legendary,
          isMythical: speciesData.is_mythical,
          rarity,
          baseStatsSum,
          description,
          stats
        };

        if (megaId) result.megaId = megaId;
        if (megaIdX) result.megaIdX = megaIdX;
        if (megaIdY) result.megaIdY = megaIdY;

        return result;
      } catch (e) {
        console.error(`Error fetching ${id}:`, e.message);
        return null;
      }
    });

    const batchResults = await Promise.all(promises);
    pokemonList.push(...batchResults.filter(p => p !== null));
  }

  pokemonList.sort((a, b) => a.id - b.id);

  const output = `export const POKEDEX_BASE: PokemonBase[] = ${JSON.stringify(pokemonList, null, 2)};`;
  fs.writeFileSync('pokedex_1025.ts', output);
  console.log('Done!');
}

main().catch(console.error);
