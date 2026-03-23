import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
const newPokedex = fs.readFileSync('pokedex_1025.ts', 'utf8');

const startIndex = content.indexOf('export const POKEDEX_BASE: PokemonBase[] = [');
if (startIndex === -1) {
  console.log('POKEDEX_BASE not found');
  process.exit(1);
}

const arrayStartIndex = content.indexOf('[', startIndex + 'export const POKEDEX_BASE: PokemonBase[]'.length);

let openBrackets = 0;
let endIndex = -1;
for (let i = arrayStartIndex; i < content.length; i++) {
  if (content[i] === '[') openBrackets++;
  else if (content[i] === ']') {
    openBrackets--;
    if (openBrackets === 0) {
      endIndex = i;
      break;
    }
  }
}

if (endIndex !== -1) {
  const newContent = content.substring(0, startIndex) + newPokedex + content.substring(endIndex + 1);
  fs.writeFileSync('src/App.tsx', newContent);
  console.log('Replaced POKEDEX_BASE successfully.');
} else {
  console.log('End bracket not found');
}
