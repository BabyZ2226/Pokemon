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
    <div className="flex items-center gap-3 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
      {user ? (
        <>
          <div className="flex items-center gap-2">
            <img src={user.photoURL || ''} alt="Profile" className="w-7 h-7 rounded-full border border-slate-600" />
            <div className="hidden md:block text-sm">
              <p className="text-white font-bold leading-none truncate max-w-[120px]">{user.displayName}</p>
              <p className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5">
                {isSyncing ? (
                  <><RefreshCw size={10} className="animate-spin" /> Guardando...</>
                ) : (
                  <><Cloud size={10} className="text-green-400" /> Guardado</>
                )}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors" title="Cerrar sesión">
            <LogOut size={16} />
          </button>
        </>
      ) : (
        <button 
          onClick={handleLogin}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold transition-colors text-sm"
        >
          <LogIn size={16} />
          <span className="hidden sm:inline">Iniciar sesión</span>
        </button>
      )}
    </div>
  );
}
