import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, LayoutGrid, Check, Info } from 'lucide-react';
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
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
          <Users size={24} />
        </div>
        <div>
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter">Gestión de Equipo</h2>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-1">Organiza tu alineación para la liga</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Roster List */}
        <div className="lg:col-span-2 bg-zinc-900/50 rounded-[32px] p-6 md:p-8 border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 border border-white/5">
                <LayoutGrid size={16} />
              </div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Colección ({roster.length})</h3>
            </div>
            <div className="bg-indigo-600/20 px-4 py-1 rounded-full border border-indigo-500/20">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Activos: {activeTeamIds.length}/6</span>
            </div>
          </div>

          {roster.length === 0 ? (
            <div className="text-center py-20 bg-black/20 rounded-3xl border border-dashed border-white/5">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-600">
                <Users size={32} />
              </div>
              <p className="text-zinc-500 font-bold">No tienes Pokémon en tu colección.</p>
              <p className="text-xs text-zinc-600 mt-2">¡Ve a la Tienda para abrir sobres!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {roster.map((pokemon) => {
                const isActive = activeTeamIds.includes(pokemon.id);
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={pokemon.instanceId || pokemon.id} 
                    className={`group relative p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer overflow-hidden ${
                      isActive 
                        ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg shadow-indigo-600/5' 
                        : 'bg-black/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/40'
                    }`}
                    onClick={() => setSelectedPokemon(pokemon)}
                  >
                    {isActive && (
                      <div className="absolute top-0 right-0 p-4">
                        <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/50">
                          <Check size={14} strokeWidth={4} />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-5 relative z-10">
                      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${
                        isActive ? 'bg-indigo-500/20' : 'bg-zinc-800/50'
                      }`}>
                        <img src={pokemon.sprite} alt={pokemon.name} className="w-16 h-16 object-contain drop-shadow-2xl" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-black text-white uppercase italic tracking-tight truncate group-hover:text-indigo-400 transition-colors">
                            {pokemon.name} {pokemon.isShiny && <span className="text-amber-400 ml-1">✨</span>}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">NV. {pokemon.level}</span>
                          <div className="w-1 h-1 rounded-full bg-zinc-700" />
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">OVR {pokemon.currentOVR}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {pokemon.types.map(t => (
                            <span key={t} className="text-[8px] uppercase font-black px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-white/5">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleActive(pokemon.id); }}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          isActive 
                            ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20' 
                            : 'bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/5'
                        }`}
                      >
                        {isActive ? 'Retirar' : 'Alinear'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pokemon Details */}
        <div className="bg-zinc-900/50 rounded-[32px] p-6 md:p-8 border border-white/10 h-fit lg:sticky lg:top-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 border border-white/5">
              <Info size={16} />
            </div>
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Detalles</h3>
          </div>

          {selectedPokemon ? (
            <div className="space-y-8">
              <div className="flex flex-col items-center text-center p-6 bg-black/40 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-indigo-600/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <img src={selectedPokemon.sprite} alt={selectedPokemon.name} className="w-32 h-32 object-contain mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] relative z-10" />
                <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter relative z-10">{selectedPokemon.name}</h4>
                <div className="flex items-center gap-3 mt-2 relative z-10">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">NV. {selectedPokemon.level}</span>
                  <div className="w-1 h-1 rounded-full bg-zinc-700" />
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{selectedPokemon.rarity}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full mt-6 relative z-10">
                  <div className="bg-zinc-800/50 p-3 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Naturaleza</p>
                    <p className="text-xs font-bold text-indigo-300">{selectedPokemon.nature.name}</p>
                  </div>
                  <div className="bg-zinc-800/50 p-3 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Habilidad</p>
                    <p className="text-xs font-bold text-purple-300">{selectedPokemon.ability.name}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Estadísticas Reales</h5>
                <div className="grid grid-cols-2 gap-3">
                  <StatRow label="PS" p={selectedPokemon} stat="hp" />
                  <StatRow label="ATQ" p={selectedPokemon} stat="atk" />
                  <StatRow label="DEF" p={selectedPokemon} stat="def" />
                  <StatRow label="SPA" p={selectedPokemon} stat="spa" />
                  <StatRow label="SPD" p={selectedPokemon} stat="spd" />
                  <StatRow label="VEL" p={selectedPokemon} stat="spe" />
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4">Objeto Equipado</h5>
                <div className="bg-black/40 p-4 rounded-2xl flex items-center gap-4 border border-white/5">
                  <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl border border-white/5">
                    {selectedPokemon.heldItem ? '🎒' : '❌'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white uppercase italic tracking-tight truncate">{selectedPokemon.heldItem?.name || 'Ninguno'}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{selectedPokemon.heldItem?.description || 'Sin objeto equipado.'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4">Condición</h5>
                <div className="space-y-4">
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Fatiga</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${selectedPokemon.fatigue > 70 ? 'text-rose-400' : 'text-emerald-400'}`}>{selectedPokemon.fatigue}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${selectedPokemon.fatigue > 70 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${selectedPokemon.fatigue}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Moral</span>
                    <span className="text-xs font-black text-indigo-400 italic tracking-tighter">{selectedPokemon.morale}</span>
                  </div>

                  {selectedPokemon.fatigue > 0 && (
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => healPokemon(selectedPokemon.id)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/20"
                    >
                      Curar (500 Monedas)
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-black/20 rounded-3xl border border-dashed border-white/5">
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-600">
                <Info size={24} />
              </div>
              <p className="text-xs text-zinc-500 font-bold">Selecciona un Pokémon para ver sus detalles.</p>
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
    <div className="flex justify-between items-center bg-black/40 px-4 py-3 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-black text-white italic tracking-tighter">{actual}</span>
        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded bg-zinc-800 ${isBest ? 'text-amber-400' : isWorst ? 'text-rose-400' : 'text-zinc-500'}`}>
          {iv}
        </span>
      </div>
    </div>
  );
}
