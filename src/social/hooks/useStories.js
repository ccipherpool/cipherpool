import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function useStories() {
  const { user } = useAuth();
  const [feed, setFeed]       = useState([]);   // [{user_id, username, avatar_url, has_unseen, story_count, ...}]
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_dashboard_stories');
    if (!error) setFeed(data || []);
    setLoading(false);
  }, [user?.id]);

  // Full story list for one user (for the viewer)
  const fetchUserStories = useCallback(async (userId) => {
    const { data, error } = await supabase.rpc('get_user_stories', { p_user_id: userId });
    if (error) return [];
    return data || [];
  }, []);

  // Upload a story image/video to Storage then insert row
  const createStory = useCallback(async ({ file, caption = '', privacy = 'friends' }) => {
    if (!user?.id || !file) throw new Error('Missing user or file');

    const ext      = file.name.split('.').pop().toLowerCase();
    const path     = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('stories')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabase.storage.from('stories').getPublicUrl(path);
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

    const { data, error } = await supabase
      .from('stories')
      .insert({ user_id: user.id, media_url: publicUrl, media_type: mediaType, caption, privacy })
      .select()
      .single();
    if (error) throw error;

    await fetchFeed();
    return data;
  }, [user?.id, fetchFeed]);

  // Record a view (idempotent RPC)
  const recordView = useCallback(async (storyId) => {
    await supabase.rpc('record_story_view', { p_story_id: storyId });
    // Optimistic: mark the story owner's bubble as seen in local state
    setFeed((prev) =>
      prev.map((entry) =>
        entry.latest_story_id === storyId ? { ...entry, has_unseen: false } : entry
      )
    );
  }, []);

  const reactToStory = useCallback(async (storyId, emoji) => {
    await supabase.from('story_reactions').upsert(
      { story_id: storyId, user_id: user.id, reaction: emoji },
      { onConflict: 'story_id,user_id' }
    );
  }, [user?.id]);

  const deleteStory = useCallback(async (storyId) => {
    await supabase.from('stories').delete().eq('id', storyId).eq('user_id', user.id);
    await fetchFeed();
  }, [user?.id, fetchFeed]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  // Realtime: refresh feed when any story is inserted
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`stories-feed-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, fetchFeed)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'stories' }, fetchFeed)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id, fetchFeed]);

  const currentUserEntry = feed.find((e) => e.user_id === user?.id) ?? null;

  return {
    feed,
    loading,
    currentUserEntry,
    fetchFeed,
    fetchUserStories,
    createStory,
    recordView,
    reactToStory,
    deleteStory,
  };
}
