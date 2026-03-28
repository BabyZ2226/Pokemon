
async function fetchMegaIds() {
  const megaIds: Record<number, { megaId?: number, megaIdX?: number, megaIdY?: number }> = {};
  for (let i = 1; i <= 493; i++) {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${i}`);
      const data = await response.json();
      const megaVarieties = data.varieties.filter((v: any) => v.pokemon.name.includes('-mega'));
      if (megaVarieties.length > 0) {
        const megaData: Record<string, number> = {};
        for (const v of megaVarieties) {
          const megaResponse = await fetch(v.pokemon.url);
          const megaDataRes = await megaResponse.json();
          if (v.pokemon.name.includes('-x')) megaData.megaIdX = megaDataRes.id;
          else if (v.pokemon.name.includes('-y')) megaData.megaIdY = megaDataRes.id;
          else megaData.megaId = megaDataRes.id;
        }
        megaIds[i] = megaData;
        console.log(`Found mega for ${i}: ${JSON.stringify(megaData)}`);
      }
    } catch (e) {
      console.error(`Error for ${i}: ${e}`);
    }
  }
  console.log(JSON.stringify(megaIds, null, 2));
}
fetchMegaIds();
