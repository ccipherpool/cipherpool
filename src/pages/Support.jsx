import { useState, useEffect, useRef } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════
   CIPHERPOOL — SUPPORT
   Premium Dark · Indigo palette
   ═══════════════════════════════════════════════════════ */
const INDIGO = "#6366f1";
const INDIGO_L = "#818cf8";
const GREEN = "#10b981";
const RED = "#f43f5e";
const AMBER = "#fbbf24";
const ORANGE = "#f97316";

const ix = (a) => `rgba(99,102,241,${a})`;
const rx = (a) => `rgba(244,63,94,${a})`;
const gx = (a) => `rgba(16,185,129,${a})`;
const ax = (a) => `rgba(251,191,36,${a})`;

const CARD_BG = "linear-gradient(135deg,rgba(12,12,26,1),rgba(20,20,38,0.98))";
const CARD_BORDER = "rgba(255,255,255,0.06)";

/* ── Glass card component ── */
function G({ children, style, ac }) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        position: "relative",
        overflow: "hidden",
        background: CARD_BG,
        border: `1px solid ${h && ac ? ac + "30" : CARD_BORDER}`,
        borderRadius: 16,
        boxShadow: "0 4px 24px rgba(0,0,0,.5)",
        transition: "border .22s",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg,transparent,${ac || ix(0.4)},transparent)`,
          opacity: h ? 1 : 0.3,
          transition: "opacity .22s",
          pointerEvents: "none",
        }}
      />
      {children}
    </div>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }) {
  const cfg = {
    open: { label: "Ouvert", color: INDIGO_L, bg: ix(0.15), border: ix(0.3) },
    pending: { label: "En cours", color: AMBER, bg: ax(0.12), border: ax(0.28) },
    answered: { label: "Répondu", color: GREEN, bg: gx(0.12), border: gx(0.28) },
    resolved: { label: "Résolu", color: GREEN, bg: gx(0.12), border: gx(0.28) },
    closed: { label: "Fermé", color: "#94a3b8", bg: "rgba(148,163,184,.1)", border: "rgba(148,163,184,.2)" },
  };
  const c = cfg[status] || cfg.open;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.5,
        color: c.color,
        background: c.bg,
        border: `1px solid ${c.border}`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: c.color,
          flexShrink: 0,
        }}
      />
      {c.label}
    </span>
  );
}

/* ── Priority badge ── */
function PriorityBadge({ priority }) {
  const cfg = {
    normal: { label: "Normal", color: INDIGO_L, bg: ix(0.12) },
    urgent: { label: "Urgent", color: ORANGE, bg: "rgba(249,115,22,.12)" },
    critique: { label: "Critique", color: RED, bg: rx(0.12) },
    low: { label: "Faible", color: "#94a3b8", bg: "rgba(148,163,184,.1)" },
    high: { label: "Élevé", color: ORANGE, bg: "rgba(249,115,22,.12)" },
  };
  const c = cfg[priority] || cfg.normal;
  if (priority === "normal" || !priority) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "2px 9px",
        borderRadius: 99,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.5,
        color: c.color,
        background: c.bg,
        whiteSpace: "nowrap",
      }}
    >
      {c.label}
    </span>
  );
}

export default function Support() {
  const { profile } = useOutletContext() || {};
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("tickets");
  const [ticketFilter, setTicketFilter] = useState("all");
  // New ticket form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "autre", priority: "normal", body: "" });
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const isAdmin = ["admin", "super_admin"].includes(profile?.role);

  // Auto-fill from profile edit request
  useEffect(() => {
    // Fallback: read directly from URL in case searchParams not ready
    const rawParams = new URLSearchParams(window.location.search);
    const type = searchParams.get("type") || rawParams.get("type");
    if (type === "profile_edit") {
      const g = (k, d = "") => searchParams.get(k) || rawParams.get(k) || d;
      const name = g("name");
      const email = g("email");
      const ffId = g("ffId", "—");
      const rol = g("role");
      const level = g("level", "1");
      const joinDate = g("joinDate");
      const userId = g("userId");
      const body = `═══════════════════════════\n📋 DEMANDE DE MODIFICATION DE PROFIL\n═══════════════════════════\n\n👤 Nom actuel : ${name}\n📧 Email : ${email}\n🎮 Free Fire ID : ${ffId}\n🏷️ Rôle : ${rol}\n⚡ Niveau : ${level}\n📅 Inscrit le : ${joinDate}\n🔑 User ID : ${userId}\n\n═══════════════════════════\n✏️ CE QUE JE SOUHAITE MODIFIER :\n\n[Décrivez ici ce que vous souhaitez changer : Nom, Email, Âge, Ville, etc.]\n\n═══════════════════════════`;
      setForm({ subject: "Demande de modification de profil", category: "compte", priority: "normal", body });
      setShowForm(true);
      setTab("tickets");
    }
  }, [searchParams, window.location.search]);

  useEffect(() => {
    fetchTickets();
    fetchAdminMessages();
    const ch = supabase
      .channel("support_ch_" + profile?.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_tickets" }, (p) => {
        if (isAdmin || p.new.user_id === profile?.id) setTickets((prev) => [p.new, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_tickets" }, (p) => {
        setTickets((prev) => prev.map((t) => (t.id === p.new.id ? p.new : t)));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, (p) => {
        if (selectedTicket && p.new.ticket_id === selectedTicket.id) fetchMessages(selectedTicket.id);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [profile?.id, isAdmin]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchTickets = async () => {
    let q = supabase
      .from("support_tickets")
      .select(
        `*,user:profiles!support_tickets_user_id_fkey(id,full_name,free_fire_id,role),assigned_to:profiles!support_tickets_assigned_to_fkey(id,full_name,role)`
      )
      .order("created_at", { ascending: false });
    if (!isAdmin) q = q.eq("user_id", profile?.id);
    const { data } = await q;
    setTickets(data || []);
    setLoading(false);
  };
  const fetchAdminMessages = async () => {
    const { data } = await supabase
      .from("admin_messages")
      .select("*")
      .or(`user_id.eq.${profile?.id},is_global.eq.true`)
      .order("created_at", { ascending: false });
    setAdminMessages(data || []);
  };
  const fetchMessages = async (id) => {
    const { data } = await supabase
      .from("support_messages")
      .select(`*,sender:profiles!support_messages_sender_id_fkey(id,full_name,role)`)
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };
  const markAsRead = async (id) => {
    await supabase.from("admin_messages").update({ read: true }).eq("id", id);
    fetchAdminMessages();
  };
  const markAllRead = async () => {
    const ids = adminMessages.filter((m) => !m.read).map((m) => m.id);
    if (!ids.length) return;
    await supabase.from("admin_messages").update({ read: true }).in("id", ids);
    fetchAdminMessages();
  };

  const createTicket = async () => {
    if (!form.subject.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert([{ user_id: profile?.id, subject: form.subject, category: form.category, priority: form.priority, status: "open" }])
        .select()
        .single();
      if (error || !data) throw error;
      if (form.body.trim()) {
        await supabase.from("support_messages").insert([{ ticket_id: data.id, sender_id: profile?.id, message: form.body.trim() }]);
      } else {
        await supabase.from("support_messages").insert([{ ticket_id: data.id, sender_id: profile?.id, message: form.subject }]);
      }
      setTickets((prev) => [data, ...prev]);
      setSelectedTicket(data);
      fetchMessages(data.id);
      setShowForm(false);
      setForm({ subject: "", category: "autre", priority: "normal", body: "" });
      setTab("tickets");
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    const { error } = await supabase
      .from("support_messages")
      .insert([{ ticket_id: selectedTicket.id, sender_id: profile?.id, message: newMessage.trim() }]);
    if (!error) {
      setNewMessage("");
      fetchMessages(selectedTicket.id);
    }
  };

  const assignToMe = async () => {
    if (!selectedTicket || !isAdmin) return;
    await supabase.from("support_tickets").update({ assigned_to: profile?.id, status: "pending" }).eq("id", selectedTicket.id);
    fetchTickets();
    setSelectedTicket({ ...selectedTicket, assigned_to: profile, status: "pending" });
  };

  const closeTicket = async () => {
    if (!selectedTicket) return;
    await supabase.from("support_tickets").update({ status: "closed" }).eq("id", selectedTicket.id);
    fetchTickets();
    setSelectedTicket(null);
  };

  const catIcon = { tournoi: "🎮", coins: "💰", compte: "👤", paiement: "💳", classement: "📊", autre: "❓" };

  const filtered = tickets.filter((t) => {
    if (ticketFilter === "all") return true;
    if (ticketFilter === "open") return t.status === "open";
    if (ticketFilter === "urgent") return ["urgent", "critique"].includes(t.priority);
    if (ticketFilter === "mine") return t.assigned_to?.id === profile?.id;
    if (ticketFilter === "closed") return t.status === "closed";
    return true;
  });

  const unread = adminMessages.filter((m) => !m.read).length;

  if (loading)
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{
            width: 36,
            height: 36,
            border: `2px solid ${ix(0.12)}`,
            borderTopColor: INDIGO,
            borderRadius: "50%",
          }}
        />
      </div>
    );

  return (
    <div className="space-y-6" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "rgba(255,255,255,.88)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .sp-in {
          background: rgba(99,102,241,0.06);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 10px;
          color: #fff;
          padding: 10px 14px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13.5px;
          outline: none;
          transition: border .2s, box-shadow .2s;
          width: 100%;
        }
        .sp-in:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .sp-in::placeholder { color: rgba(255,255,255,.25); }
        select.sp-in option { background: #0d0d1a; color: #fff; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,.3); border-radius: 99px; }
        .ticket-row:hover { background: rgba(99,102,241,0.07) !important; }
        .tab-pill { background: none; border: none; cursor: pointer; padding: 8px 20px; border-radius: 99px; font-family: 'Space Grotesk',sans-serif; font-size: 13px; font-weight: 600; transition: all .2s; }
        .tab-pill.active { background: ${ix(0.18)}; color: ${INDIGO_L}; box-shadow: 0 0 0 1px ${ix(0.35)}; }
        .tab-pill.inactive { color: rgba(255,255,255,.38); }
        .tab-pill.inactive:hover { color: rgba(255,255,255,.65); background: rgba(255,255,255,.04); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 38,
              fontWeight: 800,
              letterSpacing: -1,
              lineHeight: 1.1,
              background: `linear-gradient(135deg, ${INDIGO_L} 0%, #c4b5fd 50%, ${INDIGO_L} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            SUPPORT
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,.38)", fontWeight: 500 }}>
            {isAdmin ? "Gestion des tickets — vue administrateur" : "Besoin d'aide ? Notre équipe vous répond rapidement."}
          </p>
        </div>
        {!isAdmin && (
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 22px",
              background: `linear-gradient(135deg, ${ix(0.22)}, ${ix(0.1)})`,
              border: `1px solid ${ix(0.38)}`,
              borderRadius: 12,
              color: INDIGO_L,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.5,
              fontFamily: "'Space Grotesk',sans-serif",
              boxShadow: `0 4px 20px ${ix(0.2)}`,
            }}
          >
            <span style={{ fontSize: 17, lineHeight: 1 }}>+</span>
            Nouveau ticket
          </motion.button>
        )}
      </div>

      {/* ── Admin stat cards ── */}
      {isAdmin && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            [INDIGO_L, tickets.length, "Total", ix],
            [GREEN, tickets.filter((t) => t.status === "open").length, "Ouverts", gx],
            [AMBER, tickets.filter((t) => ["urgent", "critique"].includes(t.priority)).length, "Urgents", ax],
            [INDIGO_L, tickets.filter((t) => t.assigned_to?.id === profile?.id).length, "Mes tickets", ix],
          ].map(([color, val, lb, cx2]) => (
            <G key={lb} ac={color} style={{ padding: "20px 22px" }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.3)", letterSpacing: 1, textTransform: "uppercase" }}>{lb}</p>
              <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color, lineHeight: 1, textShadow: `0 0 28px ${color}55` }}>{val}</p>
            </G>
          ))}
        </div>
      )}

      {/* ── Tab switcher ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px", background: "rgba(255,255,255,.03)", border: `1px solid ${CARD_BORDER}`, borderRadius: 99, width: "fit-content" }}>
        {[
          ["tickets", isAdmin ? "Gestion tickets" : "Mes tickets", "🎟️"],
          ["announcements", "Annonces", "📢"],
        ].map(([k, lb, ic]) => (
          <button key={k} onClick={() => setTab(k)} className={`tab-pill ${tab === k ? "active" : "inactive"}`} style={{ position: "relative" }}>
            {ic} {lb}
            {k === "announcements" && unread > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  right: 4,
                  minWidth: 17,
                  height: 17,
                  borderRadius: 99,
                  background: RED,
                  fontSize: 9,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  padding: "0 4px",
                }}
              >
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════
          TICKETS TAB
      ══════════════════════════════════════ */}
      {tab === "tickets" && (
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, minHeight: 520 }}>

          {/* Left — ticket list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {isAdmin && (
              <select
                value={ticketFilter}
                onChange={(e) => setTicketFilter(e.target.value)}
                className="sp-in"
                style={{ width: "100%", cursor: "pointer" }}
              >
                <option value="all">Tous les tickets</option>
                <option value="open">Ouverts</option>
                <option value="urgent">Urgents</option>
                <option value="mine">Mes tickets</option>
                <option value="closed">Fermés</option>
              </select>
            )}

            <G style={{ flex: 1, padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  padding: "14px 18px 12px",
                  borderBottom: `1px solid ${CARD_BORDER}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.3)", letterSpacing: 1, textTransform: "uppercase" }}>
                  {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>

              {filtered.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 24px", gap: 12 }}>
                  <div style={{ fontSize: 44, opacity: 0.2 }}>🎟️</div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.22)", textAlign: "center" }}>
                    Aucun ticket pour le moment
                  </p>
                  {!isAdmin && (
                    <button
                      onClick={() => setShowForm(true)}
                      style={{
                        marginTop: 4,
                        padding: "7px 18px",
                        background: ix(0.12),
                        border: `1px solid ${ix(0.28)}`,
                        borderRadius: 99,
                        color: INDIGO_L,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "'Space Grotesk',sans-serif",
                      }}
                    >
                      Créer un ticket
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ maxHeight: 500, overflowY: "auto", padding: "8px" }}>
                  {filtered.map((t) => {
                    const active = selectedTicket?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        className="ticket-row"
                        onClick={() => { setSelectedTicket(t); fetchMessages(t.id); }}
                        style={{
                          padding: "13px 14px",
                          borderRadius: 12,
                          cursor: "pointer",
                          marginBottom: 4,
                          transition: "background .18s",
                          background: active ? ix(0.14) : "transparent",
                          border: `1px solid ${active ? ix(0.35) : "transparent"}`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 13,
                              fontWeight: 600,
                              color: "rgba(255,255,255,.85)",
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.subject}
                          </p>
                          <StatusBadge status={t.status} />
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: 11 }}>{catIcon[t.category] || "❓"}</span>
                          {isAdmin && t.user && (
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)", fontWeight: 500 }}>{t.user.full_name}</span>
                          )}
                          <PriorityBadge priority={t.priority} />
                        </div>
                        <p style={{ margin: "7px 0 0", fontSize: 11, color: "rgba(255,255,255,.22)", fontFamily: "'JetBrains Mono',monospace" }}>
                          {new Date(t.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </G>
          </div>

          {/* Right — conversation */}
          {selectedTicket ? (
            <G style={{ display: "flex", flexDirection: "column", height: 580, padding: 0 }}>
              {/* Conversation header */}
              <div
                style={{
                  padding: "16px 22px",
                  borderBottom: `1px solid ${CARD_BORDER}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexShrink: 0,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 7px", fontSize: 15, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedTicket.subject}
                  </p>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                    <StatusBadge status={selectedTicket.status} />
                    <PriorityBadge priority={selectedTicket.priority} />
                    {isAdmin && selectedTicket.user && (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 500 }}>
                        👤 {selectedTicket.user.full_name}
                      </span>
                    )}
                    {selectedTicket.assigned_to && (
                      <span style={{ fontSize: 11, color: INDIGO_L, fontWeight: 500 }}>
                        → {selectedTicket.assigned_to.full_name}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {isAdmin && !selectedTicket.assigned_to && (
                    <button
                      onClick={assignToMe}
                      style={{
                        padding: "7px 16px",
                        background: ix(0.12),
                        border: `1px solid ${ix(0.3)}`,
                        borderRadius: 10,
                        color: INDIGO_L,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "'Space Grotesk',sans-serif",
                      }}
                    >
                      Prendre en charge
                    </button>
                  )}
                  {selectedTicket.status !== "closed" && (
                    <button
                      onClick={closeTicket}
                      style={{
                        padding: "7px 16px",
                        background: rx(0.1),
                        border: `1px solid ${rx(0.28)}`,
                        borderRadius: 10,
                        color: RED,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "'Space Grotesk',sans-serif",
                      }}
                    >
                      Fermer
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
                {messages.length === 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,.2)", fontStyle: "italic" }}>Aucun message pour l'instant.</p>
                  </div>
                )}
                {messages.map((msg) => {
                  const mine = msg.sender_id === profile?.id;
                  const isAdminMsg = ["admin", "super_admin"].includes(msg.sender?.role);
                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                      <div
                        style={{
                          maxWidth: "72%",
                          padding: "12px 16px",
                          borderRadius: mine ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                          background: mine
                            ? `linear-gradient(135deg,${ix(0.3)},${ix(0.15)})`
                            : "linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))",
                          border: `1px solid ${mine ? ix(0.4) : "rgba(255,255,255,.08)"}`,
                          boxShadow: "0 4px 16px rgba(0,0,0,.3)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: mine ? INDIGO_L : isAdminMsg ? "#c4b5fd" : "rgba(255,255,255,.7)",
                            }}
                          >
                            {mine ? "Vous" : msg.sender?.full_name || "—"}
                          </span>
                          {isAdminMsg && !mine && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: "#a78bfa",
                                background: "rgba(167,139,250,.15)",
                                padding: "1px 8px",
                                borderRadius: 99,
                              }}
                            >
                              {msg.sender?.role === "super_admin" ? "Super Admin" : "Admin"}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, color: "rgba(255,255,255,.82)", fontSize: 13.5, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                          {msg.message}
                        </p>
                        <p
                          style={{
                            margin: "7px 0 0",
                            fontSize: 10,
                            color: "rgba(255,255,255,.25)",
                            fontFamily: "'JetBrains Mono',monospace",
                            textAlign: mine ? "right" : "left",
                          }}
                        >
                          {new Date(msg.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Message input */}
              {selectedTicket.status !== "closed" && (
                <div
                  style={{
                    padding: "14px 22px",
                    borderTop: `1px solid ${CARD_BORDER}`,
                    display: "flex",
                    gap: 10,
                    flexShrink: 0,
                    alignItems: "flex-end",
                  }}
                >
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Votre message… (Entrée pour envoyer)"
                    rows={2}
                    style={{
                      flex: 1,
                      background: "rgba(99,102,241,0.06)",
                      border: `1px solid ${ix(0.2)}`,
                      borderRadius: 12,
                      color: "#fff",
                      padding: "10px 14px",
                      fontSize: 13.5,
                      outline: "none",
                      resize: "none",
                      fontFamily: "'Space Grotesk',sans-serif",
                      transition: "border .2s, box-shadow .2s",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = INDIGO; e.target.style.boxShadow = `0 0 0 3px ${ix(0.15)}`; }}
                    onBlur={(e) => { e.target.style.borderColor = ix(0.2); e.target.style.boxShadow = "none"; }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    style={{
                      padding: "10px 22px",
                      height: "fit-content",
                      background: newMessage.trim() ? `linear-gradient(135deg, ${INDIGO}, #7c3aed)` : "rgba(255,255,255,.05)",
                      border: `1px solid ${newMessage.trim() ? ix(0.5) : "rgba(255,255,255,.08)"}`,
                      borderRadius: 12,
                      color: newMessage.trim() ? "#fff" : "rgba(255,255,255,.25)",
                      cursor: newMessage.trim() ? "pointer" : "default",
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "'Space Grotesk',sans-serif",
                      transition: "all .2s",
                      boxShadow: newMessage.trim() ? `0 4px 16px ${ix(0.3)}` : "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Envoyer →
                  </motion.button>
                </div>
              )}

              {selectedTicket.status === "closed" && (
                <div
                  style={{
                    padding: "12px 22px",
                    borderTop: `1px solid ${CARD_BORDER}`,
                    textAlign: "center",
                    flexShrink: 0,
                    background: "rgba(148,163,184,.04)",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.3)", fontWeight: 500 }}>
                    Ce ticket est fermé · Créez un nouveau ticket si besoin
                  </p>
                </div>
              )}
            </G>
          ) : (
            <G style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
              <div style={{ textAlign: "center" }}>
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{ fontSize: 56, marginBottom: 16, opacity: 0.18 }}
                >
                  💬
                </motion.div>
                <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,.3)" }}>
                  Sélectionnez un ticket
                </p>
                {!isAdmin && (
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.18)", fontWeight: 500 }}>
                    ou créez-en un nouveau ci-dessous
                  </p>
                )}
              </div>
            </G>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          ANNOUNCEMENTS TAB
      ══════════════════════════════════════ */}
      {tab === "announcements" && (
        <G style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "16px 24px",
              borderBottom: `1px solid ${CARD_BORDER}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.5)", letterSpacing: 0.5 }}>
              📢 Annonces officielles
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: INDIGO_L,
                  background: ix(0.1),
                  border: `1px solid ${ix(0.25)}`,
                  borderRadius: 8,
                  padding: "5px 14px",
                  cursor: "pointer",
                  fontFamily: "'Space Grotesk',sans-serif",
                }}
              >
                Tout marquer lu
              </button>
            )}
          </div>
          {adminMessages.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: 14 }}>
              <motion.div
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{ fontSize: 52 }}
              >
                📭
              </motion.div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.22)" }}>
                Aucune annonce pour le moment
              </p>
            </div>
          ) : (
            <div style={{ padding: "12px" }}>
              {adminMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  whileHover={{ x: 2 }}
                  onClick={() => !msg.read && markAsRead(msg.id)}
                  style={{
                    padding: "18px 22px",
                    borderRadius: 13,
                    marginBottom: 8,
                    cursor: msg.read ? "default" : "pointer",
                    background: msg.read ? "rgba(255,255,255,.02)" : ix(0.06),
                    border: `1px solid ${msg.read ? CARD_BORDER : ix(0.2)}`,
                    borderLeft: `3px solid ${msg.read ? "rgba(99,102,241,.18)" : INDIGO}`,
                    transition: "all .2s",
                    position: "relative",
                  }}
                >
                  {!msg.read && (
                    <motion.div
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      style={{
                        position: "absolute",
                        top: 14,
                        right: 14,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: INDIGO_L,
                        boxShadow: `0 0 8px ${INDIGO}`,
                      }}
                    />
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 20 }}>{msg.type === "warning" ? "⚠️" : msg.type === "update" ? "🔄" : "📢"}</span>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>{msg.title}</p>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "rgba(255,255,255,.28)",
                        background: "rgba(255,255,255,.04)",
                        padding: "2px 9px",
                        borderRadius: 99,
                        border: `1px solid rgba(255,255,255,.06)`,
                      }}
                    >
                      {msg.is_global ? "📢 Général" : "📩 Personnel"}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: "rgba(255,255,255,.55)", fontSize: 13.5, lineHeight: 1.7 }}>{msg.content}</p>
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontSize: 11,
                      color: "rgba(255,255,255,.22)",
                      fontFamily: "'JetBrains Mono',monospace",
                    }}
                  >
                    {new Date(msg.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </G>
      )}

      {/* ══════════════════════════════════════
          MODAL — Nouveau ticket
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(5,5,18,.88)",
              backdropFilter: "blur(14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
              padding: 20,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 24 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              style={{
                background: CARD_BG,
                border: `1px solid ${ix(0.28)}`,
                borderRadius: 20,
                padding: "32px 34px",
                maxWidth: 560,
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: `0 28px 80px rgba(0,0,0,.75), 0 0 0 1px ${ix(0.08)}`,
                position: "relative",
              }}
            >
              {/* Modal accent line */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: `linear-gradient(90deg, transparent, ${INDIGO}, #7c3aed, transparent)`,
                  borderRadius: "20px 20px 0 0",
                }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#fff" }}>Nouveau ticket</h2>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.35)", fontWeight: 500 }}>Notre équipe vous répondra sous 24h</p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: rx(0.1),
                    border: `1px solid ${rx(0.25)}`,
                    color: RED,
                    cursor: "pointer",
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Subject */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.45)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                    Sujet *
                  </label>
                  <input
                    className="sp-in"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Décrivez votre problème en une ligne…"
                  />
                </div>

                {/* Category + Priority */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.45)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                      Catégorie
                    </label>
                    <select className="sp-in" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ cursor: "pointer" }}>
                      <option value="compte">👤 Compte / Profil</option>
                      <option value="tournoi">🎮 Tournoi</option>
                      <option value="coins">💰 Pièces / Wallet</option>
                      <option value="paiement">💳 Paiement</option>
                      <option value="classement">📊 Classement</option>
                      <option value="autre">❓ Autre</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.45)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                      Priorité
                    </label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[
                        ["normal", "Normal", "#94a3b8"],
                        ["urgent", "Urgent", ORANGE],
                        ["critique", "Critique", RED],
                      ].map(([v, lb, c]) => (
                        <button
                          key={v}
                          onClick={() => setForm({ ...form, priority: v })}
                          style={{
                            flex: 1,
                            padding: "9px 0",
                            borderRadius: 10,
                            border: `1px solid ${form.priority === v ? c + "55" : "rgba(255,255,255,.08)"}`,
                            background: form.priority === v ? `${c}18` : "transparent",
                            color: form.priority === v ? c : "rgba(255,255,255,.35)",
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: "'Space Grotesk',sans-serif",
                            transition: "all .18s",
                          }}
                        >
                          {lb}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.45)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                    Message / Détails
                  </label>
                  <textarea
                    className="sp-in"
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    rows={8}
                    placeholder="Décrivez votre demande en détail…"
                    style={{ resize: "vertical", minHeight: 140 }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                  <button
                    onClick={() => setShowForm(false)}
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      border: `1px solid rgba(255,255,255,.1)`,
                      borderRadius: 12,
                      color: "rgba(255,255,255,.45)",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "'Space Grotesk',sans-serif",
                      transition: "all .2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = ix(0.3); e.currentTarget.style.color = "rgba(255,255,255,.7)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,.1)"; e.currentTarget.style.color = "rgba(255,255,255,.45)"; }}
                  >
                    Annuler
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={createTicket}
                    disabled={!form.subject.trim() || sending}
                    style={{
                      flex: 2,
                      padding: "12px 0",
                      background: form.subject.trim() ? `linear-gradient(135deg, ${INDIGO}, #7c3aed)` : "rgba(255,255,255,.05)",
                      border: `1px solid ${form.subject.trim() ? ix(0.5) : "rgba(255,255,255,.06)"}`,
                      borderRadius: 12,
                      color: form.subject.trim() ? "#fff" : "rgba(255,255,255,.25)",
                      cursor: form.subject.trim() ? "pointer" : "default",
                      fontSize: 14,
                      fontWeight: 700,
                      fontFamily: "'Space Grotesk',sans-serif",
                      transition: "all .2s",
                      boxShadow: form.subject.trim() ? `0 4px 20px ${ix(0.3)}` : "none",
                    }}
                  >
                    {sending ? "Envoi en cours…" : "Envoyer au support ✓"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
