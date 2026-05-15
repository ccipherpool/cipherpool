import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends]               = useState([]);
  const [pendingRequests, setPending]        = useState([]);
  const [sentRequests, setSent]             = useState([]);
  const [loading, setLoading]               = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const [friendsRes, receivedRes, sentRes] = await Promise.all([
      supabase
        .from('friends')
        .select('*, profile:profiles!friends_friend_id_fkey(id,username,avatar_url,level), presence:user_presence(status,last_seen)')
        .eq('user_id', user.id)
        .order('is_favorite', { ascending: false }),
      supabase
        .from('friend_requests')
        .select('*, sender:profiles!friend_requests_sender_id_fkey(id,username,avatar_url)')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('friend_requests')
        .select('*, receiver:profiles!friend_requests_receiver_id_fkey(id,username,avatar_url)')
        .eq('sender_id', user.id)
        .eq('status', 'pending'),
    ]);
    setFriends(friendsRes.data || []);
    setPending(receivedRes.data || []);
    setSent(sentRes.data || []);
    setLoading(false);
  }, [user?.id]);

  const sendFriendRequest = useCallback(async (targetId) => {
    const { error } = await supabase.from('friend_requests').insert({
      sender_id: user.id, receiver_id: targetId,
    });
    if (error) throw error;
    await fetchAll();
  }, [user?.id, fetchAll]);

  const acceptRequest = useCallback(async (requestId) => {
    const { error } = await supabase.rpc('accept_friend_request', { request_id: requestId });
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const rejectRequest = useCallback(async (requestId) => {
    await supabase
      .from('friend_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId);
    await fetchAll();
  }, [fetchAll]);

  const removeFriend = useCallback(async (friendId) => {
    await Promise.all([
      supabase.from('friends').delete().eq('user_id', user.id).eq('friend_id', friendId),
      supabase.from('friends').delete().eq('user_id', friendId).eq('friend_id', user.id),
    ]);
    await fetchAll();
  }, [user?.id, fetchAll]);

  const blockUser = useCallback(async (targetId) => {
    await supabase.from('blocked_users').insert({ blocker_id: user.id, blocked_id: targetId });
    await removeFriend(targetId);
  }, [user?.id, removeFriend]);

  const toggleFavorite = useCallback(async (friendId, currentValue) => {
    await supabase
      .from('friends')
      .update({ is_favorite: !currentValue })
      .eq('user_id', user.id)
      .eq('friend_id', friendId);
    await fetchAll();
  }, [user?.id, fetchAll]);

  // Check if a specific user is already a friend or has a pending request
  const getFriendshipState = useCallback((targetId) => {
    if (friends.some((f) => f.friend_id === targetId))             return 'friends';
    if (sentRequests.some((r) => r.receiver_id === targetId))      return 'sent';
    if (pendingRequests.some((r) => r.sender_id === targetId))     return 'received';
    return 'none';
  }, [friends, sentRequests, pendingRequests]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime for incoming friend requests
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`friends-realtime-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'friend_requests',
        filter: `receiver_id=eq.${user.id}`,
      }, fetchAll)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'friends',
        filter: `user_id=eq.${user.id}`,
      }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id, fetchAll]);

  return {
    friends, pendingRequests, sentRequests, loading,
    fetchAll,
    sendFriendRequest, acceptRequest, rejectRequest,
    removeFriend, blockUser, toggleFavorite,
    getFriendshipState,
  };
}
