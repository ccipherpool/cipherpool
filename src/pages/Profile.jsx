import { useState, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useProfileData } from "../hooks/useProfileData";
import {
  User, Trophy, Wallet, Settings, Award, History,
  ShieldCheck, Gamepad2, Sword, Target, Star, X, Upload,
  BarChart3, Zap, Camera, Globe,
} from "lucide-react";
import { supabase } from "../lib/supabase";

// ─── XP RING ─────────────────────────────────────────────────────────────────
const XpRing = ({ progress, size = 96, children }) => {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(progress, 100)) / 100;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          style={{ filter: "drop-shadow(0 0 4px rgba(139,92,246,0.6))" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

// ─── STAT ITEM ────────────────────────────────────────────────────────────────
const StatItem = ({ label, value, icon: Icon, accent = "#4f46e5" }) => (
  <div className="flex flex-col gap-1 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
    <div className="flex items-center gap-2 mb-1">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}14`, border: `1px solid ${accent}25` }}>
        <Icon size={13} style={{ color: accent }} />
      </div>
    </div>
    <p className="text-xl font-bold text-slate-900 leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{value}</p>
    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
  </div>
);

// ─── TAB BUTTON ──────────────────────────────────────────────────────────────
const TabBtn = ({ active, icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 flex-shrink-0 ${
      active ? "text-indigo-600" : "text-slate-400 hover:text-slate-700"
    }`}
  >
    <Icon size={14} className={active ? "text-indigo-500" : ""} />
    <span>{label}</span>
    {active && (
      <motion.div
        layoutId="profile-tab-indicator"
        className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-indigo-500"
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    )}
  </button>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Profile() {
  const { profile: ap, refreshProfile, refreshCurrentUser } = useOutletContext() || {};
  const [activeTab, setActiveTab] = useState("overview");
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarMode, setAvatarMode] = useState("photo");
  const [storeAvatars, setStoreAvatars] = useState([]);
  const [selectedStoreAvatar, setSelectedStoreAvatar] = useState(null);
  const avatarInputRef = useRef(null);
  const { profile: dp, stats, achievements, recentMatches, loading } = useProfileData(ap?.id);
  const profile = ap || dp;

  const xpProgress = Math.min((((profile?.xp || 0) % 1000) / 1000) * 100, 100);
  const winRate = stats?.total_matches ? Math.round((stats.wins / stats.total_matches) * 100) : 0;

  const fetchStoreAvatars = useCallback(async (userId) => {
    if (!userId) return;
    const { data } = await supabase.from("user_items").select("*, item:store_items(*)").eq("user_id", userId);
    setStoreAvatars((data || []).filter(r => r.item?.type === "avatar" && r.item?.image_url));
  }, []);

  const openEdit = () => {
    setEditForm({
      username: profile?.username || "",
      bio: profile?.bio || "",
      free_fire_id: profile?.free_fire_id || "",
      city: profile?.city || "",
      country: profile?.country || "",
    });
    setAvatarPreview(null);
    setAvatarFile(null);
    setSelectedStoreAvatar(null);
    setAvatarMode("photo");
    fetchStoreAvatars(profile?.id);
    setShowEdit(true);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setSelectedStoreAvatar(null);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const saveProfile = async () => {
    if (!profile?.id || saving) return;
    setSaving(true);
    let avatarUrl = profile?.avatar_url;
    if (selectedStoreAvatar) {
      avatarUrl = selectedStoreAvatar.item.image_url;
    } else if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = urlData?.publicUrl + `?t=${Date.now()}`;
      }
    }
    const { error } = await supabase.from("profiles").update({
      username: editForm.username.trim(),
      bio: editForm.bio.trim(),
      free_fire_id: editForm.free_fire_id.trim(),
      city: editForm.city.trim(),
      country: editForm.country.trim(),
      ...(avatarUrl !== profile?.avatar_url ? { avatar_url: avatarUrl } : {}),
    }).eq("id", profile.id);
    if (!error) {
      await Promise.all([refreshProfile?.(), refreshCurrentUser?.()]);
      setShowEdit(false);
    }
    setSaving(false);
  };

  if (loading && !profile) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
    </div>
  );

  const STATS = [
    { label: "Matches",  value: stats?.total_matches || 0, icon: Gamepad2, accent: "#8b5cf6" },
    { label: "Win Rate", value: `${winRate}%`,              icon: Trophy,   accent: "#f59e0b" },
    { label: "Kills",    value: stats?.kills || 0,          icon: Sword,    accent: "#10b981" },
    { label: "K/D",      value: stats?.deaths ? (stats.kills / stats.deaths).toFixed(2) : (stats?.kills || 0), icon: Target, accent: "#06b6d4" },
  ];

  return (
    <div className="space-y-4 pb-6">

      {/* ── PROFILE HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
      >
        {/* Banner */}
        <div className="h-24 relative overflow-hidden" style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #2563eb 50%, #0891b2 100%)"
        }}>
          <div className="absolute inset-0 opacity-15"
            style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)", backgroundSize: "18px 18px" }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />
        </div>

        <div className="px-5 pb-5 -mt-10">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            {/* Avatar */}
            <XpRing progress={xpProgress} size={88}>
              <div
                className="w-[72px] h-[72px] rounded-2xl overflow-hidden flex items-center justify-center font-bold text-xl text-white"
                style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)" }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{profile?.username?.[0]?.toUpperCase() || "?"}</span>
                )}
              </div>
            </XpRing>

            {/* Info block */}
            <div className="flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-xl font-bold text-slate-900 leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {profile?.username || profile?.email?.split("@")[0] || "Player"}
                </h1>
                {profile?.verification_status === "approved" && (
                  <span className="cp-badge cp-badge-mint flex items-center gap-1">
                    <ShieldCheck size={10} />
                    Verified
                  </span>
                )}
                <span className="cp-badge cp-badge-violet">
                  Level {profile?.level || 1}
                </span>
                {profile?.role && profile.role !== "user" && (
                  <span className="cp-badge cp-badge-cyan capitalize">
                    {profile.role.replace("_", " ")}
                  </span>
                )}
              </div>

              {profile?.bio && (
                <p className="text-sm text-slate-500 max-w-md mb-3 leading-relaxed">{profile.bio}</p>
              )}

              {/* XP progress */}
              <div className="max-w-xs">
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>XP Progress</span>
                  <span>{(profile?.xp || 0) % 1000} / 1000</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0 pb-1">
              {profile?.free_fire_id && (
                <div className="hidden sm:block px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-400 mb-0.5">Free Fire ID</p>
                  <p className="text-sm font-semibold text-slate-700">{profile.free_fire_id}</p>
                </div>
              )}
              <button onClick={openEdit} className="cp-btn cp-btn-ghost flex items-center gap-2">
                <Settings size={14} />
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── STATS STRIP ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.04, duration: 0.35 }}
          >
            <StatItem {...s} />
          </motion.div>
        ))}
      </motion.div>

      {/* ── TABS + CONTENT ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.35 }}
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
      >
        {/* Tab bar */}
        <div className="flex items-center border-b border-slate-100 overflow-x-auto scrollbar-hide px-2">
          <TabBtn active={activeTab === "overview"}     icon={BarChart3} label="Overview"     onClick={() => setActiveTab("overview")} />
          <TabBtn active={activeTab === "matches"}      icon={History}   label="Matches"      onClick={() => setActiveTab("matches")} />
          <TabBtn active={activeTab === "achievements"} icon={Award}     label="Achievements" onClick={() => setActiveTab("achievements")} />
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">

            {activeTab === "overview" && (
              <motion.div
                key="ov"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-5"
              >
                {/* Recent Activity */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Recent Activity</p>
                  <div className="space-y-2">
                    {recentMatches?.slice(0, 5).map((match, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                        <div
                          className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold"
                          style={{
                            background: match.position === 1 ? "rgba(245,158,11,0.12)" : "#f1f5f9",
                            color: match.position === 1 ? "#f59e0b" : "#64748b",
                            border: `1px solid ${match.position === 1 ? "rgba(245,158,11,0.25)" : "#e2e8f0"}`,
                          }}
                        >
                          #{match.position}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{match.matches?.tournaments?.name || "Match"}</p>
                          <p className="text-xs text-slate-400">{new Date(match.created_at).toLocaleDateString("en-GB")}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-emerald-600">+{match.reward || 0} CP</p>
                          <p className="text-xs text-slate-400">{match.kills} kills</p>
                        </div>
                      </div>
                    ))}
                    {(!recentMatches || recentMatches.length === 0) && (
                      <div className="py-10 text-center">
                        <Gamepad2 size={28} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-sm text-slate-400">No matches yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Badges</p>
                  <div className="grid grid-cols-2 gap-2">
                    {achievements?.slice(0, 6).map((ach, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-xl flex-shrink-0">{ach.achievements?.icon || "🏆"}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{ach.achievements?.name}</p>
                          <p className="text-xs text-slate-400">Unlocked</p>
                        </div>
                      </div>
                    ))}
                    {(!achievements || achievements.length === 0) && (
                      <div className="col-span-2 py-10 text-center">
                        <Star size={28} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-sm text-slate-400">No badges yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {(activeTab === "matches" || activeTab === "achievements") && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="py-16 text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  {activeTab === "matches" ? <History size={22} className="text-slate-400" /> : <Award size={22} className="text-slate-400" />}
                </div>
                <p className="text-sm font-medium text-slate-400">Coming soon</p>
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
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[300]"
              onClick={() => setShowEdit(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-[310] flex items-center justify-center p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-full max-w-[440px] rounded-[20px] border border-white/[0.08] overflow-hidden"
                style={{ background: "var(--cp-surface-2)", backdropFilter: "blur(40px)", boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)" }}>

                {/* Modal header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                  <div>
                    <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Edit Profile</h2>
                    <p className="text-xs text-white/40 mt-0.5">Update your information</p>
                  </div>
                  <button onClick={() => setShowEdit(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.07] transition-all">
                    <X size={15} />
                  </button>
                </div>

                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-hide">

                  {/* Avatar */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div
                      className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-lg text-white"
                      style={{ background: "linear-gradient(135deg, #8B5CF6, #06B6D4)" }}
                    >
                      {(avatarPreview || selectedStoreAvatar?.item?.image_url || profile?.avatar_url) ? (
                        <img src={avatarPreview || selectedStoreAvatar?.item?.image_url || profile?.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{profile?.username?.[0]?.toUpperCase() || "?"}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white/70 mb-2">Profile Photo</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => avatarInputRef.current?.click()}
                          className="cp-btn cp-btn-ghost text-xs h-8 px-3 flex items-center gap-1.5"
                        >
                          <Camera size={12} />
                          Upload
                        </button>
                        {storeAvatars.length > 0 && (
                          <button
                            onClick={() => setAvatarMode(avatarMode === "store" ? "photo" : "store")}
                            className="cp-btn cp-btn-ghost text-xs h-8 px-3 flex items-center gap-1.5"
                          >
                            <Star size={12} />
                            Store ({storeAvatars.length})
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Store avatars */}
                  {avatarMode === "store" && storeAvatars.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {storeAvatars.map(row => (
                        <button
                          key={row.id}
                          onClick={() => { setSelectedStoreAvatar(row); setAvatarFile(null); setAvatarPreview(null); }}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                            selectedStoreAvatar?.id === row.id
                              ? "border-violet-500"
                              : "border-white/[0.10] hover:border-white/25"
                          }`}
                        >
                          <img src={row.item.image_url} alt={row.item.name} className="w-full h-full object-cover" />
                          {selectedStoreAvatar?.id === row.id && (
                            <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                              <span className="text-white text-lg font-bold">✓</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

                  {/* Upload drop area */}
                  {avatarMode === "photo" && !avatarPreview && (
                    <div
                      className="rounded-xl border border-dashed border-white/[0.12] hover:border-violet-500/40 transition-colors cursor-pointer p-4 flex flex-col items-center gap-2 group"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <Upload size={18} className="text-white/25 group-hover:text-violet-400 transition-colors" />
                      <p className="text-xs text-white/35 group-hover:text-white/60 transition-colors">
                        {avatarFile ? avatarFile.name : "Click to choose an image"}
                      </p>
                    </div>
                  )}

                  {/* Form fields */}
                  {[
                    { key: "username",     label: "Username",     placeholder: "Enter username" },
                    { key: "free_fire_id", label: "Free Fire ID", placeholder: "123456789" },
                    { key: "city",         label: "City",         placeholder: "Your city" },
                    { key: "country",      label: "Country",      placeholder: "Your country" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="cp-label">{label}</label>
                      <input
                        value={editForm[key]}
                        onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="cp-input"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="cp-label">Bio</label>
                    <textarea
                      value={editForm.bio}
                      onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Tell your story..."
                      rows={3}
                      className="cp-input resize-none"
                      style={{ height: "auto", paddingTop: "11px", paddingBottom: "11px", lineHeight: "1.5" }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setShowEdit(false)} className="cp-btn cp-btn-ghost flex-1">Cancel</button>
                    <button onClick={saveProfile} disabled={saving} className="cp-btn cp-btn-indigo flex-1">
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
