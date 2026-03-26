import React, { useState } from 'react';
import { Package } from 'lucide-react';

interface InventoryTabProps {
  inventory: any[];
  roster: any[];
  onUseItem: (itemId: string, pokemonId: string) => void;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({ inventory, roster, onUseItem }) => {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedPokemon, setSelectedPokemon] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleUseItem = async () => {
    if (!selectedItem || !selectedPokemon) return;
    onUseItem(selectedItem, selectedPokemon);
    setSelectedItem(null);
    setSelectedPokemon(null);
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
                    <div className="flex items-center gap-2">
                      <img 
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${item.type === 'stone' ? `${item.id}-stone` : item.id}.png`} 
                        alt={item.name} 
                        className="w-8 h-8 object-contain" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32';
                        }}
                      />
                      <span className="font-bold text-white">{item.name}</span>
                    </div>
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
                  key={pokemon.instanceId || pokemon.id}
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
