import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useProfileData } from "../hooks/useProfileData";
import {
  ArrowLeft, CheckCircle2, Hash, MapPin, Calendar, Clock,
  Swords, Trophy, Target, Zap, Award,
  Aperture, Play, MessageCircle, Music2, Globe,
  BarChart3, Medal, Flame,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────
const countryFlag = (code) => {
  if (!code || code.length !== 2) return null;
  return code.toUpperCase().split("").map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join("");
};

const getRank = (points = 0) => {
  if (points >= 5000) return { label: "Legend",  color: "#f43f5e", glow: "rgba(244,63,94,0.5)",  icon: "👑", bg: "linear-gradient(135deg,#4a0010,#1a0008)", tier: 5 };
  if (points >= 2500) return { label: "Master",  color: "#a855f7", glow: "rgba(168,85,247,0.5)", icon: "💎", bg: "linear-gradient(135deg,#2d0a4a,#12001a)", tier: 4 };
  if (points >= 1200) return { label: "Diamond", color: "#3b82f6", glow: "rgba(59,130,246,0.5)", icon: "🔷", bg: "linear-gradient(135deg,#0a1a4a,#020820)", tier: 3 };
  if (points >= 600)  return { label: "Gold",    color: "#f59e0b", glow: "rgba(245,158,11,0.5)", icon: "🥇", bg: "linear-gradient(135deg,#3a2000,#1a0e00)", tier: 2 };
  if (points >= 200)  return { label: "Silver",  color: "#94a3b8", glow: "rgba(148,163,184,0.4)",icon: "🥈", bg: "linear-gradient(135deg,#1e2535,#0b0f1a)", tier: 1 };
  return                     { label: "Bronze",  color: "#cd7f32", glow: "rgba(205,127,50,0.4)", icon: "🥉", bg: "linear-gradient(135deg,#2a1400,#100800)", tier: 0 };
};

// ─── XP Ring ─────────────────────────────────────────────────
const XpRing = ({ progress, size = 104, rankColor, children }) => {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(progress, 100)) / 100;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={rankColor} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          style={{ filter: `drop-shadow(0 0 4px ${rankColor})` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
};

// ─── Win Rate Ring ────────────────────────────────────────────
const WinRateRing = ({ rate, size = 56 }) => {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(rate, 100)) / 100;
  const color = rate >= 60 ? "#10b981" : rate >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 800, color, lineHeight: 1 }}>{rate}%</span>
        <span style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>WIN</span>
      </div>
    </div>
  );
};

// ─── Social link ──────────────────────────────────────────────
const SocialLink = ({ href, icon: Icon, label, color }) => {
  if (!href) return null;
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
        borderRadius: 8, background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 600, textDecoration: "none",
        transition: "all 0.18s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}14`; e.currentTarget.style.borderColor = `${color}35`; e.currentTarget.style.color = color; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
    >
      <Icon size={13} color={color} /> {label}
    </a>
  );
};

// ─── Stat card ────────────────────────────────────────────────
const Stat = ({ icon: Icon, label, value, color }) => (
  <div style={{
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}14`, border: `1px solid ${color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={13} color={color} />
      </div>
      <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</span>
    </div>
    <span style={{ fontSize: 26, fontWeight: 900, color, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>{value}</span>
  </div>
);

// ══════════════════════════════════════════════════════════════
export default function UserProfile() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [tab, setTab] = useState("overview");

  const { profile, stats, achievements, recentMatches, loading, error } = useProfileData(id);

  const xpProgress = Math.min((((profile?.xp || 0) % 1000) / 1000) * 100, 100);
  const winRate    = stats?.total_matches ? Math.round((stats.wins / stats.total_matches) * 100) : 0;
  const kd         = stats?.kills && stats?.deaths ? (stats.kills / stats.deaths).toFixed(2) : (stats?.kills || 0);
  const rank       = getRank(stats?.total_points || 0);
  const flag       = countryFlag(profile?.country);
  const ffUID      = profile?.free_fire_uid || profile?.free_fire_id;
  const hasSocials = profile?.instagram || profile?.tiktok || profile?.discord || profile?.youtube;

  // ── Loading ────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#020617", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "up-spin 0.8s linear infinite", margin: "0 auto 14px" }} />
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0 }}>Loading profile…</p>
      </div>
      <style>{`@keyframes up-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !profile) return (
    <div style={{ minHeight: "100vh", background: "#020617", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontSize: 48 }}>😶</div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Profile not found</h2>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>{error || "This user doesn't exist or was removed."}</p>
      <button onClick={() => navigate(-1)} style={{ marginTop: 8, padding: "9px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
        ← Go back
      </button>
    </div>
  );

  const TABS = [
    { id: "overview",      label: "Overview",     icon: BarChart3 },
    { id: "achievements",  label: "Achievements", icon: Award, count: achievements.length },
    { id: "matches",       label: "Matches",      icon: Swords, count: recentMatches.length },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "#f1f5f9", fontFamily: "Satoshi, Inter, system-ui, sans-serif", paddingBottom: 60 }}>

      {/* Back button */}
      <div style={{ padding: "18px 24px 0" }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      {/* Banner */}
      <div style={{ height: 180, margin: "18px 24px 0", borderRadius: 20, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: rank.bg }} />
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 30% 50%, ${rank.color}25, transparent 60%)` }} />
        <div style={{ position: "absolute", top: 16, right: 20, fontSize: 48, opacity: 0.15 }}>
          {rank.icon}
        </div>
        <div style={{ position: "absolute", bottom: 14, left: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: rank.color, background: `${rank.color}18`, border: `1px solid ${rank.color}30`, padding: "3px 10px", borderRadius: 20 }}>
            {rank.icon} {rank.label}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            {(stats?.total_points || 0).toLocaleString()} pts
          </span>
        </div>
      </div>

      {/* Player info card */}
      <div style={{ margin: "0 24px", background: "rgba(8,10,22,0.98)", backdropFilter: "blur(20px)", borderTop: `1px solid ${rank.color}20`, borderRadius: "0 0 20px 20px", padding: "0 24px 22px" }}>
        <div style={{ display: "flex", gap: 18, marginTop: -52, flexWrap: "wrap", alignItems: "flex-end" }}>

          {/* Avatar */}
          <XpRing progress={xpProgress} size={104} rankColor={rank.color}>
            <div style={{
              width: 86, height: 86, borderRadius: 20, overflow: "hidden",
              background: `linear-gradient(135deg, ${rank.color}cc, #06b6d4)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 30, color: "#fff",
              boxShadow: `0 0 28px ${rank.glow}, 0 4px 24px rgba(0,0,0,0.7)`,
            }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (profile.username?.[0]?.toUpperCase() || "?")}
            </div>
          </XpRing>

          {/* Name + meta */}
          <div style={{ flex: 1, paddingBottom: 2, minWidth: 200 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>
                {profile.username || "Player"}
              </h1>
              {(profile.verified || profile.verification_status === "verified") && (
                <span style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 20, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.22)", color: "#06b6d4", fontSize: 10, fontWeight: 700 }}>
                  <CheckCircle2 size={9} /> VERIFIED
                </span>
              )}
              <span style={{ padding: "2px 10px", borderRadius: 20, background: `${rank.color}18`, border: `1px solid ${rank.color}28`, color: rank.color, fontSize: 11, fontWeight: 700 }}>
                LVL {profile.level || 1}
              </span>
              {profile.role && profile.role !== "user" && (
                <span style={{ padding: "2px 10px", borderRadius: 20, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.22)", color: "#fbbf24", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                  {profile.role.replace("_", " ")}
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginBottom: 10 }}>
              {profile.free_fire_name && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  <Swords size={11} style={{ color: "#f59e0b" }} />
                  <span style={{ color: "#fbbf24", fontWeight: 700 }}>{profile.free_fire_name}</span>
                </span>
              )}
              {ffUID && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                  <Hash size={11} style={{ color: "#6366f1" }} />
                  <span style={{ color: "#c7d2fe", fontWeight: 600 }}>{ffUID}</span>
                </span>
              )}
              {(profile.country || flag) && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                  {flag && <span>{flag}</span>} {profile.country}
                </span>
              )}
              {profile.city && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                  <MapPin size={11} style={{ color: "#06b6d4" }} /> {profile.city}
                </span>
              )}
              {profile.age && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                  <Calendar size={11} /> {profile.age} yrs
                </span>
              )}
              {profile.created_at && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
                  <Clock size={11} /> Since {new Date(profile.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                </span>
              )}
            </div>

            {/* XP bar */}
            <div style={{ maxWidth: 280 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 4, fontWeight: 600 }}>
                <span>XP {(profile.xp || 0) % 1000} / 1000</span>
                <span>→ Level {(profile.level || 1) + 1}</span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                  style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${rank.color}, #06b6d4)`, boxShadow: `0 0 10px ${rank.glow}` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "14px 0 0", maxWidth: 600, lineHeight: 1.65 }}>
            {profile.bio}
          </p>
        )}

        {/* Social links */}
        {hasSocials && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            <SocialLink href={profile.instagram} icon={Aperture}      label="Instagram" color="#e1306c" />
            <SocialLink href={profile.tiktok}    icon={Music2}        label="TikTok"    color="#69c9d0" />
            <SocialLink href={profile.discord}   icon={MessageCircle} label="Discord"   color="#5865f2" />
            <SocialLink href={profile.youtube}   icon={Play}          label="YouTube"   color="#ff0000" />
          </div>
        )}
      </div>

      {/* Tabs + content */}
      <div style={{ margin: "24px 24px 0" }}>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 4 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "9px 14px", borderRadius: 9, border: "none", cursor: "pointer",
                background: tab === t.id ? "rgba(99,102,241,0.15)" : "transparent",
                color: tab === t.id ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                fontSize: 13, fontWeight: 700, transition: "all 0.18s",
              }}
            >
              <t.icon size={14} />
              {t.label}
              {t.count > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, background: tab === t.id ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.08)", color: tab === t.id ? "#a5b4fc" : "rgba(255,255,255,0.4)", borderRadius: 10, padding: "1px 7px" }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── Overview ── */}
          {tab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
                <Stat icon={Trophy}  label="Tournaments"    value={stats.tournaments_played || 0}  color="#f59e0b" />
                <Stat icon={Zap}     label="Wins"           value={stats.wins || 0}               color="#10b981" />
                <Stat icon={Target}  label="Kills"          value={stats.kills || 0}              color="#ef4444" />
                <Stat icon={Flame}   label="K/D Ratio"      value={kd}                            color="#f97316" />
              </div>

              {/* Win rate + rank tier */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 16 }}>
                  <WinRateRing rate={winRate} size={56} />
                  <div>
                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Win Rate</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: winRate >= 60 ? "#10b981" : winRate >= 40 ? "#f59e0b" : "#ef4444", fontFamily: "'Space Grotesk', sans-serif" }}>
                      {winRate}%
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                      {stats.wins || 0}W / {stats.losses || 0}L
                    </div>
                  </div>
                </div>

                <div style={{ background: `${rank.color}0a`, border: `1px solid ${rank.color}20`, borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 36 }}>{rank.icon}</div>
                  <div>
                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Rank</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: rank.color, fontFamily: "'Space Grotesk', sans-serif" }}>{rank.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{(stats?.total_points || 0).toLocaleString()} pts</div>
                  </div>
                </div>
              </div>

              {/* Top 3 / Best placement */}
              {(stats?.top3_finishes > 0 || stats?.best_position) && (
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {stats?.top3_finishes > 0 && (
                    <Stat icon={Medal} label="Top 3 Finishes" value={stats.top3_finishes} color="#a855f7" />
                  )}
                  {stats?.best_position && (
                    <Stat icon={Trophy} label="Best Placement" value={`#${stats.best_position}`} color="#06b6d4" />
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Achievements ── */}
          {tab === "achievements" && (
            <motion.div key="ach" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              {achievements.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🏅</div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0 }}>No achievements yet</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                  {achievements.map(a => (
                    <div key={a.id} style={{ display: "flex", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, alignItems: "center" }}>
                      <div style={{ fontSize: 24, flexShrink: 0 }}>{a.achievements?.icon || "🏅"}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 2 }}>{a.achievements?.name || "Achievement"}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{a.achievements?.description || ""}</div>
                        {a.earned_at && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 4 }}>{new Date(a.earned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Recent matches ── */}
          {tab === "matches" && (
            <motion.div key="matches" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              {recentMatches.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>⚔️</div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: 0 }}>No matches yet</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {recentMatches.map(m => {
                    const pos = m.position || m.placement;
                    const posColor = pos === 1 ? "#f59e0b" : pos <= 3 ? "#94a3b8" : "rgba(255,255,255,0.4)";
                    return (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: pos === 1 ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${posColor}30`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 900, color: posColor, lineHeight: 1 }}>{pos}</span>
                          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>PLACE</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {m.matches?.tournaments?.name || m.tournaments?.name || "Tournament"}
                          </div>
                          <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>💀 {m.kills || 0} kills</span>
                            {m.mvp && <span style={{ fontSize: 11, color: "#f59e0b" }}>⭐ MVP</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          {(m.reward || m.coins_awarded) > 0 && (
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>+{m.reward || m.coins_awarded} 🪙</div>
                          )}
                          {m.created_at && (
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                              {new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <style>{`@keyframes up-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
