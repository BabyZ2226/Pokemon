import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { generatePokemon } from '../utils/pokemonGenerator';
import { Rarity } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Package, Coins, Star } from 'lucide-react';

const PACKS = [
  { id: 'standard', name: 'Standard Pack', cost: 500, currency: 'coins', rarity: 'Common' as Rarity, color: 'from-slate-600 via-slate-700 to-slate-900', shadow: 'shadow-slate-500/50' },
  { id: 'premium', name: 'Premium Pack', cost: 2000, currency: 'coins', rarity: 'Rare' as Rarity, color: 'from-blue-500 via-blue-700 to-blue-900', shadow: 'shadow-blue-500/50' },
  { id: 'elite', name: 'Elite Pack', cost: 4500, currency: 'coins', rarity: 'Epic' as Rarity, color: 'from-purple-500 via-purple-700 to-purple-900', shadow: 'shadow-purple-500/50' },
  { id: 'master', name: 'Master Pack', cost: 10000, currency: 'coins', rarity: 'Legendary' as Rarity, color: 'from-amber-400 via-amber-600 to-amber-900', shadow: 'shadow-amber-500/50' },
];

export default function StoreTab() {
  const { coins, stardust, spendCoins, addPokemon, facilities } = useGameStore();
  const [openingState, setOpeningState] = useState<'idle' | 'shaking' | 'bursting' | 'revealed'>('idle');
  const [lastPulled, setLastPulled] = useState<any>(null);
  const [selectedPack, setSelectedPack] = useState<typeof PACKS[0] | null>(null);

  const handleBuyPack = async (pack: typeof PACKS[0]) => {
    if (pack.currency === 'coins' && spendCoins(pack.cost)) {
      setSelectedPack(pack);
      setOpeningState('shaking');
      setLastPulled(null);
      
      // Sequence: Shaking (1.5s) -> Bursting (0.5s) -> Revealed
      await new Promise(resolve => setTimeout(resolve, 1500));
      setOpeningState('bursting');
      
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const newPokemon = await generatePokemon(pack.rarity, facilities.academyLevel);
        addPokemon(newPokemon);
        setLastPulled(newPokemon);
        setOpeningState('revealed');
      } catch (e) {
        console.error("Error generating pokemon", e);
        setOpeningState('idle');
      }
    } else {
      alert("Not enough resources!");
    }
  };

  const closeReveal = () => {
    setOpeningState('idle');
    setLastPulled(null);
    setSelectedPack(null);
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 uppercase italic tracking-tighter drop-shadow-sm">PokéMart</h2>
        <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-sm px-6 py-3 rounded-2xl border border-slate-700 shadow-xl">
          <div className="flex items-center gap-2 text-yellow-400 font-bold text-xl">
            <Coins size={24} className="drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
            {coins.toLocaleString()}
          </div>
        </div>
      </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {PACKS.map((pack) => (
          <motion.div 
            key={pack.id} 
            whileHover={{ y: -15, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`bg-gradient-to-br ${pack.color} rounded-[2rem] p-1 relative group cursor-pointer shadow-2xl ${pack.shadow}`}
            onClick={() => openingState === 'idle' && handleBuyPack(pack)}
          >
            {/* Animated border glow */}
            <div className="absolute inset-0 bg-white/20 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
            
            <div className="bg-slate-900/40 backdrop-blur-md rounded-[1.8rem] p-6 h-full flex flex-col items-center justify-between text-center relative z-10 border border-white/10 overflow-hidden">
              {/* Shine effect */}
              <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />

              <div className="relative z-10 w-full space-y-6">
                <h3 className="text-2xl font-black text-white uppercase italic drop-shadow-md">{pack.name}</h3>
                
                <motion.div 
                  className="w-32 h-40 mx-auto bg-gradient-to-b from-white/20 to-transparent rounded-2xl border-2 border-white/30 flex items-center justify-center shadow-[inset_0_0_20px_rgba(255,255,255,0.2)] relative"
                  whileHover={{ rotateY: 15, rotateX: 5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Package size={64} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                  <Sparkles className="absolute top-2 right-2 text-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                </motion.div>

                <div className="bg-black/60 py-2 px-4 rounded-full border border-white/20">
                  <p className="text-sm font-bold text-white uppercase tracking-widest flex items-center justify-center gap-2">
                    <Star size={14} className="text-yellow-300" />
                    {pack.rarity}
                  </p>
                </div>
                
                <button 
                  disabled={openingState !== 'idle' || (pack.currency === 'coins' && coins < pack.cost)}
                  className="w-full bg-white text-slate-900 font-black py-4 rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase italic tracking-widest shadow-[0_0_15px_rgba(255,255,255,0.3)] group-hover:shadow-[0_0_25px_rgba(255,255,255,0.6)]"
                >
                  {pack.cost.toLocaleString()} <Coins size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pack Opening Sequence */}
      <AnimatePresence>
        {openingState !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            {/* Shaking Phase */}
            {openingState === 'shaking' && selectedPack && (
              <motion.div 
                animate={{ 
                  x: [-10, 10, -10, 10, -5, 5, -2, 2, 0],
                  y: [-5, 5, -5, 5, -2, 2, -1, 1, 0],
                  rotate: [-5, 5, -5, 5, -2, 2, 0],
                  scale: [1, 1.1, 1.2, 1.25]
                }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className={`w-64 h-80 rounded-3xl bg-gradient-to-br ${selectedPack.color} border-4 border-white/50 shadow-[0_0_50px_rgba(255,255,255,0.5)] flex items-center justify-center relative overflow-hidden`}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                <Package size={120} className="text-white drop-shadow-2xl relative z-10" />
              </motion.div>
            )}

            {/* Bursting Phase (White Flash) */}
            {openingState === 'bursting' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [1, 1, 0], scale: [1, 5, 10] }}
                transition={{ duration: 0.5 }}
                className="w-32 h-32 bg-white rounded-full blur-2xl"
              />
            )}

            {/* Revealed Phase */}
            {openingState === 'revealed' && lastPulled && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5, y: 100 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -100 }}
                transition={{ type: "spring", damping: 15, stiffness: 100 }}
                className="relative"
              >
                {/* Background rays */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(255,255,255,0.3)_360deg)] rounded-full blur-xl -z-10"
                />

                <div className="bg-slate-800/90 backdrop-blur-xl rounded-[2.5rem] p-10 max-w-md w-full text-center border border-white/20 shadow-[0_0_100px_rgba(59,130,246,0.3)] relative overflow-hidden">
                  {/* Card Shine */}
                  <motion.div 
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={{ x: '200%', opacity: 0.5 }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
                    className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 z-20 pointer-events-none"
                  />

                  <motion.h3 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-4 uppercase italic tracking-widest"
                  >
                    New Pokémon!
                  </motion.h3>
                  
                  <div className="relative w-64 h-64 mx-auto mb-8">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                      className="absolute inset-0 bg-gradient-to-t from-blue-500/30 to-transparent rounded-full blur-2xl" 
                    />
                    <motion.img 
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1.5, rotate: 0 }}
                      transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.4 }}
                      src={lastPulled.sprite} 
                      alt={lastPulled.name} 
                      className="w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] relative z-10" 
                    />
                  </div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <h4 className="text-5xl font-black text-white mb-2 uppercase italic tracking-tighter drop-shadow-lg">
                      {lastPulled.name} {lastPulled.isShiny && <span className="text-yellow-400 animate-pulse">✨</span>}
                    </h4>
                    <div className="inline-block bg-black/50 px-6 py-2 rounded-full border border-white/10 mb-8">
                      <p className="text-xl font-black text-white uppercase tracking-[0.3em]">{lastPulled.rarity}</p>
                    </div>
                    
                    <button 
                      onClick={closeReveal}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black py-5 rounded-2xl transition-all uppercase italic tracking-widest text-lg shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:shadow-[0_0_30px_rgba(37,99,235,0.8)] hover:scale-105 active:scale-95"
                    >
                      Add to Roster
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
