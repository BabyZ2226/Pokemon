import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Package, Zap, Heart, Shield, Sparkles, Droplets, Flame, Leaf, Mountain, Skull, Eye } from 'lucide-react';
import { canEvolve } from '../utils/evolution';
import { generatePokemon } from '../utils/pokemonGenerator';

export const InventoryTab: React.FC = () => {
  const { inventory, roster, removeItem, loadState } = useGameStore();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedPokemon, setSelectedPokemon] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleUseItem = async () => {
    if (!selectedItem || !selectedPokemon) return;

    const item = inventory.find(i => i.id === selectedItem);
    const pokemon = roster.find(p => p.id === selectedPokemon);

    if (!item || !pokemon) return;

    if (item.type === 'stone') {
      const { canEvolve: evolvePossible, evolutionId } = canEvolve(pokemon, inventory);
      if (evolvePossible && evolutionId) {
        // Evolve
        try {
          const evolvedPokemon = await generatePokemon(pokemon.rarity, 1); // We just need the base stats, wait we should fetch the specific evolution
          // Actually, we need a way to fetch a specific pokemon by ID and keep the current stats/level
          // For now, let's just update the pokedexNumber, name, sprite, types, baseStats
          const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${evolutionId}`);
          const data = await response.json();
          
          const types = data.types.map((t: any) => (t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)));
          const baseStats = {
            hp: data.stats.find((s: any) => s.stat.name === 'hp').base_stat,
            atk: data.stats.find((s: any) => s.stat.name === 'attack').base_stat,
            def: data.stats.find((s: any) => s.stat.name === 'defense').base_stat,
            spa: data.stats.find((s: any) => s.stat.name === 'special-attack').base_stat,
            spd: data.stats.find((s: any) => s.stat.name === 'special-defense').base_stat,
            spe: data.stats.find((s: any) => s.stat.name === 'speed').base_stat,
          };

          const updatedPokemon = {
            ...pokemon,
            pokedexNumber: evolutionId,
            name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
            sprite: pokemon.isShiny ? data.sprites.front_shiny : data.sprites.front_default,
            types,
            baseStats,
            currentStats: { ...baseStats }, // Simplified
          };

          const newRoster = roster.map(p => p.id === pokemon.id ? updatedPokemon : p);
          removeItem(item.id, 1);
          loadState({ roster: newRoster });
          setMessage(`¡${pokemon.name} ha evolucionado a ${updatedPokemon.name}!`);
        } catch (error) {
          console.error("Error evolving pokemon", error);
          setMessage("Hubo un error al evolucionar.");
        }
      } else {
        setMessage("Este objeto no tiene efecto en este Pokémon.");
      }
    } else if (item.type === 'mega_stone') {
      // Equip mega stone
      const newRoster = roster.map(p => p.id === pokemon.id ? { ...p, heldItem: { id: item.id, name: item.name, description: 'Permite la Mega Evolución', effectType: 'utility' as const, value: 0 } } : p);
      removeItem(item.id, 1);
      loadState({ roster: newRoster });
      setMessage(`¡${pokemon.name} ha equipado ${item.name}!`);
    } else {
      setMessage("No puedes usar este objeto así.");
    }

    setSelectedItem(null);
    setSelectedPokemon(null);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
          <Package className="text-indigo-400" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Inventario</h2>
          <p className="text-zinc-400 text-sm">Gestiona tus objetos y piedras evolutivas</p>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-center">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white uppercase tracking-tight">Tus Objetos</h3>
          {inventory.length === 0 ? (
            <div className="p-8 bg-zinc-900/50 rounded-2xl border border-white/5 text-center">
              <Package className="mx-auto text-zinc-600 mb-2" size={32} />
              <p className="text-zinc-500 font-medium">Tu inventario está vacío</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {inventory.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedItem === item.id 
                      ? 'bg-indigo-500/20 border-indigo-500/50' 
                      : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-white">{item.name}</span>
                    <span className="text-xs font-black text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg">x{item.quantity}</span>
                  </div>
                  <p className="text-xs text-zinc-400 capitalize">{item.type.replace('_', ' ')}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedItem && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Usar en...</h3>
            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {roster.map(pokemon => (
                <button
                  key={pokemon.id}
                  onClick={() => setSelectedPokemon(pokemon.id)}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                    selectedPokemon === pokemon.id 
                      ? 'bg-rose-500/20 border-rose-500/50' 
                      : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800/50'
                  }`}
                >
                  <img src={pokemon.sprite} alt={pokemon.name} className="w-12 h-12 object-contain" />
                  <div className="text-left">
                    <div className="font-bold text-white text-sm">{pokemon.name}</div>
                    <div className="text-xs text-zinc-500">Nv. {pokemon.level}</div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleUseItem}
              disabled={!selectedPokemon}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Usar Objeto
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
