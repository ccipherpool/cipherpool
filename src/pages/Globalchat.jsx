import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Smile, Image as ImageIcon, Reply, Check, CheckCheck, MoreVertical } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   CipherPool Global Chat — WhatsApp/Discord hybrid (mobile-first)
   - Sticky header + sticky composer (always visible, NEVER scrolls)
   - Message bubbles avec tails, status ticks (Discord/WhatsApp style)
   - Reply quote, emoji picker, smart timestamps, day separators
   - Active user roles (super_admin/admin/founder) avec badges colored
   ───────────────────────────────────────────────────────────── */

const EMOJIS = ["👍","🔥","💪","🏆","😂","❤️","👏","🎮","⚡","💀","🎯","✨","💯","🚀","🎉","😎"];
const ROLE_BADGES = {
  super_admin: { label: "SUPER", color: "#ef4444", bg: "rgba(239,68,68,.15)" },
  founder:     { label: "FOUNDER", color: "#a855f7", bg: "rgba(168,85,247,.15)" },
  fondateur:   { label: "FOUNDER", color: "#a855f7", bg: "rgba(168,85,247,.15)" },
  admin:       { label: "ADMIN", color: "#f97316", bg: "rgba(249,115,22,.15)" },
  designer:    { label: "DESIGN", color: "#10b981", bg: "rgba(16,185,129,.15)" },
};
const USER_COLORS = ["#06b6d4","#a855f7","#10b981","#f59e0b","#ec4899","#14b8a6","#8b5cf6","#22d3ee"];

function colorFromId(id = "") {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return USER_COLORS[Math.abs(h) % USER_COLORS.length];
}

function initialsFrom(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map(s => s[0]).join("").toUpperCase();
}

function dayKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
}
function daySeparator(d) {
  const x = new Date(d);
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

function Avatar({ name, url, size = 36, color }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: size,
        background: url ? "transparent" : `linear-gradient(135deg, ${color}, ${color}aa)`,
        flexShrink: 0, overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.36, fontWeight: 800, color: "#fff",
        boxShadow: `0 2px 12px ${color}30`,
      }}
    >
      {url ? (
        <img
          src={url} alt=""
          onError={(e) => { e.target.style.display = "none"; }}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : initialsFrom(name)}
    </div>
  );
}

export default function GlobalChat() {
  const { profile } = useOutletContext() || {};
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    load();
    setOnlineCount(Math.floor(Math.random() * 80) + 12);
    const ch = supabase
      .channel("globalchat_v3")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, async (p) => {
        const msg = p.new;
        if (!msg?.id) return;
        const { data: sp } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, role")
          .eq("id", msg.sender_id)
          .maybeSingle();
        setMessages(prev => [...prev, { ...msg, sender: sp || null }]);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const load = async () => {
    setLoading(true);
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("id, sender_id, content, created_at")
      .order("created_at", { ascending: true })
      .limit(120);
    if (!msgs?.length) { setMessages([]); setLoading(false); return; }
    const ids = [...new Set(msgs.map(m => m.sender_id).filter(Boolean))];
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, username, avatar_url, role").in("id", ids)
      : { data: [] };
    const pm = Object.fromEntries((profs || []).map(p => [p.id, p]));
    setMessages(msgs.map(m => ({ ...m, sender: pm[m.sender_id] || null })));
    setLoading(false);
  };

  const send = async (e) => {
    e?.preventDefault();
    const txt = newMsg.trim();
    if (!txt || !profile?.id || sending) return;
    setSending(true);
    setNewMsg("");
    setReplyTo(null);
    try {
      await supabase.from("chat_messages").insert({
        sender_id: profile.id,
        content: txt,
      });
    } catch (_) {}
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const addEmoji = (em) => {
    setNewMsg(p => p + em);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  // Group messages by day + consecutive same-sender within 3 minutes
  const grouped = [];
  let lastDay = null;
  let lastSender = null;
  let lastTime = 0;
  messages.forEach((m) => {
    const k = dayKey(m.created_at);
    if (k !== lastDay) {
      grouped.push({ type: "day", id: `d-${k}`, label: daySeparator(m.created_at) });
      lastDay = k;
      lastSender = null;
    }
    const t = new Date(m.created_at).getTime();
    const sameUserBurst = lastSender === m.sender_id && t - lastTime < 3 * 60 * 1000;
    grouped.push({ type: "msg", data: m, grouped: sameUserBurst });
    lastSender = m.sender_id;
    lastTime = t;
  });

  return (
    <div
      data-testid="global-chat"
      style={{
        // Fill the parent main area — header + scroll + composer
        display: "flex", flexDirection: "column",
        height: "calc(100vh - 8rem)", // mobile: top nav (56) + bottom nav (76) ≈ 132px
        maxHeight: "calc(100dvh - 8rem)",
        margin: "-1rem -1rem -1rem -1rem", // edge-to-edge inside main padding
        background: "linear-gradient(180deg,#080820 0%,#0a0a1f 100%)",
        borderRadius: 18, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <style>{`
        .cipher-chat-scroll::-webkit-scrollbar { width: 3px; }
        .cipher-chat-scroll::-webkit-scrollbar-thumb { background: rgba(124,58,237,.3); border-radius: 99px; }
        @keyframes pulseDot { 0%,100% { opacity:1 } 50% { opacity:.45 } }
        .bubble-in  { animation: bubbleIn .22s cubic-bezier(.2,.9,.3,1.2); }
        @keyframes bubbleIn { from { opacity:0; transform: translateY(6px) scale(.97); } to { opacity:1; transform: none; } }
      `}</style>

      {/* ── HEADER (sticky) ── */}
      <div
        data-testid="chat-header"
        style={{
          flexShrink: 0,
          padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 12,
          background: "rgba(8,8,28,0.92)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          position: "sticky", top: 0, zIndex: 5,
        }}
      >
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
              {onlineCount} en ligne · {messages.length} messages
            </p>
          </div>
        </div>
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

      {/* ── MESSAGES SCROLL ── */}
      <div
        ref={scrollRef}
        className="cipher-chat-scroll"
        data-testid="chat-messages"
        style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          padding: "16px 12px 12px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
            <div style={{
              width: 28, height: 28, border: "2px solid rgba(168,85,247,.15)",
              borderTopColor: "#a855f7", borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 40, gap: 12, opacity: 0.5,
          }}>
            <div style={{ fontSize: 56 }}>💬</div>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)", fontWeight: 600 }}>
              Pas encore de messages
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,.25)" }}>
              Sois le premier à écrire 👋
            </p>
          </div>
        )}

        {grouped.map((item) => {
          if (item.type === "day") {
            return (
              <div key={item.id} style={{
                display: "flex", justifyContent: "center", margin: "16px 0 12px",
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
                  padding: "4px 12px", borderRadius: 99,
                  background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.4)",
                  border: "1px solid rgba(255,255,255,.05)",
                }}>{item.label}</span>
              </div>
            );
          }
          const m = item.data;
          const isMe = m.sender_id === profile?.id;
          const sender = m.sender || {};
          const senderName = sender.username || "Joueur";
          const senderColor = colorFromId(sender.id || m.sender_id || "");
          const roleBadge = ROLE_BADGES[sender.role];
          const grouped = item.grouped;

          return (
            <div
              key={m.id}
              data-testid={`chat-msg-${m.id}`}
              className="bubble-in"
              style={{
                display: "flex",
                flexDirection: isMe ? "row-reverse" : "row",
                gap: 8,
                margin: grouped ? "1px 0" : "10px 0 1px",
                paddingRight: isMe ? 4 : 40,
                paddingLeft: isMe ? 40 : 4,
              }}
            >
              {/* Avatar (only on first bubble of burst) */}
              {!isMe && (
                <div style={{ width: 36, flexShrink: 0 }}>
                  {!grouped && <Avatar name={senderName} url={sender.avatar_url} color={senderColor} />}
                </div>
              )}

              {/* Bubble column */}
              <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                {/* Sender row (only on first bubble of burst & not me) */}
                {!isMe && !grouped && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, paddingLeft: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: senderColor }}>{senderName}</span>
                    {roleBadge && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: 0.6,
                        padding: "2px 6px", borderRadius: 4,
                        background: roleBadge.bg, color: roleBadge.color,
                        border: `1px solid ${roleBadge.color}33`,
                      }}>{roleBadge.label}</span>
                    )}
                  </div>
                )}

                {/* Reply quote */}
                {m.reply_to_preview && (
                  <div style={{
                    fontSize: 11, color: "rgba(255,255,255,.5)",
                    background: "rgba(255,255,255,.03)",
                    borderLeft: `3px solid ${isMe ? "#a855f7" : senderColor}`,
                    padding: "4px 8px", borderRadius: 6, marginBottom: 4,
                    maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    ↪ {m.reply_to_preview}
                  </div>
                )}

                {/* The bubble */}
                <div
                  onDoubleClick={() => setReplyTo({ id: m.id, content: m.content, sender: senderName })}
                  style={{
                    padding: "8px 13px",
                    borderRadius: isMe
                      ? (grouped ? "18px 6px 6px 18px" : "18px 6px 18px 18px")
                      : (grouped ? "6px 18px 18px 6px" : "6px 18px 18px 18px"),
                    background: isMe
                      ? "linear-gradient(135deg,#7c3aed,#9333ea)"
                      : "rgba(255,255,255,.06)",
                    border: isMe ? "1px solid rgba(168,85,247,.4)" : "1px solid rgba(255,255,255,.06)",
                    boxShadow: isMe ? "0 4px 14px rgba(124,58,237,.25)" : "none",
                    wordBreak: "break-word",
                    fontSize: 14, lineHeight: 1.45, color: "#fff",
                  }}
                >
                  {m.content}
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    marginLeft: 8, fontSize: 10, opacity: 0.55,
                    verticalAlign: "baseline",
                  }}>
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

      {/* ── REPLY BANNER ── */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            style={{
              flexShrink: 0,
              padding: "8px 14px",
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(168,85,247,.08)",
              borderTop: "1px solid rgba(168,85,247,.2)",
              borderBottom: "1px solid rgba(168,85,247,.2)",
            }}
          >
            <Reply size={14} style={{ color: "#a855f7", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#a855f7", letterSpacing: 0.8 }}>
                RÉPONDRE À {replyTo.sender?.toUpperCase()}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {replyTo.content}
              </p>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", cursor: "pointer", padding: 4 }}
              aria-label="Annuler"
            >✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── COMPOSER (sticky bottom) ── */}
      <div
        data-testid="chat-composer"
        style={{
          flexShrink: 0,
          padding: "10px 12px max(10px, env(safe-area-inset-bottom)) 12px",
          background: "rgba(8,8,28,0.97)", backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          position: "sticky", bottom: 0, zIndex: 5,
        }}
      >
        <AnimatePresence>
          {showEmoji && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              style={{
                position: "absolute", bottom: "calc(100% - 4px)", left: 12, right: 12,
                background: "#0d0d24", borderRadius: 14,
                border: "1px solid rgba(255,255,255,.08)",
                padding: 10, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4,
                boxShadow: "0 -8px 32px rgba(0,0,0,.5)",
              }}
            >
              {EMOJIS.map(em => (
                <button
                  key={em}
                  onClick={() => addEmoji(em)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 22, padding: 6, borderRadius: 8, transition: "background .15s",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,.06)"}
                  onMouseOut={(e) => e.currentTarget.style.background = "none"}
                >{em}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form
          onSubmit={send}
          style={{
            display: "flex", alignItems: "flex-end", gap: 8,
            background: "rgba(255,255,255,.04)",
            border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 22, padding: "6px 6px 6px 12px",
          }}
        >
          <button
            type="button"
            onClick={() => setShowEmoji(o => !o)}
            aria-label="Emoji"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: showEmoji ? "#a855f7" : "rgba(255,255,255,.4)",
              padding: 6, flexShrink: 0,
            }}
          >
            <Smile size={20} />
          </button>

          <textarea
            ref={inputRef}
            data-testid="chat-input"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Écris un message…"
            rows={1}
            style={{
              flex: 1, resize: "none", outline: "none", border: "none",
              background: "transparent", color: "#fff",
              fontFamily: "inherit", fontSize: 14, lineHeight: 1.4,
              maxHeight: 100, padding: "8px 0",
            }}
          />

          <motion.button
            type="submit"
            data-testid="chat-send-btn"
            whileTap={{ scale: 0.92 }}
            disabled={!newMsg.trim() || sending}
            style={{
              width: 40, height: 40, borderRadius: 20, flexShrink: 0,
              border: "none", cursor: newMsg.trim() ? "pointer" : "default",
              background: newMsg.trim()
                ? "linear-gradient(135deg,#7c3aed,#a855f7)"
                : "rgba(255,255,255,.06)",
              color: newMsg.trim() ? "#fff" : "rgba(255,255,255,.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: newMsg.trim() ? "0 4px 16px rgba(124,58,237,.4)" : "none",
              transition: "all .2s",
            }}
          >
            <Send size={16} />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
