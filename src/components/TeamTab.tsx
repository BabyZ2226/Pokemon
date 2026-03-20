import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { PokemonInstance } from '../types';
import { calculateActualStat } from '../utils/battleLogic';

export default function TeamTab() {
  const { roster, activeTeamIds, setActiveTeam, healPokemon } = useGameStore();
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonInstance | null>(null);

  const toggleActive = (id: string) => {
    if (activeTeamIds.includes(id)) {
      setActiveTeam(activeTeamIds.filter((teamId) => teamId !== id));
    } else if (activeTeamIds.length < 6) {
      setActiveTeam([...activeTeamIds, id]);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-4">Team Management</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roster List */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Roster ({roster.length})</h3>
          {roster.length === 0 ? (
            <div className="text-center text-white py-12">
              No Pokémon in your roster. Go to the Store to open packs!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {roster.map((pokemon) => {
                const isActive = activeTeamIds.includes(pokemon.id);
                return (
                  <div 
                    key={pokemon.id} 
                    className={`relative p-4 rounded-lg border cursor-pointer transition-all ${
                      isActive ? 'bg-blue-900/40 border-blue-500' : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700'
                    }`}
                    onClick={() => setSelectedPokemon(pokemon)}
                  >
                    <div className="flex items-center gap-4">
                      <img src={pokemon.sprite} alt={pokemon.name} className="w-16 h-16 object-contain drop-shadow-lg" />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-white">{pokemon.name} {pokemon.isShiny && '✨'}</h4>
                          <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-100">OVR {pokemon.currentOVR}</span>
                        </div>
                        <div className="text-xs text-white mt-1">
                          Lv. {pokemon.level} • {pokemon.rarity}
                        </div>
                        <div className="flex gap-1 mt-2">
                          {pokemon.types.map(t => (
                            <span key={t} className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-600 text-white">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleActive(pokemon.id); }}
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isActive ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                      }`}
                    >
                      {isActive ? '✓' : '+'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pokemon Details */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 h-fit sticky top-24">
          <h3 className="text-lg font-semibold text-white mb-4">Details</h3>
          {selectedPokemon ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <img src={selectedPokemon.sprite} alt={selectedPokemon.name} className="w-24 h-24 object-contain bg-slate-700 rounded-lg" />
                <div>
                  <h4 className="text-xl font-bold text-white">{selectedPokemon.name}</h4>
                  <p className="text-sm text-white">Lv. {selectedPokemon.level} • {selectedPokemon.rarity}</p>
                  <p className="text-sm text-white">Nature: <span className="text-blue-300">{selectedPokemon.nature.name}</span></p>
                  <p className="text-sm text-white">Ability: <span className="text-purple-300">{selectedPokemon.ability.name}</span></p>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-sm font-bold text-white uppercase">Stats (Base + IV + EV)</h5>
                <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                  <StatRow label="HP" p={selectedPokemon} stat="hp" />
                  <StatRow label="ATK" p={selectedPokemon} stat="atk" />
                  <StatRow label="DEF" p={selectedPokemon} stat="def" />
                  <StatRow label="SPA" p={selectedPokemon} stat="spa" />
                  <StatRow label="SPD" p={selectedPokemon} stat="spd" />
                  <StatRow label="SPE" p={selectedPokemon} stat="spe" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700">
                <h5 className="text-sm font-bold text-white uppercase mb-2">Held Item</h5>
                <div className="bg-slate-700/50 p-3 rounded-lg flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-600 rounded flex items-center justify-center text-xl">
                    {selectedPokemon.heldItem ? '🎒' : '❌'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{selectedPokemon.heldItem?.name || 'None'}</p>
                    <p className="text-xs text-white">{selectedPokemon.heldItem?.description || 'No item equipped.'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700">
                <h5 className="text-sm font-bold text-white uppercase mb-2">Condition</h5>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white">Fatigue</span>
                    <span className={selectedPokemon.fatigue > 70 ? 'text-red-300' : 'text-green-300'}>{selectedPokemon.fatigue}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white">Morale</span>
                    <span className="text-blue-300">{selectedPokemon.morale}</span>
                  </div>
                  {selectedPokemon.fatigue > 0 && (
                    <button 
                      onClick={() => healPokemon(selectedPokemon.id)}
                      className="w-full mt-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold py-2 rounded transition-colors"
                    >
                      Heal (500 Coins)
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-white py-12">
              Select a Pokémon to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, p, stat }: { label: string, p: PokemonInstance, stat: keyof PokemonInstance['baseStats'] }) {
  const actual = calculateActualStat(p, stat);
  const iv = p.ivs[stat];
  const isBest = iv === 31;
  const isWorst = iv === 0;

  return (
    <div className="flex justify-between items-center bg-slate-900/50 px-2 py-1 rounded">
      <span className="text-white">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-white font-bold">{actual}</span>
        <span className={`text-[10px] ${isBest ? 'text-yellow-300' : isWorst ? 'text-red-300' : 'text-slate-200'}`}>
          ({iv})
        </span>
      </div>
    </div>
  );
}
