import fs from 'fs';

const appTsx = fs.readFileSync('src/App.tsx', 'utf8');

const oldStartIdx = appTsx.indexOf("= [\n  { id: 1, name: 'Bulbasaur'");

if (oldStartIdx === -1) {
  console.log('Old POKEDEX_BASE not found');
  process.exit(1);
}

let bracketCount = 0;
let foundStart = false;
let oldEndIdx = -1;

for (let i = oldStartIdx; i < appTsx.length; i++) {
  if (appTsx[i] === '[') {
    bracketCount++;
    foundStart = true;
  } else if (appTsx[i] === ']') {
    bracketCount--;
    if (foundStart && bracketCount === 0) {
      // Check if the next characters are ';'
      if (appTsx[i + 1] === ';') {
        oldEndIdx = i + 2;
        break;
      }
    }
  }
}

if (oldEndIdx !== -1) {
  console.log('Found old end at', oldEndIdx);
  console.log('Next 50 chars:', appTsx.substring(oldEndIdx, oldEndIdx + 50));
  
  // Remove the old POKEDEX_BASE
  // But wait, the new POKEDEX_BASE ended with `];`
  // And the old one started with `= [`
  // So we need to remove from `oldStartIdx` to `oldEndIdx`
  // Wait, `oldStartIdx` is at `= [\n`.
  // So `appTsx.substring(0, oldStartIdx)` will end with `];`.
  // And `appTsx.substring(oldEndIdx)` will start with whatever is after the old POKEDEX_BASE.
  const newAppTsx = appTsx.substring(0, oldStartIdx) + appTsx.substring(oldEndIdx);
  fs.writeFileSync('src/App.tsx', newAppTsx);
  console.log('Successfully removed old POKEDEX_BASE');
} else {
  console.log('Could not find end of old POKEDEX_BASE');
}
