import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase";

/**
 * Central notification hook — reads from both `notifications` and `admin_messages`.
 * Provides unified list, unread count, mark-read functions, and real-time subscription.
 */
export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [newNotif, setNewNotif]           = useState(null); // for toast
  const channelRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchAll = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      // Fetch from notifications table
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      // Fetch from admin_messages (personal + global)
      const { data: adminMsgs } = await supabase
        .from("admin_messages")
        .select("*")
        .or(`user_id.eq.${userId},is_global.eq.true`)
        .order("created_at", { ascending: false })
        .limit(30);

      // Normalize + merge
      const normalized = [
        ...(notifs || []).map(n => ({
          id:         n.id,
          type:       n.type,
          title:      n.title,
          content:    n.message,
          data:       n.data,
          action_url: n.data?.action_url || null,
          read:       n.is_read,
          is_global:  false,
          created_at: n.created_at,
          source:     "notifications",
        })),
        ...(adminMsgs || []).map(m => ({
          id:         m.id,
          type:       m.type,
          title:      m.title,
          content:    m.content,
          data:       null,
          action_url: null,
          read:       m.read,
          is_global:  m.is_global,
          created_at: m.created_at,
          source:     "admin_messages",
        })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setNotifications(normalized);
    } catch (err) {
      if (import.meta.env.DEV) console.error("useNotifications fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch + real-time subscription
  useEffect(() => {
    if (!userId) return;
    fetchAll();

    // Unsubscribe old channel
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const ch = supabase.channel("notifs_" + userId)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = {
            id:         payload.new.id,
            type:       payload.new.type,
            title:      payload.new.title,
            content:    payload.new.message,
            data:       payload.new.data,
            action_url: payload.new.data?.action_url || null,
            read:       false,
            is_global:  false,
            created_at: payload.new.created_at,
            source:     "notifications",
          };
          setNotifications(prev => [n, ...prev]);
          setNewNotif(n); // trigger toast
        }
      )
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_messages" },
        (payload) => {
          const m = payload.new;
          if (m.user_id !== userId && !m.is_global) return;
          const n = {
            id:         m.id,
            type:       m.type,
            title:      m.title,
            content:    m.content,
            data:       null,
            action_url: null,
            read:       false,
            is_global:  m.is_global,
            created_at: m.created_at,
            source:     "admin_messages",
          };
          setNotifications(prev => [n, ...prev]);
          setNewNotif(n);
        }
      )
      .subscribe();

    channelRef.current = ch;
    return () => supabase.removeChannel(ch);
  }, [userId, fetchAll]);

  const markRead = useCallback(async (id, source) => {
    if (source === "notifications") {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    } else {
      await supabase.from("admin_messages").update({ read: true }).eq("id", id);
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.read);
    const notifIds    = unread.filter(n => n.source === "notifications").map(n => n.id);
    const adminMsgIds = unread.filter(n => n.source === "admin_messages").map(n => n.id);

    if (notifIds.length)    await supabase.from("notifications").update({ is_read: true }).in("id", notifIds);
    if (adminMsgIds.length) await supabase.from("admin_messages").update({ read: true }).in("id", adminMsgIds);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [notifications]);

  const clearNewNotif = useCallback(() => setNewNotif(null), []);

  return {
    notifications,
    unreadCount,
    loading,
    newNotif,
    clearNewNotif,
    markRead,
    markAllRead,
    refresh: fetchAll,
  };
}
