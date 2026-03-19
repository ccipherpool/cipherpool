import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

// === CONSTANTS & THEME ===
const THEME = {
  cyan: "#00d4ff",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  green: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b",
  pink: "#ec4899",
  bg: "#0a0c10",
  card: "#111317",
  cardHover: "#1a1d24",
  border: "#1e2128",
  text: "#ffffff",
  textMuted: "#8f9bb3"
};

const COLORS = [THEME.cyan, THEME.indigo, THEME.violet, THEME.green, THEME.amber, THEME.pink];

const rgba = (color, alpha) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// === COMPONENTS ===
function TeamAvatar({ team, size = 48 }) {
  const accent = team?.accent_color || THEME.cyan;
  const borderRadius = Math.round(size * 0.25);
  const fontSize = Math.round(size * 0.4);

  if (team?.logo_url) {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius,
        overflow: "hidden",
        border: `2px solid ${rgba(accent, 0.3)}`,
        boxShadow: `0 0 20px ${rgba(accent, 0.2)}`,
        flexShrink: 0
      }}>
        <img 
          src={team.logo_url} 
          alt={team?.name || "team"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement.style.background = `linear-gradient(135deg, ${rgba(accent, 0.2)}, ${THEME.card})`; }}
        />
      </div>
    );
  }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius,
      background: `linear-gradient(135deg, ${rgba(accent, 0.2)}, ${THEME.card})`,
      border: `2px solid ${rgba(accent, 0.3)}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Bebas Neue', cursive",
      fontSize,
      color: accent,
      flexShrink: 0,
      boxShadow: `0 0 20px ${rgba(accent, 0.1)}`
    }}>
      {team?.tag?.[0] || "?"}
    </div>
  );
}

function RoleBadge({ role }) {
  const config = {
    captain: { color: THEME.amber, icon: "👑", label: "CAPITAINE" },
    co_captain: { color: THEME.violet, icon: "⚡", label: "CO-CAPITAINE" },
    member: { color: THEME.indigo, icon: "🎮", label: "MEMBRE" }
  }[role] || { color: THEME.indigo, icon: "🎮", label: role?.toUpperCase() };

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10,
      fontWeight: 500,
      color: config.color,
      background: rgba(config.color, 0.1),
      border: `1px solid ${rgba(config.color, 0.2)}`,
      padding: "4px 8px",
      borderRadius: 6,
      letterSpacing: 0.5
    }}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

function StatCard({ value, label, color, icon }) {
  return (
    <div style={{
      flex: 1,
      background: rgba(color, 0.05),
      border: `1px solid ${rgba(color, 0.1)}`,
      borderRadius: 12,
      padding: "12px 8px",
      textAlign: "center"
    }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 28, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: THEME.textMuted, letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

// === MAIN COMPONENT ===
export default function TeamProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useOutletContext();

  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [myRole, setMyRole] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("members");
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", tag: "", description: "", accent_color: THEME.cyan, is_open: true
  });

  const chatEndRef = useRef(null);

  const isCaptain = myRole === "captain";
  const isCoCapt = myRole === "co_captain";
  const isMember = !!myRole;
  const isAdmin = ["admin", "super_admin"].includes(profile?.role);
  const isSuperAdmin = profile?.role === "super_admin";
  const canManage = isCaptain || isCoCapt || isAdmin;

  // === DATA FETCHING ===
  const fetchTeamData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch team details
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select(`
          *,
          captain:profiles!teams_captain_id_fkey(id, full_name, avatar_url, free_fire_id)
        `)
        .eq("id", id)
        .single();

      if (teamError) throw teamError;
      if (!teamData) {
        navigate("/teams");
        return;
      }

      setTeam(teamData);
      setEditForm({
        name: teamData.name,
        tag: teamData.tag,
        description: teamData.description || "",
        accent_color: teamData.accent_color || THEME.cyan,
        is_open: teamData.is_open
      });

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from("team_members")
        .select(`
          *,
          profile:profiles!team_members_user_id_fkey(id, full_name, avatar_url, free_fire_id, level)
        `)
        .eq("team_id", id)
        .order("role", { ascending: true });

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Set current user's role — défini EN DEHORS du if pour être accessible plus bas
      const currentMember = profile?.id
        ? (membersData || []).find(m => m.user_id === profile.id)
        : null;
      setMyRole(currentMember?.role || null);

      // Fetch tournaments
      const { data: tournamentsData } = await supabase
        .from("team_tournaments")
        .select(`
          *,
          tournament:tournaments(name, background_color, mode, prize_coins, status, start_date)
        `)
        .eq("team_id", id)
        .order("joined_at", { ascending: false })
        .limit(10);

      setTournaments(tournamentsData || []);

      // ✅ FIX: utilise currentMember (local) — myRole (state) pas encore mis à jour ici
      const isMemberLocal = !!currentMember;
      const canManageLocal = currentMember?.role === "captain" || currentMember?.role === "co_captain" || isAdmin;

      // Fetch chat if member or admin
      if (isMemberLocal || isAdmin) {
        await fetchChatMessages();
      }

      // Fetch join requests if manager
      if (canManageLocal || isAdmin) {
        await fetchJoinRequests();
      }

    } catch (err) {
      console.error("Error fetching team data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("team_messages")
        .select(`
          *,
          sender:profiles!team_messages_sender_id_fkey(full_name, avatar_url)
        `)
        .eq("team_id", id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) throw error;
      setChatMessages(data || []);
    } catch (err) {
      console.error("Error fetching chat:", err);
    }
  };

  const fetchJoinRequests = async () => {
    if (!id) return;
    
    try {
      // Utiliser une fonction RPC pour éviter les problèmes de permission
      const { data, error } = await supabase
        .rpc("get_team_join_requests", { p_team_id: id });

      if (error) throw error;
      setJoinRequests(data || []);
    } catch (err) {
      console.error("Error fetching join requests:", err);
      // Fallback: essayer avec la table directement si RPC échoue
      try {
        const { data, error } = await supabase
          .from("team_join_requests")
          .select(`
            *,
            user:profiles!team_join_requests_user_id_fkey(id, full_name, avatar_url, free_fire_id, level)
          `)
          .eq("team_id", id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (!error) setJoinRequests(data || []);
      } catch (fallbackErr) {
        console.error("Fallback also failed:", fallbackErr);
      }
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [id, profile?.id]);

  // Real-time chat subscription
  // FIX: utilise id + profile?.id — pas isMember (calculé après mount)
  useEffect(() => {
    if (!id || !profile?.id) return;

    const channel = supabase
      .channel(`team-chat-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_messages",
          filter: `team_id=eq.${id}`
        },
        async (payload) => {
          const newMsg = payload.new;

          setChatMessages(prev => {
            // Si message déjà présent (vrai ID) → ignorer
            if (prev.some(m => m.id === newMsg.id)) return prev;

            // Si c'est MON message optimiste (sender_id correspond + contenu identique)
            // → remplacer le temp par le vrai ID
            const tempIdx = prev.findIndex(
              m => typeof m.id === "string" && m.id.startsWith("temp-") &&
                   m.sender_id === newMsg.sender_id &&
                   m.content === newMsg.content
            );
            if (tempIdx !== -1) {
              const updated = [...prev];
              updated[tempIdx] = { ...newMsg, sender: prev[tempIdx].sender };
              return updated;
            }

            // Message d'un autre utilisateur → ajouter
            return [...prev, { ...newMsg, sender: { full_name: "...", avatar_url: null } }];
          });

          // Enrichir avec profil expéditeur (pour messages d'autres)
          const { data: sender } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", newMsg.sender_id)
            .single();
          if (sender) {
            setChatMessages(prev =>
              prev.map(m => m.id === newMsg.id ? { ...m, sender } : m)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, profile?.id]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // === ACTIONS ===
  const sendMessage = async () => {
    if (!chatInput.trim() || sending || !profile?.id) return;

    const text = chatInput.trim();
    const tempId = `temp-${Date.now()}`;

    // ✅ Optimistic update — message visible immédiatement
    const optimisticMsg = {
      id: tempId,
      team_id: id,
      sender_id: profile.id,
      content: text,
      created_at: new Date().toISOString(),
      sender: {
        full_name: profile.full_name || "Vous",
        avatar_url: profile.avatar_url || null
      }
    };
    setChatMessages(prev => [...prev, optimisticMsg]);
    setChatInput("");
    setSending(true);

    try {
      const { data, error } = await supabase
        .from("team_messages")
        .insert([{
          team_id: id,
          sender_id: profile.id,
          content: text
        }])
        .select()
        .single();

      if (error) throw error;

      // Remplacer le message temporaire par le vrai
      if (data) {
        setChatMessages(prev =>
          prev.map(m => m.id === tempId
            ? { ...data, sender: optimisticMsg.sender }
            : m
          )
        );
      }
    } catch (err) {
      console.error("Error sending message:", err);
      // Rollback — supprimer le message temporaire
      setChatMessages(prev => prev.filter(m => m.id !== tempId));
      setChatInput(text);
      alert("❌ Erreur lors de l'envoi du message");
    } finally {
      setSending(false);
    }
  };

  const handleAcceptRequest = async (requestId, userId) => {
    try {
      const { data, error } = await supabase
        .rpc("approve_team_join_request", {
          p_request_id: requestId,
          p_team_id: id,
          p_user_id: userId
        });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur lors de l'acceptation");
      
      await fetchTeamData();
    } catch (err) {
      alert("❌ " + err.message);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const { error } = await supabase
        .from("team_join_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id
        })
        .eq("id", requestId);

      if (error) throw error;
      await fetchJoinRequests();
    } catch (err) {
      alert("❌ " + err.message);
    }
  };

  const handleKickMember = async (userId) => {
    if (!confirm("⚠️ Êtes-vous sûr de vouloir expulser ce membre ?")) return;

    try {
      const { data, error } = await supabase
        .rpc("team_kick_member", {
          p_team_id: id,
          p_user_id: userId
        });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur lors de l'expulsion");
      
      await fetchTeamData();
    } catch (err) {
      alert("❌ " + err.message);
    }
  };

  const handlePromoteToCoCapt = async (userId) => {
    if (!isCaptain) return;

    try {
      const { data, error } = await supabase
        .rpc("team_promote_member", {
          p_team_id: id,
          p_user_id: userId,
          p_role: "co_captain"
        });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur lors de la promotion");
      
      await fetchTeamData();
    } catch (err) {
      alert("❌ " + err.message);
    }
  };

  const handleLeaveTeam = async () => {
    if (!confirm("Quitter cette équipe ?")) return;

    try {
      const { data, error } = await supabase
        .rpc("leave_team", {
          p_team_id: id,
          p_user_id: profile.id
        });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur lors du départ");
      
      navigate("/teams");
    } catch (err) {
      alert("❌ " + err.message);
    }
  };

  const handleDisbandTeam = async () => {
    if (!isCaptain) return;
    if (!confirm("⚠️ DISSOUDRE L'ÉQUIPE ?\nCette action est irréversible !")) return;

    try {
      const { data, error } = await supabase
        .rpc("team_disband", { p_team_id: id });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur lors de la dissolution");
      
      navigate("/teams");
    } catch (err) {
      alert("❌ " + err.message);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from("teams")
        .update({
          name: editForm.name,
          tag: editForm.tag.toUpperCase(),
          description: editForm.description,
          accent_color: editForm.accent_color,
          is_open: editForm.is_open
        })
        .eq("id", id);

      if (error) throw error;
      
      setShowEditModal(false);
      await fetchTeamData();
    } catch (err) {
      alert("❌ " + err.message);
    }
  };

  const handleAdminDeleteTeam = async () => {
    if (!isSuperAdmin) return;
    if (!confirm("⚠️ SUPPRIMER DÉFINITIVEMENT CETTE ÉQUIPE ?\nCette action est irréversible !")) return;

    setAdminActionLoading(true);
    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", id);

      if (error) throw error;
      navigate("/teams");
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleRequestJoin = async () => {
    try {
      const { data, error } = await supabase
        .rpc("team_request_join", { p_team_id: id });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur lors de la demande");
      
      alert("✅ Demande envoyée avec succès !");
    } catch (err) {
      alert("❌ " + err.message);
    }
  };

  // === RENDER STATES ===
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: THEME.bg
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{
            width: 48,
            height: 48,
            border: `3px solid ${rgba(THEME.cyan, 0.1)}`,
            borderTopColor: THEME.cyan,
            borderRadius: "50%"
          }}
        />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        background: THEME.bg
      }}>
        <div style={{
          padding: 32,
          background: THEME.card,
          border: `1px solid ${rgba(THEME.red, 0.2)}`,
          borderRadius: 16,
          textAlign: "center"
        }}>
          <p style={{ color: THEME.red, fontFamily: "'JetBrains Mono', monospace", marginBottom: 16 }}>
            ❌ {error || "Équipe non trouvée"}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/teams")}
            style={{
              padding: "10px 22px",
              borderRadius: 10,
              background: rgba(THEME.cyan, 0.1),
              border: `1px solid ${rgba(THEME.cyan, 0.2)}`,
              color: THEME.cyan,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              cursor: "pointer"
            }}
          >
            ← Retour aux équipes
          </motion.button>
        </div>
      </div>
    );
  }

  const accentColor = team.accent_color || THEME.cyan;

  // === TABS CONFIG ===
  const tabs = [
    { id: "members", label: "MEMBRES", icon: "👥", count: members.length },
    ...(isMember || isAdmin ? [{ id: "chat", label: "CHAT", icon: "💬", count: chatMessages.filter(m => !m.read).length }] : []),
    { id: "tournaments", label: "TOURNOIS", icon: "🏆", count: tournaments.length },
    ...(canManage ? [{ id: "requests", label: "DEMANDES", icon: "📨", count: joinRequests.length }] : [])
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: ${THEME.bg};
        }

        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${rgba(THEME.cyan, 0.2)};
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${rgba(THEME.cyan, 0.3)};
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.text,
        fontFamily: "'Space Grotesk', sans-serif"
      }}>
        {/* Header Banner */}
        <div style={{
          position: "relative",
          overflow: "hidden",
          background: `linear-gradient(135deg, ${rgba(accentColor, 0.15)}, ${THEME.card})`,
          borderBottom: `1px solid ${rgba(accentColor, 0.2)}`,
          padding: "32px 40px"
        }}>
          {/* Animated background gradient */}
          <motion.div
            animate={{
              background: [
                `radial-gradient(circle at 20% 50%, ${rgba(accentColor, 0.15)} 0%, transparent 50%)`,
                `radial-gradient(circle at 80% 30%, ${rgba(accentColor, 0.15)} 0%, transparent 50%)`,
                `radial-gradient(circle at 20% 50%, ${rgba(accentColor, 0.15)} 0%, transparent 50%)`
              ]
            }}
            transition={{ duration: 8, repeat: Infinity }}
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none"
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Top row */}
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 24,
              flexWrap: "wrap",
              marginBottom: 24
            }}>
              <TeamAvatar team={team} size={100} />

              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 8
                }}>
                  <h1 style={{
                    fontFamily: "'Bebas Neue', cursive",
                    fontSize: 48,
                    letterSpacing: 2,
                    color: "#fff",
                    margin: 0,
                    lineHeight: 1
                  }}>
                    {team.name}
                  </h1>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    color: accentColor,
                    background: rgba(accentColor, 0.1),
                    border: `1px solid ${rgba(accentColor, 0.2)}`,
                    padding: "4px 12px",
                    borderRadius: 8,
                    letterSpacing: 2
                  }}>
                    [{team.tag}]
                  </span>
                  <div style={{
                    padding: "4px 12px",
                    borderRadius: 8,
                    background: team.is_open ? rgba(THEME.green, 0.1) : rgba(THEME.red, 0.1),
                    border: `1px solid ${team.is_open ? rgba(THEME.green, 0.2) : rgba(THEME.red, 0.2)}`,
                    color: team.is_open ? THEME.green : THEME.red,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    letterSpacing: 1
                  }}>
                    {team.is_open ? "OUVERT" : "FERMÉ"}
                  </div>
                </div>

                {team.description && (
                  <p style={{
                    color: THEME.textMuted,
                    fontSize: 14,
                    lineHeight: 1.6,
                    marginBottom: 8,
                    maxWidth: 600
                  }}>
                    {team.description}
                  </p>
                )}

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: THEME.textMuted
                }}>
                  <span>👑 Capitaine: {team.captain?.full_name || "—"}</span>
                  <span>•</span>
                  <span>👥 {members.length} membres</span>
                  <span>•</span>
                  <span>🏆 {team.tournaments_played || 0} tournois</span>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 12,
              marginBottom: 24
            }}>
              <StatCard value={team.points || 0} label="POINTS" color={accentColor} icon="⭐" />
              <StatCard value={team.wins || 0} label="VICTOIRES" color={THEME.green} icon="🏆" />
              <StatCard value={team.tournaments_played || 0} label="TOURNOIS" color={THEME.indigo} icon="🎯" />
              <StatCard value={team.rank || "#?"} label="RANG" color={THEME.amber} icon="📊" />
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {!isMember && team.is_open && profile && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRequestJoin}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${accentColor}, ${THEME.indigo})`,
                    border: "none",
                    color: "#fff",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 1,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <span>🙋</span>
                  REJOINDRE
                </motion.button>
              )}

              {canManage && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowEditModal(true)}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 10,
                    background: rgba(accentColor, 0.1),
                    border: `1px solid ${rgba(accentColor, 0.2)}`,
                    color: accentColor,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    letterSpacing: 1,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <span>✏️</span>
                  MODIFIER
                </motion.button>
              )}

              {isMember && !isCaptain && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLeaveTeam}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 10,
                    background: rgba(THEME.red, 0.1),
                    border: `1px solid ${rgba(THEME.red, 0.2)}`,
                    color: THEME.red,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    letterSpacing: 1,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <span>🚪</span>
                  QUITTER
                </motion.button>
              )}

              {isCaptain && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDisbandTeam}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 10,
                    background: rgba(THEME.red, 0.1),
                    border: `1px solid ${rgba(THEME.red, 0.2)}`,
                    color: THEME.red,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    letterSpacing: 1,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <span>💥</span>
                  DISSOUDRE
                </motion.button>
              )}

              {isAdmin && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAdminPanel(p => !p)}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 10,
                    background: rgba(THEME.amber, 0.1),
                    border: `1px solid ${rgba(THEME.amber, 0.2)}`,
                    color: THEME.amber,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    letterSpacing: 1,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <span>🛡️</span>
                  ADMIN
                </motion.button>
              )}
            </div>

            {/* Admin Panel */}
            <AnimatePresence>
              {showAdminPanel && isAdmin && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    marginTop: 20,
                    padding: 20,
                    borderRadius: 12,
                    background: rgba(THEME.amber, 0.05),
                    border: `1px solid ${rgba(THEME.amber, 0.15)}`
                  }}
                >
                  <p style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    letterSpacing: 2,
                    color: THEME.amber,
                    marginBottom: 12
                  }}>
                    ⚙️ PANEL ADMINISTRATEUR
                  </p>
                  
                  {isSuperAdmin && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAdminDeleteTeam}
                      disabled={adminActionLoading}
                      style={{
                        padding: "10px 20px",
                        borderRadius: 8,
                        background: rgba(THEME.red, 0.1),
                        border: `1px solid ${rgba(THEME.red, 0.2)}`,
                        color: THEME.red,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        cursor: adminActionLoading ? "not-allowed" : "pointer",
                        opacity: adminActionLoading ? 0.5 : 1
                      }}
                    >
                      {adminActionLoading ? "..." : "🗑️ SUPPRIMER L'ÉQUIPE"}
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          padding: "0 40px",
          borderBottom: `1px solid ${THEME.border}`,
          display: "flex",
          gap: 4,
          overflowX: "auto"
        }}>
          {tabs.map(tab => (
            <motion.button
              key={tab.id}
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "16px 20px",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${activeTab === tab.id ? accentColor : "transparent"}`,
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: 1,
                color: activeTab === tab.id ? THEME.text : THEME.textMuted,
                transition: "all 0.2s",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  background: activeTab === tab.id ? rgba(accentColor, 0.2) : rgba(THEME.textMuted, 0.1),
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: 9
                }}>
                  {tab.count}
                </span>
              )}
            </motion.button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "32px 40px" }}>
          {/* Members Tab */}
          {activeTab === "members" && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 12
            }}>
              {members.map((member, index) => {
                const profileData = member.profile;
                const isCurrentUser = profileData?.id === profile?.id;
                const memberAccent = member.role === "captain" ? THEME.amber :
                                    member.role === "co_captain" ? THEME.violet : accentColor;

                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    style={{
                      background: isCurrentUser ? rgba(memberAccent, 0.05) : THEME.card,
                      border: `1px solid ${isCurrentUser ? rgba(memberAccent, 0.2) : THEME.border}`,
                      borderRadius: 14,
                      padding: 16,
                      transition: "all 0.2s",
                      cursor: "pointer"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = isCurrentUser ? rgba(memberAccent, 0.08) : THEME.cardHover}
                    onMouseLeave={e => e.currentTarget.style.background = isCurrentUser ? rgba(memberAccent, 0.05) : THEME.card}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${rgba(memberAccent, 0.2)}, ${THEME.card})`,
                        border: `2px solid ${rgba(memberAccent, 0.3)}`,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "'Bebas Neue', cursive",
                        fontSize: 20,
                        color: memberAccent,
                        flexShrink: 0
                      }}>
                        {profileData?.avatar_url ? (
                          <img 
                            src={profileData.avatar_url} 
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          profileData?.full_name?.[0] || "?"
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                          marginBottom: 4
                        }}>
                          <p style={{
                            fontFamily: "'Bebas Neue', cursive",
                            fontSize: 16,
                            letterSpacing: 1,
                            color: "#fff",
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}>
                            {profileData?.full_name || "—"}
                          </p>
                          <RoleBadge role={member.role} />
                          {isCurrentUser && (
                            <span style={{
                              fontSize: 10,
                              color: THEME.textMuted,
                              fontFamily: "'JetBrains Mono', monospace"
                            }}>
                              (vous)
                            </span>
                          )}
                        </div>

                        {profileData?.free_fire_id && (
                          <p style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            color: THEME.textMuted
                          }}>
                            FF: {profileData.free_fire_id}
                            {profileData.level && ` · Niv. ${profileData.level}`}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      {canManage && !isCurrentUser && member.role !== "captain" && (
                        <div style={{ display: "flex", gap: 4 }}>
                          {isCaptain && member.role === "member" && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePromoteToCoCapt(profileData.id);
                              }}
                              style={{
                                padding: "6px",
                                borderRadius: 6,
                                background: rgba(THEME.violet, 0.1),
                                border: `1px solid ${rgba(THEME.violet, 0.2)}`,
                                color: THEME.violet,
                                cursor: "pointer",
                                fontSize: 12
                              }}
                              title="Promouvoir co-capitaine"
                            >
                              ⚡
                            </motion.button>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleKickMember(profileData.id);
                            }}
                            style={{
                              padding: "6px",
                              borderRadius: 6,
                              background: rgba(THEME.red, 0.1),
                              border: `1px solid ${rgba(THEME.red, 0.2)}`,
                              color: THEME.red,
                              cursor: "pointer",
                              fontSize: 12
                            }}
                            title="Expulser"
                          >
                            🦵
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === "chat" && (isMember || isAdmin) && (
            <div style={{
              background: THEME.card,
              border: `1px solid ${THEME.border}`,
              borderRadius: 16,
              overflow: "hidden",
              height: 600,
              display: "flex",
              flexDirection: "column"
            }}>
              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px"
              }}>
                {chatMessages.length === 0 ? (
                  <div style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 8,
                    color: THEME.textMuted
                  }}>
                    <span style={{ fontSize: 32 }}>💬</span>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                      Aucun message pour le moment
                    </p>
                    <p style={{ fontSize: 12, color: rgba(THEME.textMuted, 0.7) }}>
                      Soyez le premier à écrire !
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {chatMessages.map((msg) => {
                      const isMe = msg.sender_id === profile?.id;
                      const sender = msg.sender;

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            display: "flex",
                            gap: 10,
                            flexDirection: isMe ? "row-reverse" : "row"
                          }}
                        >
                          {/* Avatar */}
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: `linear-gradient(135deg, ${rgba(accentColor, 0.2)}, ${THEME.card})`,
                            border: `1px solid ${rgba(accentColor, 0.2)}`,
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "'Bebas Neue', cursive",
                            fontSize: 14,
                            color: accentColor,
                            flexShrink: 0
                          }}>
                            {sender?.avatar_url ? (
                              <img 
                                src={sender.avatar_url} 
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              sender?.full_name?.[0] || "?"
                            )}
                          </div>

                          {/* Message */}
                          <div style={{
                            maxWidth: "70%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: isMe ? "flex-end" : "flex-start"
                          }}>
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 2
                            }}>
                              <span style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 9,
                                color: isMe ? accentColor : THEME.textMuted
                              }}>
                                {isMe ? "Vous" : (sender?.full_name || "Inconnu")}
                              </span>
                              <span style={{
                                fontSize: 8,
                                color: rgba(THEME.textMuted, 0.5)
                              }}>
                                {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>
                            <div style={{
                              padding: "10px 14px",
                              borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                              background: isMe ? rgba(accentColor, 0.1) : rgba(THEME.text, 0.05),
                              border: `1px solid ${isMe ? rgba(accentColor, 0.15) : "transparent"}`,
                              color: THEME.text,
                              fontSize: 13,
                              lineHeight: 1.5,
                              wordBreak: "break-word"
                            }}>
                              {msg.content || msg.message}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{
                padding: "16px 20px",
                borderTop: `1px solid ${THEME.border}`,
                display: "flex",
                gap: 10
              }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Écrivez votre message..."
                  style={{
                    flex: 1,
                    background: rgba(THEME.text, 0.05),
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: THEME.text,
                    fontSize: 13,
                    fontFamily: "'Space Grotesk', sans-serif",
                    outline: "none"
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={sendMessage}
                  disabled={sending || !chatInput.trim()}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 8,
                    background: chatInput.trim() ? `linear-gradient(135deg, ${accentColor}, ${THEME.indigo})` : rgba(THEME.text, 0.05),
                    border: "none",
                    color: chatInput.trim() ? "#fff" : rgba(THEME.text, 0.3),
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: chatInput.trim() ? "pointer" : "not-allowed"
                  }}
                >
                  {sending ? "..." : "ENVOYER"}
                </motion.button>
              </div>
            </div>
          )}

          {/* Tournaments Tab */}
          {activeTab === "tournaments" && (
            <div>
              {tournaments.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  background: THEME.card,
                  border: `1px solid ${THEME.border}`,
                  borderRadius: 16
                }}>
                  <span style={{ fontSize: 48, marginBottom: 16, display: "block" }}>🏆</span>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: THEME.textMuted }}>
                    Aucun tournoi pour le moment
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {tournaments.map((entry, index) => {
                    const tournament = entry.tournament;
                    const tourneyColor = tournament?.background_color || accentColor;

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          padding: "16px 20px",
                          background: THEME.card,
                          border: `1px solid ${THEME.border}`,
                          borderRadius: 12,
                          cursor: "pointer"
                        }}
                        onClick={() => navigate(`/tournaments/${entry.tournament_id}`)}
                      >
                        <div style={{
                          width: 48,
                          height: 48,
                          borderRadius: 10,
                          background: rgba(tourneyColor, 0.1),
                          border: `1px solid ${rgba(tourneyColor, 0.2)}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 24
                        }}>
                          🏆
                        </div>

                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: "#fff",
                            marginBottom: 4
                          }}>
                            {tournament?.name || "Tournoi"}
                          </p>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            color: THEME.textMuted
                          }}>
                            <span>{tournament?.mode?.toUpperCase() || "?"}</span>
                            <span>•</span>
                            <span>
                              {new Date(entry.joined_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}
                            </span>
                            {tournament?.status && (
                              <>
                                <span>•</span>
                                <span style={{
                                  color: tournament.status === "ongoing" ? THEME.green :
                                         tournament.status === "upcoming" ? THEME.amber : THEME.textMuted
                                }}>
                                  {tournament.status}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {tournament?.prize_coins > 0 && (
                          <div style={{
                            padding: "6px 12px",
                            background: rgba(THEME.amber, 0.1),
                            border: `1px solid ${rgba(THEME.amber, 0.2)}`,
                            borderRadius: 8,
                            color: THEME.amber,
                            fontFamily: "'Bebas Neue', cursive",
                            fontSize: 18
                          }}>
                            💎 {tournament.prize_coins}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Join Requests Tab */}
          {activeTab === "requests" && canManage && (
            <div>
              {joinRequests.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  background: THEME.card,
                  border: `1px solid ${THEME.border}`,
                  borderRadius: 16
                }}>
                  <span style={{ fontSize: 48, marginBottom: 16, display: "block" }}>📨</span>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: THEME.textMuted }}>
                    Aucune demande en attente
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {joinRequests.map((request, index) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "16px 20px",
                        background: THEME.card,
                        border: `1px solid ${THEME.border}`,
                        borderRadius: 12
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${rgba(accentColor, 0.2)}, ${THEME.card})`,
                        border: `2px solid ${rgba(accentColor, 0.3)}`,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "'Bebas Neue', cursive",
                        fontSize: 20,
                        color: accentColor,
                        flexShrink: 0
                      }}>
                        {request.user?.avatar_url ? (
                          <img 
                            src={request.user.avatar_url} 
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          request.user?.full_name?.[0] || "?"
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: "#fff",
                          marginBottom: 4
                        }}>
                          {request.user?.full_name || "—"}
                        </p>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10,
                          color: THEME.textMuted
                        }}>
                          <span>FF: {request.user?.free_fire_id || "—"}</span>
                          <span>•</span>
                          <span>
                            {new Date(request.created_at).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 8 }}>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleAcceptRequest(request.id, request.user_id)}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            background: rgba(THEME.green, 0.1),
                            border: `1px solid ${rgba(THEME.green, 0.2)}`,
                            color: THEME.green,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4
                          }}
                        >
                          ✓ ACCEPTER
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRejectRequest(request.id)}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            background: rgba(THEME.red, 0.1),
                            border: `1px solid ${rgba(THEME.red, 0.2)}`,
                            color: THEME.red,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4
                          }}
                        >
                          ✕ REFUSER
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: rgba(THEME.bg, 0.9),
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
              padding: 20
            }}
            onClick={e => {
              if (e.target === e.currentTarget) setShowEditModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                width: "100%",
                maxWidth: 480,
                background: THEME.card,
                border: `1px solid ${THEME.border}`,
                borderRadius: 20,
                overflow: "hidden"
              }}
            >
              {/* Header */}
              <div style={{
                padding: "24px 28px",
                borderBottom: `1px solid ${THEME.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <h2 style={{
                  fontFamily: "'Bebas Neue', cursive",
                  fontSize: 24,
                  letterSpacing: 2,
                  color: "#fff",
                  margin: 0
                }}>
                  Modifier l'équipe
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: THEME.textMuted,
                    fontSize: 20,
                    cursor: "pointer"
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Form */}
              <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{
                    display: "block",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: THEME.textMuted,
                    marginBottom: 6
                  }}>
                    NOM DE L'ÉQUIPE
                  </label>
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nom de l'équipe"
                    style={{
                      width: "100%",
                      background: rgba(THEME.text, 0.05),
                      border: `1px solid ${THEME.border}`,
                      borderRadius: 8,
                      padding: "10px 14px",
                      color: THEME.text,
                      fontSize: 13,
                      fontFamily: "'Space Grotesk', sans-serif",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: "block",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: THEME.textMuted,
                    marginBottom: 6
                  }}>
                    TAG (max 4 caractères)
                  </label>
                  <input
                    value={editForm.tag}
                    onChange={e => setEditForm(f => ({ ...f, tag: e.target.value.toUpperCase().slice(0, 4) }))}
                    placeholder="TAG"
                    style={{
                      width: "100%",
                      background: rgba(THEME.text, 0.05),
                      border: `1px solid ${THEME.border}`,
                      borderRadius: 8,
                      padding: "10px 14px",
                      color: THEME.text,
                      fontSize: 13,
                      fontFamily: "'Bebas Neue', cursive",
                      letterSpacing: 2,
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: "block",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: THEME.textMuted,
                    marginBottom: 6
                  }}>
                    DESCRIPTION
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Description de l'équipe..."
                    rows={3}
                    style={{
                      width: "100%",
                      background: rgba(THEME.text, 0.05),
                      border: `1px solid ${THEME.border}`,
                      borderRadius: 8,
                      padding: "10px 14px",
                      color: THEME.text,
                      fontSize: 13,
                      fontFamily: "'Space Grotesk', sans-serif",
                      outline: "none",
                      resize: "vertical"
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: "block",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: THEME.textMuted,
                    marginBottom: 6
                  }}>
                    COULEUR D'ACCENT
                  </label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {COLORS.map(color => (
                      <motion.button
                        key={color}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setEditForm(f => ({ ...f, accent_color: color }))}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: color,
                          border: editForm.accent_color === color ? "2px solid #fff" : "2px solid transparent",
                          cursor: "pointer",
                          boxShadow: editForm.accent_color === color ? `0 0 15px ${color}` : "none"
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 0"
                }}>
                  <div
                    onClick={() => setEditForm(f => ({ ...f, is_open: !f.is_open }))}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: editForm.is_open ? THEME.green : rgba(THEME.text, 0.1),
                      cursor: "pointer",
                      position: "relative",
                      transition: "background 0.2s"
                    }}
                  >
                    <motion.div
                      animate={{ x: editForm.is_open ? 22 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      style={{
                        position: "absolute",
                        top: 2,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "#fff"
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 13, color: THEME.textMuted }}>
                    {editForm.is_open ? "Équipe ouverte" : "Équipe fermée"}
                  </span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveEdit}
                  style={{
                    padding: "14px",
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${accentColor}, ${THEME.indigo})`,
                    border: "none",
                    color: "#fff",
                    fontFamily: "'Bebas Neue', cursive",
                    fontSize: 18,
                    letterSpacing: 2,
                    cursor: "pointer",
                    marginTop: 8
                  }}
                >
                  ENREGISTRER
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}