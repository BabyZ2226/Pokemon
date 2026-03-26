import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp, updateDoc, getFirestore, onSnapshot } from 'firebase/firestore';
import { Friend, FriendRequest, MultiplayerRoom } from '../types';
import { Users, UserPlus, Search, Check, X, Loader2, Swords } from 'lucide-react';

export default function FriendsTab({ setActiveTab, roster: propRoster, activeTeamIds: propActiveTeamIds }: { setActiveTab?: (tab: string) => void, roster?: any[], activeTeamIds?: string[] }) {
  const store = useGameStore();
  const roster = propRoster || store.roster;
  const activeTeamIds = propActiveTeamIds || store.activeTeamIds;
  const { userId, userName, subscribeToRoom } = store;
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [incomingChallenges, setIncomingChallenges] = useState<MultiplayerRoom[]>([]);
  const [searchResults, setSearchResults] = useState<{id: string, name: string}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const playerTeam = React.useMemo(() => roster.filter(p => activeTeamIds.includes(p.id)), [roster, activeTeamIds]);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    setIsLoading(true);

    // Real-time Friends
    const friendsRef = collection(getFirestore(), 'users', auth.currentUser.uid, 'friends');
    const unsubFriends = onSnapshot(friendsRef, async (snapshot) => {
      const friendsData: Friend[] = [];
      for (const friendDoc of snapshot.docs) {
        const friendId = friendDoc.id; // Using doc ID as friend UID
        const userDoc = await getDoc(doc(getFirestore(), 'users', friendId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          friendsData.push({
            id: friendId,
            name: data.name || 'Entrenador',
            progress: data.progress || { coins: 0, leagueLevel: 1, pokedexCount: 0 }
          });
        }
      }
      setFriends(friendsData);
      setIsLoading(false);
    });

    // Real-time Friend Requests
    const requestsQuery = query(
      collection(getFirestore(), 'friendRequests'),
      where('receiverId', '==', auth.currentUser.uid)
    );
    const unsubRequests = onSnapshot(requestsQuery, async (snapshot) => {
      const requestsData: (FriendRequest & { senderName?: string })[] = [];
      const pendingRequests = snapshot.docs.filter(doc => doc.data().status === 'pending');
      for (const requestDoc of pendingRequests) {
        const data = requestDoc.data() as FriendRequest;
        const senderDoc = await getDoc(doc(getFirestore(), 'users', data.senderId));
        requestsData.push({
          id: requestDoc.id,
          ...data,
          senderName: senderDoc.exists() ? senderDoc.data().name : 'Entrenador'
        });
      }
      setFriendRequests(requestsData);
    });

    // Real-time Challenges
    const challengesQuery = query(
      collection(getFirestore(), 'rooms'),
      where('targetPlayerId', '==', auth.currentUser.uid)
    );
    const unsubChallenges = onSnapshot(challengesQuery, (snapshot) => {
      const challengesData: MultiplayerRoom[] = snapshot.docs
        .filter(doc => doc.data().status === 'waiting')
        .map(doc => ({
          id: doc.id,
          ...doc.data() as Omit<MultiplayerRoom, 'id'>
        }));
      setIncomingChallenges(challengesData);
    });

    return () => {
      unsubFriends();
      unsubRequests();
      unsubChallenges();
    };
  }, []);

  const challengeFriend = async (friendId: string) => {
    if (playerTeam.length === 0) {
      alert('¡Necesitas al menos un Pokémon en tu equipo activo!');
      return;
    }

    const myPlayer = {
      id: userId,
      uid: auth.currentUser?.uid || 'anonymous',
      name: userName,
      team: playerTeam,
      activeIdx: 0,
      hp: playerTeam.map(p => p.baseStats.hp * 3)
    };

    try {
      const roomsRef = collection(getFirestore(), 'rooms');
      const newRoom = {
        status: 'waiting',
        player1: myPlayer,
        player2: null,
        currentTurnId: userId,
        logs: [`¡${userName} ha retado a un duelo!`],
        winnerId: null,
        updatedAt: Date.now(),
        isPrivate: true,
        targetPlayerId: friendId
      };
      const docRef = await addDoc(roomsRef, newRoom);
      subscribeToRoom(docRef.id, userId);
      if (setActiveTab) setActiveTab('multiplayer');
    } catch (error) {
      console.error("Error challenging friend:", error);
      alert('Error al enviar el reto');
    }
  };

  const acceptChallenge = async (room: MultiplayerRoom) => {
    if (playerTeam.length === 0) {
      alert('¡Necesitas al menos un Pokémon en tu equipo activo!');
      return;
    }

    const myPlayer = {
      id: userId,
      uid: auth.currentUser?.uid || 'anonymous',
      name: userName,
      team: playerTeam,
      activeIdx: 0,
      hp: playerTeam.map(p => p.baseStats.hp * 3)
    };

    try {
      await updateDoc(doc(getFirestore(), 'rooms', room.id!), {
        status: 'playing',
        player2: myPlayer,
        updatedAt: Date.now()
      });
      subscribeToRoom(room.id!, userId);
      if (setActiveTab) setActiveTab('multiplayer');
    } catch (error) {
      console.error("Error accepting challenge:", error);
      alert('Error al aceptar el reto');
    }
  };

  const handleSearch = async () => {
    if (!searchTerm) return;
    const usersQuery = query(collection(getFirestore(), 'users'), where('name', '==', searchTerm));
    const snapshot = await getDocs(usersQuery);
    setSearchResults(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!auth.currentUser) return;
    await addDoc(collection(getFirestore(), 'friendRequests'), {
      senderId: auth.currentUser.uid,
      receiverId,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    alert('Solicitud enviada');
  };

  const acceptFriendRequest = async (request: FriendRequest) => {
    if (!auth.currentUser) return;
    
    try {
      // Add to friends subcollection for both users using setDoc to use UID as doc ID
      await setDoc(doc(getFirestore(), 'users', auth.currentUser.uid, 'friends', request.senderId), { friendId: request.senderId, addedAt: serverTimestamp() });
      await setDoc(doc(getFirestore(), 'users', request.senderId, 'friends', auth.currentUser.uid), { friendId: auth.currentUser.uid, addedAt: serverTimestamp() });
      
      // Update request status
      await updateDoc(doc(getFirestore(), 'friendRequests', request.id), { status: 'accepted' });
      
      alert('Solicitud aceptada');
    } catch (error) {
      console.error("Error accepting friend request:", error);
      alert('Error al aceptar la solicitud');
    }
  };

  const declineFriendRequest = async (requestId: string) => {
    await updateDoc(doc(getFirestore(), 'friendRequests', requestId), { status: 'declined' });
    setFriendRequests(prev => prev.filter(r => r.id !== requestId));
    alert('Solicitud rechazada');
  };

  return (
    <div className="p-6 space-y-6 bg-zinc-900">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black uppercase italic text-white">Amigos</h2>
      </div>

      <div className="relative flex gap-2">
        <Search className="absolute left-3 top-3 text-zinc-500" size={20} />
        <input 
          type="text" 
          placeholder="Buscar amigos por nombre..." 
          className="flex-1 bg-zinc-950 border border-white/10 rounded-2xl p-3 pl-10 text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={handleSearch} className="bg-indigo-600 p-3 rounded-2xl text-white">Buscar</button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Resultados</h3>
          {searchResults.map(user => (
            <div key={user.id} className="bg-zinc-800 p-4 rounded-2xl border border-white/10 flex justify-between items-center">
              <span className="text-white">{user.name}</span>
              <button onClick={() => sendFriendRequest(user.id)} className="bg-indigo-600 p-2 rounded-xl text-white"><UserPlus size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Incoming Challenges */}
      {incomingChallenges.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Swords className="text-rose-500" size={20} />
            Retos Recibidos
          </h3>
          {incomingChallenges.map(room => (
            <div key={room.id} className="bg-rose-950/30 p-4 rounded-2xl border border-rose-500/30 flex justify-between items-center">
              <span className="text-white font-bold">{room.player1.name} te ha retado!</span>
              <button 
                onClick={() => acceptChallenge(room)} 
                className="bg-rose-600 hover:bg-rose-500 p-2 px-4 rounded-xl text-white font-bold text-xs flex items-center gap-2"
              >
                <Swords size={14} />
                Aceptar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending Requests */}
      {friendRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Solicitudes Pendientes</h3>
          {friendRequests.map((request: any) => (
            <div key={request.id} className="bg-zinc-800 p-4 rounded-2xl border border-white/10 flex justify-between items-center">
              <span className="text-white">Solicitud de {request.senderName || request.senderId}</span>
              <div className="flex gap-2">
                <button onClick={() => acceptFriendRequest(request)} className="bg-emerald-600 p-2 rounded-xl text-white"><Check size={16} /></button>
                <button onClick={() => declineFriendRequest(request.id)} className="bg-rose-600 p-2 rounded-xl text-white"><X size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center p-12 bg-zinc-800/50 rounded-3xl border border-white/5">
            <Users className="mx-auto text-zinc-700 mb-4" size={48} />
            <p className="text-zinc-500 font-bold">Aún no tienes amigos. ¡Busca a otros entrenadores!</p>
          </div>
        ) : (
          friends.map(friend => (
            <div key={friend.id} className="bg-zinc-800 p-4 rounded-2xl border border-white/10 flex justify-between items-center hover:bg-zinc-750 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl">
                  {friend.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-white">{friend.name}</div>
                  <div className="flex gap-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <span>Nivel: {friend.progress.leagueLevel}</span>
                    <span>Pokédex: {friend.progress.pokedexCount}</span>
                    <span className="text-amber-500">Coins: {friend.progress.coins}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => challengeFriend(friend.id)}
                  className="bg-rose-600 hover:bg-rose-500 px-4 py-2 rounded-xl text-white text-xs font-bold transition-colors flex items-center gap-2"
                >
                  <Swords size={14} />
                  Retar
                </button>
                <button className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-xl text-white text-xs font-bold transition-colors">
                  Perfil
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
