import { useState, useRef, useCallback, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useProfileData } from "../hooks/useProfileData";
import {
  Settings, X, Upload, Camera, Star, ShieldCheck,
  Trophy, Target, Zap, TrendingUp, Award, GamepadIcon,
  Instagram, Youtube, MessageCircle, Music2, Globe,
  MapPin, Calendar, Hash, CheckCircle2, Clock,
  ChevronRight, BarChart3, History, Medal,
} from "lucide-react";
import { supabase } from "../lib/supabase";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const countryFlag = (code) => {
  if (!code || code.length !== 2) return null;
  return code.toUpperCase().split("").map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join("");
};

const getRank = (points = 0) => {
  if (points >= 5000) return { label: "Legend",   color: "#f43f5e", glow: "rgba(244,63,94,0.4)",   icon: "👑" };
  if (points >= 2500) return { label: "Master",   color: "#a855f7", glow: "rgba(168,85,247,0.4)",  icon: "💎" };
  if (points >= 1200) return { label: "Diamond",  color: "#3b82f6", glow: "rgba(59,130,246,0.4)",  icon: "🔷" };
  if (points >= 600)  return { label: "Gold",     color: "#f59e0b", glow: "rgba(245,158,11,0.4)",  icon: "🥇" };
  if (points >= 200)  return { label: "Silver",   color: "#94a3b8", glow: "rgba(148,163,184,0.35)","icon": "🥈" };
  return                      { label: "Bronze",  color: "#b45309", glow: "rgba(180,83,9,0.35)",   icon: "🥉" };
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

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, suffix = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    style={{
      background: "rgba(15,15,30,0.8)",
      border: `1px solid rgba(255,255,255,0.07)`,
      borderRadius: 14,
      padding: "16px",
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div style={{
      position: "absolute", inset: 0, borderRadius: 14,
      background: `radial-gradient(circle at 0% 0%, ${color}12, transparent 60%)`,
      pointerEvents: "none",
    }} />
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={14} style={{ color }} />
      </div>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
    <p style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9", lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif" }}>
      <AnimatedNumber value={typeof value === "number" ? value : 0} />
      {suffix && <span style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginLeft: 2 }}>{suffix}</span>}
      {typeof value === "string" && value}
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
        padding: "6px 12px", borderRadius: 8,
        background: `${color}14`, border: `1px solid ${color}25`,
        color, fontSize: 12, fontWeight: 600, textDecoration: "none",
        transition: "all 0.2s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}28`; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}14`; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <Icon size={13} />
      {label}
    </a>
  );
};

// ─── FORM INPUT ──────────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, placeholder, type = "text", optional }) => (
  <div>
    <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
      {label}{optional && <span style={{ color: "rgba(255,255,255,0.25)", marginLeft: 4 }}>(optional)</span>}
    </label>
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{
        width: "100%", padding: "9px 12px", borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
        color: "#f1f5f9", fontSize: 13, outline: "none", fontFamily: "inherit",
        boxSizing: "border-box", transition: "border-color 0.2s",
      }}
      onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
      onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
    />
  </div>
);

// ─── TAB BUTTON ──────────────────────────────────────────────────────────────
const TabBtn = ({ active, icon: Icon, label, onClick }) => (
  <button onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 6,
    padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
    background: "none", border: "none", outline: "none", position: "relative",
    color: active ? "#6366f1" : "rgba(255,255,255,0.35)",
    transition: "color 0.2s", flexShrink: 0,
  }}>
    <Icon size={14} />
    {label}
    {active && (
      <motion.div
        layoutId="profile-tab"
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, borderRadius: 2, background: "#6366f1" }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      />
    )}
  </button>
);

// ─── XP RING ─────────────────────────────────────────────────────────────────
const XpRing = ({ progress, size = 100, children }) => {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(progress, 100)) / 100;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#xpGrad)" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          style={{ filter: "drop-shadow(0 0 6px rgba(99,102,241,0.7))" }}
        />
        <defs>
          <linearGradient id="xpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
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

  const fetchStoreAvatars = useCallback(async (userId) => {
    if (!userId) return;
    const { data } = await supabase.from("user_items").select("*, item:store_items(*)").eq("user_id", userId);
    setStoreAvatars((data || []).filter(r => r.item?.type === "avatar" && r.item?.image_url));
  }, []);

  const openEdit = () => {
    setEditForm({
      username:     profile?.username     || "",
      bio:          profile?.bio          || "",
      free_fire_uid: profile?.free_fire_uid || profile?.free_fire_id || "",
      city:         profile?.city         || "",
      country:      profile?.country      || "",
      age:          profile?.age          || "",
      instagram:    profile?.instagram    || "",
      tiktok:       profile?.tiktok       || "",
      discord:      profile?.discord      || "",
      youtube:      profile?.youtube      || "",
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
      username:      editForm.username.trim(),
      bio:           editForm.bio.trim(),
      free_fire_uid: editForm.free_fire_uid.trim() || null,
      city:          editForm.city.trim()          || null,
      country:       editForm.country.trim()       || null,
      age:           editForm.age ? Number(editForm.age) : null,
      instagram:     editForm.instagram.trim()     || null,
      tiktok:        editForm.tiktok.trim()        || null,
      discord:       editForm.discord.trim()       || null,
      youtube:       editForm.youtube.trim()       || null,
      ...(avatarUrl !== profile?.avatar_url ? { avatar_url: avatarUrl } : {}),
    }).eq("id", profile.id);
    if (!error) {
      await Promise.all([refreshProfile?.(), refreshCurrentUser?.()]);
      setShowEdit(false);
    }
    setSaving(false);
  };

  if (loading && !profile) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  const ffUID = profile?.free_fire_uid || profile?.free_fire_id;

  const STATS = [
    { label: "Tournaments", value: stats?.total_matches || 0,   icon: GamepadIcon,  color: "#6366f1", delay: 0 },
    { label: "Wins",        value: stats?.wins          || 0,   icon: Trophy,       color: "#f59e0b", delay: 0.05 },
    { label: "Top 3",       value: stats?.top3_finishes || 0,   icon: Medal,        color: "#10b981", delay: 0.1 },
    { label: "Kills",       value: stats?.kills         || 0,   icon: Target,       color: "#ef4444", delay: 0.15 },
    { label: "K/D",         value: 0,                           icon: TrendingUp,   color: "#06b6d4", delay: 0.2, raw: kd },
    { label: "Points",      value: stats?.total_points  || 0,   icon: Zap,          color: "#8b5cf6", delay: 0.25 },
  ];

  const hasSocials = profile?.instagram || profile?.tiktok || profile?.discord || profile?.youtube;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 32 }}>

      {/* ── HERO HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{ borderRadius: 20, overflow: "hidden", position: "relative" }}
      >
        {/* Animated banner */}
        <div style={{
          height: 140, position: "relative", overflow: "hidden",
          background: "linear-gradient(135deg, #0f0726 0%, #1a0a3e 30%, #0a1628 60%, #060d1f 100%)",
        }}>
          {/* Grid pattern */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.15,
            backgroundImage: "linear-gradient(rgba(99,102,241,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.4) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
          {/* Glow orbs */}
          <div style={{ position: "absolute", top: -60, left: "20%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: -40, right: "15%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.2), transparent 70%)", pointerEvents: "none" }} />
          {/* Rank text in banner */}
          <div style={{ position: "absolute", bottom: 16, right: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 24 }}>{rank.icon}</span>
            <div>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, textTransform: "uppercase", margin: 0 }}>Rank</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: rank.color, margin: 0, textShadow: `0 0 16px ${rank.glow}`, fontFamily: "'Space Grotesk', sans-serif" }}>
                {rank.label}
              </p>
            </div>
          </div>
        </div>

        {/* Player card */}
        <div style={{
          background: "rgba(10,10,20,0.97)", backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "0 24px 24px",
        }}>
          <div style={{ display: "flex", gap: 20, marginTop: -44, flexWrap: "wrap", alignItems: "flex-end" }}>

            {/* Avatar */}
            <XpRing progress={xpProgress} size={100}>
              <div style={{
                width: 82, height: 82, borderRadius: 18, overflow: "hidden",
                background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 28, color: "#fff",
                boxShadow: "0 0 24px rgba(99,102,241,0.4), 0 4px 20px rgba(0,0,0,0.6)",
              }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (profile?.username?.[0]?.toUpperCase() || "?")}
              </div>
            </XpRing>

            {/* Player info */}
            <div style={{ flex: 1, paddingBottom: 4, minWidth: 200 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 }}>
                  {profile?.username || "Player"}
                </h1>
                {profile?.verified && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", color: "#06b6d4", fontSize: 10, fontWeight: 700 }}>
                    <CheckCircle2 size={10} /> VERIFIED
                  </span>
                )}
                {profile?.verification_status === "verified" && !profile?.verified && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981", fontSize: 10, fontWeight: 700 }}>
                    <ShieldCheck size={10} /> VERIFIED
                  </span>
                )}
                <span style={{ padding: "2px 10px", borderRadius: 20, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc", fontSize: 11, fontWeight: 700 }}>
                  LVL {profile?.level || 1}
                </span>
                {profile?.role && profile.role !== "user" && (
                  <span style={{ padding: "2px 10px", borderRadius: 20, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                    {profile.role.replace("_", " ")}
                  </span>
                )}
              </div>

              {/* Meta row */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginBottom: 10 }}>
                {ffUID && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                    <Hash size={12} style={{ color: "#6366f1" }} />
                    <span style={{ color: "#c7d2fe", fontWeight: 600 }}>{ffUID}</span>
                  </span>
                )}
                {(profile?.country || flag) && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                    {flag && <span>{flag}</span>}
                    <span>{profile.country}</span>
                  </span>
                )}
                {profile?.city && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                    <MapPin size={11} style={{ color: "#06b6d4" }} />
                    {profile.city}
                  </span>
                )}
                {profile?.age && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                    <Calendar size={11} />
                    {profile.age} years
                  </span>
                )}
                {profile?.created_at && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                    <Clock size={11} />
                    Joined {new Date(profile.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>

              {/* XP bar */}
              <div style={{ maxWidth: 280 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 5 }}>
                  <span>XP {(profile?.xp || 0) % 1000} / 1000</span>
                  <span>Level {(profile?.level || 1) + 1} →</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                    style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #6366f1, #06b6d4)", boxShadow: "0 0 8px rgba(99,102,241,0.6)" }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 4, flexShrink: 0 }}>
              <button
                onClick={openEdit}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
                  borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.15)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; e.currentTarget.style.color = "#a5b4fc"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
              >
                <Settings size={14} /> Edit Profile
              </button>
            </div>
          </div>

          {/* Bio */}
          {profile?.bio && (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "12px 0 0", maxWidth: 560, lineHeight: 1.6 }}>
              {profile.bio}
            </p>
          )}

          {/* Social links */}
          {hasSocials && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              <SocialLink href={profile.instagram} icon={Instagram}      label="Instagram" color="#e1306c" />
              <SocialLink href={profile.tiktok}    icon={Music2}         label="TikTok"    color="#69c9d0" />
              <SocialLink href={profile.discord}   icon={MessageCircle}  label="Discord"   color="#5865f2" />
              <SocialLink href={profile.youtube}   icon={Youtube}        label="YouTube"   color="#ff0000" />
            </div>
          )}
        </div>
      </motion.div>

      {/* ── STATS GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
        {STATS.map((s) => (
          s.raw !== undefined
            ? (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: s.delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: "rgba(15,15,30,0.8)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 14, padding: "16px", position: "relative", overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", inset: 0, borderRadius: 14, background: `radial-gradient(circle at 0% 0%, ${s.color}12, transparent 60%)`, pointerEvents: "none" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${s.color}18`, border: `1px solid ${s.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <s.icon size={14} style={{ color: s.color }} />
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</span>
                </div>
                <p style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9", lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif" }}>{s.raw}</p>
              </motion.div>
            )
            : <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* ── TABS + CONTENT ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        style={{ background: "rgba(10,10,20,0.95)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}
      >
        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto", padding: "0 8px" }}>
          <TabBtn active={activeTab === "overview"}     icon={BarChart3}  label="Overview"     onClick={() => setActiveTab("overview")} />
          <TabBtn active={activeTab === "matches"}      icon={History}    label="Match History" onClick={() => setActiveTab("matches")} />
          <TabBtn active={activeTab === "achievements"} icon={Award}      label="Achievements"  onClick={() => setActiveTab("achievements")} />
        </div>

        <div style={{ padding: 20 }}>
          <AnimatePresence mode="wait">

            {/* Overview tab */}
            {activeTab === "overview" && (
              <motion.div
                key="ov"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}
              >
                {/* Recent Activity */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
                    Recent Activity
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {recentMatches?.slice(0, 6).map((match, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                        borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                        transition: "background 0.2s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.07)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 800,
                          background: match.position === 1 ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
                          color: match.position === 1 ? "#f59e0b" : "rgba(255,255,255,0.4)",
                          border: `1px solid ${match.position === 1 ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.07)"}`,
                        }}>
                          #{match.position}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {match.matches?.tournaments?.name || "Match"}
                          </p>
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: "2px 0 0" }}>
                            {new Date(match.created_at).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#10b981", margin: 0 }}>+{match.reward || 0} CP</p>
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: "2px 0 0" }}>{match.kills} kills</p>
                        </div>
                      </div>
                    ))}
                    {(!recentMatches || recentMatches.length === 0) && (
                      <div style={{ padding: "40px 0", textAlign: "center" }}>
                        <GamepadIcon size={28} style={{ color: "rgba(255,255,255,0.12)", margin: "0 auto 8px", display: "block" }} />
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", margin: 0 }}>No matches yet. Enter a tournament!</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Achievements */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
                    Achievements
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {achievements?.slice(0, 6).map((ach, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px",
                        borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                      }}>
                        <span style={{ fontSize: 22, flexShrink: 0 }}>{ach.achievements?.icon || "🏆"}</span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {ach.achievements?.name}
                          </p>
                          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", margin: "2px 0 0" }}>Unlocked</p>
                        </div>
                      </div>
                    ))}
                    {(!achievements || achievements.length === 0) && (
                      <div style={{ gridColumn: "1 / -1", padding: "40px 0", textAlign: "center" }}>
                        <Star size={28} style={{ color: "rgba(255,255,255,0.12)", margin: "0 auto 8px", display: "block" }} />
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", margin: 0 }}>No achievements yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Matches / Achievements placeholder */}
            {(activeTab === "matches" || activeTab === "achievements") && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ padding: "60px 0", textAlign: "center" }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  {activeTab === "matches" ? <History size={22} style={{ color: "rgba(255,255,255,0.2)" }} /> : <Award size={22} style={{ color: "rgba(255,255,255,0.2)" }} />}
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", margin: 0 }}>
                  {activeTab === "matches" ? "Full match history coming soon" : "Achievement showcase coming soon"}
                </p>
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
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", zIndex: 300 }}
              onClick={() => setShowEdit(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: "fixed", inset: 0, zIndex: 310, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{
                width: "100%", maxWidth: 480, borderRadius: 20,
                background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.8)", overflow: "hidden",
              }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>Edit Profile</h2>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: "3px 0 0" }}>Update your player information</p>
                  </div>
                  <button onClick={() => setShowEdit(false)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={14} />
                  </button>
                </div>

                <div style={{ padding: 20, maxHeight: "76vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Avatar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ width: 60, height: 60, borderRadius: 14, overflow: "hidden", flexShrink: 0, background: "linear-gradient(135deg, #6366f1, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22, color: "#fff" }}>
                      {(avatarPreview || selectedStoreAvatar?.item?.image_url || profile?.avatar_url)
                        ? <img src={avatarPreview || selectedStoreAvatar?.item?.image_url || profile?.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : (profile?.username?.[0]?.toUpperCase() || "?")}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", margin: "0 0 8px" }}>Profile Photo</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => avatarInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          <Camera size={11} /> Upload
                        </button>
                        {storeAvatars.length > 0 && (
                          <button onClick={() => setAvatarMode(m => m === "store" ? "photo" : "store")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
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
                          style={{ aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: `2px solid ${selectedStoreAvatar?.id === row.id ? "#6366f1" : "rgba(255,255,255,0.08)"}`, cursor: "pointer", background: "none", padding: 0, position: "relative" }}>
                          <img src={row.item.image_url} alt={row.item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </button>
                      ))}
                    </div>
                  )}

                  <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setSelectedStoreAvatar(null); setAvatarPreview(URL.createObjectURL(f)); }}} />

                  {/* Identity fields */}
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(99,102,241,0.7)", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>Identity</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <Field label="Username" value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} placeholder="Enter username" />
                      <Field label="Free Fire UID" value={editForm.free_fire_uid} onChange={e => setEditForm(f => ({ ...f, free_fire_uid: e.target.value }))} placeholder="Numeric UID (e.g. 123456789)" />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <Field label="Country" value={editForm.country} onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))} placeholder="MA" />
                        <Field label="City" value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} placeholder="Casablanca" />
                      </div>
                      <Field label="Age" value={editForm.age} onChange={e => setEditForm(f => ({ ...f, age: e.target.value }))} placeholder="18" type="number" />
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Bio</label>
                    <textarea
                      value={editForm.bio}
                      onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Tell your story..."
                      rows={2}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#f1f5f9", fontSize: 13, outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                  </div>

                  {/* Social links */}
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(16,185,129,0.6)", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px" }}>Social Links (optional)</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <Field label="Instagram" value={editForm.instagram} onChange={e => setEditForm(f => ({ ...f, instagram: e.target.value }))} placeholder="https://instagram.com/..." optional />
                      <Field label="TikTok"    value={editForm.tiktok}    onChange={e => setEditForm(f => ({ ...f, tiktok: e.target.value }))}    placeholder="https://tiktok.com/@..." optional />
                      <Field label="Discord"   value={editForm.discord}   onChange={e => setEditForm(f => ({ ...f, discord: e.target.value }))}   placeholder="YourTag#0000 or server link" optional />
                      <Field label="YouTube"   value={editForm.youtube}   onChange={e => setEditForm(f => ({ ...f, youtube: e.target.value }))}   placeholder="https://youtube.com/..." optional />
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 10, paddingTop: 2 }}>
                    <button onClick={() => setShowEdit(false)} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
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
