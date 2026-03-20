import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Building2, HeartPulse, GraduationCap, Users, Briefcase, ShieldAlert } from 'lucide-react';

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
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex flex-col h-full">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-blue-900/50 text-blue-400 rounded-lg">
            {icon}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{name}</h3>
            <p className="text-sm text-white">Level {level}/10</p>
          </div>
        </div>
        <p className="text-sm text-white mb-6 flex-1">{description}</p>
        
        <button
          onClick={() => upgradeFacility(id)}
          disabled={!canUpgrade}
          className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {level >= 10 ? 'Max Level' : `Upgrade (💰 ${cost})`}
        </button>
      </div>
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
      <div className={`rounded-xl p-6 border flex flex-col h-full transition-colors ${isHired ? 'bg-green-900/20 border-green-500/50' : 'bg-slate-800 border-slate-700'}`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-lg ${isHired ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{name}</h3>
            <p className="text-sm text-white">{isHired ? 'Hired' : 'Available'}</p>
          </div>
        </div>
        <p className="text-sm text-white mb-6 flex-1">{description}</p>
        
        <button
          onClick={() => hireStaff(id)}
          disabled={!canHire || isHired}
          className={`w-full font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
            isHired ? 'bg-green-600/50 text-green-100 cursor-default' : 'bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {isHired ? 'Active' : `Hire (💰 ${cost})`}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Facilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderFacility('stadiumLevel', 'Stadium', <Building2 size={24} />, 'Increases match income and fan attendance.', facilities.stadiumLevel)}
          {renderFacility('medicalCenterLevel', 'Medical Center', <HeartPulse size={24} />, 'Accelerates injury recovery and reduces post-match fatigue.', facilities.medicalCenterLevel)}
          {renderFacility('academyLevel', 'Youth Academy', <GraduationCap size={24} />, 'Improves base stats of Common and Rare Pokémon pulled from packs.', facilities.academyLevel)}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Staff</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderStaff('tacticalCoach', 'Tactical Coach', <Users size={24} />, 'Provides a 10% damage bonus to your team\'s primary types.', staff.tacticalCoach)}
          {renderStaff('physiotherapist', 'Physiotherapist', <ShieldAlert size={24} />, 'Reduces injury risk threshold to 80% fatigue instead of 70%.', staff.physiotherapist)}
          {renderStaff('scout', 'Head Scout', <Briefcase size={24} />, 'Improves the quality of Pokémon available in the Transfer Market.', staff.scout)}
        </div>
      </div>
    </div>
  );
}
