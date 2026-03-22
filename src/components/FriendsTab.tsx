import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Friend, FriendRequest } from '../types';
import { Users, UserPlus, Search, Check, X } from 'lucide-react';

export default function FriendsTab() {
  console.log("FriendsTab rendering");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<{id: string, name: string}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchFriendsAndRequests = async () => {
      if (!auth.currentUser) return;
      
      // Fetch Friends
      const friendsRef = collection(db, 'users', auth.currentUser.uid, 'friends');
      const snapshot = await getDocs(friendsRef);
      
      const friendsData: Friend[] = [];
      for (const friendDoc of snapshot.docs) {
        const friendId = friendDoc.id;
        const userDoc = await getDoc(doc(db, 'users', friendId));
        if (userDoc.exists()) {
          friendsData.push({
            id: friendId,
            ...userDoc.data() as Omit<Friend, 'id' | 'progress'>,
            progress: userDoc.data().progress
          });
        }
      }
      setFriends(friendsData);

      // Fetch Friend Requests
      const requestsQuery = query(
        collection(db, 'friendRequests'),
        where('receiverId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsData: FriendRequest[] = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<FriendRequest, 'id'>
      }));
      setFriendRequests(requestsData);
    };

    fetchFriendsAndRequests();
  }, []);

  const handleSearch = async () => {
    if (!searchTerm) return;
    const usersQuery = query(collection(db, 'users'), where('name', '==', searchTerm));
    const snapshot = await getDocs(usersQuery);
    setSearchResults(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!auth.currentUser) return;
    await addDoc(collection(db, 'friendRequests'), {
      senderId: auth.currentUser.uid,
      receiverId,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    alert('Solicitud enviada');
  };

  const acceptFriendRequest = async (request: FriendRequest) => {
    if (!auth.currentUser) return;
    
    // Add to friends subcollection for both users
    await addDoc(collection(db, 'users', auth.currentUser.uid, 'friends'), { friendId: request.senderId });
    await addDoc(collection(db, 'users', request.senderId, 'friends'), { friendId: auth.currentUser.uid });
    
    // Update request status
    await updateDoc(doc(db, 'friendRequests', request.id), { status: 'accepted' });
    
    setFriendRequests(prev => prev.filter(r => r.id !== request.id));
    alert('Solicitud aceptada');
  };

  const declineFriendRequest = async (requestId: string) => {
    await updateDoc(doc(db, 'friendRequests', requestId), { status: 'declined' });
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

      {/* Pending Requests */}
      {friendRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Solicitudes Pendientes</h3>
          {friendRequests.map(request => (
            <div key={request.id} className="bg-zinc-800 p-4 rounded-2xl border border-white/10 flex justify-between items-center">
              <span className="text-white">Solicitud de {request.senderId}</span>
              <div className="flex gap-2">
                <button onClick={() => acceptFriendRequest(request)} className="bg-emerald-600 p-2 rounded-xl text-white"><Check size={16} /></button>
                <button onClick={() => declineFriendRequest(request.id)} className="bg-rose-600 p-2 rounded-xl text-white"><X size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {friends.map(friend => (
          <div key={friend.id} className="bg-zinc-900 p-4 rounded-2xl border border-white/10 flex justify-between items-center">
            <div>
              <div className="font-bold text-white">{friend.name}</div>
              <div className="text-xs text-zinc-400">Monedas: {friend.progress.coins}</div>
            </div>
            <button className="text-indigo-400 text-sm font-bold">Ver Progreso</button>
          </div>
        ))}
      </div>
    </div>
  );
}
