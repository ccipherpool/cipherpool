import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Smile, Reply, CheckCheck, MoreVertical,
  Users, X, UserPlus, UserMinus, MessageSquare,
  Shield, Users2, Trophy, Flag, ChevronRight,
  Loader2, Circle, Clock, Gamepad2, Swords, Radio, Hash,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePresence } from "../social/hooks/usePresence";
import { useFriends } from "../social/hooks/useFriends";

// ─── constants ──────────────────────────────────────────────────────────────
const EMOJIS = ["👍","🔥","💪","🏆","😂","❤️","👏","🎮","⚡","💀","🎯","✨","💯","🚀","🎉","😎"];

const ROLE_BADGES = {
  super_admin: { label: "SUPER",   color: "#ef4444", bg: "rgba(239,68,68,.13)"   },
  founder:     { label: "FOUNDER", color: "#a78bfa", bg: "rgba(167,139,250,.13)" },
  admin:       { label: "ADMIN",   color: "#fb923c", bg: "rgba(251,146,60,.13)"  },
  designer:    { label: "DESIGN",  color: "#34d399", bg: "rgba(52,211,153,.13)"  },
};

const STATUS_DOT_COLOR = {
  online:        "#10b981",
  away:          "#f59e0b",
  in_game:       "#10b981",
  in_tournament: "#8b5cf6",
  streaming:     "#ef4444",
};

const STATUS_ICONS = {
  online:        { icon: Circle,   label: "Online"       },
  away:          { icon: Clock,    label: "Away"         },
  in_game:       { icon: Gamepad2, label: "In Game"      },
  in_tournament: { icon: Swords,   label: "In Tournament"},
  streaming:     { icon: Radio,    label: "Streaming"    },
  offline:       { icon: Circle,   label: "Offline"      },
};

const USER_COLORS = ["#06b6d4","#a855f7","#10b981","#f59e0b","#ec4899","#14b8a6","#8b5cf6","#22d3ee"];

// ─── pure helpers ────────────────────────────────────────────────────────────
function colorFromId(id = "") {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return USER_COLORS[Math.abs(h) % USER_COLORS.length];
}
function initialsFrom(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}
function dayKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
}
function daySeparator(d) {
  const x     = new Date(d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yest  = new Date(today); yest.setDate(yest.getDate() - 1);
  const dd    = new Date(x); dd.setHours(0, 0, 0, 0);
  if (+dd === +today) return "Today";
  if (+dd === +yest)  return "Yesterday";
  return x.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
function timeShort(d) {
  return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ name, url, size = 36, color, status }) {
  const radius  = Math.round(size * 0.26);
  const dotSize = Math.max(8, Math.round(size * 0.30));

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden font-bold text-white select-none"
        style={{
          borderRadius: radius,
          background: url ? "transparent" : `linear-gradient(135deg,${color}dd,${color}88)`,
          fontSize: size * 0.38,
        }}
      >
        {url
          ? <img src={url} alt="" onError={(e) => { e.target.style.display = "none"; }} className="w-full h-full object-cover" />
          : initialsFrom(name)
        }
      </div>
      {status && status !== "offline" && STATUS_DOT_COLOR[status] && (
        <span
          className="absolute rounded-full border-2"
          style={{
            width: dotSize, height: dotSize,
            bottom: -1, right: -1,
            borderColor: "var(--cp-surface-1)",
            background: STATUS_DOT_COLOR[status],
          }}
        />
      )}
    </div>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const b = ROLE_BADGES[role];
  if (!b) return null;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide leading-none"
      style={{ color: b.color, background: b.bg }}
    >
      {b.label}
    </span>
  );
}

// ─── DM Modal ─────────────────────────────────────────────────────────────────
function DMModal({ targetUser, currentUser, onClose }) {
  const [convId,   setConvId]   = useState(null);
  const [messages, setMsgs]     = useState([]);
  const [text,     setText]     = useState("");
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: cId } = await supabase.rpc("get_or_create_conversation", { other_user_id: targetUser.id });
      setConvId(cId);
      if (cId) {
        const { data: msgs } = await supabase
          .from("direct_messages")
          .select("*")
          .eq("conversation_id", cId)
          .order("created_at", { ascending: true })
          .limit(60);
        setMsgs(msgs || []);
      }
      setLoading(false);
    })();
  }, [targetUser.id]);

  useEffect(() => {
    if (!convId) return;
    const ch = supabase
      .channel(`dm-${convId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${convId}` },
        (p) => setMsgs((prev) => [...prev, p.new]))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [convId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const sendMsg = async (e) => {
    e?.preventDefault();
    const content = text.trim();
    if (!content || !convId || sending) return;
    setSending(true);
    setText("");
    await supabase.from("direct_messages").insert({ conversation_id: convId, sender_id: currentUser.id, content });
    setSending(false);
  };

  const targetColor = colorFromId(targetUser.id);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: 56, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 56, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="w-full sm:max-w-sm flex flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl border"
          style={{
            height: "65vh",
            background: "var(--cp-surface-3)",
            borderColor: "var(--cp-border)",
          }}
        >
          {/* DM header */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b"
            style={{ borderColor: "var(--cp-border)" }}
          >
            <Avatar name={targetUser.username} url={targetUser.avatar_url} size={34} color={targetColor} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--cp-text-1)" }}>
                {targetUser.username}
              </p>
              <p className="text-[11px]" style={{ color: "var(--cp-text-4)" }}>Direct Message</p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: "var(--cp-text-3)" }}
            >
              <X size={13} />
            </button>
          </div>

          {/* DM messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
            {loading && (
              <div className="flex justify-center pt-10">
                <Loader2 size={18} className="animate-spin" style={{ color: "var(--cp-accent)" }} />
              </div>
            )}
            {!loading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                <MessageSquare size={26} style={{ color: "var(--cp-text-4)" }} />
                <p className="text-xs" style={{ color: "var(--cp-text-4)" }}>Start the conversation</p>
              </div>
            )}
            {messages.map((m) => {
              const isMe = m.sender_id === currentUser.id;
              return (
                <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[78%]">
                    <div
                      className="px-3 py-2 text-sm rounded-2xl"
                      style={{
                        background: isMe ? "var(--cp-accent-dim)" : "var(--cp-surface-4)",
                        border: `1px solid ${isMe ? "var(--cp-accent-border)" : "var(--cp-border)"}`,
                        color: "var(--cp-text-1)",
                        wordBreak: "break-word",
                        lineHeight: 1.5,
                      }}
                    >
                      {m.content}
                    </div>
                    <p
                      className="text-[10px] mt-0.5 px-1"
                      style={{ color: "var(--cp-text-4)", textAlign: isMe ? "right" : "left" }}
                    >
                      {timeShort(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* DM composer */}
          <form
            onSubmit={sendMsg}
            className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0 border-t"
            style={{ borderColor: "var(--cp-border)" }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Message ${targetUser.username}…`}
              className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
              style={{
                background: "var(--cp-surface-4)",
                border: "1px solid var(--cp-border)",
                color: "var(--cp-text-1)",
              }}
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
              style={{
                background: text.trim() ? "var(--cp-accent)" : "var(--cp-surface-4)",
                border: "1px solid var(--cp-border)",
                color: text.trim() ? "#fff" : "var(--cp-text-4)",
              }}
            >
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Mini Profile Card ────────────────────────────────────────────────────────
function MiniProfileCard({ user: target, currentUserId, friends, onClose, onSendDM, onFriendAction }) {
  const [inviting, setInviting] = useState("");
  const isFriend   = friends.some((f) => f.friend_id === target.id);
  const targetColor = colorFromId(target.id);
  const roleBadge   = ROLE_BADGES[target.role];
  const statusInfo  = STATUS_ICONS[target.status] ?? STATUS_ICONS.offline;
  const StatusIcon  = statusInfo.icon;

  const sendInvite = async (type) => {
    setInviting(type);
    try {
      let resourceId = null;
      if (type === "tournament") {
        const { data } = await supabase.from("tournaments").select("id").in("status", ["registration_open","published","live"]).limit(1).maybeSingle();
        resourceId = data?.id;
      } else if (type === "clan") {
        const { data } = await supabase.from("clans").select("id").eq("leader_id", currentUserId).maybeSingle();
        resourceId = data?.id;
      } else if (type === "team") {
        const { data } = await supabase.from("teams").select("id").eq("leader_id", currentUserId).maybeSingle();
        resourceId = data?.id;
      }
      await supabase.from("notifications").insert({
        user_id: target.id,
        sender_id: currentUserId,
        type: `${type}_invite`,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Invitation`,
        message: `You have been invited to join a ${type}`,
        metadata: resourceId ? { resource_id: resourceId } : {},
      });
    } catch (_) {}
    setInviting("");
  };

  const actions = [
    { icon: MessageSquare, label: "Send DM",               action: () => { onSendDM(target); onClose(); }, accent: "var(--cp-mint)"   },
    isFriend
      ? { icon: UserMinus, label: "Remove Friend",          action: () => { onFriendAction("remove", target); onClose(); }, accent: "#ef4444" }
      : { icon: UserPlus,  label: "Add Friend",             action: () => { onFriendAction("add",    target); onClose(); }, accent: "var(--cp-mint)" },
    { icon: Shield,        label: "Invite to Clan",         action: () => sendInvite("clan"),       accent: "var(--cp-accent)" },
    { icon: Users2,        label: "Invite to Team",         action: () => sendInvite("team"),       accent: "var(--cp-gold)"   },
    { icon: Trophy,        label: "Invite to Tournament",   action: () => sendInvite("tournament"), accent: "var(--cp-gold)"   },
    { icon: Flag,          label: "Block / Report",         action: () => { onFriendAction("block", target); onClose(); }, accent: "#ef4444" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.93, y: -6 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="absolute right-full mr-2 top-0 w-52 rounded-2xl overflow-hidden z-50 border"
      style={{
        background: "var(--cp-surface-4)",
        borderColor: "var(--cp-border-hover)",
        boxShadow: "0 20px 50px rgba(0,0,0,.65)",
      }}
    >
      {/* Header */}
      <div className="p-3.5 border-b" style={{ borderColor: "var(--cp-border)" }}>
        <div className="flex items-center gap-2.5 mb-2.5">
          <Avatar name={target.username} url={target.avatar_url} size={38} color={targetColor} status={target.status} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--cp-text-1)" }}>
              {target.username}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <StatusIcon size={9} style={{ color: STATUS_DOT_COLOR[target.status] ?? "var(--cp-text-4)" }} />
              <span className="text-[10px]" style={{ color: "var(--cp-text-4)" }}>{statusInfo.label}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {roleBadge && <RoleBadge role={target.role} />}
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: "var(--cp-surface-2)", color: "var(--cp-text-4)", border: "1px solid var(--cp-border)" }}
          >
            Lv {target.level || 1}
          </span>
        </div>
      </div>

      {/* View profile link */}
      <Link
        to={`/profile/${target.id}`}
        onClick={onClose}
        className="flex items-center gap-2 px-3.5 py-2.5 transition-colors hover:bg-white/5"
        style={{ color: "var(--cp-text-3)" }}
      >
        <ChevronRight size={12} />
        <span className="text-xs font-medium">View Profile</span>
      </Link>

      {/* Actions */}
      <div className="border-t py-1" style={{ borderColor: "var(--cp-border)" }}>
        {actions.map(({ icon: Icon, label, action, accent }) => (
          <button
            key={label}
            onClick={action}
            disabled={!!inviting}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 transition-colors hover:bg-white/5 disabled:opacity-50 text-left"
          >
            {inviting === label.toLowerCase().split(" ").pop() ? (
              <Loader2 size={12} className="animate-spin flex-shrink-0" style={{ color: accent }} />
            ) : (
              <Icon size={12} className="flex-shrink-0" style={{ color: accent }} />
            )}
            <span className="text-xs" style={{ color: "var(--cp-text-2)" }}>{label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── User Row (online panel) ──────────────────────────────────────────────────
function UserRow({ user, selected, setSelected, onSendDM, onFriendAction, friends, currentUser, selectedRef }) {
  const color      = colorFromId(user.id);
  const isSelected = selected?.id === user.id;

  return (
    <div className="relative" ref={isSelected ? selectedRef : null}>
      <button
        onClick={() => setSelected(isSelected ? null : user)}
        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors text-left group hover:bg-white/5"
      >
        <Avatar name={user.username} url={user.avatar_url} size={30} color={color} status={user.status} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate transition-colors group-hover:text-white" style={{ color: "var(--cp-text-2)" }}>
            {user.username}
          </p>
          {user.role && ROLE_BADGES[user.role] ? (
            <RoleBadge role={user.role} />
          ) : (
            <span className="text-[10px]" style={{ color: "var(--cp-text-4)" }}>Lv {user.level || 1}</span>
          )}
        </div>
      </button>

      <AnimatePresence>
        {isSelected && (
          <MiniProfileCard
            user={user}
            currentUserId={currentUser?.id}
            friends={friends}
            onClose={() => setSelected(null)}
            onSendDM={onSendDM}
            onFriendAction={onFriendAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Online Panel (shared between desktop sidebar + mobile drawer) ────────────
function OnlinePanelContent({ currentUser, friends, onFriendAction, onSendDM }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null);
  const selectedRef = useRef(null);

  const fetchOnline = useCallback(async () => {
    const { data: presenceData } = await supabase
      .from("user_presence")
      .select("user_id, status, last_seen")
      .neq("status", "offline")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (!presenceData) { setLoading(false); return; }

    const userIds = presenceData.map((r) => r.user_id).filter(Boolean);
    const { data: profileData } = userIds.length
      ? await supabase.from("profiles").select("id, username, avatar_url, role, level").in("id", userIds)
      : { data: [] };

    const profileMap = Object.fromEntries((profileData || []).map((p) => [p.id, p]));

    const friendIds  = new Set(friends.map((f) => f.friend_id));
    const STAFF      = new Set(["super_admin","admin","founder","designer"]);

    const enriched = presenceData
      .filter((r) => profileMap[r.user_id] && r.user_id !== currentUser?.id)
      .map((r) => ({
        ...profileMap[r.user_id],
        status:    r.status,
        last_seen: r.last_seen,
        _isFriend: friendIds.has(profileMap[r.user_id]?.id),
        _isStaff:  STAFF.has(profileMap[r.user_id]?.role),
      }))
      .sort((a, b) => {
        const score = (u) => (u._isFriend ? 3 : u._isStaff ? 2 : 1);
        return score(b) - score(a);
      });

    setOnlineUsers(enriched);
    setLoading(false);
  }, [currentUser?.id, friends]);

  useEffect(() => { fetchOnline(); }, [fetchOnline]);

  useEffect(() => {
    const ch = supabase
      .channel("presence-panel")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, fetchOnline)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchOnline]);

  useEffect(() => {
    const handler = (e) => {
      if (selectedRef.current && !selectedRef.current.contains(e.target)) setSelected(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const friendUsers = onlineUsers.filter((u) => u._isFriend);
  const otherUsers  = onlineUsers.filter((u) => !u._isFriend);
  const rowProps    = { selected, setSelected, onSendDM, onFriendAction, friends, currentUser, selectedRef };

  return (
    <>
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-3 py-3 flex-shrink-0 border-b"
        style={{ borderColor: "var(--cp-border)" }}
      >
        <div className="flex items-center gap-2">
          <Users size={13} style={{ color: "var(--cp-mint)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--cp-text-2)" }}>Online</span>
        </div>
        {!loading && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{ background: "var(--cp-mint-dim)", color: "var(--cp-mint)", border: "1px solid rgba(16,185,129,.2)" }}
          >
            {onlineUsers.length}
          </span>
        )}
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {loading && (
          <div className="space-y-2 px-1 pt-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 animate-pulse">
                <div className="w-7 h-7 rounded-lg cp-skeleton flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2 rounded cp-skeleton w-3/4" />
                  <div className="h-1.5 rounded cp-skeleton w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && onlineUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 pt-10 opacity-40">
            <Users size={20} style={{ color: "var(--cp-text-4)" }} />
            <p className="text-xs" style={{ color: "var(--cp-text-4)" }}>Nobody online</p>
          </div>
        )}

        {!loading && friendUsers.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider px-2 pb-1.5 pt-0.5" style={{ color: "var(--cp-text-4)" }}>
              Friends — {friendUsers.length}
            </p>
            {friendUsers.map((u) => <UserRow key={u.id} user={u} {...rowProps} />)}
          </div>
        )}

        {!loading && otherUsers.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider px-2 pb-1.5 pt-0.5" style={{ color: "var(--cp-text-4)" }}>
              Players — {otherUsers.length}
            </p>
            {otherUsers.map((u) => <UserRow key={u.id} user={u} {...rowProps} />)}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Mobile Online Drawer ─────────────────────────────────────────────────────
function MobileOnlineDrawer({ open, onClose, currentUser, friends, onFriendAction, onSendDM }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 w-60 z-[101] flex flex-col border-l"
            style={{ background: "var(--cp-surface-1)", borderColor: "var(--cp-border)" }}
          >
            {/* Close header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: "var(--cp-border)" }}>
              <span className="text-xs font-semibold" style={{ color: "var(--cp-text-2)" }}>Online Now</span>
              <button
                onClick={onClose}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: "var(--cp-text-3)" }}
              >
                <X size={13} />
              </button>
            </div>
            {/* Reuse panel content — extract the shared logic */}
            <OnlinePanelContent
              currentUser={currentUser}
              friends={friends}
              onFriendAction={onFriendAction}
              onSendDM={onSendDM}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GlobalChat() {
  const { profile }                                           = useOutletContext() || {};
  const { user }                                              = useAuth();
  const { friends, sendFriendRequest, removeFriend, blockUser } = useFriends();
  usePresence();

  const [messages,      setMessages]      = useState([]);
  const [newMsg,        setNewMsg]        = useState("");
  const [loading,       setLoading]       = useState(true);
  const [showEmoji,     setShowEmoji]     = useState(false);
  const [sending,       setSending]       = useState(false);
  const [replyTo,       setReplyTo]       = useState(null);
  const [dmTarget,      setDmTarget]      = useState(null);
  const [mobileOnline,  setMobileOnline]  = useState(false);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("globalchat_v4")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, async (p) => {
        const msg = p.new;
        if (!msg?.id) return;
        const { data: sp } = await supabase
          .from("profiles").select("id,username,avatar_url,role").eq("id", msg.sender_id).maybeSingle();
        setMessages((prev) => [...prev, { ...msg, sender: sp || null }]);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const load = async () => {
    setLoading(true);
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("id,sender_id,content,created_at")
      .order("created_at", { ascending: true })
      .limit(120);
    if (!msgs?.length) { setMessages([]); setLoading(false); return; }
    const ids = [...new Set(msgs.map((m) => m.sender_id).filter(Boolean))];
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id,username,avatar_url,role").in("id", ids)
      : { data: [] };
    const pm = Object.fromEntries((profs || []).map((p) => [p.id, p]));
    setMessages(msgs.map((m) => ({ ...m, sender: pm[m.sender_id] || null })));
    setLoading(false);
  };

  const send = async (e) => {
    e?.preventDefault();
    const txt = newMsg.trim();
    if (!txt || !profile?.id || sending) return;
    setSending(true);
    setNewMsg("");
    setReplyTo(null);
    try { await supabase.from("chat_messages").insert({ sender_id: profile.id, content: txt }); } catch (_) {}
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const addEmoji = (em) => { setNewMsg((p) => p + em); setShowEmoji(false); inputRef.current?.focus(); };

  const handleFriendAction = useCallback(async (action, target) => {
    if (action === "add")    await sendFriendRequest(target.id).catch(() => {});
    if (action === "remove") await removeFriend(target.id).catch(() => {});
    if (action === "block")  await blockUser(target.id).catch(() => {});
  }, [sendFriendRequest, removeFriend, blockUser]);

  // Group messages by day + burst
  const grouped = [];
  let lastDay = null, lastSender = null, lastTime = 0;
  messages.forEach((m) => {
    const k = dayKey(m.created_at);
    if (k !== lastDay) {
      grouped.push({ type: "day", id: `d-${k}`, label: daySeparator(m.created_at) });
      lastDay = k; lastSender = null;
    }
    const t    = new Date(m.created_at).getTime();
    const burst = lastSender === m.sender_id && t - lastTime < 3 * 60 * 1000;
    grouped.push({ type: "msg", data: m, grouped: burst });
    lastSender = m.sender_id;
    lastTime   = t;
  });

  const canSend = newMsg.trim().length > 0 && !sending;

  return (
    <>
      {/* ── Chat shell ─────────────────────────────────────────────────────── */}
      <div
        className="h-full flex overflow-hidden"
        style={{ background: "var(--cp-surface-1)" }}
        data-testid="global-chat"
      >

        {/* ── Main chat column ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Channel header */}
          <div
            className="flex items-center gap-3 px-4 h-14 flex-shrink-0 border-b"
            style={{
              background: "var(--cp-surface-1)",
              borderColor: "var(--cp-border)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Channel icon */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--cp-accent-dim)", border: "1px solid var(--cp-accent-border)" }}
            >
              <Hash size={14} style={{ color: "var(--cp-accent)" }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: "var(--cp-text-1)" }}>global-chat</span>
                <span
                  className="hidden sm:inline text-[11px] px-1.5 py-0.5 rounded-md"
                  style={{ background: "var(--cp-surface-3)", color: "var(--cp-text-4)", border: "1px solid var(--cp-border)" }}
                >
                  {messages.length} messages
                </span>
              </div>
              <p className="text-[11px] hidden sm:block" style={{ color: "var(--cp-text-4)" }}>
                CipherPool community — Free Fire esports
              </p>
            </div>

            {/* Mobile: show online panel */}
            <button
              onClick={() => setMobileOnline(true)}
              className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: "var(--cp-text-3)", border: "1px solid var(--cp-border)" }}
            >
              <Users size={13} />
              <span className="text-xs">Online</span>
            </button>

            <button
              aria-label="Options"
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5 flex-shrink-0"
              style={{ color: "var(--cp-text-3)" }}
            >
              <MoreVertical size={16} />
            </button>
          </div>

          {/* Message list */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(124,58,237,.2) transparent" }}
          >
            <div className="px-4 py-3">

              {/* Loading skeleton */}
              {loading && (
                <div className="flex flex-col gap-4 pt-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl cp-skeleton flex-shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-2.5 rounded cp-skeleton w-32" />
                        <div className="h-2 rounded cp-skeleton w-3/4" />
                        <div className="h-2 rounded cp-skeleton w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!loading && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 opacity-50">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--cp-surface-2)" }}>
                    <MessageSquare size={22} style={{ color: "var(--cp-text-4)" }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--cp-text-4)" }}>No messages yet. Start the conversation!</p>
                </div>
              )}

              {/* Message groups */}
              {grouped.map((item) => {
                if (item.type === "day") {
                  return (
                    <div key={item.id} className="flex items-center gap-3 my-5">
                      <div className="flex-1 h-px" style={{ background: "var(--cp-border)" }} />
                      <span
                        className="text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
                        style={{
                          background: "var(--cp-surface-2)",
                          color: "var(--cp-text-4)",
                          border: "1px solid var(--cp-border)",
                        }}
                      >
                        {item.label}
                      </span>
                      <div className="flex-1 h-px" style={{ background: "var(--cp-border)" }} />
                    </div>
                  );
                }

                const m           = item.data;
                const isMe        = m.sender_id === profile?.id;
                const sender      = m.sender || {};
                const senderName  = sender.username || "Player";
                const senderColor = colorFromId(sender.id || m.sender_id || "");
                const isBurst     = item.grouped;

                return (
                  <div
                    key={m.id}
                    className={`group flex ${isMe ? "flex-row-reverse" : "flex-row"} items-start gap-2.5 ${isBurst ? "mt-0.5" : "mt-4"}`}
                  >
                    {/* Avatar — only show on first of burst */}
                    <div className={`flex-shrink-0 ${isMe ? "hidden" : ""}`} style={{ width: 34 }}>
                      {!isBurst ? (
                        <Avatar name={senderName} url={sender.avatar_url} size={34} color={senderColor} />
                      ) : null}
                    </div>

                    {/* Content */}
                    <div
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"} min-w-0`}
                      style={{ maxWidth: "min(72%, 560px)" }}
                    >
                      {/* Username + timestamp row (hidden for burst) */}
                      {!isBurst && !isMe && (
                        <div className="flex items-center gap-2 mb-1 ml-1">
                          <span className="text-sm font-semibold" style={{ color: senderColor }}>
                            {senderName}
                          </span>
                          {sender.role && <RoleBadge role={sender.role} />}
                          <span className="text-[10px]" style={{ color: "var(--cp-text-4)" }}>
                            {timeShort(m.created_at)}
                          </span>
                        </div>
                      )}

                      {/* Reply quote */}
                      {m.reply_to_preview && (
                        <div
                          className="text-xs px-2.5 py-1.5 rounded-xl mb-1 max-w-full overflow-hidden"
                          style={{
                            background: "var(--cp-surface-3)",
                            borderLeft: `2px solid ${isMe ? "var(--cp-accent)" : senderColor}`,
                            color: "var(--cp-text-3)",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                          }}
                        >
                          ↪ {m.reply_to_preview}
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className="relative text-sm px-3.5 py-2 cursor-pointer"
                        style={{
                          background: isMe ? "var(--cp-accent-dim)" : "var(--cp-surface-2)",
                          border: `1px solid ${isMe ? "var(--cp-accent-border)" : "var(--cp-border)"}`,
                          color: "var(--cp-text-1)",
                          borderRadius: isMe
                            ? (isBurst ? "18px 6px 6px 18px" : "18px 6px 18px 18px")
                            : (isBurst ? "6px 18px 18px 6px" : "6px 18px 18px 18px"),
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                        }}
                        onDoubleClick={() => setReplyTo({ id: m.id, content: m.content, sender: senderName })}
                      >
                        {m.content}
                        {isMe && (
                          <span className="inline-flex items-center gap-0.5 ml-2 opacity-50" style={{ verticalAlign: "middle" }}>
                            <span className="text-[10px]">{timeShort(m.created_at)}</span>
                            <CheckCheck size={10} />
                          </span>
                        )}
                      </div>

                      {/* Reply hint — visible on hover for others' messages */}
                      {!isMe && (
                        <button
                          onClick={() => setReplyTo({ id: m.id, content: m.content, sender: senderName })}
                          className="flex items-center gap-1 mt-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                          style={{ color: "var(--cp-text-4)" }}
                        >
                          <Reply size={10} />
                          Reply
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Reply banner */}
          <AnimatePresence>
            {replyTo && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="flex items-center gap-2.5 px-4 py-2.5 flex-shrink-0 border-t"
                style={{
                  background: "var(--cp-accent-dim)",
                  borderColor: "var(--cp-accent-border)",
                }}
              >
                <Reply size={13} style={{ color: "var(--cp-accent)", flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--cp-accent)" }}>
                    Replying to {replyTo.sender}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--cp-text-3)" }}>{replyTo.content}</p>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 flex-shrink-0"
                  style={{ color: "var(--cp-text-4)" }}
                >
                  <X size={12} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Composer */}
          <div
            className="flex-shrink-0 px-4 py-3 border-t"
            style={{
              background: "var(--cp-surface-1)",
              borderColor: "var(--cp-border)",
              paddingBottom: "max(12px, env(safe-area-inset-bottom))",
            }}
          >
            {/* Emoji picker */}
            <div className="relative">
              <AnimatePresence>
                {showEmoji && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.14 }}
                    className="absolute bottom-full left-0 mb-2 rounded-2xl p-3 border z-10"
                    style={{
                      background: "var(--cp-surface-4)",
                      borderColor: "var(--cp-border-hover)",
                      boxShadow: "0 -8px 32px rgba(0,0,0,.4)",
                      display: "grid",
                      gridTemplateColumns: "repeat(8,1fr)",
                      gap: 4,
                    }}
                  >
                    {EMOJIS.map((em) => (
                      <button
                        key={em}
                        onClick={() => addEmoji(em)}
                        className="text-xl p-1.5 rounded-lg transition-colors hover:bg-white/8 leading-none"
                      >
                        {em}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input row */}
              <div
                className="flex items-end gap-2 rounded-2xl px-3 py-2"
                style={{
                  background: "var(--cp-surface-2)",
                  border: "1px solid var(--cp-border)",
                }}
              >
                {/* Emoji button */}
                <button
                  type="button"
                  onClick={() => setShowEmoji((o) => !o)}
                  className="flex-shrink-0 mb-1 transition-colors"
                  style={{ color: showEmoji ? "var(--cp-accent)" : "var(--cp-text-4)" }}
                  aria-label="Emoji"
                >
                  <Smile size={19} />
                </button>

                {/* Textarea */}
                <textarea
                  ref={inputRef}
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Message #global-chat…"
                  rows={1}
                  className="flex-1 resize-none outline-none border-none bg-transparent text-sm"
                  style={{
                    color: "var(--cp-text-1)",
                    maxHeight: 96,
                    lineHeight: 1.5,
                    paddingTop: 4,
                    paddingBottom: 4,
                    fontFamily: "inherit",
                  }}
                />

                {/* Send button */}
                <motion.button
                  type="button"
                  onClick={send}
                  whileTap={{ scale: 0.92 }}
                  disabled={!canSend}
                  className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all mb-0.5"
                  style={{
                    background: canSend ? "var(--cp-accent)" : "var(--cp-surface-3)",
                    color: canSend ? "#fff" : "var(--cp-text-4)",
                    border: `1px solid ${canSend ? "var(--cp-accent-border)" : "var(--cp-border)"}`,
                    boxShadow: canSend ? "0 2px 12px var(--cp-accent-glow)" : "none",
                  }}
                >
                  {sending
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Send size={13} />
                  }
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Online panel (desktop) ──────────────────────────────────────── */}
        <div
          className="hidden lg:flex flex-col flex-shrink-0 border-l w-60"
          style={{
            background: "var(--cp-surface-1)",
            borderColor: "var(--cp-border)",
          }}
        >
          <OnlinePanelContent
            currentUser={profile}
            friends={friends}
            onFriendAction={handleFriendAction}
            onSendDM={setDmTarget}
          />
        </div>
      </div>

      {/* Mobile online drawer */}
      <MobileOnlineDrawer
        open={mobileOnline}
        onClose={() => setMobileOnline(false)}
        currentUser={profile}
        friends={friends}
        onFriendAction={handleFriendAction}
        onSendDM={(u) => { setDmTarget(u); setMobileOnline(false); }}
      />

      {/* DM Modal */}
      {dmTarget && (
        <DMModal
          targetUser={dmTarget}
          currentUser={profile}
          onClose={() => setDmTarget(null)}
        />
      )}
    </>
  );
}
