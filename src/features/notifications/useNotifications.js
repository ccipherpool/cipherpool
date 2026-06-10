import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase";

const PAGE_SIZE = 30;

export function useNotifications(userId) {
  const [notifications, setNotifications]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [toastQueue, setToastQueue]         = useState([]);
  const [preferences, setPreferences]       = useState(null);
  const [unreadCount, setUnreadCount]       = useState(0);
  const channelRef = useRef(null);

  // ── Normalize a notifications row ───────────────────────────────
  const normalize = (n) => ({
    id:         n.id,
    type:       n.type       || "system",
    category:   n.category   || "system",
    priority:   n.priority   || "normal",
    title:      n.title,
    content:    n.message,
    icon:       n.icon       || null,
    action_url: n.action_url || null,
    image_url:  n.image_url  || null,
    metadata:   n.metadata   || n.data || {},
    read:       n.is_read    || n.read || false,
    created_by: n.created_by || null,
    created_at: n.created_at,
    source:     "notifications",
  });

  // ── Fetch notifications + preferences ───────────────────────────
  const fetchAll = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data: notifs }, { data: prefs }] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE * 2),
        supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      setNotifications((notifs || []).map(normalize));
      setPreferences(prefs || null);
    } catch (err) {
      if (import.meta.env.DEV) console.error("useNotifications fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ── Fast unread count via RPC ───────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await supabase.rpc("get_unread_notification_count");
      setUnreadCount(data ?? 0);
    } catch {
      // fallback: count from local state
    }
  }, [userId]);

  // ── Realtime subscription ───────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    fetchAll();
    fetchUnreadCount();

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const ch = supabase
      .channel(`notifs_v2_${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = normalize(payload.new);
          setNotifications(prev => [n, ...prev]);
          setUnreadCount(c => c + 1);
          setToastQueue(prev => {
            const next = [...prev, n];
            return next.slice(-3); // keep max 3 toasts
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const updated = normalize(payload.new);
          setNotifications(prev =>
            prev.map(n => n.id === updated.id ? updated : n)
          );
          // Recount unread
          setNotifications(prev => {
            const count = prev.map(n => n.id === updated.id ? updated : n).filter(n => !n.read).length;
            setUnreadCount(count);
            return prev.map(n => n.id === updated.id ? updated : n);
          });
        }
      )
      .subscribe();

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [userId, fetchAll, fetchUnreadCount]);

  // Keep unreadCount in sync with local state
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // ── dismissToast ────────────────────────────────────────────────
  const dismissToast = useCallback((id) => {
    setToastQueue(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── markRead ────────────────────────────────────────────────────
  const markRead = useCallback(async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await supabase.rpc("mark_notification_read", { p_notification_id: id });
    } catch {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", userId);
    }
  }, [userId]);

  // ── markAllRead ─────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await supabase.rpc("mark_all_notifications_read");
    } catch {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
    }
  }, [userId]);

  // ── deleteNotification ──────────────────────────────────────────
  const deleteNotification = useCallback(async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
    } catch {
      // Best-effort
    }
  }, [userId]);

  // ── updatePreferences ───────────────────────────────────────────
  const updatePreferences = useCallback(async (prefs) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
    try {
      await supabase.rpc("upsert_notification_preferences", {
        p_tournament: prefs.tournament_notifications ?? true,
        p_social:     prefs.social_notifications ?? true,
        p_admin:      prefs.admin_notifications ?? true,
        p_marketing:  prefs.marketing_notifications ?? true,
        p_system:     prefs.system_notifications ?? true,
        p_sound:      prefs.sound_enabled ?? true,
        p_email:      prefs.email_notifications ?? false,
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error("updatePreferences:", err);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    toastQueue,
    dismissToast,
    markRead,
    markAllRead,
    deleteNotification,
    refresh: fetchAll,
    preferences,
    updatePreferences,
  };
}
