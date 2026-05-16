import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Smile, Reply, CheckCheck, MoreVertical,
  Users, X, UserPlus, UserMinus, MessageSquare,
  Shield, Users2, Trophy, Flag, ChevronRight,
  Loader2, Circle, Clock, Gamepad2, Swords, Radio,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePresence, statusColor } from "../social/hooks/usePresence";
import { useFriends } from "../social/hooks/useFriends";

// ─── constants ───────────────────────────────────────────────────
const EMOJIS = ["👍","🔥","💪","🏆","😂","❤️","👏","🎮","⚡","💀","🎯","✨","💯","🚀","🎉","😎"];
const ROLE_BADGES = {
  super_admin: { label: "SUPER",   color: "#ef4444", bg: "rgba(239,68,68,.15)"  },
  founder:     { label: "FOUNDER", color: "#a855f7", bg: "rgba(168,85,247,.15)" },
  fondateur:   { label: "FOUNDER", color: "#a855f7", bg: "rgba(168,85,247,.15)" },
  admin:       { label: "ADMIN",   color: "#f97316", bg: "rgba(249,115,22,.15)" },
  designer:    { label: "DESIGN",  color: "#10b981", bg: "rgba(16,185,129,.15)" },
};
const STATUS_ICONS = {
  online:        { icon: Circle,   label: "Online",        class: "text-emerald-400" },
  away:          { icon: Clock,    label: "Away",          class: "text-yellow-400"  },
  in_game:       { icon: Gamepad2, label: "In Game",       class: "text-mint"        },
  in_tournament: { icon: Swords,   label: "In Tournament", class: "text-electric-purple" },
  streaming:     { icon: Radio,    label: "Streaming",     class: "text-red-500"     },
  offline:       { icon: Circle,   label: "Offline",       class: "text-slate-600"   },
};
const USER_COLORS = ["#06b6d4","#a855f7","#10b981","#f59e0b","#ec4899","#14b8a6","#8b5cf6","#22d3ee"];

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
  const x   = new Date(d);
  const today = new Date(); today.setHours(0,0,0,0);
  const yest  = new Date(today); yest.setDate(yest.getDate() - 1);
  const dd    = new Date(x); dd.setHours(0,0,0,0);
  if (+dd === +today) return "Aujourd'hui";
  if (+dd === +yest)  return "Hier";
  return x.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function timeShort(d) {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Avatar ──────────────────────────────────────────────────────
function Avatar({ name, url, size = 36, color, status }) {
  const dotSize = Math.max(8, size * 0.22);
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: size,
        background: url ? "transparent" : `linear-gradient(135deg,${color},${color}aa)`,
        overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.36, fontWeight: 800, color: "#fff",
        boxShadow: `0 2px 12px ${color}30`,
      }}>
        {url
          ? <img src={url} alt="" onError={(e) => { e.target.style.display="none"; }} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          : initialsFrom(name)}
      </div>
      {status && status !== "offline" && (
        <div style={{
          position: "absolute", bottom: -1, right: -1,
          width: dotSize, height: dotSize, borderRadius: dotSize,
          border: "2px solid #080820",
          background: {
            online: "#10b981", away: "#f59e0b", in_game: "#10b981",
            in_tournament: "#8b5cf6", streaming: "#ef4444",
          }[status] ?? "#475569",
        }} />
      )}
    </div>
  );
}

// ─── DM Modal ────────────────────────────────────────────────────
function DMModal({ targetUser, currentUser, onClose }) {
  const [convId, setConvId]   = useState(null);
  const [messages, setMsgs]   = useState([]);
  const [text, setText]       = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: cId } = await supabase.rpc("get_or_create_conversation", {
        other_user_id: targetUser.id,
      });
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
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "direct_messages",
        filter: `conversation_id=eq.${convId}`,
      }, (p) => setMsgs((prev) => [...prev, p.new]))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMsg = async (e) => {
    e?.preventDefault();
    const content = text.trim();
    if (!content || !convId || sending) return;
    setSending(true);
    setText("");
    await supabase.from("direct_messages").insert({
      conversation_id: convId,
      sender_id: currentUser.id,
      content,
    });
    setSending(false);
  };

  const targetColor = colorFromId(targetUser.id);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="w-full sm:max-w-sm rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden border border-white/10"
          style={{ background: "#080820", height: "60vh", display: "flex", flexDirection: "column" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0">
            <Avatar name={targetUser.username} url={targetUser.avatar_url} size={36} color={targetColor} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-black uppercase tracking-widest truncate">{targetUser.username}</p>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Private Message</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1" style={{ scrollbarWidth: "thin" }}>
            {loading && <div className="flex justify-center pt-8"><Loader2 size={20} className="animate-spin text-electric-purple" /></div>}
            {!loading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                <MessageSquare size={32} className="text-slate-600" />
                <p className="text-slate-500 text-xs font-bold">Start the conversation</p>
              </div>
            )}
            {messages.map((m) => {
              const isMe = m.sender_id === currentUser.id;
              return (
                <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[75%]">
                    <div
                      className="px-3 py-2 rounded-2xl text-sm text-white"
                      style={{
                        background: isMe ? "linear-gradient(135deg,#7c3aed,#9333ea)" : "rgba(255,255,255,.06)",
                        border: isMe ? "1px solid rgba(168,85,247,.4)" : "1px solid rgba(255,255,255,.06)",
                        wordBreak: "break-word",
                      }}
                    >
                      {m.content}
                    </div>
                    <p className="text-[9px] text-slate-600 font-bold mt-0.5 px-1 text-right">{timeShort(m.created_at)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <form onSubmit={sendMsg} className="flex items-center gap-2 px-3 py-3 border-t border-white/5 flex-shrink-0">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Message ${targetUser.username}...`}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-electric-purple/40"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="w-9 h-9 rounded-2xl bg-electric-purple flex items-center justify-center text-white disabled:opacity-40 hover:shadow-neon-mint transition-all"
            >
              <Send size={14} />
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Mini Profile Card ────────────────────────────────────────────
function MiniProfileCard({ user: target, currentUserId, friends, onClose, onSendDM, onFriendAction, rect }) {
  const [loading, setLoading]   = useState(false);
  const [inviting, setInviting] = useState("");
  const isFriend = friends.some((f) => f.friend_id === target.id);
  const targetColor = colorFromId(target.id);
  const roleBadge = ROLE_BADGES[target.role];
  const statusInfo = STATUS_ICONS[target.status] ?? STATUS_ICONS.offline;

  const sendInvite = async (type) => {
    setInviting(type);
    try {
      // Fetch latest active item of the requested type
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
    { icon: MessageSquare, label: "Send Private Message", action: () => { onSendDM(target); onClose(); }, color: "text-mint" },
    isFriend
      ? { icon: UserMinus, label: "Remove Friend",     action: () => { onFriendAction("remove", target); onClose(); }, color: "text-red-400" }
      : { icon: UserPlus,  label: "Add Friend",        action: () => { onFriendAction("add",    target); onClose(); }, color: "text-mint" },
    { icon: Shield,       label: "Invite to Clan",      action: () => sendInvite("clan"),       color: "text-electric-purple" },
    { icon: Users2,       label: "Invite to Team",      action: () => sendInvite("team"),       color: "text-cyber-gold" },
    { icon: Trophy,       label: "Invite to Tournament",action: () => sendInvite("tournament"), color: "text-cyber-gold" },
    { icon: Flag,         label: "Block / Report",      action: () => { onFriendAction("block", target); onClose(); }, color: "text-red-400" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -8 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="absolute right-full mr-2 top-0 w-56 bg-obsidian-deep border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
      style={{ boxShadow: "0 20px 60px rgba(0,0,0,.7)" }}
    >
      {/* User info */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={target.username} url={target.avatar_url} size={40} color={targetColor} status={target.status} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-black uppercase tracking-widest truncate">{target.username}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <statusInfo.icon size={9} className={statusInfo.class} />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{statusInfo.label}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {roleBadge && (
            <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
              style={{ background: roleBadge.bg, color: roleBadge.color, border: `1px solid ${roleBadge.color}33` }}>
              {roleBadge.label}
            </span>
          )}
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/5">
            Lv {target.level || 1}
          </span>
        </div>
      </div>

      {/* View Profile */}
      <Link to={`/profile/${target.id}`} onClick={onClose}
        className="flex items-center gap-2.5 px-4 py-2.5 text-slate-300 hover:bg-white/5 hover:text-white transition-all">
        <ChevronRight size={13} />
        <span className="text-[10px] font-black uppercase tracking-widest">View Profile</span>
      </Link>

      <div className="border-t border-white/5 py-1">
        {actions.map(({ icon: Icon, label, action, color }) => (
          <button
            key={label}
            onClick={action}
            disabled={!!inviting}
            className={`w-full flex items-center gap-2.5 px-4 py-2 hover:bg-white/5 transition-all disabled:opacity-50 ${color}`}
          >
            {inviting === label.toLowerCase().split(" ").slice(-1)[0] ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Icon size={13} />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white">{label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Online Panel ─────────────────────────────────────────────────
function OnlinePanel({ currentUser, friends, onFriendAction, onSendDM }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const selectedRef = useRef(null);

  const fetchOnline = useCallback(async () => {
    // Fetch users who are not offline, joined with profiles
    const { data } = await supabase
      .from("user_presence")
      .select("user_id, status, last_seen, profiles:profiles!user_presence_user_id_fkey(id,username,avatar_url,role,level)")
      .neq("status", "offline")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (!data) { setLoading(false); return; }

    const friendIds = new Set(friends.map((f) => f.friend_id));
    const STAFF_ROLES = new Set(["super_admin","admin","founder","fondateur","designer"]);

    const enriched = data
      .filter((r) => r.profiles && r.user_id !== currentUser?.id)
      .map((r) => ({
        ...r.profiles,
        status: r.status,
        last_seen: r.last_seen,
        _isFriend: friendIds.has(r.profiles.id),
        _isStaff: STAFF_ROLES.has(r.profiles.role),
      }))
      .sort((a, b) => {
        const score = (u) =>
          u._isFriend ? 3 : u._isStaff ? 2 : 1;
        return score(b) - score(a);
      });

    setOnlineUsers(enriched);
    setLoading(false);
  }, [currentUser?.id, friends]);

  useEffect(() => { fetchOnline(); }, [fetchOnline]);

  // Realtime presence updates
  useEffect(() => {
    const ch = supabase
      .channel("presence-panel")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, fetchOnline)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchOnline]);

  // Close card on outside click
  useEffect(() => {
    const handler = (e) => {
      if (selectedRef.current && !selectedRef.current.contains(e.target)) {
        setSelected(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      className="hidden lg:flex flex-col flex-shrink-0 border-l border-white/5"
      style={{ width: 240, background: "rgba(8,8,28,0.97)" }}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-mint" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Online Now</span>
        </div>
        <div className="px-2 py-0.5 rounded-md bg-mint/10 border border-mint/20">
          <span className="text-[9px] font-black text-mint">{onlineUsers.length}</span>
        </div>
      </div>

      {/* Users list */}
      <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(124,58,237,.2) transparent" }}>
        {loading && (
          <div className="space-y-2 px-3 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-white/5" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2 rounded bg-white/5 w-3/4" />
                  <div className="h-1.5 rounded bg-white/5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && onlineUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-40">
            <Users size={24} className="text-slate-600" />
            <p className="text-slate-600 text-[9px] font-black uppercase tracking-widest">No one online</p>
          </div>
        )}

        {/* Friends section */}
        {!loading && onlineUsers.some((u) => u._isFriend) && (
          <div className="px-3 py-1.5">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Friends</p>
            {onlineUsers.filter((u) => u._isFriend).map((u) => (
              <UserRow key={u.id} user={u} selected={selected} setSelected={setSelected} onSendDM={onSendDM} onFriendAction={onFriendAction} friends={friends} currentUser={currentUser} selectedRef={selectedRef} />
            ))}
          </div>
        )}

        {/* Others section */}
        {!loading && onlineUsers.some((u) => !u._isFriend) && (
          <div className="px-3 py-1.5">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Players</p>
            {onlineUsers.filter((u) => !u._isFriend).map((u) => (
              <UserRow key={u.id} user={u} selected={selected} setSelected={setSelected} onSendDM={onSendDM} onFriendAction={onFriendAction} friends={friends} currentUser={currentUser} selectedRef={selectedRef} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({ user, selected, setSelected, onSendDM, onFriendAction, friends, currentUser, selectedRef }) {
  const color      = colorFromId(user.id);
  const roleBadge  = ROLE_BADGES[user.role];
  const isSelected = selected?.id === user.id;

  return (
    <div className="relative" ref={isSelected ? selectedRef : null}>
      <button
        onClick={() => setSelected(isSelected ? null : user)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-all text-left group"
      >
        <Avatar name={user.username} url={user.avatar_url} size={32} color={color} status={user.status} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-[10px] font-black uppercase tracking-widest truncate group-hover:text-mint transition-colors">
            {user.username}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            {roleBadge && (
              <span className="text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded"
                style={{ background: roleBadge.bg, color: roleBadge.color }}>
                {roleBadge.label}
              </span>
            )}
            <span className="text-[7px] font-bold text-slate-600 uppercase">Lv {user.level || 1}</span>
          </div>
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

// ─── Mobile Online Drawer ─────────────────────────────────────────
function MobileOnlineDrawer({ open, onClose, currentUser, friends, onFriendAction, onSendDM }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-64 z-[101] border-l border-white/10 flex flex-col"
            style={{ background: "#080820" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-mint" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Online Now</span>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
                <X size={14} />
              </button>
            </div>
            <OnlinePanel
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

// ─── Main Component ───────────────────────────────────────────────
export default function GlobalChat() {
  const { profile } = useOutletContext() || {};
  const { user }    = useAuth();
  const { friends, sendFriendRequest, removeFriend, blockUser } = useFriends();
  usePresence(); // heartbeat for own presence

  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [showEmoji, setShowEmoji]     = useState(false);
  const [sending, setSending]         = useState(false);
  const [replyTo, setReplyTo]         = useState(null);
  const [dmTarget, setDmTarget]       = useState(null);
  const [mobileOnline, setMobileOnline] = useState(false);
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

  // Group by day + burst
  const grouped = [];
  let lastDay = null, lastSender = null, lastTime = 0;
  messages.forEach((m) => {
    const k = dayKey(m.created_at);
    if (k !== lastDay) {
      grouped.push({ type: "day", id: `d-${k}`, label: daySeparator(m.created_at) });
      lastDay = k; lastSender = null;
    }
    const t = new Date(m.created_at).getTime();
    const burst = lastSender === m.sender_id && t - lastTime < 3 * 60 * 1000;
    grouped.push({ type: "msg", data: m, grouped: burst });
    lastSender = m.sender_id;
    lastTime   = t;
  });

  return (
    <>
      <div
        data-testid="global-chat"
        className="h-full flex flex-col md:flex-row bg-gradient-to-b from-[#080820] to-[#0a0a1f] rounded-3xl overflow-hidden border border-white/10"
      >
        <style>{`
          .cipher-chat-scroll::-webkit-scrollbar { width: 3px; }
          .cipher-chat-scroll::-webkit-scrollbar-thumb { background: rgba(124,58,237,.3); border-radius: 99px; }
          @keyframes pulseDot { 0%,100% { opacity:1 } 50% { opacity:.45 } }
          .bubble-in { animation: bubbleIn .22s cubic-bezier(.2,.9,.3,1.2); }
          @keyframes bubbleIn { from { opacity:0; transform: translateY(6px) scale(.97); } to { opacity:1; transform: none; } }
        `}</style>

        {/* ── CHAT COLUMN ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Header */}
          <div style={{
            flexShrink: 0, padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 12,
            background: "rgba(8,8,28,0.92)", backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            position: "sticky", top: 0, zIndex: 5,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: "linear-gradient(135deg,#7c3aed,#a855f7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 20px rgba(124,58,237,.3)",
              fontSize: 18, fontWeight: 900, color: "#fff",
            }}>#</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "#fff", letterSpacing: 0.2 }}>Chat Global</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", animation: "pulseDot 2s infinite" }} />
                <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,.5)", fontWeight: 600 }}>
                  {messages.length} messages
                </p>
              </div>
            </div>
            {/* Mobile: Online button */}
            <button
              onClick={() => setMobileOnline(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all"
            >
              <Users size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest">Online</span>
            </button>
            <button
              aria-label="Options"
              style={{
                width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.06)", color: "rgba(255,255,255,.6)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}
            >
              <MoreVertical size={18} />
            </button>
          </div>

          {/* Messages scroll */}
          <div
            ref={scrollRef}
            className="cipher-chat-scroll"
            style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 12px 12px", WebkitOverflowScrolling: "touch" }}
          >
            {loading && (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
                <div style={{ width: 28, height: 28, border: "2px solid rgba(168,85,247,.15)", borderTopColor: "#a855f7", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              </div>
            )}
            {!loading && messages.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 12, opacity: 0.5 }}>
                <div style={{ fontSize: 56 }}>💬</div>
                <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)", fontWeight: 600 }}>Pas encore de messages</p>
              </div>
            )}
            {grouped.map((item) => {
              if (item.type === "day") {
                return (
                  <div key={item.id} style={{ display: "flex", justifyContent: "center", margin: "16px 0 12px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", padding: "4px 12px", borderRadius: 99, background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.4)", border: "1px solid rgba(255,255,255,.05)" }}>{item.label}</span>
                  </div>
                );
              }
              const m = item.data;
              const isMe = m.sender_id === profile?.id;
              const sender = m.sender || {};
              const senderName  = sender.username || "Joueur";
              const senderColor = colorFromId(sender.id || m.sender_id || "");
              const roleBadge   = ROLE_BADGES[sender.role];
              const isBurst     = item.grouped;

              return (
                <div key={m.id} className="bubble-in" style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", gap: 8, margin: isBurst ? "1px 0" : "10px 0 1px", paddingRight: isMe ? 4 : 40, paddingLeft: isMe ? 40 : 4 }}>
                  {!isMe && (
                    <div style={{ width: 36, flexShrink: 0 }}>
                      {!isBurst && <Avatar name={senderName} url={sender.avatar_url} size={36} color={senderColor} />}
                    </div>
                  )}
                  <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                    {!isMe && !isBurst && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, paddingLeft: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: senderColor }}>{senderName}</span>
                        {roleBadge && <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.6, padding: "2px 6px", borderRadius: 4, background: roleBadge.bg, color: roleBadge.color, border: `1px solid ${roleBadge.color}33` }}>{roleBadge.label}</span>}
                      </div>
                    )}
                    {m.reply_to_preview && (
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", background: "rgba(255,255,255,.03)", borderLeft: `3px solid ${isMe ? "#a855f7" : senderColor}`, padding: "4px 8px", borderRadius: 6, marginBottom: 4, maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        ↪ {m.reply_to_preview}
                      </div>
                    )}
                    <div
                      onDoubleClick={() => setReplyTo({ id: m.id, content: m.content, sender: senderName })}
                      style={{ padding: "8px 13px", borderRadius: isMe ? (isBurst ? "18px 6px 6px 18px" : "18px 6px 18px 18px") : (isBurst ? "6px 18px 18px 6px" : "6px 18px 18px 18px"), background: isMe ? "linear-gradient(135deg,#7c3aed,#9333ea)" : "rgba(255,255,255,.06)", border: isMe ? "1px solid rgba(168,85,247,.4)" : "1px solid rgba(255,255,255,.06)", boxShadow: isMe ? "0 4px 14px rgba(124,58,237,.25)" : "none", wordBreak: "break-word", fontSize: 14, lineHeight: 1.45, color: "#fff" }}
                    >
                      {m.content}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 8, fontSize: 10, opacity: 0.55, verticalAlign: "baseline" }}>
                        {timeShort(m.created_at)}
                        {isMe && <CheckCheck size={11} style={{ marginLeft: 2 }} />}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Reply banner */}
          <AnimatePresence>
            {replyTo && (
              <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:12 }}
                style={{ flexShrink:0,padding:"8px 14px",display:"flex",alignItems:"center",gap:10,background:"rgba(168,85,247,.08)",borderTop:"1px solid rgba(168,85,247,.2)",borderBottom:"1px solid rgba(168,85,247,.2)" }}>
                <Reply size={14} style={{ color:"#a855f7",flexShrink:0 }} />
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ margin:0,fontSize:10,fontWeight:700,color:"#a855f7",letterSpacing:0.8 }}>RÉPONDRE À {replyTo.sender?.toUpperCase()}</p>
                  <p style={{ margin:0,fontSize:12,color:"rgba(255,255,255,.55)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{replyTo.content}</p>
                </div>
                <button onClick={() => setReplyTo(null)} style={{ background:"none",border:"none",color:"rgba(255,255,255,.4)",cursor:"pointer",padding:4 }}>✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Composer */}
          <div style={{ flexShrink:0,padding:"10px 12px max(10px,env(safe-area-inset-bottom)) 12px",background:"rgba(8,8,28,0.97)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,0.06)",position:"sticky",bottom:0,zIndex:5 }}>
            <AnimatePresence>
              {showEmoji && (
                <motion.div initial={{ opacity:0,y:8,scale:0.96 }} animate={{ opacity:1,y:0,scale:1 }} exit={{ opacity:0,y:8,scale:0.96 }}
                  style={{ position:"absolute",bottom:"calc(100% - 4px)",left:12,right:12,background:"#0d0d24",borderRadius:14,border:"1px solid rgba(255,255,255,.08)",padding:10,display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:4,boxShadow:"0 -8px 32px rgba(0,0,0,.5)" }}>
                  {EMOJIS.map((em) => (
                    <button key={em} onClick={() => addEmoji(em)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:22,padding:6,borderRadius:8,transition:"background .15s" }}
                      onMouseOver={(e) => e.currentTarget.style.background="rgba(255,255,255,.06)"}
                      onMouseOut={(e) => e.currentTarget.style.background="none"}
                    >{em}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <form onSubmit={send} style={{ display:"flex",alignItems:"flex-end",gap:8,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:22,padding:"6px 6px 6px 12px" }}>
              <button type="button" onClick={() => setShowEmoji((o) => !o)} aria-label="Emoji" style={{ background:"none",border:"none",cursor:"pointer",color:showEmoji?"#a855f7":"rgba(255,255,255,.4)",padding:6,flexShrink:0 }}>
                <Smile size={20} />
              </button>
              <textarea
                ref={inputRef}
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Écris un message…"
                rows={1}
                style={{ flex:1,resize:"none",outline:"none",border:"none",background:"transparent",color:"#fff",fontFamily:"inherit",fontSize:14,lineHeight:1.4,maxHeight:100,padding:"8px 0" }}
              />
              <motion.button type="submit" whileTap={{ scale:0.92 }} disabled={!newMsg.trim()||sending}
                style={{ width:40,height:40,borderRadius:20,flexShrink:0,border:"none",cursor:newMsg.trim()?"pointer":"default",background:newMsg.trim()?"linear-gradient(135deg,#7c3aed,#a855f7)":"rgba(255,255,255,.06)",color:newMsg.trim()?"#fff":"rgba(255,255,255,.25)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:newMsg.trim()?"0 4px 16px rgba(124,58,237,.4)":"none",transition:"all .2s" }}>
                <Send size={16} />
              </motion.button>
            </form>
          </div>
        </div>

        {/* ── ONLINE PANEL (desktop) ── */}
        <OnlinePanel
          currentUser={profile}
          friends={friends}
          onFriendAction={handleFriendAction}
          onSendDM={setDmTarget}
        />
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
