import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map as MapIcon, Gift, Sparkles, Coins, Package, Heart } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { POKEDEX_BASE } from '../App'; // We might need to pass this or import differently

export const ExploreTab: React.FC = () => {
  const { 
    energy, 
    setEnergy, 
    coins, 
    setCoins, 
    roster, 
    updatePokemon,
    addItem,
    updateMissionProgress
  } = useGameStore();

  const [isExploring, setIsExploring] = useState(false);
  const [eventResult, setEventResult] = useState<{
    type: 'item' | 'money' | 'happiness' | 'nothing';
    message: string;
    icon: React.ReactNode;
    color: string;
  } | null>(null);

  const handleExplore = () => {
    if (energy < 1) return;

    setEnergy(energy - 1);
    updateMissionProgress('spend_energy', 1);
    setIsExploring(true);
    setEventResult(null);

    setTimeout(() => {
      const rand = Math.random();
      if (rand < 0.3) {
        // Find an item
        const items = [
          { id: 'potion', name: 'Poción', type: 'item' as const, quantity: 1 },
          { id: 'fire_stone', name: 'Piedra Fuego', type: 'stone' as const, quantity: 1 },
          { id: 'water_stone', name: 'Piedra Agua', type: 'stone' as const, quantity: 1 },
          { id: 'thunder_stone', name: 'Piedra Trueno', type: 'stone' as const, quantity: 1 },
          { id: 'lucarionite', name: 'Lucarionita', type: 'mega_stone' as const, quantity: 1 },
        ];
        const item = items[Math.floor(Math.random() * items.length)];
        addItem(item);
        setEventResult({
          type: 'item',
          message: `¡Encontraste un objeto: ${item.name}!`,
          icon: <Package size={32} />,
          color: 'text-indigo-400'
        });
      } else if (rand < 0.6) {
        // Find money
        const amount = Math.floor(Math.random() * 500) + 100;
        setCoins(coins + amount);
        setEventResult({
          type: 'money',
          message: `¡Encontraste ${amount} monedas en el suelo!`,
          icon: <Coins size={32} />,
          color: 'text-amber-400'
        });
      } else if (rand < 0.9 && roster.length > 0) {
        // Increase happiness of a random pokemon
        const randomPokemon = roster[Math.floor(Math.random() * roster.length)];
        const currentHappiness = randomPokemon.happiness || 0;
        const increase = Math.floor(Math.random() * 20) + 10;
        updatePokemon(randomPokemon.id, { happiness: Math.min(255, currentHappiness + increase) });
        setEventResult({
          type: 'happiness',
          message: `¡Pasaste un buen rato jugando con ${randomPokemon.name}! Su felicidad aumentó.`,
          icon: <Heart size={32} />,
          color: 'text-rose-400'
        });
      } else {
        // Nothing happens
        setEventResult({
          type: 'nothing',
          message: 'Exploraste la zona pero no encontraste nada interesante esta vez.',
          icon: <MapIcon size={32} />,
          color: 'text-zinc-400'
        });
      }
      setIsExploring(false);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white">Explorar</h2>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Sal de aventura y descubre sorpresas</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-3xl p-8 text-center space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <MapIcon size={200} />
        </div>

        <div className="relative z-10 space-y-6">
          <p className="text-zinc-400 max-w-lg mx-auto">
            Gasta 1 de Energía para explorar los alrededores. Puedes encontrar objetos útiles, monedas, o pasar tiempo con tus Pokémon para aumentar su felicidad.
          </p>

          <button
            onClick={handleExplore}
            disabled={energy < 1 || isExploring}
            className={`px-12 py-6 rounded-3xl text-xl font-black uppercase italic tracking-tight transition-all flex items-center justify-center gap-4 mx-auto shadow-2xl ${
              energy >= 1 && !isExploring
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105 active:scale-95 shadow-emerald-500/20'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            {isExploring ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <MapIcon size={24} />
                </motion.div>
                Explorando...
              </>
            ) : (
              <>
                <MapIcon size={24} />
                Explorar Zona (1 Energía)
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {eventResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center space-y-6"
          >
            <div className={`w-20 h-20 mx-auto rounded-full bg-white/5 flex items-center justify-center ${eventResult.color}`}>
              {eventResult.icon}
            </div>
            <h3 className="text-2xl font-black uppercase italic text-white">
              {eventResult.type === 'item' && '¡Objeto Encontrado!'}
              {eventResult.type === 'money' && '¡Monedas Encontradas!'}
              {eventResult.type === 'happiness' && '¡Momento Feliz!'}
              {eventResult.type === 'nothing' && 'Sin Novedades'}
            </h3>
            <p className="text-zinc-400 text-lg max-w-md mx-auto">
              {eventResult.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
