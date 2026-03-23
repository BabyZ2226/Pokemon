import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replacements
content = content.replace(
  /src=\{`https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\/\$\{pokemon\.isShiny \? 'shiny\/' : ''\}\$\{pokemon\.id\}\.png`\}/g,
  'src={getPokemonImage(pokemon)}'
);

content = content.replace(
  /src=\{`https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\/\$\{\[1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912\]\[starterIndex\]\}\.png`\}/g,
  'src={getPokemonImage({ id: [1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912][starterIndex] })}'
);

content = content.replace(
  /src=\{`https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\/back\/\$\{battleData\.playerTeam\[battleData\.playerIdx\]\.p\.id\}\.png`\}/g,
  'src={getPokemonImage(battleData.playerTeam[battleData.playerIdx], true)}'
);

content = content.replace(
  /src=\{`https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\/other\/official-artwork\/\$\{battleData\.rivalTeam\[battleData\.rivalIdx\]\.p\.id\}\.png`\}/g,
  'src={getPokemonImage(battleData.rivalTeam[battleData.rivalIdx], false, true)}'
);

content = content.replace(
  /src=\{`https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\/\$\{member\.p\.id\}\.png`\}/g,
  'src={getPokemonImage(member)}'
);

content = content.replace(
  /src=\{`https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\/\$\{teamMembers\[i\]\.id\}\.png`\}/g,
  'src={getPokemonImage(teamMembers[i])}'
);

content = content.replace(
  /src=\{`https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\/\$\{p\.id\}\.png`\}/g,
  'src={getPokemonImage(p)}'
);

content = content.replace(
  /src=\{`https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\/\$\{evolvingPokemon\.from\.id\}\.png`\}/g,
  'src={getPokemonImage(evolvingPokemon.from)}'
);

content = content.replace(
  /src=\{`https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\/\$\{evolvingPokemon\.to\.id\}\.png`\}/g,
  'src={getPokemonImage(evolvingPokemon.to)}'
);

content = content.replace(
  /src=\{`https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\/\$\{item\.p\.id\}\.png`\}/g,
  'src={getPokemonImage(item)}'
);

content = content.replace(
  /src=\{`https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\/\$\{selectedPokedexPokemon\.id\}\.png`\}/g,
  'src={getPokemonImage(selectedPokedexPokemon)}'
);

content = content.replace(
  /src=\{`https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\/\$\{evId\}\.png`\}/g,
  'src={getPokemonImage({ id: evId })}'
);

content = content.replace(
  /src=\{`https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\/\$\{selectedPokemon\.id\}\.png`\}/g,
  'src={getPokemonImage(selectedPokemon)}'
);

content = content.replace(
  /src=\{`https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\/\$\{opt\.id\}\.png`\}/g,
  'src={getPokemonImage(opt)}'
);

fs.writeFileSync('src/App.tsx', content);
console.log('Replaced image URLs');
