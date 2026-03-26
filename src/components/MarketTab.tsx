import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { PokemonInstance } from '../types';
import { generatePokemon } from '../utils/pokemonGenerator';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

export default function MarketTab() {
  const { coins, spendCoins, addCoins, roster, addPokemon, staff } = useGameStore();
  const [marketListings, setMarketListings] = useState<PokemonInstance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Generate some random listings when market opens
    const generateListings = async () => {
      setLoading(true);
      const listings: PokemonInstance[] = [];
      for (let i = 0; i < 6; i++) {
        // Scout improves rarity chances
        const rand = Math.random();
        let rarity: 'Common' | 'Rare' | 'Mythical' | 'Legendary' = 'Common';
        if (staff.scout) {
          if (rand > 0.9) rarity = 'Legendary';
          else if (rand > 0.6) rarity = 'Mythical';
          else if (rand > 0.3) rarity = 'Rare';
        } else {
          if (rand > 0.95) rarity = 'Legendary';
          else if (rand > 0.8) rarity = 'Mythical';
          else if (rand > 0.5) rarity = 'Rare';
        }
        
        const p = await generatePokemon(rarity, 1);
        listings.push(p);
      }
      setMarketListings(listings);
      setLoading(false);
    };

    if (marketListings.length === 0) {
      generateListings();
    }
  }, [staff.scout]);

  const buyPokemon = (pokemon: PokemonInstance) => {
    const cost = getPrice(pokemon);
    if (spendCoins(cost)) {
      addPokemon(pokemon);
      setMarketListings(marketListings.filter(p => p.id !== pokemon.id));
    } else {
      alert("Not enough coins!");
    }
  };

  const sellPokemon = (pokemon: PokemonInstance) => {
    const price = Math.floor(getPrice(pokemon) * 0.6); // Sell for 60% of value
    addCoins(price);
    // In a real app, we'd remove from roster here.
    // For simplicity, we'll just alert.
    alert(`Sold ${pokemon.name} for ${price} coins! (Not actually removed in this prototype)`);
  };

  const getPrice = (p: PokemonInstance) => {
    let base = 500;
    if (p.rarity === 'Rare') base = 2000;
    if (p.rarity === 'Mythical') base = 5000;
    if (p.rarity === 'Legendary') base = 15000;
    
    return base + (p.level * 100) + (p.isShiny ? 5000 : 0);
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div>
        <div className="flex items-center gap-4 mb-8 md:mb-12">
          <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
            <TrendingUp size={24} />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter">Mercado de Transferencias</h2>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full"
            />
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Buscando jugadores...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {marketListings.map((p, idx) => (
              <motion.div 
                key={p.instanceId || p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-zinc-900/50 rounded-[32px] p-6 border border-white/10 flex flex-col group hover:border-indigo-500/30 transition-all shadow-xl hover:shadow-indigo-500/5"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">
                      {p.name} {p.isShiny && <span className="text-yellow-400">✨</span>}
                    </h3>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                      Nv. {p.level} • {p.rarity}
                    </p>
                  </div>
                  <div className="bg-black/40 px-3 py-1 rounded-xl border border-white/5">
                    <span className="text-xs font-black text-indigo-400 uppercase tracking-tighter">OVR {p.currentOVR}</span>
                  </div>
                </div>
                
                <div className="flex-1 flex items-center justify-center py-8 relative group/sprite">
                  <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-3xl opacity-0 group-hover/sprite:opacity-100 transition-opacity" />
                  <img 
                    src={p.sprite} 
                    alt={p.name} 
                    className="w-32 h-32 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] relative z-10 group-hover/sprite:scale-110 transition-transform duration-500" 
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Naturaleza</span>
                    <span className="text-xs font-bold text-white uppercase italic">{p.nature.name}</span>
                  </div>
                  <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Habilidad</span>
                    <span className="text-xs font-bold text-white uppercase italic truncate block" title={p.ability.name}>{p.ability.name}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => buyPokemon(p)}
                  disabled={coins < getPrice(p)}
                  className="w-full bg-white hover:bg-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed text-black font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase italic tracking-widest text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  Fichar <span className="text-zinc-500 font-bold ml-1">💰 {getPrice(p).toLocaleString()}</span>
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
