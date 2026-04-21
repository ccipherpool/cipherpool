import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

const C = {
  card:    "rgba(26,26,53,0.7)",
  border:  "rgba(255,255,255,0.07)",
  orange:  "#FF6B35",
  orangeD: "#E55A2B",
  purple:  "#6E56CF",
  purpleL: "#9E8CFC",
  teal:    "#2DD4BF",
  danger:  "#EF4444",
  text:    "#F0F0FA",
  text2:   "#B8B8D8",
  text3:   "#8B8BA7",
  text4:   "#6B6B8A",
};

const ROLE_ORDER = ["leader","co_leader","elite","member","recruit"];
const ROLE_CFG = {
  leader:    { label: "LEADER",     color: C.orange  },
  co_leader: { label: "CO-LEADER", color: C.purpleL },
  elite:     { label: "ELITE",      color: C.teal    },
  member:    { label: "MEMBRE",     color: C.text3   },
  recruit:   { label: "RECRUE",     color: C.text4   },
};

function RoleBadge({ role }) {
  const cfg = ROLE_CFG[role] || { label: role, color: C.text4 };
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: 1.5, fontFamily: "'JetBrains Mono',monospace",
      color: cfg.color, background: `${cfg.color}18`,
      border: `1px solid ${cfg.color}30`, borderRadius: 99,
      padding: "2px 7px",
    }}>{cfg.label}</span>
  );
}

export default function ClanDetails() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const ctx        = useOutletContext() || {};
  const { profile } = ctx;

  const [clan,         setClan]        = useState(null);
  const [members,      setMembers]     = useState([]);
  const [myMembership, setMyMembership] = useState(null);
  const [loading,      setLoading]     = useState(true);
  const [applying,     setApplying]    = useState(false);
  const [appMsg,       setAppMsg]      = useState("");
  const [tab,          setTab]         = useState("members"); // members | info | chat
  const [chatMsgs,     setChatMsgs]    = useState([]);
  const [newMsg,       setNewMsg]      = useState("");
  const [sendingMsg,   setSendingMsg]  = useState(false);

  useEffect(() => { fetchClan(); }, [id]);
  useEffect(() => { if (profile?.id) fetchMyMembership(); }, [profile?.id, id]);
  useEffect(() => { if (tab === "chat" && myMembership) fetchChat(); }, [tab, myMembership]);

  const fetchClan = async () => {
    setLoading(true);
    try {
      const { data: clanData } = await supabase.from("clans").select("*").eq("id", id).single();
      if (!clanData) { navigate("/clans"); return; }
      setClan(clanData);

      const { data: mData } = await supabase
        .from("clan_members")
        .select("*, profiles(id,full_name,avatar_url,level,free_fire_id)")
        .eq("clan_id", id)
        .order("joined_at");
      setMembers(mData || []);
    } catch (_) {}
    setLoading(false);
  };

  const fetchMyMembership = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from("clan_members").select("clan_id,role").eq("user_id", profile.id).maybeSingle();
    setMyMembership(data);
  };

  const fetchChat = async () => {
    const { data } = await supabase
      .from("clan_messages")
      .select("*, profiles(full_name,avatar_url)")
      .eq("clan_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    setChatMsgs((data || []).reverse());
  };

  const handleApply = async () => {
    if (!profile?.id || !appMsg.trim()) return;
    setApplying(true);
    try {
      await supabase.from("clan_applications").insert({
        clan_id: id, user_id: profile.id, message: appMsg.trim(), status: "pending",
      });
      alert("Candidature envoyée !");
      setAppMsg("");
    } catch (_) { alert("Erreur lors de la candidature."); }
    setApplying(false);
  };

  const handleSendMsg = async () => {
    if (!newMsg.trim() || sendingMsg) return;
    setSendingMsg(true);
    try {
      await supabase.from("clan_messages").insert({ clan_id: id, user_id: profile?.id, message: newMsg.trim() });
      setNewMsg("");
      await fetchChat();
    } catch (_) {}
    setSendingMsg(false);
  };

  const isInThisClan = myMembership?.clan_id === id;
  const isLeader     = isInThisClan && ["leader","co_leader"].includes(myMembership?.role);
  const inOtherClan  = myMembership && myMembership.clan_id !== id;

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.text3 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔄</div>
        <p style={{ fontFamily: "'JetBrains Mono',monospace", letterSpacing: 4, fontSize: 10 }}>CHARGEMENT...</p>
      </div>
    </div>
  );

  if (!clan) return null;

  const sorted = [...members].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));

  return (
    <div style={{ minHeight: "100vh", padding: "0 0 80px" }}>

      {/* Banner */}
      <div style={{
        height: 160, position: "relative",
        background: clan.accent_color
          ? `linear-gradient(135deg,${clan.accent_color}50,rgba(11,11,26,0.9))`
          : `linear-gradient(135deg,rgba(110,86,207,0.35),rgba(255,107,53,0.15),rgba(11,11,26,1))`,
      }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 40%,rgba(11,11,26,1))" }} />
        <div style={{ position: "absolute", top: 16, left: 16 }}>
          <Link to="/clans" style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8,
            background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)",
            border: `1px solid ${C.border}`, color: C.text2, textDecoration: "none", fontSize: 12,
          }}>← Clans</Link>
        </div>
        {isLeader && (
          <div style={{ position: "absolute", top: 16, right: 16 }}>
            <span style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
              background: "rgba(255,107,53,0.15)", border: "1px solid rgba(255,107,53,0.3)",
              color: C.orange, fontFamily: "'JetBrains Mono',monospace",
            }}>⚡ LEADER</span>
          </div>
        )}
      </div>

      {/* Clan header info */}
      <div style={{ padding: "0 24px", marginTop: -40, position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 20 }}>
          {/* Logo */}
          <div style={{
            width: 72, height: 72, borderRadius: 18, flexShrink: 0,
            background: clan.accent_color || `linear-gradient(135deg,${C.purple},${C.orange})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `3px solid rgba(11,11,26,1)`, fontSize: 32,
            boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
          }}>
            {clan.logo_url
              ? <img src={clan.logo_url} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }} />
              : "🛡️"}
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: C.text }}>{clan.name}</h1>
              <span style={{
                background: "rgba(255,107,53,0.12)", color: C.orange,
                border: `1px solid rgba(255,107,53,0.25)`, borderRadius: 7,
                fontSize: 10, padding: "3px 8px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
              }}>[{clan.tag}]</span>
              <span style={{
                fontSize: 9, letterSpacing: 1, fontFamily: "'JetBrains Mono',monospace",
                color: clan.is_open ? C.teal : C.text4,
                background: clan.is_open ? "rgba(45,212,191,0.08)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${clan.is_open ? "rgba(45,212,191,0.2)" : C.border}`,
                borderRadius: 99, padding: "3px 8px",
              }}>{clan.is_open ? "OUVERT" : "FERMÉ"}</span>
            </div>
            {clan.description && <p style={{ color: C.text3, fontSize: 13, margin: "4px 0 0" }}>{clan.description}</p>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: 10, marginBottom: 20 }}>
          {[
            { label: "MEMBRES",   value: members.length },
            { label: "VICTOIRES", value: clan.wins || 0 },
            { label: "DÉFAITES",  value: clan.losses || 0 },
            { label: "POINTS",    value: (clan.points || 0).toLocaleString("fr-FR") },
          ].map(s => (
            <div key={s.label} style={{ padding: "12px 8px", textAlign: "center", borderRadius: 12, background: C.card, border: `1px solid ${C.border}` }}>
              <div style={{ color: C.orange, fontSize: 18, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace" }}>{s.value}</div>
              <div style={{ color: C.text4, fontSize: 8, letterSpacing: 1, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Apply box — si pas membre et clan ouvert */}
        {!isInThisClan && !inOtherClan && clan.is_open && profile && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: 20, padding: 16, borderRadius: 14, background: C.card, border: `1px solid rgba(110,86,207,0.25)` }}>
            <h3 style={{ color: C.purpleL, fontSize: 13, fontWeight: 700, margin: "0 0 10px", fontFamily: "'Space Grotesk',sans-serif" }}>
              🎯 Postuler à ce clan
            </h3>
            <textarea
              value={appMsg}
              onChange={e => setAppMsg(e.target.value)}
              placeholder="Présente-toi et explique pourquoi tu veux rejoindre ce clan..."
              rows={3}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
                color: C.text, fontSize: 13, outline: "none", resize: "vertical",
                fontFamily: "'Space Grotesk',sans-serif", boxSizing: "border-box",
              }}
            />
            <button
              onClick={handleApply}
              disabled={applying || !appMsg.trim()}
              style={{
                marginTop: 10, padding: "10px 20px", borderRadius: 10, fontSize: 12,
                fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", letterSpacing: .5,
                background: applying || !appMsg.trim()
                  ? "rgba(110,86,207,0.2)"
                  : `linear-gradient(135deg,${C.purple},${C.purpleL})`,
                color: "#fff", border: "none", cursor: applying || !appMsg.trim() ? "not-allowed" : "pointer",
                boxShadow: "0 2px 14px rgba(110,86,207,0.3)",
              }}>
              {applying ? "ENVOI..." : "ENVOYER LA CANDIDATURE →"}
            </button>
          </motion.div>
        )}

        {inOtherClan && (
          <div style={{ marginBottom: 20, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: C.danger, fontSize: 12 }}>
            Tu es déjà membre d'un autre clan. Quitte-le d'abord pour postuler ici.
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.card, padding: 4, borderRadius: 12, border: `1px solid ${C.border}`, width: "fit-content" }}>
          {(isInThisClan ? ["members","info","chat"] : ["members","info"]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: "8px 16px", borderRadius: 9, cursor: "pointer", fontSize: 11,
                fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", letterSpacing: .5,
                background: tab === t ? `linear-gradient(135deg,${C.orange},${C.orangeD})` : "transparent",
                color:      tab === t ? "#fff" : C.text3,
                border: "none",
                boxShadow:  tab === t ? "0 2px 10px rgba(255,107,53,0.2)" : "none",
              }}>
              { t === "members" ? "MEMBRES" : t === "info" ? "INFO" : "CHAT 💬" }
            </button>
          ))}
        </div>

        {/* Tab: Members */}
        <AnimatePresence mode="wait">
          {tab === "members" && (
            <motion.div key="members" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sorted.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: C.card, border: `1px solid ${C.border}` }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg,${C.purple}60,${C.orange}40)`, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {m.profiles?.avatar_url
                        ? <img src={m.profiles.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ color: C.text3, fontSize: 14 }}>👤</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: C.text, fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.profiles?.full_name || "Joueur"}
                        </span>
                        <RoleBadge role={m.role} />
                      </div>
                      {m.profiles?.free_fire_id && (
                        <span style={{ color: C.text4, fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>
                          ID: {m.profiles.free_fire_id}
                        </span>
                      )}
                    </div>
                    {m.profiles?.level && (
                      <span style={{ color: C.orange, fontWeight: 800, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }}>
                        Niv.{m.profiles.level}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tab: Info */}
          {tab === "info" && (
            <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {clan.rules && (
                  <div style={{ padding: 16, borderRadius: 12, background: C.card, border: `1px solid ${C.border}` }}>
                    <h3 style={{ color: C.orange, fontSize: 12, fontWeight: 700, margin: "0 0 8px", letterSpacing: 1, fontFamily: "'JetBrains Mono',monospace" }}>RÈGLES</h3>
                    <p style={{ color: C.text2, fontSize: 13, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{clan.rules}</p>
                  </div>
                )}
                {clan.requirements && (
                  <div style={{ padding: 16, borderRadius: 12, background: C.card, border: `1px solid ${C.border}` }}>
                    <h3 style={{ color: C.purpleL, fontSize: 12, fontWeight: 700, margin: "0 0 8px", letterSpacing: 1, fontFamily: "'JetBrains Mono',monospace" }}>PRÉREQUIS</h3>
                    <p style={{ color: C.text2, fontSize: 13, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{clan.requirements}</p>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                  {clan.discord_link && (
                    <a href={clan.discord_link} target="_blank" rel="noopener noreferrer" style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(88,101,242,0.1)", border: "1px solid rgba(88,101,242,0.25)", color: "#7289DA", textDecoration: "none", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                      💬 Discord
                    </a>
                  )}
                  {clan.whatsapp_link && (
                    <a href={clan.whatsapp_link} target="_blank" rel="noopener noreferrer" style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.25)", color: "#25D366", textDecoration: "none", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                      📱 WhatsApp
                    </a>
                  )}
                </div>
                {!clan.rules && !clan.requirements && !clan.discord_link && !clan.whatsapp_link && (
                  <p style={{ color: C.text4, fontSize: 13, textAlign: "center", padding: 24 }}>Aucune information supplémentaire.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Tab: Chat (membres seulement) */}
          {tab === "chat" && isInThisClan && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                {/* Messages */}
                <div style={{ height: 320, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  {chatMsgs.length === 0 && (
                    <p style={{ color: C.text4, fontSize: 12, textAlign: "center", padding: "40px 0", fontFamily: "'JetBrains Mono',monospace" }}>
                      Aucun message. Soyez le premier à écrire !
                    </p>
                  )}
                  {chatMsgs.map(msg => (
                    <div key={msg.id} style={{ display: "flex", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg,${C.purple}40,${C.orange}20)`, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {msg.profiles?.avatar_url
                          ? <img src={msg.profiles.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 12 }}>👤</span>}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ color: C.text, fontSize: 12, fontWeight: 700 }}>{msg.profiles?.full_name || "?"}</span>
                          <span style={{ color: C.text4, fontSize: 9, fontFamily: "'JetBrains Mono',monospace" }}>
                            {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p style={{ color: C.text2, fontSize: 13, margin: 0 }}>{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Input */}
                <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderTop: `1px solid ${C.border}` }}>
                  <input
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendMsg()}
                    placeholder="Message..."
                    style={{ flex: 1, padding: "9px 14px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none", fontFamily: "'Space Grotesk',sans-serif" }}
                  />
                  <button
                    onClick={handleSendMsg}
                    disabled={sendingMsg || !newMsg.trim()}
                    style={{ padding: "9px 16px", borderRadius: 9, border: "none", cursor: sendingMsg || !newMsg.trim() ? "not-allowed" : "pointer", background: `linear-gradient(135deg,${C.orange},${C.orangeD})`, color: "#fff", fontWeight: 700, fontSize: 13 }}>
                    →
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
