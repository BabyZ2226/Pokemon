import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { PokemonInstance } from '../types';
import { generatePokemon } from '../utils/pokemonGenerator';

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
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Transfer Market</h2>
        
        {loading ? (
          <div className="text-center text-slate-300 py-12">Scouting players...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketListings.map(p => (
              <div key={p.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{p.name} {p.isShiny && '✨'}</h3>
                    <p className="text-sm text-white">Lv. {p.level} • {p.rarity}</p>
                  </div>
                  <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-white">OVR {p.currentOVR}</span>
                </div>
                
                <div className="flex-1 flex items-center justify-center py-4">
                  <img src={p.sprite} alt={p.name} className="w-24 h-24 object-contain drop-shadow-lg" />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                  <div className="bg-slate-900/50 p-2 rounded text-center">
                    <span className="text-white block">Nature</span>
                    <span className="text-white font-bold">{p.nature.name}</span>
                  </div>
                  <div className="bg-slate-900/50 p-2 rounded text-center">
                    <span className="text-white block">Ability</span>
                    <span className="text-white font-bold truncate block" title={p.ability.name}>{p.ability.name}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => buyPokemon(p)}
                  disabled={coins < getPrice(p)}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Buy (💰 {getPrice(p)})
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
