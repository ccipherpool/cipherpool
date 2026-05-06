import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Users, Hash, Smile, AtSign } from "lucide-react";

const ACCENT   = "#6366f1";
const ACCENT_L = "#818cf8";
const ix = a => `rgba(99,102,241,${a})`;

const EMOJIS = ["👍","🔥","💪","🏆","😂","❤️","👏","🎮","⚡","💀"];

function Avatar({ name, url, size = 36, color }) {
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() || "?";
  const bg = color || "#4f46e5";
  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: `linear-gradient(135deg,${bg},${bg}99)`, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 700, color: "#fff", border: "1px solid rgba(255,255,255,.1)" }}>
      {url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </div>
  );
}

const COLORS = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6"];
function userColor(id) { return COLORS[(id?.charCodeAt(0) || 0) % COLORS.length]; }

function timeLabel(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60)    return "À l'instant";
  if (diff < 3600)  return `${Math.floor(diff/60)} min`;
  if (diff < 86400) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function GlobalChat() {
  const { profile } = useOutletContext() || {};
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [onlineCount, setOnline] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    loadMessages();
    setOnline(Math.floor(Math.random() * 120) + 30);
    const ch = supabase
      .channel("globalchat_v2")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, async (p) => {
        const { data } = await supabase
          .from("chat_messages")
          .select("*, sender:profiles(id, full_name, avatar_url, role)")
          .eq("id", p.new.id)
          .maybeSingle();
        if (data) setMessages(prev => [...prev, data]);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*, sender:profiles(id, full_name, avatar_url, role)")
      .order("created_at", { ascending: true })
      .limit(80);
    setMessages(data || []);
    setLoading(false);
  };

  const send = async (e) => {
    e?.preventDefault();
    const txt = newMsg.trim();
    if (!txt || !profile?.id || sending) return;
    setSending(true);
    setNewMsg("");
    try {
      await supabase.from("chat_messages").insert({ sender_id: profile.id, channel: "global", content: txt });
    } catch (_) {}
    setSending(false);
    inputRef.current?.focus();
  };

  const addEmoji = (em) => { setNewMsg(p => p + em); setShowEmoji(false); inputRef.current?.focus(); };

  const ROLE_COLOR = { super_admin: "#f43f5e", admin: "#f97316", founder: "#a78bfa", fondateur: "#a78bfa", designer: "#10b981", user: "rgba(255,255,255,.35)" };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ width: 32, height: 32, border: `2px solid ${ix(.12)}`, borderTopColor: ACCENT, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 112px)", fontFamily: "'Space Grotesk',sans-serif", color: "rgba(255,255,255,.88)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .chat-in::-webkit-scrollbar{width:4px}
        .chat-in::-webkit-scrollbar-thumb{background:${ix(.25)};border-radius:99px}
        .chat-msg-row{display:flex;gap:10px;padding:6px 0;align-items:flex-end}
        .chat-msg-row:hover .chat-time{opacity:1}
        .chat-time{opacity:0;transition:opacity .2s;font-size:10px;color:rgba(255,255,255,.2);font-family:'JetBrains Mono',monospace;white-space:nowrap;margin-bottom:4px}
        .emoji-btn{background:none;border:none;cursor:pointer;font-size:20px;padding:4px 6px;border-radius:8px;transition:background .15s}
        .emoji-btn:hover{background:rgba(255,255,255,.08)}
        textarea.chat-input{resize:none;outline:none;background:transparent;color:#fff;font-family:'Space Grotesk',sans-serif;font-size:14px;line-height:1.5;width:100%;border:none}
        textarea.chat-input::placeholder{color:rgba(255,255,255,.2)}
      `}</style>

      {/* ── Header ── */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${ix(.12)}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(8,8,24,.6)", backdropFilter: "blur(16px)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: `linear-gradient(135deg,${ix(.25)},${ix(.08)})`, border: `1px solid ${ix(.3)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Hash size={17} style={{ color: ACCENT_L }} />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, letterSpacing: 0.3 }}>Chat Global</p>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,.3)", fontFamily: "'JetBrains Mono',monospace" }}>
              {messages.length} messages · Canal public
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 99, background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981", animation: "pulse-dot 2s infinite" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#10b981" }}>{onlineCount} en ligne</span>
        </div>
        <style>{`@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.85)}}`}</style>
      </div>

      {/* ── Messages ── */}
      <div className="chat-in" style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
            <div style={{ fontSize: 48, opacity: 0.15 }}>💬</div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.2)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 2 }}>SOYEZ LE PREMIER À ÉCRIRE</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.sender_id === profile?.id || msg.sender?.id === profile?.id;
          const sender = msg.sender || {};
          const col = userColor(sender.id || msg.sender_id);
          const roleLabel = sender.role && sender.role !== "user" ? sender.role?.replace("_", " ").toUpperCase() : null;
          const roleColor = ROLE_COLOR[sender.role] || "rgba(255,255,255,.3)";
          const prev = messages[i - 1];
          const sameUser = prev && (prev.sender_id === msg.sender_id) && (new Date(msg.created_at) - new Date(prev.created_at) < 120000);

          return (
            <motion.div
              key={msg.id || i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="chat-msg-row"
              style={{ flexDirection: isMe ? "row-reverse" : "row", marginTop: sameUser ? 2 : 12 }}
            >
              {!sameUser ? (
                <Avatar name={sender.full_name} url={sender.avatar_url} color={col} />
              ) : (
                <div style={{ width: 36, flexShrink: 0 }} />
              )}

              <div style={{ maxWidth: "68%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: 3 }}>
                {!sameUser && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isMe ? ACCENT_L : col }}>
                      {isMe ? "Vous" : sender.full_name || "Joueur"}
                    </span>
                    {roleLabel && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: roleColor, background: `${roleColor}18`, border: `1px solid ${roleColor}30`, padding: "1px 7px", borderRadius: 99, letterSpacing: 0.5 }}>
                        {roleLabel}
                      </span>
                    )}
                  </div>
                )}
                <div
                  style={{
                    padding: "9px 14px",
                    borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                    background: isMe
                      ? `linear-gradient(135deg,${ix(.28)},${ix(.15)})`
                      : "rgba(255,255,255,.05)",
                    border: `1px solid ${isMe ? ix(.38) : "rgba(255,255,255,.07)"}`,
                    boxShadow: isMe ? `0 4px 16px ${ix(.12)}` : "none",
                    wordBreak: "break-word",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "rgba(255,255,255,.9)" }}>{msg.content}</p>
                </div>
                <span className="chat-time">{timeLabel(msg.created_at)}</span>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div style={{ padding: "12px 20px", flexShrink: 0, position: "relative" }}>
        <div style={{ background: "rgba(8,8,24,.9)", border: `1px solid ${ix(.2)}`, borderRadius: 16, padding: "10px 14px", display: "flex", alignItems: "flex-end", gap: 10, backdropFilter: "blur(16px)", boxShadow: `0 0 0 1px ${ix(.06)}` }}>

          {/* Emoji picker */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowEmoji(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 8, color: showEmoji ? ACCENT_L : "rgba(255,255,255,.25)", fontSize: 18, transition: "color .2s" }}>
              <Smile size={18} />
            </button>
            <AnimatePresence>
              {showEmoji && (
                <motion.div
                  initial={{ opacity: 0, scale: .9, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: .9, y: 8 }}
                  style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, background: "#080820", border: `1px solid ${ix(.2)}`, borderRadius: 12, padding: 8, display: "flex", gap: 4, flexWrap: "wrap", width: 220, boxShadow: "0 16px 40px rgba(0,0,0,.6)" }}
                >
                  {EMOJIS.map(em => (
                    <button key={em} className="emoji-btn" onClick={() => addEmoji(em)}>{em}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <textarea
            ref={inputRef}
            className="chat-input"
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Écris un message… (Entrée pour envoyer)"
            rows={1}
            style={{ maxHeight: 80 }}
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={send}
            disabled={!newMsg.trim() || sending}
            style={{
              width: 38, height: 38, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: newMsg.trim() ? "pointer" : "default",
              background: newMsg.trim() ? `linear-gradient(135deg,${ACCENT},#7c3aed)` : "rgba(255,255,255,.05)",
              border: `1px solid ${newMsg.trim() ? ix(.5) : "rgba(255,255,255,.06)"}`,
              boxShadow: newMsg.trim() ? `0 4px 16px ${ix(.3)}` : "none",
              transition: "all .2s",
            }}
          >
            <Send size={15} style={{ color: newMsg.trim() ? "#fff" : "rgba(255,255,255,.2)" }} />
          </motion.button>
        </div>
        <p style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,.12)", fontFamily: "'JetBrains Mono',monospace", marginTop: 6, letterSpacing: 1 }}>
          SHIFT+ENTRÉE pour nouvelle ligne
        </p>
      </div>
    </div>
  );
}
