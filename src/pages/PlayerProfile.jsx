import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { ArrowLeft, MapPin, Calendar, Globe, Shield, Trophy, Swords, Star, ChevronRight } from "lucide-react";

const C = {
  bg:       "#06080f",
  surface:  "rgba(10,14,26,0.98)",
  surface2: "rgba(15,20,35,0.95)",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.12)",
  indigo:   "#6366f1",
  cyan:     "#06b6d4",
  violet:   "#a855f7",
  green:    "#22c55e",
  amber:    "#f59e0b",
  red:      "#ef4444",
  text:     "#f1f5f9",
  text2:    "rgba(255,255,255,0.5)",
  text3:    "rgba(255,255,255,0.25)",
};

const STATUS_LABEL = {
  online:        { label: "Online",          color: "#22c55e" },
  in_game:       { label: "In Game",         color: "#f59e0b" },
  in_tournament: { label: "In Tournament",   color: "#f59e0b" },
  streaming:     { label: "Streaming",       color: "#a855f7" },
  away:          { label: "Away",            color: "#94a3b8" },
  offline:       { label: "Offline",         color: "rgba(255,255,255,0.25)" },
};

const ROLE_BADGE = {
  founder:    { label: "Founder",     color: "#f59e0b" },
  fondateur:  { label: "Founder",     color: "#f59e0b" },
  super_admin:{ label: "Super Admin", color: "#ef4444" },
  admin:      { label: "Admin",       color: "#6366f1" },
  designer:   { label: "Designer",    color: "#a855f7" },
  mod:        { label: "Mod",         color: "#06b6d4" },
};

const T_STATUS_COLOR = {
  completed:       "#22c55e",
  live:            "#06b6d4",
  results_pending: "#a855f7",
  cancelled:       "rgba(255,255,255,0.2)",
};

function flag(code) {
  if (!code || code.length !== 2) return "";
  try {
    return code.toUpperCase().split("").map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join("");
  } catch { return ""; }
}

function getStatus(profile) {
  const p = Array.isArray(profile.user_presence) ? profile.user_presence[0] : profile.user_presence;
  if (!p) return "offline";
  const fresh = Date.now() - new Date(p.last_seen).getTime() < 15 * 60 * 1000;
  return fresh && p.status !== "offline" ? p.status : "offline";
}

function InfoPill({ icon, text }) {
  if (!text) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, fontSize: 12, color: C.text2 }}>
      {icon} {text}
    </span>
  );
}

function SocialLink({ href, icon, label }) {
  if (!href) return null;
  const full = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a href={full} target="_blank" rel="noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, fontSize: 12, color: C.text2, textDecoration: "none", transition: "all 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text2; }}
    >
      {icon} {label}
    </a>
  );
}

// ════════════════════════════════════════════════════════════════
export default function PlayerProfile() {
  const { username } = useParams();
  const navigate = useNavigate();

  const [player,   setPlayer]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [history,  setHistory]  = useState([]);
  const [histTab,  setHistTab]  = useState("all"); // "all" | "wins"

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setNotFound(false);
    setHistory([]);

    supabase.from("profiles")
      .select(`
        id, username, avatar_url, bio, country, city, age, gender, level, xp, role, created_at,
        free_fire_name, free_fire_uid,
        instagram, tiktok, discord, youtube,
        user_presence(status, last_seen),
        clan_members(clans(id, name, tag, logo_url, accent_color)),
        team_members(teams(id, name, tag, logo_url))
      `)
      .eq("username", username)
      .eq("account_status", "active")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setPlayer(data);
        setLoading(false);

        // Fetch tournament history
        supabase.from("tournament_participants")
          .select(`
            status, created_at,
            tournaments(id, name, prize_coins, start_date, mode, status, entry_fee)
          `)
          .eq("user_id", data.id)
          .order("created_at", { ascending: false })
          .limit(20)
          .then(({ data: hist }) => setHistory(hist ?? []));
      });
  }, [username]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(99,102,241,0.2)", borderTopColor: C.indigo, animation: "pp-spin 0.8s linear infinite" }} />
      <span style={{ fontSize: 12, color: C.text3, fontWeight: 600 }}>Loading profile…</span>
      <style>{`@keyframes pp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (notFound || !player) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16, padding: 24 }}>
      <div style={{ fontSize: 48 }}>🔍</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Player not found</div>
      <p style={{ fontSize: 13, color: C.text2, textAlign: "center", maxWidth: 300 }}>
        "{username}" doesn't exist or is inactive.
      </p>
      <button onClick={() => navigate("/players")} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: "rgba(99,102,241,0.2)", color: C.indigo, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        ← Player Directory
      </button>
    </div>
  );

  const status    = getStatus(player);
  const statusInfo = STATUS_LABEL[status] || STATUS_LABEL.offline;
  const roleInfo  = ROLE_BADGE[player.role];
  const clan      = Array.isArray(player.clan_members) ? player.clan_members[0]?.clans : player.clan_members?.clans;
  const team      = Array.isArray(player.team_members) ? player.team_members[0]?.teams : player.team_members?.teams;
  const hasSocial = player.instagram || player.tiktok || player.discord || player.youtube;

  // Tournament stats
  const finishedHistory = history.filter(h => h.tournaments?.status === "completed");
  const wins     = finishedHistory.filter(h => h.status === "winner").length;
  const played   = history.filter(h => ["approved","eliminated","winner"].includes(h.status)).length;
  const totalPrize = finishedHistory
    .filter(h => h.status === "winner")
    .reduce((sum, h) => sum + (h.tournaments?.prize_coins || 0), 0);

  const filteredHistory = histTab === "wins"
    ? history.filter(h => h.status === "winner")
    : history.filter(h => ["approved","eliminated","winner","pending"].includes(h.status));

  const isOnline = status !== "offline";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "24px 20px 48px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 20, background: "none", border: "none", color: C.text2, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = C.text; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.text2; }}
        >
          <ArrowLeft size={15} /> Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >

          {/* Profile card */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden", marginBottom: 16 }}>

            {/* Banner with online glow */}
            <div style={{
              height: 90,
              background: isOnline
                ? `linear-gradient(135deg, rgba(99,102,241,0.2), rgba(34,197,94,0.1), rgba(6,182,212,0.12))`
                : "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(6,182,212,0.06), rgba(168,85,247,0.08))",
              position: "relative",
            }}>
              <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 40px)" }} />
              {/* Online indicator glow */}
              {isOnline && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${statusInfo.color}80, transparent)` }} />
              )}
            </div>

            <div style={{ padding: "0 24px 24px" }}>
              {/* Avatar */}
              <div style={{ marginTop: -44, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div style={{ position: "relative" }}>
                  <div style={{
                    width: 88, height: 88, borderRadius: 22,
                    border: `3px solid ${isOnline ? statusInfo.color + "60" : "#06080f"}`,
                    background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(6,182,212,0.1))",
                    overflow: "hidden",
                    boxShadow: isOnline ? `0 0 20px ${statusInfo.color}30` : "none",
                  }}>
                    {player.avatar_url
                      ? <img src={player.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: C.indigo }}>
                          {player.username?.[0]?.toUpperCase() || "?"}
                        </div>
                    }
                  </div>
                  <div style={{
                    position: "absolute", bottom: 4, right: 4,
                    width: 16, height: 16, borderRadius: "50%",
                    background: statusInfo.color,
                    border: "3px solid #06080f",
                    boxShadow: isOnline ? `0 0 8px ${statusInfo.color}` : "none",
                  }} />
                </div>

                {/* Level + stats */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {player.level && (
                    <div style={{
                      padding: "6px 14px", borderRadius: 10,
                      background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)",
                      fontSize: 12, fontWeight: 800, color: C.indigo,
                    }}>
                      Lvl {player.level}
                    </div>
                  )}
                  {wins > 0 && (
                    <div style={{
                      padding: "6px 12px", borderRadius: 10,
                      background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
                      fontSize: 12, fontWeight: 800, color: C.amber,
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                      🏆 {wins}W
                    </div>
                  )}
                </div>
              </div>

              {/* Name + role + status */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: 0, letterSpacing: -0.4 }}>
                    {player.username}
                  </h1>
                  {roleInfo && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: roleInfo.color, background: `${roleInfo.color}18`, border: `1px solid ${roleInfo.color}30`, borderRadius: 6, padding: "3px 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {roleInfo.label}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: statusInfo.color }}>
                  ● {statusInfo.label}
                </span>
              </div>

              {/* FF info */}
              {(player.free_fire_name || player.free_fire_uid) && (
                <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.14)", marginBottom: 14, display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {player.free_fire_name && (
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 }}>FF Name</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.indigo }}>🎮 {player.free_fire_name}</div>
                    </div>
                  )}
                  {player.free_fire_uid && (
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 }}>UID</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.text, fontFamily: "monospace" }}>{player.free_fire_uid}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Info pills */}
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
                {player.country && (
                  <InfoPill icon={<span>{flag(player.country)}</span>} text={`${player.country}${player.city ? `, ${player.city}` : ""}`} />
                )}
                {player.age && (
                  <InfoPill icon={<Calendar size={12} />} text={`${player.age} years old`} />
                )}
                {player.gender === "male"   && <InfoPill icon="♂" text="Male" />}
                {player.gender === "female" && <InfoPill icon="♀" text="Female" />}
                <InfoPill icon={<Globe size={12} />} text={`Joined ${new Date(player.created_at).getFullYear()}`} />
              </div>

              {/* Bio */}
              {player.bio && (
                <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.7, margin: 0 }}>
                  {player.bio}
                </p>
              )}
            </div>
          </div>

          {/* Tournament stats row */}
          {played > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}
            >
              {[
                { label: "TOURNAMENTS",  value: played,                    color: C.cyan,    icon: <Swords size={13} /> },
                { label: "WINS",         value: wins,                      color: C.amber,   icon: "🏆" },
                { label: "PRIZE EARNED", value: `${totalPrize.toLocaleString()} CP`, color: "#f97316", icon: <Trophy size={13} /> },
              ].map(({ label, value, color, icon }) => (
                <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 4, color }}>{icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color, fontFamily: "Orbitron, monospace", letterSpacing: -0.5 }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>
                    {label}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Clan + Team */}
          {(clan || team) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
              {clan && (
                <Link to={`/clans/${clan.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: C.surface, border: "1px solid rgba(168,85,247,0.2)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, transition: "border-color 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(168,85,247,0.4)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(168,85,247,0.2)"; }}
                  >
                    {clan.logo_url
                      ? <img src={clan.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />
                      : <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛡</div>
                    }
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(168,85,247,0.7)", textTransform: "uppercase", letterSpacing: 0.8 }}>Clan</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>[{clan.tag}] {clan.name}</div>
                    </div>
                  </div>
                </Link>
              )}
              {team && (
                <Link to={`/teams/${team.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: C.surface, border: "1px solid rgba(6,182,212,0.2)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, transition: "border-color 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(6,182,212,0.4)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(6,182,212,0.2)"; }}
                  >
                    {team.logo_url
                      ? <img src={team.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />
                      : <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(6,182,212,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚔</div>
                    }
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(6,182,212,0.7)", textTransform: "uppercase", letterSpacing: 0.8 }}>Team</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{team.name}</div>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          )}

          {/* Social links */}
          {hasSocial && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>Social</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <SocialLink href={player.instagram} icon="📸" label="Instagram" />
                <SocialLink href={player.tiktok}    icon="🎵" label="TikTok" />
                <SocialLink href={player.discord}   icon="💬" label="Discord" />
                <SocialLink href={player.youtube}   icon="▶️" label="YouTube" />
              </div>
            </div>
          )}

          {/* Tournament history */}
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}
            >
              {/* Header */}
              <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  Tournament History
                </div>
                {/* Filter tabs */}
                <div style={{ display: "flex", gap: 4 }}>
                  {["all", "wins"].map(t => (
                    <button key={t} onClick={() => setHistTab(t)}
                      style={{
                        padding: "4px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer",
                        background: histTab === t ? "rgba(99,102,241,0.15)" : "transparent",
                        border: `1px solid ${histTab === t ? "rgba(99,102,241,0.3)" : "transparent"}`,
                        color: histTab === t ? C.indigo : C.text3,
                        textTransform: "capitalize",
                      }}>
                      {t === "wins" ? "🏆 Wins" : "All"}
                    </button>
                  ))}
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div style={{ padding: "24px 20px", textAlign: "center", color: C.text3, fontSize: 12 }}>
                  No wins recorded yet
                </div>
              ) : (
                <div style={{ padding: "12px 0" }}>
                  {filteredHistory.slice(0, 8).map((entry, i) => {
                    const t = entry.tournaments;
                    if (!t) return null;
                    const isWin = entry.status === "winner";
                    const isElim = entry.status === "eliminated";
                    const statusColor = isWin ? C.amber : isElim ? C.red : C.text3;
                    const statusLabel = isWin ? "Won" : isElim ? "Eliminated" : entry.status === "approved" ? "Played" : entry.status;

                    return (
                      <Link key={i} to={`/tournaments/${t.id}`} style={{ textDecoration: "none" }}>
                        <div
                          style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "10px 20px",
                            borderBottom: i < filteredHistory.length - 1 ? `1px solid ${C.border}` : "none",
                            transition: "background 0.12s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                        >
                          {/* Trophy icon */}
                          <div style={{
                            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 15,
                            background: isWin ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${isWin ? "rgba(245,158,11,0.25)" : C.border}`,
                          }}>
                            {isWin ? "🏆" : "🎮"}
                          </div>

                          {/* Tournament info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {t.name}
                            </div>
                            <div style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>
                              {t.mode && <span style={{ marginRight: 8 }}>{t.mode}</span>}
                              {t.start_date && new Date(t.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          </div>

                          {/* Status + prize */}
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: statusColor, marginBottom: 2 }}>
                              {statusLabel}
                            </div>
                            {isWin && t.prize_coins && (
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#f97316" }}>
                                +{t.prize_coins.toLocaleString()} CP
                              </div>
                            )}
                          </div>

                          <ChevronRight size={13} style={{ color: C.text3, flexShrink: 0 }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

        </motion.div>
      </div>

      <style>{`@keyframes pp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
