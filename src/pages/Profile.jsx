import { useState, useRef, useCallback, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useProfileData } from "../hooks/useProfileData";
import {
  Settings, X, Upload, Camera, Star, ShieldCheck,
  Trophy, Target, Zap, TrendingUp, Award, GamepadIcon,
  Aperture, Play, MessageCircle, Music2, Globe,
  MapPin, Calendar, Hash, CheckCircle2, Clock,
  BarChart3, History, Medal, Swords, Flame,
  ChevronRight, Crown, Shield,
} from "lucide-react";
import { supabase } from "../lib/supabase";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const countryFlag = (code) => {
  if (!code || code.length !== 2) return null;
  return code.toUpperCase().split("").map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join("");
};

const getRank = (points = 0) => {
  if (points >= 5000) return { label: "Legend",   color: "#f43f5e", glow: "rgba(244,63,94,0.5)",   icon: "👑", bg: "linear-gradient(135deg,#4a0010,#1a0008)", tier: 5 };
  if (points >= 2500) return { label: "Master",   color: "#a855f7", glow: "rgba(168,85,247,0.5)",  icon: "💎", bg: "linear-gradient(135deg,#2d0a4a,#12001a)", tier: 4 };
  if (points >= 1200) return { label: "Diamond",  color: "#3b82f6", glow: "rgba(59,130,246,0.5)",  icon: "🔷", bg: "linear-gradient(135deg,#0a1a4a,#020820)", tier: 3 };
  if (points >= 600)  return { label: "Gold",     color: "#f59e0b", glow: "rgba(245,158,11,0.5)",  icon: "🥇", bg: "linear-gradient(135deg,#3a2000,#1a0e00)", tier: 2 };
  if (points >= 200)  return { label: "Silver",   color: "#94a3b8", glow: "rgba(148,163,184,0.4)", icon: "🥈", bg: "linear-gradient(135deg,#1e2535,#0b0f1a)", tier: 1 };
  return                      { label: "Bronze",  color: "#cd7f32", glow: "rgba(205,127,50,0.4)",  icon: "🥉", bg: "linear-gradient(135deg,#2a1400,#100800)", tier: 0 };
};

const AnimatedNumber = ({ value, duration = 1400 }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const target = Number(value) || 0;
    const frame = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [value, duration]);
  return <>{display.toLocaleString()}</>;
};

// ─── WIN RATE RING ────────────────────────────────────────────────────────────
const WinRateRing = ({ rate, size = 64 }) => {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(rate, 100)) / 100;
  const color = rate >= 60 ? "#10b981" : rate >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 800, color, lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif" }}>{rate}%</span>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontWeight: 600, letterSpacing: 0.3 }}>WIN</span>
      </div>
    </div>
  );
};

// ─── XP RING ─────────────────────────────────────────────────────────────────
const XpRing = ({ progress, size = 104, rankColor, children }) => {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(progress, 100)) / 100;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} width={size} height={size}>
        <defs>
          <linearGradient id="xpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={rankColor || "#6366f1"} />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#xpGrad)" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 8px ${rankColor || "#6366f1"})` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, suffix = "", delay = 0, raw }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    style={{
      background: "rgba(12,14,28,0.9)",
      border: `1px solid rgba(255,255,255,0.07)`,
      borderRadius: 14,
      padding: "14px 16px",
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 2, borderRadius: "14px 14px 0 0",
      background: `linear-gradient(90deg, ${color}, transparent)`,
    }} />
    <div style={{
      position: "absolute", inset: 0, borderRadius: 14,
      background: `radial-gradient(ellipse at 0% 0%, ${color}10, transparent 65%)`,
      pointerEvents: "none",
    }} />
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: `${color}15`, border: `1px solid ${color}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={13} style={{ color }} />
      </div>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
    <p style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif" }}>
      {raw !== undefined ? raw : <AnimatedNumber value={typeof value === "number" ? value : 0} />}
      {!raw && suffix && <span style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginLeft: 2 }}>{suffix}</span>}
    </p>
  </motion.div>
);

// ─── SOCIAL LINK ─────────────────────────────────────────────────────────────
const SocialLink = ({ href, icon: Icon, label, color }) => {
  if (!href) return null;
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 12px", borderRadius: 20,
        background: `${color}12`, border: `1px solid ${color}22`,
        color, fontSize: 11, fontWeight: 700, textDecoration: "none",
        transition: "all 0.2s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}24`; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}12`; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <Icon size={12} /> {label}
    </a>
  );
};

// ─── FORM INPUT ──────────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, placeholder, type = "text", optional }) => (
  <div>
    <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 0.8, textTransform: "uppercase", display: "block", marginBottom: 5 }}>
      {label}{optional && <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: 4 }}>(optional)</span>}
    </label>
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{
        width: "100%", padding: "9px 12px", borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)",
        color: "#f1f5f9", fontSize: 13, outline: "none", fontFamily: "inherit",
        boxSizing: "border-box", transition: "border-color 0.2s",
      }}
      onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
      onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
    />
  </div>
);

// ─── TAB BUTTON ──────────────────────────────────────────────────────────────
const TabBtn = ({ active, icon: Icon, label, onClick, count }) => (
  <button onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 6,
    padding: "11px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
    background: "none", border: "none", outline: "none", position: "relative",
    color: active ? "#6366f1" : "rgba(255,255,255,0.3)",
    transition: "color 0.2s", flexShrink: 0, whiteSpace: "nowrap",
  }}>
    <Icon size={14} />
    {label}
    {count != null && count > 0 && (
      <span style={{ padding: "1px 6px", borderRadius: 20, background: active ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.07)", color: active ? "#a5b4fc" : "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 700 }}>
        {count}
      </span>
    )}
    {active && (
      <motion.div
        layoutId="profile-tab-indicator"
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, borderRadius: 2, background: "linear-gradient(90deg,#6366f1,#06b6d4)" }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      />
    )}
  </button>
);

// ──────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────────────────────────────
export default function Profile() {
  const { profile: ap, refreshProfile, refreshCurrentUser } = useOutletContext() || {};
  const [activeTab, setActiveTab] = useState("overview");
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile]       = useState(null);
  const [avatarMode, setAvatarMode]       = useState("photo");
  const [storeAvatars, setStoreAvatars]   = useState([]);
  const [selectedStoreAvatar, setSelectedStoreAvatar] = useState(null);
  const avatarInputRef = useRef(null);

  const { profile: dp, stats, achievements, recentMatches, loading } = useProfileData(ap?.id);
  const profile = ap || dp;

  const xpProgress = Math.min((((profile?.xp || 0) % 1000) / 1000) * 100, 100);
  const winRate    = stats?.total_matches ? Math.round((stats.wins / stats.total_matches) * 100) : 0;
  const kd         = stats?.kills && stats?.deaths ? (stats.kills / stats.deaths).toFixed(2) : (stats?.kills || 0);
  const rank       = getRank(stats?.total_points || 0);
  const flag       = countryFlag(profile?.country);
  const ffUID      = profile?.free_fire_uid || profile?.free_fire_id;

  const fetchStoreAvatars = useCallback(async (userId) => {
    if (!userId) return;
    const { data } = await supabase.from("user_items").select("*, item:store_items(*)").eq("user_id", userId);
    setStoreAvatars((data || []).filter(r => r.item?.type === "avatar" && r.item?.image_url));
  }, []);

  const openEdit = () => {
    setEditForm({
      username:          profile?.username          || "",
      bio:               profile?.bio               || "",
      free_fire_uid:     profile?.free_fire_uid     || profile?.free_fire_id || "",
      free_fire_name:    profile?.free_fire_name    || "",
      city:              profile?.city              || "",
      country:           profile?.country           || "",
      age:               profile?.age               || "",
      gender:            profile?.gender            || "",
      instagram:         profile?.instagram         || "",
      tiktok:            profile?.tiktok            || "",
      discord:           profile?.discord           || "",
      youtube:           profile?.youtube           || "",
      phone_number:      profile?.phone_number      || "",
      whatsapp_enabled:  profile?.whatsapp_enabled  ?? false,
    });
    setAvatarPreview(null); setAvatarFile(null);
    setSelectedStoreAvatar(null); setAvatarMode("photo");
    fetchStoreAvatars(profile?.id);
    setShowEdit(true);
  };

  const saveProfile = async () => {
    if (!profile?.id || saving) return;
    setSaving(true);
    let avatarUrl = profile?.avatar_url;
    if (selectedStoreAvatar) {
      avatarUrl = selectedStoreAvatar.item.image_url;
    } else if (avatarFile) {
      const ext  = avatarFile.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = urlData?.publicUrl + `?t=${Date.now()}`;
      }
    }
    const { error } = await supabase.from("profiles").update({
      username:        editForm.username.trim(),
      bio:             editForm.bio.trim(),
      free_fire_uid:   editForm.free_fire_uid.trim()  || null,
      free_fire_name:  editForm.free_fire_name.trim() || null,
      city:            editForm.city.trim()            || null,
      country:         editForm.country.trim()         || null,
      age:             editForm.age ? Number(editForm.age) : null,
      gender:          editForm.gender || null,
      instagram:         editForm.instagram.trim()         || null,
      tiktok:            editForm.tiktok.trim()            || null,
      discord:           editForm.discord.trim()           || null,
      youtube:           editForm.youtube.trim()           || null,
      phone_number:      editForm.phone_number?.trim()     || null,
      whatsapp_enabled:  editForm.whatsapp_enabled         ?? false,
      ...(avatarUrl !== profile?.avatar_url ? { avatar_url: avatarUrl } : {}),
    }).eq("id", profile.id);
    if (!error) {
      await Promise.all([refreshProfile?.(), refreshCurrentUser?.()]);
      setShowEdit(false);
    }
    setSaving(false);
  };

  if (loading && !profile) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 280 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid rgba(99,102,241,0.15)", borderTopColor: "#6366f1", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Loading Profile</span>
      </div>
    </div>
  );

  const STATS = [
    { label: "Played",  value: stats?.total_matches || 0, icon: GamepadIcon, color: "#6366f1", delay: 0 },
    { label: "Wins",    value: stats?.wins          || 0, icon: Trophy,      color: "#f59e0b", delay: 0.06 },
    { label: "Top 3",   value: stats?.top3_finishes || 0, icon: Medal,       color: "#10b981", delay: 0.12 },
    { label: "Kills",   value: stats?.kills         || 0, icon: Flame,       color: "#ef4444", delay: 0.18 },
    { label: "K/D",     raw: kd,                          icon: TrendingUp,  color: "#06b6d4", delay: 0.24 },
    { label: "Points",  value: stats?.total_points  || 0, icon: Zap,         color: "#8b5cf6", delay: 0.30 },
  ];

  const hasSocials = profile?.instagram || profile?.tiktok || profile?.discord || profile?.youtube;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 32 }}>

      {/* ── HERO CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{ borderRadius: 20, overflow: "hidden", position: "relative", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* ── BANNER ── */}
        <div style={{
          height: 160, position: "relative", overflow: "hidden",
          background: rank.bg,
        }}>
          {/* Animated mesh */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `radial-gradient(ellipse at 20% 50%, ${rank.color}20 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.15) 0%, transparent 50%)`,
          }} />
          {/* Grid lines */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.12,
            backgroundImage: `linear-gradient(${rank.color}50 1px, transparent 1px), linear-gradient(90deg, ${rank.color}50 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }} />
          {/* Scan line */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.35) 100%)" }} />

          {/* Rank badge top-right */}
          <div style={{ position: "absolute", top: 16, right: 16, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 14px 6px 10px",
              borderRadius: 12, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(12px)",
              border: `1px solid ${rank.color}35`,
            }}>
              <span style={{ fontSize: 20 }}>{rank.icon}</span>
              <div>
                <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, textTransform: "uppercase", margin: 0, fontWeight: 700 }}>Rank</p>
                <p style={{ fontSize: 17, fontWeight: 800, color: rank.color, margin: 0, fontFamily: "'Space Grotesk', sans-serif", textShadow: `0 0 20px ${rank.glow}` }}>
                  {rank.label}
                </p>
              </div>
            </div>
            {stats?.total_points > 0 && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
                {(stats.total_points).toLocaleString()} pts
              </span>
            )}
          </div>

          {/* Bottom-left glow */}
          <div style={{ position: "absolute", bottom: -40, left: -20, width: 220, height: 220, borderRadius: "50%", background: `radial-gradient(circle, ${rank.color}20, transparent 70%)`, pointerEvents: "none" }} />
        </div>

        {/* ── PLAYER INFO ── */}
        <div style={{
          background: "rgba(8,10,22,0.98)", backdropFilter: "blur(20px)",
          borderTop: `1px solid ${rank.color}20`,
          padding: "0 20px 22px",
        }}>
          <div style={{ display: "flex", gap: 16, marginTop: -50, flexWrap: "wrap", alignItems: "flex-end" }}>

            {/* Avatar */}
            <XpRing progress={xpProgress} size={104} rankColor={rank.color}>
              <div
                onClick={openEdit}
                title="Change profile photo"
                style={{
                  width: 86, height: 86, borderRadius: 20, overflow: "hidden",
                  background: `linear-gradient(135deg, ${rank.color}cc, #06b6d4)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 30, color: "#fff",
                  boxShadow: `0 0 28px ${rank.glow}, 0 4px 24px rgba(0,0,0,0.7)`,
                  cursor: "pointer", position: "relative",
                }}
                onMouseEnter={e => { const ov = e.currentTarget.querySelector(".av-ov"); if (ov) ov.style.opacity = "1"; }}
                onMouseLeave={e => { const ov = e.currentTarget.querySelector(".av-ov"); if (ov) ov.style.opacity = "0"; }}
              >
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (profile?.username?.[0]?.toUpperCase() || "?")}
                <div className="av-ov" style={{
                  position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: 0, transition: "opacity 0.2s", borderRadius: 20,
                }}>
                  <Camera size={18} style={{ color: "#fff" }} />
                </div>
              </div>
            </XpRing>

            {/* Player text info */}
            <div style={{ flex: 1, paddingBottom: 2, minWidth: 200 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>
                  {profile?.username || "Player"}
                </h1>
                {(profile?.verified || profile?.verification_status === "verified") && (
                  <span style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 20, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.22)", color: "#06b6d4", fontSize: 10, fontWeight: 700 }}>
                    <CheckCircle2 size={9} /> VERIFIED
                  </span>
                )}
                <span style={{ padding: "2px 10px", borderRadius: 20, background: `${rank.color}18`, border: `1px solid ${rank.color}28`, color: rank.color, fontSize: 11, fontWeight: 700 }}>
                  LVL {profile?.level || 1}
                </span>
                {profile?.role && profile.role !== "user" && (
                  <span style={{ padding: "2px 10px", borderRadius: 20, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.22)", color: "#fbbf24", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                    {profile.role.replace("_", " ")}
                  </span>
                )}
              </div>

              {/* Meta row */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 14px", marginBottom: 10 }}>
                {profile?.free_fire_name && (
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
                {(profile?.country || flag) && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                    {flag && <span>{flag}</span>}
                    {profile.country}
                  </span>
                )}
                {profile?.city && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                    <MapPin size={11} style={{ color: "#06b6d4" }} />
                    {profile.city}
                  </span>
                )}
                {profile?.age && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                    <Calendar size={11} />
                    {profile.age} yrs
                  </span>
                )}
                {profile?.created_at && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
                    <Clock size={11} />
                    Since {new Date(profile.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>

              {/* XP bar */}
              <div style={{ maxWidth: 300 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 4, fontWeight: 600 }}>
                  <span>XP {(profile?.xp || 0) % 1000} / 1000</span>
                  <span>→ Level {(profile?.level || 1) + 1}</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                    style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${rank.color}, #06b6d4)`, boxShadow: `0 0 10px ${rank.glow}` }}
                  />
                </div>
              </div>
            </div>

            {/* Edit button */}
            <div style={{ paddingBottom: 4, flexShrink: 0 }}>
              <button
                onClick={openEdit}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "9px 18px",
                  borderRadius: 12, border: "1px solid rgba(255,255,255,0.09)",
                  background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.14)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)"; e.currentTarget.style.color = "#a5b4fc"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
              >
                <Settings size={14} /> Edit Profile
              </button>
            </div>
          </div>

          {/* Bio */}
          {profile?.bio && (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "12px 0 0", maxWidth: 600, lineHeight: 1.65 }}>
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
      </motion.div>

      {/* ── STATS GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
        {/* Win Rate special card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: "rgba(12,14,28,0.9)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14, padding: "14px 16px", position: "relative", overflow: "hidden",
            gridColumn: "span 2",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, borderRadius: "14px 14px 0 0", background: "linear-gradient(90deg,#10b981,transparent)" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: 14, background: "radial-gradient(ellipse at 0% 0%, rgba(16,185,129,0.08), transparent 65%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <WinRateRing rate={winRate} size={72} />
            <div>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", margin: "0 0 4px" }}>Win Rate</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>
                {stats?.wins || 0} <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>wins</span>
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: "4px 0 0" }}>
                from {stats?.total_matches || 0} matches
              </p>
            </div>
          </div>
        </motion.div>

        {STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* ── TABS + CONTENT ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        style={{ background: "rgba(8,10,22,0.97)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}
      >
        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto", padding: "0 6px" }}>
          <TabBtn active={activeTab === "overview"}     icon={BarChart3} label="Overview"      onClick={() => setActiveTab("overview")} />
          <TabBtn active={activeTab === "matches"}      icon={History}   label="Match History" onClick={() => setActiveTab("matches")}      count={recentMatches?.length} />
          <TabBtn active={activeTab === "achievements"} icon={Award}     label="Achievements"  onClick={() => setActiveTab("achievements")} count={achievements?.length} />
        </div>

        <div style={{ padding: 20 }}>
          <AnimatePresence mode="wait">

            {/* ── OVERVIEW ── */}
            {activeTab === "overview" && (
              <motion.div
                key="ov"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}
              >
                {/* Recent Activity */}
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 14 }}>
                    Recent Activity
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {recentMatches?.slice(0, 5).map((match, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                        borderRadius: 10, background: "rgba(255,255,255,0.025)",
                        border: `1px solid ${match.position === 1 ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.05)"}`,
                        transition: "background 0.2s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.06)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                      >
                        <div style={{
                          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 800,
                          background: match.position === 1 ? "rgba(245,158,11,0.15)" : match.position <= 3 ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
                          color: match.position === 1 ? "#f59e0b" : match.position <= 3 ? "#10b981" : "rgba(255,255,255,0.35)",
                          border: `1px solid ${match.position === 1 ? "rgba(245,158,11,0.3)" : match.position <= 3 ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.06)"}`,
                        }}>
                          #{match.position}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {match.matches?.tournaments?.name || "Tournament"}
                          </p>
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: "2px 0 0" }}>
                            {new Date(match.created_at).toLocaleDateString("en-GB")} · {match.kills || 0} kills
                          </p>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#10b981", margin: 0 }}>+{match.reward || 0} CP</p>
                        </div>
                      </div>
                    ))}
                    {(!recentMatches || recentMatches.length === 0) && (
                      <div style={{ padding: "36px 0", textAlign: "center" }}>
                        <GamepadIcon size={26} style={{ color: "rgba(255,255,255,0.1)", margin: "0 auto 8px", display: "block" }} />
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", margin: 0 }}>No matches yet. Enter a tournament!</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Achievements */}
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 14 }}>
                    Achievements
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {achievements?.slice(0, 6).map((ach, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04, duration: 0.25 }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "10px 11px",
                          borderRadius: 10, background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)",
                        }}
                      >
                        <span style={{ fontSize: 22, flexShrink: 0 }}>{ach.achievements?.icon || "🏆"}</span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {ach.achievements?.name}
                          </p>
                          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", margin: "2px 0 0" }}>Unlocked</p>
                        </div>
                      </motion.div>
                    ))}
                    {(!achievements || achievements.length === 0) && (
                      <div style={{ gridColumn: "1 / -1", padding: "36px 0", textAlign: "center" }}>
                        <Star size={26} style={{ color: "rgba(255,255,255,0.1)", margin: "0 auto 8px", display: "block" }} />
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", margin: 0 }}>No achievements yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── MATCH HISTORY ── */}
            {activeTab === "matches" && (
              <motion.div
                key="matches"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {recentMatches && recentMatches.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {recentMatches.map((match, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.3 }}
                        style={{
                          display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                          borderRadius: 12, background: "rgba(255,255,255,0.025)",
                          border: `1px solid ${match.position === 1 ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)"}`,
                        }}
                      >
                        {/* Rank badge */}
                        <div style={{
                          width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14, fontWeight: 900, fontFamily: "'Space Grotesk', sans-serif",
                          background: match.position === 1 ? "rgba(245,158,11,0.15)" : match.position <= 3 ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
                          color: match.position === 1 ? "#f59e0b" : match.position <= 3 ? "#10b981" : "rgba(255,255,255,0.4)",
                          border: `1px solid ${match.position === 1 ? "rgba(245,158,11,0.35)" : match.position <= 3 ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.07)"}`,
                          boxShadow: match.position === 1 ? "0 0 12px rgba(245,158,11,0.2)" : "none",
                        }}>
                          #{match.position || "—"}
                        </div>
                        {/* Tournament name */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.82)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {match.matches?.tournaments?.name || "Tournament"}
                          </p>
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", margin: "3px 0 0" }}>
                            {new Date(match.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        {/* Kills */}
                        <div style={{ textAlign: "center", flexShrink: 0, minWidth: 44 }}>
                          <p style={{ fontSize: 16, fontWeight: 800, color: "#ef4444", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>{match.kills || 0}</p>
                          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", margin: "1px 0 0", letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 700 }}>kills</p>
                        </div>
                        {/* Reward */}
                        <div style={{ textAlign: "right", flexShrink: 0, minWidth: 60 }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: match.reward > 0 ? "#10b981" : "rgba(255,255,255,0.3)", margin: 0 }}>
                            {match.reward > 0 ? `+${match.reward}` : "—"} {match.reward > 0 ? "CP" : ""}
                          </p>
                          {match.mvp && (
                            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 20, background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: 700, letterSpacing: 0.3 }}>
                              MVP
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "60px 0", textAlign: "center" }}>
                    <History size={30} style={{ color: "rgba(255,255,255,0.1)", margin: "0 auto 10px", display: "block" }} />
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", margin: 0 }}>No match history yet</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", margin: "6px 0 0" }}>Enter a tournament to get started</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── ACHIEVEMENTS ── */}
            {activeTab === "achievements" && (
              <motion.div
                key="ach"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {achievements && achievements.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                    {achievements.map((ach, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05, duration: 0.28 }}
                        style={{
                          display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                          borderRadius: 12, background: "rgba(245,158,11,0.04)",
                          border: "1px solid rgba(245,158,11,0.14)",
                          position: "relative", overflow: "hidden",
                        }}
                      >
                        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 0% 50%, rgba(245,158,11,0.07), transparent 65%)", pointerEvents: "none" }} />
                        <div style={{
                          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
                          fontSize: 22,
                        }}>
                          {ach.achievements?.icon || "🏆"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)", margin: 0 }}>
                            {ach.achievements?.name || "Achievement"}
                          </p>
                          {ach.achievements?.description && (
                            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {ach.achievements.description}
                            </p>
                          )}
                          <p style={{ fontSize: 10, color: "rgba(245,158,11,0.5)", margin: "3px 0 0", fontWeight: 600 }}>
                            {ach.earned_at ? new Date(ach.earned_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Unlocked"}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "60px 0", textAlign: "center" }}>
                    <Award size={30} style={{ color: "rgba(255,255,255,0.1)", margin: "0 auto 10px", display: "block" }} />
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", margin: 0 }}>No achievements yet</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.12)", margin: "6px 0 0" }}>Win tournaments to unlock achievements</p>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── EDIT MODAL ── */}
      <AnimatePresence>
        {showEdit && editForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(16px)", zIndex: 300 }}
              onClick={() => setShowEdit(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: "fixed", inset: 0, zIndex: 310, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{
                width: "100%", maxWidth: 480, borderRadius: 20,
                background: "#09091c", border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 28px 80px rgba(0,0,0,0.85)", overflow: "hidden",
              }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>Edit Profile</h2>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", margin: "3px 0 0" }}>Update your player information</p>
                  </div>
                  <button onClick={() => setShowEdit(false)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={14} />
                  </button>
                </div>

                <div style={{ padding: 20, maxHeight: "76vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Avatar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div
                      onClick={() => avatarInputRef.current?.click()}
                      style={{
                        width: 68, height: 68, borderRadius: 16, overflow: "hidden", flexShrink: 0,
                        background: `linear-gradient(135deg, ${rank.color}cc, #06b6d4)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: 24, color: "#fff",
                        cursor: "pointer", position: "relative",
                        boxShadow: `0 0 0 2px ${rank.color}50`,
                        transition: "box-shadow 0.2s",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.boxShadow = `0 0 0 2px ${rank.color}`;
                        const ov = e.currentTarget.querySelector(".modal-av-ov");
                        if (ov) ov.style.opacity = "1";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.boxShadow = `0 0 0 2px ${rank.color}50`;
                        const ov = e.currentTarget.querySelector(".modal-av-ov");
                        if (ov) ov.style.opacity = "0";
                      }}
                    >
                      {(avatarPreview || selectedStoreAvatar?.item?.image_url || profile?.avatar_url)
                        ? <img src={avatarPreview || selectedStoreAvatar?.item?.image_url || profile?.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : (profile?.username?.[0]?.toUpperCase() || "?")}
                      <div className="modal-av-ov" style={{
                        position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        opacity: 0, transition: "opacity 0.2s", gap: 3,
                      }}>
                        <Camera size={16} style={{ color: "#fff" }} />
                        <span style={{ fontSize: 9, color: "#fff", fontWeight: 700, letterSpacing: 0.3 }}>CHANGE</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", margin: "0 0 4px" }}>Profile Photo</p>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", margin: "0 0 8px" }}>Click photo or use button below</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => avatarInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(99,102,241,0.28)", background: "rgba(99,102,241,0.08)", color: "#a5b4fc", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          <Upload size={11} /> Upload
                        </button>
                        {storeAvatars.length > 0 && (
                          <button onClick={() => setAvatarMode(m => m === "store" ? "photo" : "store")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                            <Star size={11} /> Store ({storeAvatars.length})
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {avatarMode === "store" && storeAvatars.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                      {storeAvatars.map(row => (
                        <button key={row.id} onClick={() => { setSelectedStoreAvatar(row); setAvatarFile(null); setAvatarPreview(null); }}
                          style={{ aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: `2px solid ${selectedStoreAvatar?.id === row.id ? "#6366f1" : "rgba(255,255,255,0.07)"}`, cursor: "pointer", background: "none", padding: 0 }}>
                          <img src={row.item.image_url} alt={row.item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </button>
                      ))}
                    </div>
                  )}

                  <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setSelectedStoreAvatar(null); setAvatarPreview(URL.createObjectURL(f)); }}} />

                  {/* Identity */}
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.13)" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(99,102,241,0.65)", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>Identity</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <Field label="Username" value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} placeholder="Enter username" />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <Field label="Free Fire UID" value={editForm.free_fire_uid} onChange={e => setEditForm(f => ({ ...f, free_fire_uid: e.target.value.replace(/\D/g, "") }))} placeholder="123456789" />
                        <Field label="Free Fire Name" value={editForm.free_fire_name} onChange={e => setEditForm(f => ({ ...f, free_fire_name: e.target.value }))} placeholder="In-game name" optional />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <Field label="Country" value={editForm.country} onChange={e => setEditForm(f => ({ ...f, country: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="MA" />
                        <Field label="City" value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} placeholder="Casablanca" optional />
                      </div>
                      <Field label="Age" value={editForm.age} onChange={e => setEditForm(f => ({ ...f, age: e.target.value }))} placeholder="18" type="number" />
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 0.8, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Genre <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400, textTransform: "none" }}>(optionnel)</span></label>
                        <select
                          value={editForm.gender}
                          onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.09)", background: "#06080f", color: editForm.gender ? "#f1f5f9" : "rgba(255,255,255,0.3)", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                        >
                          <option value="">Préférer ne pas dire</option>
                          <option value="male">Homme</option>
                          <option value="female">Femme</option>
                          <option value="prefer_not_to_say">Préférer ne pas dire</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 0.8, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Bio</label>
                    <textarea
                      value={editForm.bio}
                      onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Tell your story..."
                      rows={2}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)", color: "#f1f5f9", fontSize: 13, outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                  </div>

                  {/* Social */}
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.1)" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(16,185,129,0.55)", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>Social Links (optional)</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <Field label="Instagram" value={editForm.instagram} onChange={e => setEditForm(f => ({ ...f, instagram: e.target.value }))} placeholder="https://instagram.com/yourname" optional />
                      <Field label="TikTok"    value={editForm.tiktok}    onChange={e => setEditForm(f => ({ ...f, tiktok: e.target.value }))}    placeholder="https://tiktok.com/@yourname" optional />
                      <Field label="Discord"   value={editForm.discord}   onChange={e => setEditForm(f => ({ ...f, discord: e.target.value }))}   placeholder="YourTag#0000" optional />
                      <Field label="YouTube"   value={editForm.youtube}   onChange={e => setEditForm(f => ({ ...f, youtube: e.target.value }))}   placeholder="https://youtube.com/yourchannel" optional />
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(37,211,102,0.03)", border: "1px solid rgba(37,211,102,0.12)" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(37,211,102,0.55)", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>WhatsApp Alerts (optional)</p>
                    <Field label="Phone Number" value={editForm.phone_number} onChange={e => setEditForm(f => ({ ...f, phone_number: e.target.value }))} placeholder="+212600000000" optional />
                    <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, cursor: "pointer" }}>
                      <div style={{ position: "relative", width: 36, height: 20, borderRadius: 10, background: editForm.whatsapp_enabled ? "rgba(37,211,102,0.7)" : "rgba(255,255,255,0.12)", transition: "background 0.2s", flexShrink: 0 }}
                        onClick={() => setEditForm(f => ({ ...f, whatsapp_enabled: !f.whatsapp_enabled }))}>
                        <div style={{ position: "absolute", top: 3, left: editForm.whatsapp_enabled ? 19 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                      </div>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Receive WhatsApp Alerts</span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 10, paddingTop: 2 }}>
                    <button onClick={() => setShowEdit(false)} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.09)", background: "transparent", color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button onClick={saveProfile} disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: 9, border: "none", background: saving ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
