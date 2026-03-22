import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Building2, HeartPulse, GraduationCap, Users, Briefcase, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FacilitiesTab() {
  const { facilities, staff, upgradeFacility, hireStaff, coins } = useGameStore();

  const renderFacility = (
    id: keyof typeof facilities,
    name: string,
    icon: React.ReactNode,
    description: string,
    level: number
  ) => {
    const cost = level * 2000;
    const canUpgrade = coins >= cost && level < 10;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-zinc-900/50 rounded-[32px] p-6 md:p-8 border border-white/10 flex flex-col h-full group hover:border-indigo-500/30 transition-all shadow-xl hover:shadow-indigo-500/5"
      >
        <div className="flex items-center gap-5 mb-6">
          <div className="p-4 bg-indigo-600/10 text-indigo-400 rounded-2xl border border-indigo-500/20 group-hover:bg-indigo-600/20 transition-colors">
            {icon}
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">{name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 w-24 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500" 
                  style={{ width: `${(level / 10) * 100}%` }}
                />
              </div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nivel {level}/10</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-zinc-400 mb-8 flex-1 leading-relaxed">{description}</p>
        
        <button
          onClick={() => upgradeFacility(id)}
          disabled={!canUpgrade}
          className="w-full bg-white hover:bg-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed text-black font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase italic tracking-widest text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          {level >= 10 ? 'Nivel Máximo' : (
            <>
              Mejorar <span className="text-zinc-500 font-bold ml-1">💰 {cost.toLocaleString()}</span>
            </>
          )}
        </button>
      </motion.div>
    );
  };

  const renderStaff = (
    id: keyof typeof staff,
    name: string,
    icon: React.ReactNode,
    description: string,
    isHired: boolean
  ) => {
    const cost = 5000;
    const canHire = coins >= cost && !isHired;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`rounded-[32px] p-6 md:p-8 border flex flex-col h-full transition-all shadow-xl ${
          isHired 
            ? 'bg-emerald-500/5 border-emerald-500/30 shadow-emerald-500/5' 
            : 'bg-zinc-900/50 border-white/10 hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-5 mb-6">
          <div className={`p-4 rounded-2xl border transition-colors ${
            isHired 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
              : 'bg-black/40 text-zinc-500 border-white/5'
          }`}>
            {icon}
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">{name}</h3>
            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isHired ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {isHired ? 'Contratado' : 'Disponible'}
            </p>
          </div>
        </div>
        <p className="text-sm text-zinc-400 mb-8 flex-1 leading-relaxed">{description}</p>
        
        <button
          onClick={() => hireStaff(id)}
          disabled={!canHire || isHired}
          className={`w-full font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase italic tracking-widest text-sm shadow-xl ${
            isHired 
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default' 
              : 'bg-white hover:bg-zinc-200 text-black disabled:opacity-20 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {isHired ? 'Activo' : (
            <>
              Contratar <span className="text-zinc-500 font-bold ml-1">💰 {cost.toLocaleString()}</span>
            </>
          )}
        </button>
      </motion.div>
    );
  };

  return (
    <div className="space-y-12 md:space-y-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div>
        <div className="flex items-center gap-4 mb-8 md:mb-12">
          <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
            <Building2 size={24} />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter">Instalaciones</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {renderFacility('stadiumLevel', 'Estadio', <Building2 size={24} />, 'Aumenta los ingresos por partido y la asistencia de fans.', facilities.stadiumLevel)}
          {renderFacility('medicalCenterLevel', 'Centro Médico', <HeartPulse size={24} />, 'Acelera la recuperación de lesiones y reduce la fatiga post-partido.', facilities.medicalCenterLevel)}
          {renderFacility('academyLevel', 'Academia Juvenil', <GraduationCap size={24} />, 'Mejora las estadísticas base de los Pokémon Comunes y Raros obtenidos en sobres.', facilities.academyLevel)}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-4 mb-8 md:mb-12">
          <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <Users size={24} />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter">Personal</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {renderStaff('tacticalCoach', 'Entrenador Táctico', <Users size={24} />, 'Proporciona un bono de daño del 10% a los tipos principales de tu equipo.', staff.tacticalCoach)}
          {renderStaff('physiotherapist', 'Fisioterapeuta', <ShieldAlert size={24} />, 'Reduce el umbral de riesgo de lesiones al 80% de fatiga en lugar del 70%.', staff.physiotherapist)}
          {renderStaff('scout', 'Jefe de Ojeadores', <Briefcase size={24} />, 'Mejora la calidad de los Pokémon disponibles en el Mercado de Transferencias.', staff.scout)}
        </div>
      </div>
    </div>
  );
}
