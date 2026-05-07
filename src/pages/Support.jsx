import { useState, useEffect, useRef } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════
   CIPHERPOOL — SUPPORT PREMIUM
   Dark Indigo · Glassmorphic Design · Smooth Animations
   ═══════════════════════════════════════════════════════ */

// ====================== CONSTANTS & THEME ======================
const THEME = {
  primary: "#00d4ff",
  primaryLight: "#22e5ff",
  primaryDark: "#0099cc",
  secondary: "#8b5cf6",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#f43f5e",
  info: "#60a5fa",
  darkBg: "#020617",
  cardBg: "rgba(5, 12, 31, 0.97)",
  borderLight: "rgba(255, 255, 255, 0.07)",
  textPrimary: "rgba(255, 255, 255, 0.92)",
  textSecondary: "rgba(255, 255, 255, 0.5)",
  textMuted: "rgba(255, 255, 255, 0.25)",
};

const GRADIENTS = {
  primary: `linear-gradient(135deg, ${THEME.primary}, ${THEME.secondary})`,
  success: `linear-gradient(135deg, ${THEME.success}, #059669)`,
  warning: `linear-gradient(135deg, ${THEME.warning}, #d97706)`,
  error: `linear-gradient(135deg, ${THEME.error}, #dc2626)`,
  card: "linear-gradient(135deg, rgba(5,12,31,0.97), rgba(8,16,38,0.95))",
};

// Helper pour opacité des couleurs
const alpha = (color, opacity) => {
  if (color === THEME.primary)  return `rgba(0, 212, 255, ${opacity})`;
  if (color === THEME.secondary) return `rgba(139, 92, 246, ${opacity})`;
  if (color === THEME.success)  return `rgba(16, 185, 129, ${opacity})`;
  if (color === THEME.error)    return `rgba(244, 63, 94, ${opacity})`;
  if (color === THEME.warning)  return `rgba(245, 158, 11, ${opacity})`;
  if (color === THEME.info)     return `rgba(96, 165, 250, ${opacity})`;
  if (color === THEME.primaryLight) return `rgba(34, 229, 255, ${opacity})`;
  return `rgba(255, 255, 255, ${opacity})`;
};

// ====================== COMPOSANTS UI ======================

// Carte glassmorphique avec effet hover
const GlassCard = ({ children, accent, className, onClick, style }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{
        background: GRADIENTS.card,
        border: `1px solid ${isHovered && accent ? alpha(accent, 0.3) : THEME.borderLight}`,
        borderRadius: 20,
        boxShadow: isHovered ? `0 8px 32px ${alpha(THEME.primary, 0.15)}` : "0 4px 20px rgba(0,0,0,0.3)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: onClick ? "pointer" : "default",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
      className={className}
    >
      {/* Accent line top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: accent ? `linear-gradient(90deg, transparent, ${accent}, transparent)` : "transparent",
          opacity: isHovered ? 0.8 : 0.3,
          transition: "opacity 0.2s",
        }}
      />
      {children}
    </motion.div>
  );
};

// Badge de statut avec icône
const StatusBadge = ({ status }) => {
  const configs = {
    open: { label: "Ouvert", color: THEME.primaryLight, bg: alpha(THEME.primary, 0.12), icon: "🟢" },
    pending: { label: "En cours", color: THEME.warning, bg: alpha(THEME.warning, 0.12), icon: "🟡" },
    answered: { label: "Répondu", color: THEME.success, bg: alpha(THEME.success, 0.12), icon: "🔵" },
    resolved: { label: "Résolu", color: THEME.success, bg: alpha(THEME.success, 0.12), icon: "✅" },
    closed: { label: "Fermé", color: THEME.textMuted, bg: alpha("#fff", 0.05), icon: "🔒" },
  };
  const config = configs[status] || configs.open;
  
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.3,
        color: config.color,
        background: config.bg,
        border: `1px solid ${alpha(config.color, 0.2)}`,
        backdropFilter: "blur(4px)",
      }}
    >
      <span style={{ fontSize: 10 }}>{config.icon}</span>
      {config.label}
    </span>
  );
};

// Badge de priorité
const PriorityBadge = ({ priority }) => {
  const configs = {
    low: { label: "Basse", color: "#94a3b8", icon: "📌" },
    normal: { label: "Normale", color: THEME.primaryLight, icon: "⚡" },
    high: { label: "Haute", color: THEME.warning, icon: "⚠️" },
    urgent: { label: "Urgente", color: THEME.error, icon: "🚨" },
    critique: { label: "Critique", color: THEME.error, icon: "💀" },
  };
  const config = configs[priority] || configs.normal;
  
  if (priority === "normal") return null;
  
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 10px",
        borderRadius: 100,
        fontSize: 10,
        fontWeight: 600,
        color: config.color,
        background: alpha(config.color, 0.1),
        border: `1px solid ${alpha(config.color, 0.2)}`,
      }}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
};

// Input stylisé
const StyledInput = ({ label, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {label && (
      <label style={{ fontSize: 11, fontWeight: 700, color: THEME.textSecondary, letterSpacing: 0.5, textTransform: "uppercase" }}>
        {label}
      </label>
    )}
    <input
      {...props}
      style={{
        background: alpha("#fff", 0.03),
        border: `1px solid ${alpha(THEME.primary, 0.2)}`,
        borderRadius: 12,
        color: THEME.textPrimary,
        padding: "12px 16px",
        fontSize: 13,
        outline: "none",
        transition: "all 0.2s",
        fontFamily: "inherit",
        "&:focus": {
          borderColor: THEME.primary,
          boxShadow: `0 0 0 3px ${alpha(THEME.primary, 0.1)}`,
        },
        ...props.style,
      }}
    />
  </div>
);

// ====================== COMPOSANT PRINCIPAL ======================
export default function Support() {
  const { profile } = useOutletContext() || {};
  const [searchParams] = useSearchParams();
  
  // États
  const [tickets, setTickets] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tickets");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ subject: "", category: "autre", priority: "normal", body: "" });
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState("list");
  const [heroSearch, setHeroSearch] = useState("");

  const messagesEndRef = useRef(null);
  const isAdmin = ["admin", "super_admin"].includes(profile?.role);
  
  // Scroll automatique vers le dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Pré-remplissage automatique depuis URL (modification profil)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("type") === "profile_edit") {
      setFormData({
        subject: "Demande de modification de profil",
        category: "compte",
        priority: "normal",
        body: `📋 DEMANDE DE MODIFICATION DE PROFIL\n\nNom: ${urlParams.get("name") || ""}\nEmail: ${urlParams.get("email") || ""}\nFree Fire ID: ${urlParams.get("ffId") || ""}\nRôle: ${urlParams.get("role") || ""}\n\nDescription des modifications souhaitées...`,
      });
      setShowForm(true);
    }
  }, []);
  
  // Chargement initial des données
  useEffect(() => {
    fetchTickets();
    fetchAdminMessages();
    
    // Subscription aux changements en temps réel
    const channel = supabase
      .channel("support_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => fetchTickets())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, (payload) => {
        if (selectedTicket && payload.new.ticket_id === selectedTicket.id) {
          fetchMessages(selectedTicket.id);
        }
      })
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, [profile?.id, selectedTicket]);
  
  const fetchTickets = async () => {
    let query = supabase
      .from("support_tickets")
      .select(`*, user:profiles!support_tickets_user_id_fkey(id, full_name, free_fire_id, role, avatar_url)`)
      .order("created_at", { ascending: false });
    
    if (!isAdmin) query = query.eq("user_id", profile?.id);
    
    const { data } = await query;
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
  
  const fetchMessages = async (ticketId) => {
    const { data } = await supabase
      .from("support_messages")
      .select(`*, sender:profiles!support_messages_sender_id_fkey(id, full_name, role, avatar_url)`)
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };
  
  const createTicket = async () => {
    if (!formData.subject.trim()) return;
    setSending(true);
    
    try {
      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert([{
          user_id: profile?.id,
          subject: formData.subject,
          category: formData.category,
          priority: formData.priority,
          status: "open"
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      await supabase.from("support_messages").insert([{
        ticket_id: ticket.id,
        sender_id: profile?.id,
        message: formData.body || formData.subject
      }]);
      
      await fetchTickets();
      setSelectedTicket(ticket);
      await fetchMessages(ticket.id);
      setShowForm(false);
      setFormData({ subject: "", category: "autre", priority: "normal", body: "" });
    } catch (err) {
      console.error("Erreur création ticket:", err);
    } finally {
      setSending(false);
    }
  };
  
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    
    const { error } = await supabase.from("support_messages").insert([{
      ticket_id: selectedTicket.id,
      sender_id: profile?.id,
      message: newMessage.trim()
    }]);
    
    if (!error) {
      setNewMessage("");
      await fetchMessages(selectedTicket.id);
    }
  };
  
  const closeTicket = async () => {
    await supabase
      .from("support_tickets")
      .update({ status: "closed" })
      .eq("id", selectedTicket.id);
    await fetchTickets();
    setSelectedTicket(null);
  };
  
  const markAsRead = async (id) => {
    await supabase.from("admin_messages").update({ read: true }).eq("id", id);
    fetchAdminMessages();
  };
  
  const markAllRead = async () => {
    const unreadIds = adminMessages.filter(m => !m.read).map(m => m.id);
    if (unreadIds.length) {
      await supabase.from("admin_messages").update({ read: true }).in("id", unreadIds);
      fetchAdminMessages();
    }
  };
  
  // Filtrage des tickets
  const filteredTickets = tickets.filter(ticket => {
    if (filter === "all") return true;
    if (filter === "open") return ticket.status === "open";
    if (filter === "urgent") return ["urgent", "critique", "high"].includes(ticket.priority);
    if (filter === "mine") return ticket.assigned_to === profile?.id;
    if (filter === "closed") return ticket.status === "closed";
    return true;
  });
  
  const unreadCount = adminMessages.filter(m => !m.read).length;
  const categoriesIcons = { tournoi: "🎮", coins: "💰", compte: "👤", paiement: "💳", classement: "📊", autre: "💬" };
  
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{
            width: 40,
            height: 40,
            border: `2px solid ${alpha(THEME.primary, 0.2)}`,
            borderTopColor: THEME.primary,
            borderRadius: "50%",
          }}
        />
      </div>
    );
  }
  
  return (
    <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
      @keyframes flow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
    `}</style>
    <div style={{ maxWidth: 1400, margin: "0 auto", fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>

      {/* ==================== HEADER ==================== */}
      <div style={{ marginBottom: 28 }}>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 4, color: THEME.primary, marginBottom: 10 }}>🎧 CENTRE D'ASSISTANCE</p>
            <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: 2, background: GRADIENTS.primary, backgroundSize: "200% 200%", animation: "flow 4s ease infinite", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              CIPHER SUPPORT
            </h1>
            <p style={{ color: THEME.textSecondary, marginTop: 8, fontSize: 13 }}>
              {isAdmin ? "Gestion des tickets support — panneau admin" : "Tickets, annonces officielles et aide rapide en un seul espace."}
            </p>
          </div>
          {!isAdmin && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowForm(true)}
              style={{ background: GRADIENTS.primary, border: "none", borderRadius: 12, padding: "12px 24px", color: "#000", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 11, letterSpacing: 1.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: `0 4px 20px ${alpha(THEME.primary, 0.35)}` }}>
              <span style={{ fontSize: 16 }}>+</span> NOUVEAU TICKET
            </motion.button>
          )}
        </motion.div>
      </div>

      {/* ==================== HERO (non-admin) ==================== */}
      {!isAdmin && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{ marginBottom: 32, padding: "28px 32px", background: "linear-gradient(135deg,rgba(99,102,241,.07),rgba(139,92,246,.04))", borderRadius: 22, border: "1px solid rgba(99,102,241,.15)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.1),transparent 70%)", pointerEvents: "none" }} />
          <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: "#fff", position: "relative" }}>
            Comment pouvons-nous vous aider ?
          </h2>
          <p style={{ color: THEME.textSecondary, marginBottom: 20, fontSize: 13, position: "relative" }}>
            Trouvez une réponse rapidement ou contactez notre équipe.
          </p>
          <input
            value={heroSearch}
            onChange={e => setHeroSearch(e.target.value)}
            placeholder="🔍 Rechercher une aide…"
            style={{ width: "100%", maxWidth: 500, background: "rgba(255,255,255,.05)", border: "1px solid rgba(99,102,241,.25)", borderRadius: 12, padding: "13px 18px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 22, position: "relative", display: "block" }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, position: "relative" }}>
            {[
              { icon: "📚", title: "Centre d'aide", desc: "Questions fréquentes.", act: () => {} },
              { icon: "💬", title: "Contacter-nous", desc: "Créer un ticket support.", act: () => setShowForm(true) },
              { icon: "🎮", title: "Tournois", desc: "Problèmes liés aux matchs.", act: () => { setFormData(f => ({...f, category:"tournoi"})); setShowForm(true); } },
              { icon: "💳", title: "Paiement", desc: "Wallet, coins et paiements.", act: () => { setFormData(f => ({...f, category:"paiement"})); setShowForm(true); } },
            ].map(card => (
              <GlassCard key={card.title} accent={THEME.primary} onClick={card.act} style={{ padding: 20, cursor: "pointer" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{card.icon}</div>
                <h3 style={{ margin: "0 0 5px", color: "#fff", fontSize: 14, fontWeight: 700 }}>{card.title}</h3>
                <p style={{ margin: 0, fontSize: 12, color: THEME.textSecondary }}>{card.desc}</p>
              </GlassCard>
            ))}
          </div>
        </motion.div>
      )}
      
      {/* ==================== STATS ADMIN ==================== */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {[
            { label: "Total tickets", value: tickets.length, color: THEME.primary, icon: "🎫" },
            { label: "Tickets ouverts", value: tickets.filter(t => t.status === "open").length, color: THEME.success, icon: "🟢" },
            { label: "Urgents", value: tickets.filter(t => ["urgent", "critique"].includes(t.priority)).length, color: THEME.error, icon: "🚨" },
            { label: "Non assignés", value: tickets.filter(t => !t.assigned_to && t.status !== "closed").length, color: THEME.warning, icon: "📋" },
          ].map((stat, idx) => (
            <GlassCard key={idx} accent={stat.color} style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{stat.icon}</span>
                <span style={{ fontSize: 32, fontWeight: 800, color: stat.color }}>{stat.value}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: THEME.textSecondary, fontWeight: 500 }}>{stat.label}</p>
            </GlassCard>
          ))}
        </motion.div>
      )}
      
      {/* ==================== TABS ==================== */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: `1px solid ${THEME.borderLight}`, paddingBottom: 12 }}>
        {[
          { id: "tickets", label: "🎟️ Tickets", count: tickets.length },
          { id: "announcements", label: "📢 Annonces", count: unreadCount }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? alpha(THEME.primary, 0.15) : "transparent",
              border: activeTab === tab.id ? `1px solid ${alpha(THEME.primary, 0.3)}` : "1px solid transparent",
              borderRadius: 12,
              padding: "8px 20px",
              color: activeTab === tab.id ? THEME.primaryLight : THEME.textSecondary,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              transition: "all 0.2s",
              position: "relative",
            }}
          >
            {tab.label}
            {tab.count > 0 && tab.id === "announcements" && (
              <span style={{
                position: "absolute",
                top: -6,
                right: -6,
                background: THEME.error,
                borderRadius: 10,
                padding: "2px 6px",
                fontSize: 10,
                fontWeight: "bold",
                color: "white",
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      
      {/* ==================== CONTENU TICKETS ==================== */}
      {activeTab === "tickets" && (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
          
          {/* Liste des tickets */}
          <div style={{ display: mobileView === "convo" ? "none" : "block" }}>
            {isAdmin && (
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  width: "100%",
                  background: alpha("#fff", 0.03),
                  border: `1px solid ${THEME.borderLight}`,
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: THEME.textPrimary,
                  fontSize: 13,
                  marginBottom: 16,
                  cursor: "pointer",
                }}
              >
                <option value="all">📋 Tous les tickets</option>
                <option value="open">🟢 Ouverts</option>
                <option value="urgent">🚨 Urgents</option>
                <option value="mine">👤 Mes tickets</option>
                <option value="closed">🔒 Fermés</option>
              </select>
            )}
            
            <GlassCard style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.borderLight}` }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: THEME.textSecondary }}>
                  {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""}
                </span>
              </div>
              
              <div style={{ maxHeight: 600, overflowY: "auto" }}>
                {filteredTickets.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "52px 20px" }}>
                    <div style={{ fontSize: 44, opacity: 0.25, marginBottom: 12 }}>🎫</div>
                    <p style={{ color: THEME.textMuted, fontSize: 13, marginBottom: 16 }}>
                      {isAdmin ? "Aucun ticket trouvé." : "Vous n'avez encore ouvert aucun ticket."}
                    </p>
                    {!isAdmin && (
                      <button onClick={() => setShowForm(true)}
                        style={{ padding: "10px 24px", borderRadius: 12, background: GRADIENTS.primary, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        Créer mon premier ticket
                      </button>
                    )}
                  </div>
                ) : (
                  filteredTickets.map(ticket => (
                    <motion.div
                      key={ticket.id}
                      whileHover={{ x: 4 }}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        fetchMessages(ticket.id);
                        setMobileView("convo");
                      }}
                      style={{
                        padding: "16px 20px",
                        borderBottom: `1px solid ${THEME.borderLight}`,
                        cursor: "pointer",
                        background: selectedTicket?.id === ticket.id ? alpha(THEME.primary, 0.08) : "transparent",
                        transition: "background 0.2s",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: THEME.textPrimary }}>
                          {ticket.subject}
                        </p>
                        <StatusBadge status={ticket.status} />
                      </div>
                      
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12 }}>{categoriesIcons[ticket.category] || "💬"}</span>
                        {isAdmin && ticket.user && (
                          <span style={{ fontSize: 11, color: THEME.textSecondary }}>
                            {ticket.user.full_name}
                          </span>
                        )}
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                      
                      <p style={{ margin: 0, fontSize: 11, color: THEME.textMuted }}>
                        {new Date(ticket.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>
          
          {/* Conversation */}
          {selectedTicket ? (
            <GlassCard style={{ display: "flex", flexDirection: "column", height: 620, padding: 0, overflow: "hidden" }}>
              {/* Header conversation */}
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${THEME.borderLight}`, background: alpha(THEME.primary, 0.02) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={() => { setSelectedTicket(null); setMobileView("list"); }}
                        style={{ display: "none", background: "none", border: "none", color: THEME.primaryLight, cursor: "pointer", fontSize: 20 }}
                        className="mobile-back-btn"
                      >
                        ←
                      </button>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selectedTicket.subject}</h3>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <StatusBadge status={selectedTicket.status} />
                      <PriorityBadge priority={selectedTicket.priority} />
                      {selectedTicket.user && (
                        <span style={{ fontSize: 12, color: THEME.textSecondary }}>👤 {selectedTicket.user.full_name}</span>
                      )}
                    </div>
                  </div>
                  
                  {selectedTicket.status !== "closed" && (
                    <button
                      onClick={closeTicket}
                      style={{
                        background: alpha(THEME.error, 0.1),
                        border: `1px solid ${alpha(THEME.error, 0.3)}`,
                        borderRadius: 10,
                        padding: "8px 16px",
                        color: THEME.error,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      Fermer le ticket
                    </button>
                  )}
                </div>
              </div>
              
              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px" }}>
                    <p style={{ color: THEME.textMuted }}>Aucun message yet. Commencez la conversation !</p>
                  </div>
                )}
                
                {messages.map((msg, idx) => {
                  const isOwn = msg.sender_id === profile?.id;
                  const isAdminMsg = ["admin", "super_admin"].includes(msg.sender?.role);
                  
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start" }}
                    >
                      <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start" }}>
                        <div style={{
                          background: isOwn ? GRADIENTS.primary : alpha("#fff", 0.05),
                          borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          padding: "12px 18px",
                          border: `1px solid ${isOwn ? alpha(THEME.primary, 0.3) : THEME.borderLight}`,
                        }}>
                          {!isOwn && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: isAdminMsg ? THEME.secondary : THEME.textSecondary }}>
                                {msg.sender?.full_name || "Support"}
                              </span>
                              {isAdminMsg && (
                                <span style={{ fontSize: 9, background: alpha(THEME.secondary, 0.2), padding: "2px 8px", borderRadius: 100, color: THEME.secondary }}>
                                  {msg.sender?.role === "super_admin" ? "Super Admin" : "Admin"}
                                </span>
                              )}
                            </div>
                          )}
                          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: THEME.textPrimary, whiteSpace: "pre-wrap" }}>
                            {msg.message}
                          </p>
                        </div>
                        <span style={{ fontSize: 10, color: THEME.textMuted, marginTop: 4, padding: "0 8px" }}>
                          {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input message */}
              {selectedTicket.status !== "closed" && (
                <div style={{ padding: "16px 24px", borderTop: `1px solid ${THEME.borderLight}`, display: "flex", gap: 12 }}>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Écrivez votre message... (Enter pour envoyer)"
                    rows={2}
                    style={{
                      flex: 1,
                      background: alpha("#fff", 0.03),
                      border: `1px solid ${THEME.borderLight}`,
                      borderRadius: 14,
                      color: THEME.textPrimary,
                      padding: "10px 14px",
                      fontSize: 13,
                      resize: "none",
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    style={{
                      background: newMessage.trim() ? GRADIENTS.primary : alpha("#fff", 0.05),
                      border: "none",
                      borderRadius: 14,
                      padding: "0 24px",
                      color: newMessage.trim() ? "white" : THEME.textMuted,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: newMessage.trim() ? "pointer" : "default",
                      transition: "all 0.2s",
                    }}
                  >
                    Envoyer
                  </motion.button>
                </div>
              )}
            </GlassCard>
          ) : (
            <GlassCard style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 64, opacity: 0.3, marginBottom: 16 }}>💬</div>
                <p style={{ color: THEME.textSecondary, fontSize: 14 }}>Sélectionnez un ticket pour voir la conversation</p>
              </div>
            </GlassCard>
          )}
        </div>
      )}
      
      {/* ==================== ANNONCES ==================== */}
      {activeTab === "announcements" && (
        <GlassCard style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${THEME.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>📢 Annonces officielles</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: alpha(THEME.primary, 0.1),
                  border: `1px solid ${alpha(THEME.primary, 0.3)}`,
                  borderRadius: 10,
                  padding: "6px 14px",
                  color: THEME.primaryLight,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Tout marquer lu
              </button>
            )}
          </div>
          
          <div style={{ padding: "16px" }}>
            {adminMessages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 12 }}>📭</div>
                <p style={{ color: THEME.textMuted }}>Aucune annonce pour le moment</p>
              </div>
            ) : (
              adminMessages.map(msg => (
                <motion.div
                  key={msg.id}
                  whileHover={{ x: 4 }}
                  onClick={() => !msg.read && markAsRead(msg.id)}
                  style={{
                    padding: "20px",
                    borderRadius: 16,
                    marginBottom: 12,
                    background: msg.read ? "transparent" : alpha(THEME.primary, 0.05),
                    border: `1px solid ${msg.read ? THEME.borderLight : alpha(THEME.primary, 0.2)}`,
                    cursor: msg.read ? "default" : "pointer",
                    position: "relative",
                  }}
                >
                  {!msg.read && (
                    <div style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: THEME.primary,
                      boxShadow: `0 0 8px ${THEME.primary}`,
                    }} />
                  )}
                  
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 24 }}>{msg.type === "warning" ? "⚠️" : msg.type === "update" ? "🔄" : "📢"}</span>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{msg.title}</h4>
                    <span style={{
                      fontSize: 10,
                      background: alpha("#fff", 0.05),
                      padding: "2px 10px",
                      borderRadius: 100,
                      color: THEME.textSecondary,
                    }}>
                      {msg.is_global ? "🌍 Général" : "👤 Personnel"}
                    </span>
                  </div>
                  
                  <p style={{ margin: "0 0 12px", fontSize: 13.5, lineHeight: 1.6, color: THEME.textSecondary }}>
                    {msg.content}
                  </p>
                  
                  <p style={{ margin: 0, fontSize: 11, color: THEME.textMuted }}>
                    {new Date(msg.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </GlassCard>
      )}
      
      {/* ==================== FAQ ==================== */}
      {!isAdmin && activeTab === "tickets" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={{ marginTop: 28 }}>
          <GlassCard style={{ padding: "24px 28px" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 700, color: "#fff" }}>❓ FAQ rapide</h3>
            {[
              ["Combien de temps pour une réponse ?", "Généralement sous 24h ouvrables. Les tickets urgents sont traités en priorité."],
              ["Comment modifier mon profil ?", "Créez un ticket catégorie Compte / Profil avec vos informations. Notre équipe le fera sous 24h."],
              ["Problème de coins ?", "Choisissez la catégorie Pièces / Wallet et décrivez le problème. Indiquez le montant et la date."],
              ["Je n'arrive pas à rejoindre un tournoi ?", "Vérifiez votre Free Fire ID dans votre profil, puis créez un ticket catégorie Tournois."],
              ["Comment contacter le support rapidement ?", "Cliquez sur + Nouveau ticket en haut à droite de cette page."],
            ].map(([q, a]) => (
              <details key={q} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${THEME.borderLight}` }}>
                <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14, color: THEME.textPrimary, listStyle: "none", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: THEME.primary }}>▸</span> {q}
                </summary>
                <p style={{ margin: "10px 0 0 22px", fontSize: 13, color: THEME.textSecondary, lineHeight: 1.7 }}>{a}</p>
              </details>
            ))}
          </GlassCard>
        </motion.div>
      )}

      {/* ==================== MODAL NOUVEAU TICKET ==================== */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: GRADIENTS.card,
                border: `1px solid ${THEME.borderLight}`,
                borderRadius: 24,
                padding: "32px",
                maxWidth: 560,
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Nouveau ticket</h2>
                  <p style={{ margin: "4px 0 0", color: THEME.textSecondary, fontSize: 13 }}>Décrivez-nous votre problème</p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  style={{
                    background: alpha(THEME.error, 0.1),
                    border: `1px solid ${alpha(THEME.error, 0.3)}`,
                    borderRadius: 12,
                    width: 36,
                    height: 36,
                    fontSize: 18,
                    color: THEME.error,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <StyledInput
                  label="Sujet *"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ex: Problème de connexion, Paiement non reçu..."
                />
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: THEME.textSecondary, display: "block", marginBottom: 8 }}>
                      Catégorie
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      style={{
                        width: "100%",
                        background: alpha("#fff", 0.03),
                        border: `1px solid ${THEME.borderLight}`,
                        borderRadius: 12,
                        padding: "10px 12px",
                        color: THEME.textPrimary,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      <option value="compte">👤 Compte</option>
                      <option value="tournoi">🎮 Tournoi</option>
                      <option value="coins">💰 Coins</option>
                      <option value="paiement">💳 Paiement</option>
                      <option value="autre">💬 Autre</option>
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: THEME.textSecondary, display: "block", marginBottom: 8 }}>
                      Priorité
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { value: "low", label: "Basse", color: "#94a3b8" },
                        { value: "normal", label: "Normale", color: THEME.primary },
                        { value: "urgent", label: "Urgente", color: THEME.error },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setFormData({ ...formData, priority: opt.value })}
                          style={{
                            flex: 1,
                            background: formData.priority === opt.value ? alpha(opt.color, 0.15) : "transparent",
                            border: `1px solid ${formData.priority === opt.value ? alpha(opt.color, 0.4) : THEME.borderLight}`,
                            borderRadius: 10,
                            padding: "8px 0",
                            color: formData.priority === opt.value ? opt.color : THEME.textSecondary,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: THEME.textSecondary, display: "block", marginBottom: 8 }}>
                    Description détaillée
                  </label>
                  <textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    rows={6}
                    placeholder="Décrivez votre problème en détail pour que nous puissions vous aider au mieux..."
                    style={{
                      width: "100%",
                      background: alpha("#fff", 0.03),
                      border: `1px solid ${THEME.borderLight}`,
                      borderRadius: 12,
                      padding: "12px",
                      color: THEME.textPrimary,
                      fontSize: 13,
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
                
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button
                    onClick={() => setShowForm(false)}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: `1px solid ${THEME.borderLight}`,
                      borderRadius: 12,
                      padding: "12px",
                      color: THEME.textSecondary,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Annuler
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={createTicket}
                    disabled={!formData.subject.trim() || sending}
                    style={{
                      flex: 2,
                      background: formData.subject.trim() ? GRADIENTS.primary : alpha("#fff", 0.05),
                      border: "none",
                      borderRadius: 12,
                      padding: "12px",
                      color: formData.subject.trim() ? "white" : THEME.textMuted,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: formData.subject.trim() ? "pointer" : "default",
                    }}
                  >
                    {sending ? "Envoi en cours..." : "Envoyer le ticket"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Styles responsive */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-back-btn {
            display: flex !important;
          }
          .support-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
    </>
  );
}