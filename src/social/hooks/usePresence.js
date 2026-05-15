import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const HEARTBEAT_MS = 25_000;

export function usePresence() {
  const { user } = useAuth();
  const heartbeatRef = useRef(null);

  const updatePresence = useCallback(async (status = 'online') => {
    if (!user?.id) return;
    await supabase.rpc('upsert_presence', { p_status: status });
  }, [user?.id]);

  const setOffline = useCallback(async () => {
    if (!user?.id) return;
    await supabase.rpc('set_user_offline');
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    updatePresence('online');

    heartbeatRef.current = setInterval(() => updatePresence('online'), HEARTBEAT_MS);

    const onVisibility = () =>
      document.hidden ? updatePresence('away') : updatePresence('online');
    document.addEventListener('visibilitychange', onVisibility);

    const onUnload = () => setOffline();
    window.addEventListener('beforeunload', onUnload);

    return () => {
      clearInterval(heartbeatRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onUnload);
      setOffline();
    };
  }, [user?.id, updatePresence, setOffline]);

  // Subscribe to a list of user IDs and call onUpdate when their presence changes
  const subscribeToPresence = useCallback((userIds, onUpdate) => {
    if (!userIds?.length) return () => {};
    const idSet = new Set(userIds);

    const channel = supabase
      .channel(`presence-watch-${userIds.join('-').slice(0, 40)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, (payload) => {
        if (idSet.has(payload.new?.user_id)) onUpdate(payload.new);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return { updatePresence, setOffline, subscribeToPresence };
}

// Read-only: fetch presence rows for an array of user IDs
export async function fetchPresenceBatch(userIds) {
  if (!userIds?.length) return {};
  const { data } = await supabase
    .from('user_presence')
    .select('user_id, status, last_seen')
    .in('user_id', userIds);
  return Object.fromEntries((data || []).map((r) => [r.user_id, r]));
}

export function statusColor(status) {
  return {
    online:        'bg-emerald-400',
    away:          'bg-yellow-400',
    in_game:       'bg-mint',
    in_tournament: 'bg-electric-purple',
    streaming:     'bg-red-500',
    offline:       'bg-slate-600',
  }[status] ?? 'bg-slate-600';
}
