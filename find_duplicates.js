import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
const pokedexMatch = content.match(/export const POKEDEX_BASE: PokemonBase\[\] = (\[[\s\S]*?\]);/);

if (pokedexMatch) {
  const pokedexStr = pokedexMatch[1];
  // This is a bit hacky but should work for finding IDs
  const idMatches = pokedexStr.matchAll(/id: (\d+),/g);
  const ids = [];
  const duplicates = [];
  const seen = new Set();

  for (const match of idMatches) {
    const id = parseInt(match[1]);
    // Only check top-level IDs (roughly)
    // In this file, top-level IDs are usually at the start of a line or after a {
    // Let's refine the regex to look for top-level objects
  }

  // Better approach: find all lines that start with { id:
  const lines = pokedexStr.split('\n');
  const topLevelIds = [];
  for (const line of lines) {
    const match = line.match(/^\s*{\s*id:\s*(\d+),/);
    if (match) {
      const id = parseInt(match[1]);
      if (seen.has(id)) {
        duplicates.push(id);
      }
      seen.add(id);
      topLevelIds.push(id);
    }
  }

  console.log('Top-level IDs found:', topLevelIds.length);
  console.log('Duplicates:', duplicates);
} else {
  console.log('POKEDEX_BASE not found');
}
