import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trophy, Users, Clock, Coins, Zap, Shield, Globe,
  Calendar, ChevronRight, AlertCircle, Lock, Gamepad2, Award,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const STATUS_CONFIG = {
  open:      { label: "Open",       color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)" },
  ongoing:   { label: "Live Now",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)" },
  completed: { label: "Completed",  color: "#6366f1", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.25)" },
  cancelled: { label: "Cancelled",  color: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.25)"  },
};

function timeUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  if (diff <= 0) return "Started";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PublicTournament() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchTournament();
  }, [id]);

  const fetchTournament = async () => {
    setLoading(true);
    try {
      const { data: t, error: tErr } = await supabase
        .from("tournaments")
        .select("id, name, status, banner_url, game, game_mode, max_players, current_players, prize_coins, entry_fee, starts_at, ends_at, description, rules, type, region, platform, is_verified, created_by, created_at")
        .eq("id", id)
        .single();
      if (tErr || !t) throw new Error("Tournament not found");
      setTournament(t);

      const { data: p } = await supabase
        .from("tournament_players")
        .select("user_id, joined_at, placement, kills, is_ready, profiles(username, avatar_url, fair_play_score, is_verified)")
        .eq("tournament_id", id)
        .order("joined_at", { ascending: true });
      setPlayers(p || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ─── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 0 32px #6366f130", animation: "pulse 1.5s ease-in-out infinite" }}>
              <Trophy size={24} color="#fff" />
            </div>
            <p style={{ color: "#52525b", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>Loading tournament…</p>
            <style>{`@keyframes pulse { 0%,100%{opacity:0.7;transform:scale(0.95)} 50%{opacity:1;transform:scale(1)} }`}</style>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error ───────────────────────────────────────────────
  if (error || !tournament) {
    return (
      <div style={pageStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <AlertCircle size={48} color="#ef4444" style={{ margin: "0 auto 16px", display: "block" }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f4f4f5", marginBottom: 8 }}>Tournament Not Found</h2>
            <p style={{ color: "#52525b", fontSize: 13, marginBottom: 24 }}>{error || "This tournament doesn't exist or has been removed."}</p>
            <Link to="/tournaments" style={{ display: "inline-block", padding: "10px 24px", background: "#6366f1", color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: 14 }}>
              Browse All Tournaments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[tournament.status] || STATUS_CONFIG.open;
  const spotsLeft = (tournament.max_players || 0) - players.length;
  const spotsPercent = Math.min(100, (players.length / (tournament.max_players || 1)) * 100);
  const timeLeft = tournament.status === "open" ? timeUntil(tournament.starts_at) : null;
  const isCompleted = tournament.status === "completed";

  const topPlayers = isCompleted
    ? [...players].sort((a, b) => (a.placement || 999) - (b.placement || 999)).slice(0, 3)
    : [];

  return (
    <div style={pageStyle}>
      <style>{`
        body { margin: 0; }
        .pt-hover { transition: background 0.12s, border-color 0.12s; }
        .pt-hover:hover { background: rgba(255,255,255,0.04) !important; border-color: rgba(255,255,255,0.1) !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>

      {/* ─── NAVBAR ─────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(8,8,13,0.9)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 56,
      }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={14} color="#fff" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#f4f4f5", letterSpacing: -0.3 }}>CipherPool</span>
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={copyLink} style={{
            padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
            background: copied ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)",
            color: copied ? "#10b981" : "#a1a1aa", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>
            {copied ? "✓ Copied!" : "📋 Share Link"}
          </button>
          <Link to="/login" style={{
            padding: "6px 14px", borderRadius: 8,
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <Gamepad2 size={12} /> Join CipherPool
          </Link>
        </div>
      </header>

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: `linear-gradient(160deg, #0e0e1a 0%, #08080d 60%)`,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "48px 24px 40px",
      }}>
        {/* Glow blob */}
        <div style={{
          position: "absolute", top: -80, right: -80, width: 400, height: 400,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 820, margin: "0 auto", position: "relative" }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 12, color: "#52525b" }}>
            <Globe size={11} />
            <span>Public Tournament</span>
            <ChevronRight size={11} />
            <span style={{ color: "#a1a1aa" }}>{tournament.name}</span>
          </div>

          {/* Status badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px", borderRadius: 20, background: status.bg, border: `1px solid ${status.border}`, marginBottom: 16 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: status.color, boxShadow: `0 0 6px ${status.color}` }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: status.color, letterSpacing: 0.5 }}>{status.label}</span>
            {timeLeft && (
              <span style={{ fontSize: 11, color: "#a1a1aa", marginLeft: 4 }}>• starts in {timeLeft}</span>
            )}
          </div>

          {/* Title */}
          <h1 style={{ fontSize: "clamp(24px, 5vw, 40px)", fontWeight: 900, color: "#f4f4f5", margin: "0 0 12px", letterSpacing: -0.5, lineHeight: 1.15 }}>
            {tournament.name}
          </h1>

          {/* Game + Mode tags */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {tournament.game && (
              <span style={{ padding: "4px 11px", borderRadius: 20, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8", fontSize: 11, fontWeight: 600 }}>
                🎮 {tournament.game}
              </span>
            )}
            {tournament.mode && (
              <span style={{ padding: "4px 11px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#a1a1aa", fontSize: 11, fontWeight: 600 }}>
                {tournament.mode}
              </span>
            )}
          </div>

          {/* Key stats row */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { icon: Users,  label: "Players",    value: `${players.length} / ${tournament.max_players || "?"}` },
              { icon: Coins,  label: "Entry Fee",  value: tournament.entry_fee ? `${tournament.entry_fee} CP` : "Free" },
              { icon: Trophy, label: "Prize Pool",  value: tournament.prize_coins ? `${tournament.prize_coins.toLocaleString()} CP` : "—" },
              { icon: Calendar, label: "Date",     value: formatDate(tournament.starts_at) },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <s.icon size={14} color="#52525b" />
                <span style={{ fontSize: 12, color: "#52525b" }}>{s.label}:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── CONTENT ─────────────────────────────────────────── */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px 80px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>

        {/* LEFT COLUMN */}
        <div>

          {/* Description */}
          {tournament.description && (
            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={cardStyle}>
              <h2 style={sectionTitle}>About This Tournament</h2>
              <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.7, margin: 0 }}>{tournament.description}</p>
            </motion.section>
          )}

          {/* Podium (completed only) */}
          {isCompleted && topPlayers.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={cardStyle}>
              <h2 style={sectionTitle}>🏆 Top Finishers</h2>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", padding: "8px 0" }}>
                {[1, 0, 2].map(idx => {
                  const p = topPlayers[idx];
                  if (!p) return null;
                  const rankColors = ["#f59e0b", "#6366f1", "#f97316"];
                  const rankLabels = ["1st", "2nd", "3rd"];
                  const heights = [120, 90, 70];
                  return (
                    <div key={idx} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ height: heights[idx], display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 8 }}>
                        <div style={{ fontSize: 22 }}>{["🥇", "🥈", "🥉"][idx]}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5", marginTop: 4 }}>
                          {p.profiles?.username || "Unknown"}
                        </div>
                        <div style={{ fontSize: 11, color: rankColors[idx], fontWeight: 600 }}>{rankLabels[idx]}</div>
                        {p.kills != null && <div style={{ fontSize: 10, color: "#52525b" }}>{p.kills} kills</div>}
                      </div>
                      <div style={{ height: heights[idx] * 0.5, background: `${rankColors[idx]}18`, border: `1px solid ${rankColors[idx]}30`, borderRadius: "8px 8px 0 0" }} />
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* Players list */}
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={cardStyle}>
            <h2 style={sectionTitle}>Players ({players.length})</h2>
            {players.length === 0 ? (
              <p style={{ fontSize: 13, color: "#52525b", textAlign: "center", padding: "24px 0" }}>No players joined yet. Be the first!</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {players.map((p, i) => {
                  const prof = p.profiles || {};
                  return (
                    <div key={i} className="pt-hover" style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", borderRadius: 10,
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                    }}>
                      <span style={{ width: 22, fontSize: 12, color: "#52525b", fontWeight: 700, textAlign: "center" }}>
                        {isCompleted && p.placement ? `#${p.placement}` : i + 1}
                      </span>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                        {prof.avatar_url
                          ? <img src={prof.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1" }}>{(prof.username || "?")[0]?.toUpperCase()}</span>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#f4f4f5", display: "flex", alignItems: "center", gap: 5 }}>
                          {prof.username || "Anonymous"}
                          {prof.is_verified && <span title="Verified" style={{ color: "#06b6d4", fontSize: 10 }}>✓</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#52525b" }}>
                          FP: {prof.fair_play_score ?? 100}
                          {isCompleted && p.kills != null && ` · ${p.kills} kills`}
                        </div>
                      </div>
                      {p.is_ready && <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>READY</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.section>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* CTA card */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...cardStyle, textAlign: "center", background: "linear-gradient(160deg, rgba(99,102,241,0.1), rgba(8,8,13,0))", border: "1px solid rgba(99,102,241,0.2)" }}>
            {tournament.status === "open" ? (
              <>
                <Trophy size={28} color="#6366f1" style={{ margin: "0 auto 12px", display: "block" }} />
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#f4f4f5", margin: "0 0 6px" }}>Join the Tournament!</h3>
                <p style={{ fontSize: 12, color: "#a1a1aa", margin: "0 0 16px", lineHeight: 1.5 }}>
                  Create a free account on CipherPool to compete and win CP prizes.
                </p>
                {tournament.entry_fee > 0 && (
                  <p style={{ fontSize: 11, color: "#f59e0b", marginBottom: 12, fontWeight: 600 }}>
                    Entry fee: {tournament.entry_fee} CP
                  </p>
                )}
                <Link to="/register" style={{
                  display: "block", padding: "11px 0", borderRadius: 10,
                  background: "linear-gradient(135deg, #6366f1, #818cf8)",
                  color: "#fff", fontWeight: 800, fontSize: 14, textDecoration: "none",
                  boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
                }}>
                  Register Free →
                </Link>
                <Link to="/login" style={{ display: "block", marginTop: 8, fontSize: 12, color: "#52525b", textDecoration: "none" }}>
                  Already have an account? <span style={{ color: "#6366f1" }}>Sign in</span>
                </Link>
              </>
            ) : tournament.status === "ongoing" ? (
              <>
                <Gamepad2 size={28} color="#f59e0b" style={{ margin: "0 auto 12px", display: "block" }} />
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#f4f4f5", margin: "0 0 6px" }}>Tournament is Live!</h3>
                <p style={{ fontSize: 12, color: "#a1a1aa", margin: "0 0 16px", lineHeight: 1.5 }}>
                  The battle is happening now. Watch the results on CipherPool.
                </p>
                <Link to="/login" style={{ display: "block", padding: "11px 0", borderRadius: 10, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                  Watch on CipherPool
                </Link>
              </>
            ) : (
              <>
                <Award size={28} color="#8b5cf6" style={{ margin: "0 auto 12px", display: "block" }} />
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#f4f4f5", margin: "0 0 6px" }}>Tournament Over</h3>
                <p style={{ fontSize: 12, color: "#a1a1aa", margin: "0 0 16px", lineHeight: 1.5 }}>
                  This tournament has ended. Browse upcoming events on CipherPool!
                </p>
                <Link to="/register" style={{ display: "block", padding: "11px 0", borderRadius: 10, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#8b5cf6", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                  Browse More Tournaments →
                </Link>
              </>
            )}
          </motion.div>

          {/* Spots progress */}
          {tournament.max_players && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={cardStyle}>
              <h3 style={{ ...sectionTitle, marginBottom: 12 }}>Capacity</h3>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#a1a1aa" }}>{players.length} joined</span>
                <span style={{ fontSize: 12, color: "#52525b" }}>{spotsLeft} spots left</span>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${spotsPercent}%`, borderRadius: 4, background: spotsPercent >= 90 ? "#ef4444" : spotsPercent >= 70 ? "#f59e0b" : "#6366f1", transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: 11, color: "#52525b", marginTop: 6, textAlign: "right" }}>{Math.round(spotsPercent)}% full</div>
            </motion.div>
          )}

          {/* Tournament details */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={cardStyle}>
            <h3 style={{ ...sectionTitle, marginBottom: 12 }}>Details</h3>
            {[
              { icon: Calendar, label: "Starts",    value: formatDate(tournament.starts_at) },
              { icon: Clock,    label: "Duration",  value: tournament.duration ? `${tournament.duration} min` : "—" },
              { icon: Lock,     label: "Entry Fee", value: tournament.entry_fee ? `${tournament.entry_fee} CP` : "Free" },
              { icon: Trophy,   label: "Prize Pool",value: tournament.prize_coins ? `${tournament.prize_coins.toLocaleString()} CP` : "—" },
              { icon: Shield,   label: "Mode",      value: tournament.mode || "—" },
            ].map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <d.icon size={13} color="#52525b" />
                <span style={{ fontSize: 12, color: "#52525b", flex: 1 }}>{d.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#f4f4f5" }}>{d.value}</span>
              </div>
            ))}
          </motion.div>

          {/* Room info hidden */}
          {(tournament.room_id || tournament.room_password) && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ ...cardStyle, textAlign: "center", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
              <Lock size={18} color="#ef4444" style={{ margin: "0 auto 8px", display: "block" }} />
              <p style={{ fontSize: 12, color: "#a1a1aa", margin: 0 }}>Room credentials are only visible to registered participants.</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px", textAlign: "center" }}>
        <Link to="/" style={{ fontSize: 13, fontWeight: 700, color: "#6366f1", textDecoration: "none" }}>CipherPool</Link>
        <span style={{ fontSize: 12, color: "#52525b", marginLeft: 8 }}>· Free Fire tournament platform</span>
      </footer>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#08080d",
  color: "#f4f4f5",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
};

const cardStyle = {
  background: "rgba(17,17,25,0.8)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
  padding: "20px",
  marginBottom: 0,
};

const sectionTitle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#f4f4f5",
  margin: "0 0 16px",
  letterSpacing: -0.2,
};
