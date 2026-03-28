import React from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { LogIn, LogOut, Cloud, RefreshCw } from 'lucide-react';

interface ProfileMenuProps {
  user: any;
  isSyncing: boolean;
}

export function ProfileMenu({ user, isSyncing }: ProfileMenuProps) {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-zinc-900/80 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-md">
      {user ? (
        <>
          <div className="flex items-center gap-3">
            <div className="relative">
              <img loading="lazy" src={user.photoURL || ''} alt="Profile" className="w-8 h-8 rounded-xl border border-white/10 shadow-lg" />
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-900 ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            </div>
            <div className="hidden md:block">
              <p className="text-white font-black text-xs uppercase italic tracking-tighter leading-none truncate max-w-[120px]">{user.displayName}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {isSyncing ? (
                  <p className="text-amber-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                    <RefreshCw size={8} className="animate-spin" /> Sincronizando
                  </p>
                ) : (
                  <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                    <Cloud size={8} className="text-emerald-500" /> En la nube
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button 
            onClick={handleLogout} 
            className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-rose-400 transition-all duration-300" 
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </>
      ) : (
        <button 
          onClick={handleLogin}
          className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-xl font-black transition-all duration-300 text-xs uppercase tracking-widest shadow-lg shadow-white/5"
        >
          <LogIn size={16} />
          <span className="hidden sm:inline">Entrar</span>
        </button>
      )}
    </div>
  );
}
